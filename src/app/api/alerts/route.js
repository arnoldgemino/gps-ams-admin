export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runOfflineAlertCheck } from "@/lib/offline-alerts";
import { getAlertSeverity } from "@/lib/alert-severity";

function jsonNoCache(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Cache-Control", "no-store, max-age=0");
  return NextResponse.json(data, { ...init, headers });
}

export async function GET() {
  try {
    await runOfflineAlertCheck();

    const alerts = await prisma.alert.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        paroleeId: true,
        type: true,
        details: true,
        status: true,
        createdAt: true,
        parolee: {
          select: {
            paroleeNo: true,
            fullName: true,
          },
        },
        officer: {
          select: {
            badgeId: true,
            fullName: true,
          },
        },
      },
    });

    if (!alerts.length) {
      return jsonNoCache([], { status: 200 });
    }

    const paroleeIds = [...new Set(alerts.map((a) => a.paroleeId).filter(Boolean))];

    const telemetryRows = paroleeIds.length
      ? await prisma.telemetry.findMany({
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
            lat: true,
            lng: true,
            createdAt: true,
          },
        })
      : [];

    const latestTelemetryMap = new Map();
    for (const t of telemetryRows) {
      latestTelemetryMap.set(t.paroleeId, t);
    }

    const items = alerts.map((a) => {
      const telemetry = latestTelemetryMap.get(a.paroleeId);
      const derivedLocation = telemetry ? `${telemetry.lat}, ${telemetry.lng}` : "Unknown";

      return {
        id: a.id,
        paroleeId: a.paroleeId || "",
        paroleeNo: a.parolee?.paroleeNo || "",
        paroleeLabel: a.parolee
          ? `${a.parolee.paroleeNo} - ${a.parolee.fullName}`
          : a.paroleeId || "—",
        type: a.type,
        severity: getAlertSeverity(a.type, a.details),
        status: a.status,
        location: derivedLocation,
        time: a.createdAt ? new Date(a.createdAt).toLocaleString() : "—",
        details: a.details || "",
        officerLabel: a.officer
          ? `${a.officer.badgeId} - ${a.officer.fullName}`
          : "—",
      };
    });

    return jsonNoCache(items, { status: 200 });
  } catch (error) {
    console.error("GET /api/alerts error:", error);

    return jsonNoCache(
      { error: "Failed to fetch alerts" },
      { status: 500 }
    );
  }
}
