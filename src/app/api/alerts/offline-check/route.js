export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function jsonNoCache(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Cache-Control", "no-store, max-age=0");
  return NextResponse.json(data, { ...init, headers });
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

  if (existing) return existing;

  return tx.alert.create({
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
    const settings = await prisma.systemSettings.findFirst({
      select: {
        telemetryIntervalSec: true,
      },
    });

    const telemetryIntervalSec = settings?.telemetryIntervalSec ?? 10;
    const offlineThresholdSec = Math.max(telemetryIntervalSec * 6, 60);
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
      return jsonNoCache({ ok: true, processed: 0 }, { status: 200 });
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

    return jsonNoCache(
      {
        ok: true,
        processed: activeDeviceAssignments.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/alerts/offline-check error:", error);

    return jsonNoCache(
      { error: "Failed to run offline check" },
      { status: 500 }
    );
  }
}