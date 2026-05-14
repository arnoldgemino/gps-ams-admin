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
    const totalParolees = await prisma.parolee.count();

    const activeAMSDevices = await prisma.deviceAssignment.count({
      where: { status: "ACTIVE" },
    });

    const probationOfficers = await prisma.officer.count();

    const unresolvedAlerts = await prisma.alert.count({
      where: { status: "OPEN" },
    });

    return jsonNoCache(
      {
        totalParolees,
        activeAMSDevices,
        probationOfficers,
        unresolvedAlerts,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/admin/dashboard-summary error:", error);

    return jsonNoCache(
      { error: "Failed to load dashboard summary" },
      { status: 500 }
    );
  }
}