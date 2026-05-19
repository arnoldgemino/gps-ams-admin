import { prisma } from "@/lib/prisma";

export function getOfflineThresholdSec(telemetryIntervalSec) {
  return Math.max(Number(telemetryIntervalSec || 30) * 2, 60);
}

async function ensureOpenAlert(tx, { paroleeId, officerId, type, details }) {
  const existing = await tx.alert.findFirst({
    where: {
      paroleeId,
      type,
      status: "OPEN",
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
    },
  });

  if (existing) return { alert: existing, created: false };

  const alert = await tx.alert.create({
    data: {
      paroleeId,
      officerId: officerId || null,
      type,
      details,
      status: "OPEN",
    },
    select: {
      id: true,
    },
  });

  return { alert, created: true };
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

export async function runOfflineAlertCheck() {
  const settings = await prisma.systemSettings.findFirst({
    select: {
      telemetryIntervalSec: true,
    },
  });

  const telemetryIntervalSec = settings?.telemetryIntervalSec ?? 30;
  const offlineThresholdSec = getOfflineThresholdSec(telemetryIntervalSec);
  const cutoff = new Date(Date.now() - offlineThresholdSec * 1000);

  const activeDeviceAssignments = await prisma.deviceAssignment.findMany({
    where: {
      status: "ACTIVE",
    },
    select: {
      paroleeId: true,
      device: {
        select: {
          deviceCode: true,
        },
      },
    },
  });

  if (!activeDeviceAssignments.length) {
    return {
      ok: true,
      processed: 0,
      created: 0,
      offlineThresholdSec,
    };
  }

  const paroleeIds = [
    ...new Set(activeDeviceAssignments.map((a) => a.paroleeId).filter(Boolean)),
  ];

  const activeOfficerAssignments = await prisma.officerParoleeAssignment.findMany({
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

  const latestTelemetryMap = new Map();
  for (const row of telemetryRows) {
    latestTelemetryMap.set(row.paroleeId, row);
  }

  const officerMap = new Map();
  for (const row of activeOfficerAssignments) {
    officerMap.set(row.paroleeId, row.officerId);
  }

  let created = 0;

  await prisma.$transaction(async (tx) => {
    for (const assignment of activeDeviceAssignments) {
      const latest = latestTelemetryMap.get(assignment.paroleeId);
      const officerId = officerMap.get(assignment.paroleeId) || null;

      if (!latest || latest.createdAt < cutoff) {
        const lastSeenText = latest
          ? latest.createdAt.toISOString()
          : "no telemetry received yet";

        const result = await ensureOpenAlert(tx, {
          paroleeId: assignment.paroleeId,
          officerId,
          type: "OFFLINE",
          details: `Device ${assignment.device.deviceCode} appears offline. No telemetry received within ${offlineThresholdSec} seconds. Last seen: ${lastSeenText}.`,
        });

        if (result.created) created += 1;
      } else {
        await resolveOfflineAlerts(tx, assignment.paroleeId);
      }
    }
  });

  return {
    ok: true,
    processed: activeDeviceAssignments.length,
    created,
    offlineThresholdSec,
  };
}
