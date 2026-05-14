import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req) {
  try {
    const body = await req.json();
    const ids = Array.isArray(body.ids) ? body.ids : [];

    if (!ids.length) {
      return NextResponse.json({ error: "No geofence ids provided" }, { status: 400 });
    }

    await prisma.geofence.updateMany({
      where: {
        id: { in: ids },
        status: "ACTIVE",
      },
      data: {
        status: "DISABLED",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to bulk disable geofences" }, { status: 500 });
  }
}