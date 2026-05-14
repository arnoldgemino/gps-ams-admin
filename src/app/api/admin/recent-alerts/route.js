import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const alerts = await prisma.alert.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        parolee: true,
        officer: true,
      },
    });

    const items = alerts.map((a) => ({
      id: a.id,
      parolee: a.parolee?.fullName || a.paroleeId,
      type: a.type,
      details: a.details || "—",
      time: new Date(a.createdAt).toLocaleString(),
      officer: a.officer?.fullName || "—",
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load alerts" },
      { status: 500 }
    );
  }
}