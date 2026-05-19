export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function jsonNoCache(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Cache-Control", "no-store, max-age=0");
  return NextResponse.json(data, { ...init, headers });
}

async function getRouteId(req, params, paramName = "id") {
  const resolvedParams = await params;
  if (resolvedParams?.[paramName]) return resolvedParams[paramName];
  try {
    const url = new URL(req.url);
    const segments = url.pathname.split("/").filter(Boolean);
    return segments[segments.length - 1] || null;
  } catch {
    return null;
  }
}

export async function GET(req, { params }) {
  try {
    const id = await getRouteId(req, params);

    if (!id) {
      return jsonNoCache({ error: "Parolee ID is required" }, { status: 400 });
    }

    const parolee = await prisma.parolee.findUnique({
      where: { id },
      select: {
        id: true,
        paroleeNo: true,
        fullName: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!parolee) {
      return jsonNoCache({ error: "Parolee not found" }, { status: 404 });
    }

    const officerAssignment = await prisma.officerParoleeAssignment.findFirst({
      where: {
        paroleeId: id,
        status: "ACTIVE",
      },
      orderBy: { startAt: "desc" },
      select: {
        officerId: true,
        officer: {
          select: {
            badgeId: true,
            fullName: true,
          },
        },
      },
    });

    const deviceAssignment = await prisma.deviceAssignment.findFirst({
      where: {
        paroleeId: id,
        status: "ACTIVE",
      },
      orderBy: { startAt: "desc" },
      select: {
        deviceId: true,
        device: {
          select: {
            deviceCode: true,
            serialNumber: true,
          },
        },
      },
    });

    const latestTelemetry = await prisma.telemetry.findFirst({
      where: { paroleeId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        lat: true,
        lng: true,
        batteryLevel: true,
        signalRssiDbm: true,
        tamperStatus: true,
        createdAt: true,
      },
    });

    const openAlerts = await prisma.alert.findMany({
      where: {
        paroleeId: id,
        status: "OPEN",
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        details: true,
        status: true,
        createdAt: true,
        resolvedAt: true,
      },
    });

    return jsonNoCache(
      {
        ...parolee,
        currentOfficerId: officerAssignment?.officerId || "",
        currentOfficerLabel: officerAssignment?.officer
          ? `${officerAssignment.officer.badgeId} - ${officerAssignment.officer.fullName}`
          : "—",
        currentDeviceId: deviceAssignment?.deviceId || "",
        currentDeviceLabel: deviceAssignment?.device
          ? `${deviceAssignment.device.deviceCode} - ${deviceAssignment.device.serialNumber}`
          : "—",
        latestTelemetry,
        openAlerts,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/parolees/[id] error:", error);
    return jsonNoCache(
      { error: "Failed to fetch parolee detail" },
      { status: 500 }
    );
  }
}

export async function PUT(req, { params }) {
  try {
    const id = await getRouteId(req, params);
    const body = await req.json();

    if (!id) {
      return jsonNoCache({ error: "Parolee ID is required" }, { status: 400 });
    }

    const existing = await prisma.parolee.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return jsonNoCache({ error: "Parolee not found" }, { status: 404 });
    }

    const paroleeNo = String(body.paroleeNo || "").trim();
    const fullName = String(body.fullName || "").trim();
    const allowedStatuses = ["ACTIVE", "INACTIVE"];
    const status = allowedStatuses.includes(body.status)
      ? body.status
      : "ACTIVE";

    if (!paroleeNo || !fullName) {
      return jsonNoCache(
        { error: "paroleeNo and fullName are required" },
        { status: 400 }
      );
    }

    const parolee = await prisma.parolee.update({
      where: { id },
      data: {
        paroleeNo,
        fullName,
        status,
      },
      select: {
        id: true,
        paroleeNo: true,
        fullName: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return jsonNoCache({ ok: true, data: parolee }, { status: 200 });
  } catch (error) {
    console.error("PUT /api/parolees/[id] error:", error);

    if (error?.code === "P2002") {
      return jsonNoCache(
        { error: "Duplicate paroleeNo" },
        { status: 409 }
      );
    }

    return jsonNoCache(
      { error: "Failed to update parolee" },
      { status: 500 }
    );
  }
}
