import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [totalParolees, activeAMSDevices, probationOfficers, unresolvedAlerts] =
      await Promise.all([
        prisma.parolee.count(),
        prisma.deviceAssignment.count({
          where: { status: "ACTIVE" },
        }),
        prisma.officer.count(),
        prisma.alert.count({
          where: { status: "OPEN" },
        }),
      ]);

    return NextResponse.json({
      totalParolees,
      activeAMSDevices,
      probationOfficers,
      unresolvedAlerts,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load dashboard summary" },
      { status: 500 }
    );
  }
}