import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    const settings = await prisma.systemSettings.findFirst();
    const telemetryIntervalSec = settings?.telemetryIntervalSec ?? 10;
    const offlineThresholdSec = Math.max(telemetryIntervalSec * 6, 60);
    const cutoff = new Date(Date.now() - offlineThresholdSec * 1000);

    const device = await prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    const [assignment, latestTelemetry] = await Promise.all([
      prisma.deviceAssignment.findFirst({
        where: {
          deviceId: id,
          status: "ACTIVE",
        },
        include: { parolee: true },
        orderBy: { startAt: "desc" },
      }),
      prisma.telemetry.findFirst({
        where: { deviceId: id },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const isFresh = latestTelemetry ? latestTelemetry.createdAt >= cutoff : false;

    return NextResponse.json({
      ...device,
      liveState: isFresh ? "ONLINE" : "OFFLINE",
      assignedParoleeLabel: assignment?.parolee
        ? `${assignment.parolee.paroleeNo} - ${assignment.parolee.fullName}`
        : "—",
      currentAssignment: assignment,
      latestTelemetry: isFresh ? latestTelemetry : null,
      lastSeenAt: latestTelemetry?.createdAt || null,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch device detail" }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const { deviceCode, serialNumber, status } = body;

    const existing = await prisma.device.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    const device = await prisma.device.update({
      where: { id },
      data: {
        deviceCode,
        serialNumber,
        status,
      },
    });

    return NextResponse.json({ ok: true, data: device });
  } catch (error) {
    console.error(error);

    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Duplicate deviceCode or serialNumber" },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: "Failed to update device" }, { status: 500 });
  }
}