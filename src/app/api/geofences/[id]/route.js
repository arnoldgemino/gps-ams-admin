import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    const geofence = await prisma.geofence.findUnique({
      where: { id },
      include: {
        parolee: true,
      },
    });

    if (!geofence) {
      return NextResponse.json({ error: "Geofence not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: geofence.id,
      name: geofence.name,
      paroleeId: geofence.paroleeId,
      paroleeLabel: geofence.parolee
        ? `${geofence.parolee.paroleeNo} - ${geofence.parolee.fullName}`
        : geofence.paroleeId,
      type: geofence.type,
      radiusMeters: geofence.radiusMeters,
      centerLat: geofence.centerLat,
      centerLng: geofence.centerLng,
      status: geofence.status,
      createdAt: geofence.createdAt,
      updatedAt: geofence.updatedAt,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch geofence detail" }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const {
      name,
      paroleeId,
      type,
      radiusMeters,
      centerLat,
      centerLng,
      status,
    } = body;

    const existing = await prisma.geofence.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Geofence not found" }, { status: 404 });
    }

    const geofence = await prisma.geofence.update({
      where: { id },
      data: {
        name,
        paroleeId,
        type,
        radiusMeters,
        centerLat,
        centerLng,
        status,
      },
    });

    return NextResponse.json({ ok: true, data: geofence });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update geofence" }, { status: 500 });
  }
}