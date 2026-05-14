import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req, { params }) {
  try {
    const { id } = await params;

    const existing = await prisma.geofence.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Geofence not found" }, { status: 404 });
    }

    const geofence = await prisma.geofence.update({
      where: { id },
      data: {
        status: "DISABLED",
      },
    });

    return NextResponse.json({ ok: true, data: geofence });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to disable geofence" }, { status: 500 });
  }
}