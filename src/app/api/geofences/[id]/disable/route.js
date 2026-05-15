export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function jsonNoCache(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Cache-Control", "no-store, max-age=0");
  return NextResponse.json(data, { ...init, headers });
}

export async function POST(req, { params }) {
  try {
    const { id } = params;

    if (!id) {
      return jsonNoCache({ error: "Geofence ID is required" }, { status: 400 });
    }

    const existing = await prisma.geofence.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
      },
    });

    if (!existing) {
      return jsonNoCache({ error: "Geofence not found" }, { status: 404 });
    }

    const geofence = await prisma.geofence.update({
      where: { id },
      data: {
        status: "DISABLED",
      },
      select: {
        id: true,
        name: true,
        paroleeId: true,
        type: true,
        radiusMeters: true,
        centerLat: true,
        centerLng: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return jsonNoCache({ ok: true, data: geofence }, { status: 200 });
  } catch (error) {
    console.error("POST /api/geofences/[id]/disable error:", error);

    return jsonNoCache(
      { error: "Failed to disable geofence" },
      { status: 500 }
    );
  }
}