export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function jsonNoCache(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Cache-Control", "no-store, max-age=0");
  return NextResponse.json(data, { ...init, headers });
}

export async function GET() {
  try {
    const parolees = await prisma.parolee.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        paroleeNo: true,
        fullName: true,
        status: true,
      },
    });

    if (!parolees.length) {
      return jsonNoCache([], { status: 200 });
    }

    const paroleeIds = parolees.map((p) => p.id);

    const officerAssignments = await prisma.officerParoleeAssignment.findMany({
      where: {
        status: "ACTIVE",
        paroleeId: { in: paroleeIds },
      },
      orderBy: [
        { paroleeId: "asc" },
        { startAt: "desc" },
      ],
      distinct: ["paroleeId"],
      select: {
        paroleeId: true,
        officerId: true,
        officer: {
          select: {
            badgeId: true,
            fullName: true,
          },
        },
      },
    });

    const deviceAssignments = await prisma.deviceAssignment.findMany({
      where: {
        status: "ACTIVE",
        paroleeId: { in: paroleeIds },
      },
      orderBy: [
        { paroleeId: "asc" },
        { startAt: "desc" },
      ],
      distinct: ["paroleeId"],
      select: {
        paroleeId: true,
        deviceId: true,
        device: {
          select: {
            deviceCode: true,
          },
        },
      },
    });

    const telemetryRows = await prisma.telemetry.findMany({
      where: {
        paroleeId: { in: paroleeIds },
      },
      orderBy: [
        { paroleeId: "asc" },
        { createdAt: "desc" },
      ],
      distinct: ["paroleeId"],
      select: {
        paroleeId: true,
        createdAt: true,
      },
    });

    const alerts = await prisma.alert.findMany({
      where: {
        status: "OPEN",
        paroleeId: { in: paroleeIds },
      },
      orderBy: [
        { paroleeId: "asc" },
        { createdAt: "desc" },
      ],
      distinct: ["paroleeId"],
      select: {
        paroleeId: true,
      },
    });

    const officerMap = new Map();
    for (const a of officerAssignments) {
      officerMap.set(a.paroleeId, a);
    }

    const deviceMap = new Map();
    for (const a of deviceAssignments) {
      deviceMap.set(a.paroleeId, a);
    }

    const telemetryMap = new Map();
    for (const t of telemetryRows) {
      telemetryMap.set(t.paroleeId, t);
    }

    const alertMap = new Map();
    for (const a of alerts) {
      alertMap.set(a.paroleeId, a);
    }

    const items = parolees.map((p) => {
      const officerAssignment = officerMap.get(p.id);
      const deviceAssignment = deviceMap.get(p.id);
      const latestTelemetry = telemetryMap.get(p.id);
      const openAlert = alertMap.get(p.id);

      return {
        id: p.id,
        paroleeNo: p.paroleeNo,
        fullName: p.fullName,
        officerId: officerAssignment?.officerId || "",
        officer: officerAssignment?.officer
          ? `${officerAssignment.officer.badgeId} - ${officerAssignment.officer.fullName}`
          : "—",
        deviceId: deviceAssignment?.deviceId || "",
        device: deviceAssignment?.device?.deviceCode || "—",
        ams: deviceAssignment ? "ACTIVE" : "INACTIVE",
        status: openAlert ? "ALERT" : latestTelemetry ? "COMPLIANT" : "WARNING",
        lastSeen: latestTelemetry
          ? new Date(latestTelemetry.createdAt).toLocaleString()
          : "—",
        dbStatus: p.status,
      };
    });

    return jsonNoCache(items, { status: 200 });
  } catch (error) {
    console.error("GET /api/parolees error:", error);
    return jsonNoCache(
      { error: "Failed to fetch parolees" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const body = await req.json();

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

    const parolee = await prisma.parolee.create({
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

    return jsonNoCache({ ok: true, data: parolee }, { status: 201 });
  } catch (error) {
    console.error("POST /api/parolees error:", error);

    if (error?.code === "P2002") {
      return jsonNoCache(
        { error: "Duplicate paroleeNo" },
        { status: 409 }
      );
    }

    return jsonNoCache(
      { error: "Failed to create parolee" },
      { status: 500 }
    );
  }
}