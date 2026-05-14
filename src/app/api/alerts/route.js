import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getSeverity(type) {
  if (type === "TAMPER") return "CRITICAL";
  if (type === "GEOFENCE") return "HIGH";
  if (type === "OFFLINE") return "HIGH";
  if (type === "LOW_BATTERY") return "MEDIUM";
  return "MEDIUM";
}

async function ensureOpenAlert(tx, { paroleeId, officerId, type, details }) {
  const existing = await tx.alert.findFirst({
    where: {
      paroleeId,
      type,
      status: "OPEN",
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) return existing;

  return tx.alert.create({
    data: {
      paroleeId,
      officerId: officerId || null,
      type,
      details,
      status: "OPEN",
    },
  });
}

async function resolveOfflineAlerts(tx, paroleeId) {
  await tx.alert.updateMany({
    where: {
      paroleeId,
      type: "OFFLINE",
      status: {
        in: ["OPEN", "ACKNOWLEDGED"],
      },
    },
    data: {
      status: "RESOLVED",
      resolvedAt: new Date(),
    },
  });
}

async function runOfflineCheck() {
  const settings = await prisma.systemSettings.findFirst();
  const telemetryIntervalSec = settings?.telemetryIntervalSec ?? 10;

  // after 6 missed intervals or minimum 60 seconds, mark offline
  const offlineThresholdSec = Math.max(telemetryIntervalSec * 6, 60);
  const cutoff = new Date(Date.now() - offlineThresholdSec * 1000);

  const [activeDeviceAssignments, activeOfficerAssignments, telemetryRows] =
    await Promise.all([
      prisma.deviceAssignment.findMany({
        where: { status: "ACTIVE" },
        include: {
          parolee: true,
          device: true,
        },
      }),
      prisma.officerParoleeAssignment.findMany({
        where: { status: "ACTIVE" },
        orderBy: { startAt: "desc" },
      }),
      prisma.telemetry.findMany({
        orderBy: { createdAt: "desc" },
        take: 1000,
      }),
    ]);

  const latestTelemetryMap = new Map();
  for (const row of telemetryRows) {
    if (!latestTelemetryMap.has(row.paroleeId)) {
      latestTelemetryMap.set(row.paroleeId, row);
    }
  }

  const officerMap = new Map();
  for (const row of activeOfficerAssignments) {
    if (!officerMap.has(row.paroleeId)) {
      officerMap.set(row.paroleeId, row.officerId);
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const assignment of activeDeviceAssignments) {
      const latest = latestTelemetryMap.get(assignment.paroleeId);
      const officerId = officerMap.get(assignment.paroleeId) || null;

      if (!latest || latest.createdAt < cutoff) {
        const lastSeenText = latest
          ? latest.createdAt.toISOString()
          : "no telemetry received yet";

        await ensureOpenAlert(tx, {
          paroleeId: assignment.paroleeId,
          officerId,
          type: "OFFLINE",
          details: `Device ${assignment.device.deviceCode} appears offline. Last seen: ${lastSeenText}.`,
        });
      } else {
        await resolveOfflineAlerts(tx, assignment.paroleeId);
      }
    }
  });
}

export async function GET() {
  try {
    await runOfflineCheck();

    const alerts = await prisma.alert.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        parolee: true,
        officer: true,
      },
    });

    const paroleeIds = [...new Set(alerts.map((a) => a.paroleeId).filter(Boolean))];

    const telemetryRows = paroleeIds.length
      ? await prisma.telemetry.findMany({
          where: { paroleeId: { in: paroleeIds } },
          orderBy: { createdAt: "desc" },
          take: 1000,
        })
      : [];

    const latestTelemetryMap = new Map();
    for (const t of telemetryRows) {
      if (!latestTelemetryMap.has(t.paroleeId)) {
        latestTelemetryMap.set(t.paroleeId, t);
      }
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
        severity: getSeverity(a.type),
        status: a.status,
        location: derivedLocation,
        time: a.createdAt ? new Date(a.createdAt).toLocaleString() : "—",
        details: a.details || "",
        officerLabel: a.officer
          ? `${a.officer.badgeId} - ${a.officer.fullName}`
          : "—",
      };
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("GET /api/alerts error:", error);
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 });
  }
}