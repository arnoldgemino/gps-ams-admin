import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

export async function POST() {
  try {
    const settings = await prisma.systemSettings.findFirst();
    const telemetryIntervalSec = settings?.telemetryIntervalSec ?? 10;

    // 6 missed intervals or minimum 60 sec
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

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/alerts/offline-check error:", error);
    return NextResponse.json(
      { error: "Failed to run offline check" },
      { status: 500 }
    );
  }
}