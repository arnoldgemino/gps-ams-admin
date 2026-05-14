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
      take: 20,
      select: {
        id: true,
        paroleeNo: true,
        fullName: true,
      },
    });

    if (!parolees.length) {
      return jsonNoCache({ items: [] }, { status: 200 });
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

    const openAlerts = await prisma.alert.findMany({
      where: {
        paroleeId: { in: paroleeIds },
        status: "OPEN",
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
    for (const item of officerAssignments) {
      officerMap.set(item.paroleeId, item.officer);
    }

    const deviceMap = new Map();
    for (const item of deviceAssignments) {
      deviceMap.set(item.paroleeId, item.device);
    }

    const telemetryMap = new Map();
    for (const item of telemetryRows) {
      telemetryMap.set(item.paroleeId, item);
    }

    const alertMap = new Map();
    for (const item of openAlerts) {
      alertMap.set(item.paroleeId, item);
    }

    const items = parolees.map((p) => {
      const officer = officerMap.get(p.id);
      const device = deviceMap.get(p.id);
      const telemetry = telemetryMap.get(p.id);
      const alert = alertMap.get(p.id);

      return {
        id: p.id,
        paroleeNo: p.paroleeNo,
        name: p.fullName,
        officer: officer ? `${officer.badgeId} - ${officer.fullName}` : "—",
        device: device ? device.deviceCode : "—",
        ams: device ? "ACTIVE" : "INACTIVE",
        status: alert ? "ALERT" : telemetry ? "COMPLIANT" : "WARNING",
        lastSeen: telemetry
          ? new Date(telemetry.createdAt).toLocaleString()
          : "—",
      };
    });

    return jsonNoCache({ items }, { status: 200 });
  } catch (error) {
    console.error("GET /api/admin/parolees-overview error:", error);

    return jsonNoCache(
      { error: "Failed to load parolees overview" },
      { status: 500 }
    );
  }
}