import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const officers = await prisma.officer.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const officerIds = officers.map((o) => o.id);

    const assignments = await prisma.officerParoleeAssignment.findMany({
      where: {
        status: "ACTIVE",
        officerId: { in: officerIds },
      },
    });

    const openAlerts = await prisma.alert.findMany({
      where: { status: "OPEN" },
    });

    const assignedMap = new Map();
    const paroleeSetMap = new Map();

    for (const officer of officers) {
      assignedMap.set(officer.id, 0);
      paroleeSetMap.set(officer.id, new Set());
    }

    for (const assignment of assignments) {
      assignedMap.set(
        assignment.officerId,
        (assignedMap.get(assignment.officerId) || 0) + 1
      );
      paroleeSetMap.get(assignment.officerId)?.add(assignment.paroleeId);
    }

    const items = officers.map((o) => {
      const relatedParolees = paroleeSetMap.get(o.id) || new Set();

      let alertCount = 0;
      for (const alert of openAlerts) {
        if (alert.officerId === o.id || relatedParolees.has(alert.paroleeId)) {
          alertCount++;
        }
      }

      return {
        id: o.id,
        officer: `${o.badgeId} - ${o.fullName}`,
        assigned: assignedMap.get(o.id) || 0,
        active: assignedMap.get(o.id) || 0,
        alerts: alertCount,
      };
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load officer summary" },
      { status: 500 }
    );
  }
}