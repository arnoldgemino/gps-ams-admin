import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    const parolee = await prisma.parolee.findUnique({
      where: { id },
    });

    if (!parolee) {
      return NextResponse.json({ error: "Parolee not found" }, { status: 404 });
    }

    const [officerAssignment, deviceAssignment, latestTelemetry, openAlerts] =
      await Promise.all([
        prisma.officerParoleeAssignment.findFirst({
          where: {
            paroleeId: id,
            status: "ACTIVE",
          },
          include: { officer: true },
          orderBy: { startAt: "desc" },
        }),
        prisma.deviceAssignment.findFirst({
          where: {
            paroleeId: id,
            status: "ACTIVE",
          },
          include: { device: true },
          orderBy: { startAt: "desc" },
        }),
        prisma.telemetry.findFirst({
          where: { paroleeId: id },
          orderBy: { createdAt: "desc" },
        }),
        prisma.alert.findMany({
          where: {
            paroleeId: id,
            status: "OPEN",
          },
          orderBy: { createdAt: "desc" },
        }),
      ]);

    return NextResponse.json({
      ...parolee,
      currentOfficerId: officerAssignment?.officerId || "",
      currentOfficerLabel: officerAssignment?.officer
        ? `${officerAssignment.officer.badgeId} - ${officerAssignment.officer.fullName}`
        : "—",
      currentDeviceId: deviceAssignment?.deviceId || "",
      currentDeviceLabel: deviceAssignment?.device
        ? `${deviceAssignment.device.deviceCode} - ${deviceAssignment.device.serialNumber}`
        : "—",
      latestTelemetry,
      openAlerts,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch parolee detail" }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const { paroleeNo, fullName, status } = body;

    const existing = await prisma.parolee.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Parolee not found" }, { status: 404 });
    }

    const parolee = await prisma.parolee.update({
      where: { id },
      data: {
        paroleeNo,
        fullName,
        status,
      },
    });

    return NextResponse.json({ ok: true, data: parolee });
  } catch (error) {
    console.error(error);

    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Duplicate paroleeNo" },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: "Failed to update parolee" }, { status: 500 });
  }
}