export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function jsonNoCache(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Cache-Control", "no-store, max-age=0");

  return NextResponse.json(data, {
    ...init,
    headers,
  });
}

export async function GET() {
  try {
    const geofences = await prisma.geofence.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        parolee: {
          select: {
            paroleeNo: true,
            fullName: true,
          },
        },
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

    return jsonNoCache(items, { status: 200 });
  } catch (error) {
    console.error("GET /api/geofences error:", error);

    // Para hindi na mag-alert ng "Failed to fetch geofences"
    return jsonNoCache([], { status: 200 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();

    const name = String(body.name || "").trim();
    const paroleeId = String(body.paroleeId || "").trim();
    const type = String(body.type || "").trim();

    const radiusMeters = Number(body.radiusMeters);
    const centerLat = Number(body.centerLat);
    const centerLng = Number(body.centerLng);

    if (!name) {
      return jsonNoCache({ error: "Geofence name is required" }, { status: 400 });
    }

    if (!paroleeId) {
      return jsonNoCache({ error: "Parolee is required" }, { status: 400 });
    }

    if (!["INCLUSION", "EXCLUSION"].includes(type)) {
      return jsonNoCache({ error: "Invalid geofence type" }, { status: 400 });
    }

    if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) {
      return jsonNoCache(
        { error: "Radius must be greater than 0" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(centerLat) || centerLat < -90 || centerLat > 90) {
      return jsonNoCache(
        { error: "Latitude must be between -90 and 90" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(centerLng) || centerLng < -180 || centerLng > 180) {
      return jsonNoCache(
        { error: "Longitude must be between -180 and 180" },
        { status: 400 }
      );
    }

    const parolee = await prisma.parolee.findUnique({
      where: { id: paroleeId },
      select: { id: true },
    });

    if (!parolee) {
      return jsonNoCache({ error: "Parolee not found" }, { status: 404 });
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

    return jsonNoCache(
      {
        ok: true,
        data: geofence,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/geofences error:", error);

    return jsonNoCache(
      { error: "Failed to create geofence" },
      { status: 500 }
    );
  }
}