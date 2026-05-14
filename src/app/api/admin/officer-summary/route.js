export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function jsonNoCache(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Cache-Control", "no-store, max-age=0");
  return NextResponse.json(data, { ...init, headers });
}

export async function GET() {
  try {
    const officers = await prisma.officer.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    if (!officers.length) {
      return jsonNoCache({ items: [] }, { status: 200 });
    }

    const officerIds = officers.map((o) => o.id);

    const assignments = await prisma.officerParoleeAssignment.findMany({
      where: {
        status: "ACTIVE",
        officerId: { in: officerIds },
      },
      select: {
        officerId: true,
        paroleeId: true,
      },
    });

    const openAlerts = await prisma.alert.findMany({
      where: {
        status: "OPEN",
      },
      select: {
        officerId: true,
        paroleeId: true,
      },
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

      const set = paroleeSetMap.get(assignment.officerId);
      if (set) {
        set.add(assignment.paroleeId);
      }
    }

    const items = officers.map((o) => {
      const relatedParolees = paroleeSetMap.get(o.id) || new Set();

      let alertCount = 0;
      for (const alert of openAlerts) {
        if (alert.officerId === o.id || relatedParolees.has(alert.paroleeId)) {
          alertCount++;
        }
      }

      const assigned = assignedMap.get(o.id) || 0;

      return {
        id: o.id,
        officer: `${o.badgeId} - ${o.fullName}`,
        assigned,
        active: assigned,
        alerts: alertCount,
      };
    });

    return jsonNoCache({ items }, { status: 200 });
  } catch (error) {
    console.error("GET /api/admin/officer-summary error:", error);

    return jsonNoCache(
      { error: "Failed to load officer summary" },
      { status: 500 }
    );
  }
}