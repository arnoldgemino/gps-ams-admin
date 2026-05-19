export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOfflineThresholdSec } from "@/lib/offline-alerts";

function jsonNoCache(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Cache-Control", "no-store, max-age=0");
  return NextResponse.json(data, { ...init, headers });
}

export async function GET() {
  try {
    const settings = await prisma.systemSettings.findFirst({
      select: {
        telemetryIntervalSec: true,
      },
    });

    const telemetryIntervalSec = settings?.telemetryIntervalSec ?? 30;
    const offlineThresholdSec = getOfflineThresholdSec(telemetryIntervalSec);
    const cutoff = new Date(Date.now() - offlineThresholdSec * 1000);

    const devices = await prisma.device.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        deviceCode: true,
        serialNumber: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!devices.length) {
      return jsonNoCache([], { status: 200 });
    }

    const deviceIds = devices.map((d) => d.id);

    const assignments = await prisma.deviceAssignment.findMany({
      where: {
        status: "ACTIVE",
        deviceId: { in: deviceIds },
      },
      orderBy: [
        { deviceId: "asc" },
        { startAt: "desc" },
      ],
      distinct: ["deviceId"],
      select: {
        deviceId: true,
        paroleeId: true,
        parolee: {
          select: {
            paroleeNo: true,
            fullName: true,
          },
        },
      },
    });

    const telemetryRows = await prisma.telemetry.findMany({
      where: {
        deviceId: { in: deviceIds },
      },
      orderBy: [
        { deviceId: "asc" },
        { createdAt: "desc" },
      ],
      distinct: ["deviceId"],
      select: {
        deviceId: true,
        createdAt: true,
        batteryLevel: true,
        signalRssiDbm: true,
      },
    });

    const activeAssignmentMap = new Map();
    for (const a of assignments) {
      activeAssignmentMap.set(a.deviceId, a);
    }

    const latestTelemetryMap = new Map();
    for (const t of telemetryRows) {
      latestTelemetryMap.set(t.deviceId, t);
    }

    const items = devices.map((d) => {
      const assignment = activeAssignmentMap.get(d.id);
      const telemetry = latestTelemetryMap.get(d.id);

      const isFresh = telemetry ? telemetry.createdAt >= cutoff : false;

      return {
        id: d.id,
        deviceCode: d.deviceCode,
        serialNumber: d.serialNumber,
        status: d.status,
        liveState: isFresh ? "ONLINE" : "OFFLINE",
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        paroleeId: assignment?.paroleeId || "",
        paroleeLabel: assignment?.parolee
          ? `${assignment.parolee.paroleeNo} - ${assignment.parolee.fullName}`
          : "—",
        lastPing: isFresh ? telemetry?.createdAt || null : null,
        latestBatteryLevel: isFresh ? telemetry?.batteryLevel ?? null : null,
        latestSignalRssiDbm: isFresh ? telemetry?.signalRssiDbm ?? null : null,
        lastSeenAt: telemetry?.createdAt || null,
      };
    });

    return jsonNoCache(items, { status: 200 });
  } catch (error) {
    console.error("GET /api/devices error:", error);

    return jsonNoCache(
      { error: "Failed to fetch devices" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const body = await req.json();

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

    const existingDeviceCode = await prisma.device.findUnique({
      where: { deviceCode },
      select: { id: true },
    });

    if (existingDeviceCode) {
      return jsonNoCache(
        { error: "Device code already exists" },
        { status: 409 }
      );
    }

    const existingSerial = await prisma.device.findUnique({
      where: { serialNumber },
      select: { id: true },
    });

    if (existingSerial) {
      return jsonNoCache(
        { error: "Serial number already exists" },
        { status: 409 }
      );
    }

    const device = await prisma.device.create({
      data: {
        deviceCode,
        serialNumber,
        status,
        apiKey: crypto.randomUUID(),
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

    return jsonNoCache(
      { ok: true, data: device },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/devices error:", error);

    if (error?.code === "P2002") {
      return jsonNoCache(
        { error: "Duplicate deviceCode or serialNumber" },
        { status: 409 }
      );
    }

    return jsonNoCache(
      { error: "Failed to create device" },
      { status: 500 }
    );
  }
}
