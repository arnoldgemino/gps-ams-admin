export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAlertSeverity } from "@/lib/alert-severity";

function jsonNoCache(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Cache-Control", "no-store, max-age=0");
  return NextResponse.json(data, { ...init, headers });
}

async function getRouteId(req, params) {
  const resolvedParams = await params;
  const fromParams = String(resolvedParams?.id || "").trim();
  if (fromParams) return fromParams;

  try {
    const segments = new URL(req.url).pathname.split("/").filter(Boolean);
    return String(segments[2] || "").trim();
  } catch {
    return "";
  }
}

export async function GET(req, { params }) {
  try {
    const id = await getRouteId(req, params);

    if (!id) {
      return jsonNoCache({ error: "Alert ID is required" }, { status: 400 });
    }

    const alert = await prisma.alert.findUnique({
      where: { id },
      select: {
        id: true,
        paroleeId: true,
        officerId: true,
        type: true,
        details: true,
        status: true,
        createdAt: true,
      },
    });

    if (!alert) {
      return jsonNoCache({ error: "Alert not found" }, { status: 404 });
    }

    const parolee = alert.paroleeId
      ? await prisma.parolee.findUnique({
          where: { id: alert.paroleeId },
          select: {
            paroleeNo: true,
            fullName: true,
          },
        })
      : null;

    const officer = alert.officerId
      ? await prisma.officer.findUnique({
          where: { id: alert.officerId },
          select: {
            badgeId: true,
            fullName: true,
          },
        })
      : null;

    const latestTelemetry = alert.paroleeId
      ? await prisma.telemetry.findFirst({
          where: { paroleeId: alert.paroleeId },
          orderBy: { createdAt: "desc" },
          select: {
            lat: true,
            lng: true,
            createdAt: true,
          },
        })
      : null;

    return jsonNoCache(
      {
        id: alert.id,
        paroleeId: alert.paroleeId || "",
        paroleeLabel: parolee
          ? `${parolee.paroleeNo} - ${parolee.fullName}`
          : alert.paroleeId || "—",
        type: alert.type,
        severity: getAlertSeverity(alert.type, alert.details),
        status: alert.status,
        details: alert.details || "",
        time: alert.createdAt ? new Date(alert.createdAt).toLocaleString() : "—",
        location: latestTelemetry
          ? `${latestTelemetry.lat}, ${latestTelemetry.lng}`
          : "Unknown",
        officerLabel: officer
          ? `${officer.badgeId} - ${officer.fullName}`
          : "—",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/alerts/[id] error:", error);

    return jsonNoCache(
      { error: "Failed to fetch alert detail" },
      { status: 500 }
    );
  }
}
