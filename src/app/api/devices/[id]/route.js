export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function jsonNoCache(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Cache-Control", "no-store, max-age=0");
  return NextResponse.json(data, { ...init, headers });
}

export async function GET(req, { params }) {
  try {
    const { id } = params;

    if (!id) {
      return jsonNoCache({ error: "Device ID is required" }, { status: 400 });
    }

    const settings = await prisma.systemSettings.findFirst({
      select: {
        telemetryIntervalSec: true,
      },
    });

    const telemetryIntervalSec = settings?.telemetryIntervalSec ?? 10;
    const offlineThresholdSec = Math.max(telemetryIntervalSec * 6, 60);
    const cutoff = new Date(Date.now() - offlineThresholdSec * 1000);

    const device = await prisma.device.findUnique({
      where: { id },
      select: {
        id: true,
        deviceCode: true,
        serialNumber: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!device) {
      return jsonNoCache({ error: "Device not found" }, { status: 404 });
    }

    const assignment = await prisma.deviceAssignment.findFirst({
      where: {
        deviceId: id,
        status: "ACTIVE",
      },
      orderBy: { startAt: "desc" },
      select: {
        id: true,
        deviceId: true,
        paroleeId: true,
        startAt: true,
        endAt: true,
        status: true,
        parolee: {
          select: {
            id: true,
            paroleeNo: true,
            fullName: true,
          },
        },
      },
    });

    const latestTelemetry = await prisma.telemetry.findFirst({
      where: { deviceId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        deviceId: true,
        paroleeId: true,
        lat: true,
        lng: true,
        batteryLevel: true,
        signalRssiDbm: true,
        tamperStatus: true,
        createdAt: true,
      },
    });

    const isFresh = latestTelemetry ? latestTelemetry.createdAt >= cutoff : false;

    return jsonNoCache(
      {
        ...device,
        liveState: isFresh ? "ONLINE" : "OFFLINE",
        assignedParoleeLabel: assignment?.parolee
          ? `${assignment.parolee.paroleeNo} - ${assignment.parolee.fullName}`
          : "—",
        currentAssignment: assignment
          ? {
              id: assignment.id,
              deviceId: assignment.deviceId,
              paroleeId: assignment.paroleeId,
              startAt: assignment.startAt,
              endAt: assignment.endAt,
              status: assignment.status,
              parolee: assignment.parolee,
            }
          : null,
        latestTelemetry: isFresh ? latestTelemetry : null,
        lastSeenAt: latestTelemetry?.createdAt || null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/devices/[id] error:", error);

    return jsonNoCache(
      { error: "Failed to fetch device detail" },
      { status: 500 }
    );
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();

    if (!id) {
      return jsonNoCache({ error: "Device ID is required" }, { status: 400 });
    }

    const existing = await prisma.device.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return jsonNoCache({ error: "Device not found" }, { status: 404 });
    }

    const deviceCode = String(body.deviceCode || "").trim();
    const serialNumber = String(body.serialNumber || "").trim();

    const allowedStatuses = ["IN_SERVICE", "IN_STOCK", "MAINTENANCE", "LOST"];
    const status = allowedStatuses.includes(body.status)
      ? body.status
      : "IN_SERVICE";

    if (!deviceCode || !serialNumber) {
      return jsonNoCache(
        { error: "deviceCode and serialNumber are required" },
        { status: 400 }
      );
    }

    const device = await prisma.device.update({
      where: { id },
      data: {
        deviceCode,
        serialNumber,
        status,
      },
      select: {
        id: true,
        deviceCode: true,
        serialNumber: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return jsonNoCache({ ok: true, data: device }, { status: 200 });
  } catch (error) {
    console.error("PUT /api/devices/[id] error:", error);

    if (error?.code === "P2002") {
      return jsonNoCache(
        { error: "Duplicate deviceCode or serialNumber" },
        { status: 409 }
      );
    }

    return jsonNoCache(
      { error: "Failed to update device" },
      { status: 500 }
    );
  }
}