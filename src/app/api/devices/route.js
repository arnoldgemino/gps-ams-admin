import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const settings = await prisma.systemSettings.findFirst();
    const telemetryIntervalSec = settings?.telemetryIntervalSec ?? 10;
    const offlineThresholdSec = Math.max(telemetryIntervalSec * 6, 60);
    const cutoff = new Date(Date.now() - offlineThresholdSec * 1000);

    const [devices, assignments, telemetryRows] = await Promise.all([
      prisma.device.findMany({
        orderBy: { createdAt: "desc" },
      }),
      prisma.deviceAssignment.findMany({
        where: { status: "ACTIVE" },
        include: { parolee: true },
        orderBy: { startAt: "desc" },
      }),
      prisma.telemetry.findMany({
        orderBy: { createdAt: "desc" },
        take: 1000,
      }),
    ]);

    const activeAssignmentMap = new Map();
    for (const a of assignments) {
      if (!activeAssignmentMap.has(a.deviceId)) {
        activeAssignmentMap.set(a.deviceId, a);
      }
    }

    const latestTelemetryMap = new Map();
    for (const t of telemetryRows) {
      if (!latestTelemetryMap.has(t.deviceId)) {
        latestTelemetryMap.set(t.deviceId, t);
      }
    }

    const items = devices.map((d) => {
      const assignment = activeAssignmentMap.get(d.id);
      const telemetry = latestTelemetryMap.get(d.id);

      const isFresh = telemetry ? telemetry.createdAt >= cutoff : false;

      return {
        id: d.id,
        deviceCode: d.deviceCode,
        serialNumber: d.serialNumber,
        status: d.status, // inventory/device record status
        liveState: isFresh ? "ONLINE" : "OFFLINE",
        apiKey: d.apiKey,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        paroleeId: assignment?.paroleeId || "",
        paroleeLabel: assignment?.parolee
          ? `${assignment.parolee.paroleeNo} - ${assignment.parolee.fullName}`
          : "—",

        // live values only if fresh telemetry
        lastPing: isFresh ? telemetry?.createdAt || null : null,
        latestBatteryLevel: isFresh ? telemetry?.batteryLevel ?? null : null,
        latestSignalRssiDbm: isFresh ? telemetry?.signalRssiDbm ?? null : null,

        // optional historical info
        lastSeenAt: telemetry?.createdAt || null,
      };
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch devices" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { deviceCode, serialNumber, status = "IN_SERVICE" } = body;

    if (!deviceCode || !serialNumber) {
      return NextResponse.json(
        { error: "deviceCode and serialNumber are required" },
        { status: 400 }
      );
    }

    const device = await prisma.device.create({
      data: {
        deviceCode,
        serialNumber,
        status,
        apiKey: crypto.randomUUID(),
      },
    });

    return NextResponse.json({ ok: true, data: device }, { status: 201 });
  } catch (error) {
    console.error(error);

    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Duplicate deviceCode or serialNumber" },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: "Failed to create device" }, { status: 500 });
  }
}