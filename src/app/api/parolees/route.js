import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [parolees, officerAssignments, deviceAssignments, telemetryRows, alerts] =
      await Promise.all([
        prisma.parolee.findMany({
          orderBy: { createdAt: "desc" },
        }),
        prisma.officerParoleeAssignment.findMany({
          where: { status: "ACTIVE" },
          include: { officer: true },
          orderBy: { startAt: "desc" },
        }),
        prisma.deviceAssignment.findMany({
          where: { status: "ACTIVE" },
          include: { device: true },
          orderBy: { startAt: "desc" },
        }),
        prisma.telemetry.findMany({
          orderBy: { createdAt: "desc" },
          take: 500,
        }),
        prisma.alert.findMany({
          where: { status: "OPEN" },
          orderBy: { createdAt: "desc" },
        }),
      ]);

    const officerMap = new Map();
    for (const a of officerAssignments) {
      if (!officerMap.has(a.paroleeId)) officerMap.set(a.paroleeId, a);
    }

    const deviceMap = new Map();
    for (const a of deviceAssignments) {
      if (!deviceMap.has(a.paroleeId)) deviceMap.set(a.paroleeId, a);
    }

    const telemetryMap = new Map();
    for (const t of telemetryRows) {
      if (!telemetryMap.has(t.paroleeId)) telemetryMap.set(t.paroleeId, t);
    }

    const alertMap = new Map();
    for (const a of alerts) {
      if (!alertMap.has(a.paroleeId)) alertMap.set(a.paroleeId, a);
    }

    const items = parolees.map((p) => {
      const officerAssignment = officerMap.get(p.id);
      const deviceAssignment = deviceMap.get(p.id);
      const latestTelemetry = telemetryMap.get(p.id);
      const openAlert = alertMap.get(p.id);

      return {
        id: p.id,
        paroleeNo: p.paroleeNo,
        fullName: p.fullName,
        officerId: officerAssignment?.officerId || "",
        officer: officerAssignment?.officer
          ? `${officerAssignment.officer.badgeId} - ${officerAssignment.officer.fullName}`
          : "—",
        deviceId: deviceAssignment?.deviceId || "",
        device: deviceAssignment?.device?.deviceCode || "—",
        ams: deviceAssignment ? "ACTIVE" : "INACTIVE",
        status: openAlert ? "ALERT" : latestTelemetry ? "COMPLIANT" : "WARNING",
        lastSeen: latestTelemetry
          ? new Date(latestTelemetry.createdAt).toLocaleString()
          : "—",
        dbStatus: p.status,
      };
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch parolees" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { paroleeNo, fullName, status = "ACTIVE" } = body;

    if (!paroleeNo || !fullName) {
      return NextResponse.json(
        { error: "paroleeNo and fullName are required" },
        { status: 400 }
      );
    }

    const parolee = await prisma.parolee.create({
      data: {
        paroleeNo,
        fullName,
        status,
      },
    });

    return NextResponse.json({ ok: true, data: parolee }, { status: 201 });
  } catch (error) {
    console.error(error);

    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Duplicate paroleeNo" },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: "Failed to create parolee" }, { status: 500 });
  }
}