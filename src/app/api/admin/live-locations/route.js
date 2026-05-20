export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOfflineThresholdSec } from "@/lib/offline-alerts";
import { formatPhilippinesDateTime } from "@/lib/time";

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

    const telemetryIntervalSec = settings?.telemetryIntervalSec ?? 10;
    const offlineThresholdSec = getOfflineThresholdSec(telemetryIntervalSec);
    const cutoff = new Date(Date.now() - offlineThresholdSec * 1000);

    const telemetryRows = await prisma.telemetry.findMany({
      where: {
        createdAt: {
          gte: cutoff,
        },
      },
      orderBy: [
        { paroleeId: "asc" },
        { createdAt: "desc" },
      ],
      distinct: ["paroleeId"],
      select: {
        paroleeId: true,
        lat: true,
        lng: true,
        createdAt: true,
        parolee: {
          select: {
            fullName: true,
          },
        },
      },
    });

    if (!telemetryRows.length) {
      return jsonNoCache(
        {
          items: [],
          offlineThresholdSec,
        },
        { status: 200 }
      );
    }

    const paroleeIds = telemetryRows.map((r) => r.paroleeId);

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

    const alertSet = new Set(openAlerts.map((a) => a.paroleeId));

    const items = telemetryRows.map((row) => ({
      paroleeId: row.paroleeId,
      name: row.parolee?.fullName || row.paroleeId,
      lat: row.lat,
      lng: row.lng,
      lastSeen: formatPhilippinesDateTime(row.createdAt, "—"),
      lastSeenAt: row.createdAt,
      status: alertSet.has(row.paroleeId) ? "ALERT" : "COMPLIANT",
    }));

    return jsonNoCache(
      {
        items,
        offlineThresholdSec,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/admin/live-locations error:", error);

    return jsonNoCache(
      { error: "Failed to load live locations" },
      { status: 500 }
    );
  }
}
