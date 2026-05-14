import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const geofences = await prisma.geofence.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        parolee: true,
      },
    });

    const items = geofences.map((g) => ({
      id: g.id,
      name: g.name,
      type: g.type,
      radiusMeters: g.radiusMeters,
      paroleeId: g.paroleeId,
      paroleeLabel: g.parolee
        ? `${g.parolee.paroleeNo} - ${g.parolee.fullName}`
        : g.paroleeId,
      centerLat: g.centerLat,
      centerLng: g.centerLng,
      status: g.status,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    }));

    return NextResponse.json(items);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch geofences" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();

    const {
      name,
      paroleeId,
      type,
      radiusMeters,
      centerLat,
      centerLng,
    } = body;

    if (
      !name ||
      !paroleeId ||
      !type ||
      !Number.isFinite(radiusMeters) ||
      !Number.isFinite(centerLat) ||
      !Number.isFinite(centerLng)
    ) {
      return NextResponse.json(
        { error: "name, paroleeId, type, radiusMeters, centerLat, centerLng are required" },
        { status: 400 }
      );
    }

    const geofence = await prisma.geofence.create({
      data: {
        name,
        paroleeId,
        type,
        radiusMeters,
        centerLat,
        centerLng,
        status: "ACTIVE",
      },
    });

    return NextResponse.json({ ok: true, data: geofence }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create geofence" }, { status: 500 });
  }
}