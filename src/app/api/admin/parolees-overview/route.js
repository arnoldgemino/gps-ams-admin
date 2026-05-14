import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const parolees = await prisma.parolee.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const paroleeIds = parolees.map((p) => p.id);

    const [officerAssignments, deviceAssignments, telemetryRows, openAlerts] =
      await Promise.all([
        prisma.officerParoleeAssignment.findMany({
          where: {
            status: "ACTIVE",
            paroleeId: { in: paroleeIds },
          },
          include: { officer: true },
          orderBy: { startAt: "desc" },
        }),
        prisma.deviceAssignment.findMany({
          where: {
            status: "ACTIVE",
            paroleeId: { in: paroleeIds },
          },
          include: { device: true },
          orderBy: { startAt: "desc" },
        }),
        prisma.telemetry.findMany({
          where: {
            paroleeId: { in: paroleeIds },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.alert.findMany({
          where: {
            paroleeId: { in: paroleeIds },
            status: "OPEN",
          },
          orderBy: { createdAt: "desc" },
        }),
      ]);

    const officerMap = new Map();
    for (const item of officerAssignments) {
      if (!officerMap.has(item.paroleeId)) {
        officerMap.set(item.paroleeId, item.officer);
      }
    }

    const deviceMap = new Map();
    for (const item of deviceAssignments) {
      if (!deviceMap.has(item.paroleeId)) {
        deviceMap.set(item.paroleeId, item.device);
      }
    }

    const telemetryMap = new Map();
    for (const item of telemetryRows) {
      if (!telemetryMap.has(item.paroleeId)) {
        telemetryMap.set(item.paroleeId, item);
      }
    }

    const alertMap = new Map();
    for (const item of openAlerts) {
      if (!alertMap.has(item.paroleeId)) {
        alertMap.set(item.paroleeId, item);
      }
    }

    const items = parolees.map((p) => {
      const officer = officerMap.get(p.id);
      const device = deviceMap.get(p.id);
      const telemetry = telemetryMap.get(p.id);
      const alert = alertMap.get(p.id);

      return {
        id: p.id,
        paroleeNo: p.paroleeNo,
        name: p.fullName,
        officer: officer ? `${officer.badgeId} - ${officer.fullName}` : "—",
        device: device ? device.deviceCode : "—",
        ams: device ? "ACTIVE" : "INACTIVE",
        status: alert ? "ALERT" : telemetry ? "COMPLIANT" : "WARNING",
        lastSeen: telemetry
          ? new Date(telemetry.createdAt).toLocaleString()
          : "—",
      };
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load parolees overview" },
      { status: 500 }
    );
  }
}