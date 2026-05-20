export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runOfflineAlertCheck } from "@/lib/offline-alerts";
import { getAlertSeverity } from "@/lib/alert-severity";
import { formatPhilippinesDateTime } from "@/lib/time";

function jsonNoCache(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Cache-Control", "no-store, max-age=0");
  return NextResponse.json(data, { ...init, headers });
}

async function getOfficerId(req, params) {
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

function normalizeTake(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.min(Math.floor(parsed), 100);
}

export async function GET(req, { params }) {
  try {
    await runOfflineAlertCheck();

    const officerId = await getOfficerId(req, params);

    if (!officerId) {
      return jsonNoCache({ error: "Officer ID is required" }, { status: 400 });
    }

    const officer = await prisma.officer.findUnique({
      where: { id: officerId },
      select: {
        id: true,
        badgeId: true,
        fullName: true,
      },
    });

    if (!officer) {
      return jsonNoCache({ error: "Officer not found" }, { status: 404 });
    }

    const assignments = await prisma.officerParoleeAssignment.findMany({
      where: {
        officerId,
        status: "ACTIVE",
      },
      select: {
        paroleeId: true,
      },
    });

    const paroleeIds = [...new Set(assignments.map((a) => a.paroleeId).filter(Boolean))];

    if (!paroleeIds.length) {
      return jsonNoCache([], { status: 200 });
    }

    const url = new URL(req.url);
    const status = String(url.searchParams.get("status") || "").trim().toUpperCase();
    const take = normalizeTake(url.searchParams.get("take"));
    const allowedStatuses = ["OPEN", "ACKNOWLEDGED", "RESOLVED"];

    const alerts = await prisma.alert.findMany({
      where: {
        paroleeId: { in: paroleeIds },
        ...(allowedStatuses.includes(status) ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
      ...(take ? { take } : {}),
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
      },
    });

    if (!alerts.length) {
      return jsonNoCache([], { status: 200 });
    }

    const alertParoleeIds = [...new Set(alerts.map((a) => a.paroleeId).filter(Boolean))];
    const telemetryRows = alertParoleeIds.length
      ? await prisma.telemetry.findMany({
          where: {
            paroleeId: { in: alertParoleeIds },
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

    const telemetryMap = new Map(telemetryRows.map((t) => [t.paroleeId, t]));

    const items = alerts.map((a) => {
      const telemetry = telemetryMap.get(a.paroleeId);
      const paroleeLabel = a.parolee
        ? `${a.parolee.paroleeNo} - ${a.parolee.fullName}`
        : a.paroleeId || "-";

      return {
        id: a.id,
        paroleeId: a.paroleeId || "",
        paroleeNo: a.parolee?.paroleeNo || "",
        paroleeLabel,
        type: a.type,
        severity: getAlertSeverity(a.type, a.details),
        status: a.status,
        location: telemetry ? `${telemetry.lat}, ${telemetry.lng}` : "Unknown",
        time: formatPhilippinesDateTime(a.createdAt),
        createdAt: a.createdAt,
        details: a.details || "",
        message: a.details || `${a.type} alert for ${paroleeLabel}`,
        officerId: officer.id,
        officerLabel: `${officer.badgeId} - ${officer.fullName}`,
      };
    });

    return jsonNoCache(items, { status: 200 });
  } catch (error) {
    console.error("GET /api/officers/[id]/alerts error:", error);

    return jsonNoCache(
      { error: "Failed to fetch officer alerts" },
      { status: 500 }
    );
  }
}
