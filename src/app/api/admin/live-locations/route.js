import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const settings = await prisma.systemSettings.findFirst();
    const telemetryIntervalSec = settings?.telemetryIntervalSec ?? 10;

    // after 6 missed intervals or minimum 60 seconds, treat as offline/stale
    const offlineThresholdSec = Math.max(telemetryIntervalSec * 6, 60);
    const cutoff = new Date(Date.now() - offlineThresholdSec * 1000);

    const telemetryRows = await prisma.telemetry.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
      include: {
        parolee: true,
      },
    });

    const latestByParolee = [];
    const seen = new Set();

    for (const row of telemetryRows) {
      if (!seen.has(row.paroleeId)) {
        seen.add(row.paroleeId);
        latestByParolee.push(row);
      }
    }

    const freshRows = latestByParolee.filter((row) => row.createdAt >= cutoff);

    const paroleeIds = freshRows.map((r) => r.paroleeId);

    const openAlerts = paroleeIds.length
      ? await prisma.alert.findMany({
          where: {
            paroleeId: { in: paroleeIds },
            status: "OPEN",
          },
        })
      : [];

    const alertSet = new Set(openAlerts.map((a) => a.paroleeId));

    const items = freshRows.map((row) => ({
      paroleeId: row.paroleeId,
      name: row.parolee?.fullName || row.paroleeId,
      lat: row.lat,
      lng: row.lng,
      lastSeen: new Date(row.createdAt).toLocaleString(),
      status: alertSet.has(row.paroleeId) ? "ALERT" : "COMPLIANT",
    }));

    return NextResponse.json({
      items,
      offlineThresholdSec,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load live locations" },
      { status: 500 }
    );
  }
}