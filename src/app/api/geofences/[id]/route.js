export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function jsonNoCache(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Cache-Control", "no-store, max-age=0");
  return NextResponse.json(data, { ...init, headers });
}

async function getRouteId(req, params) {
  const resolvedParams = await params;
  const fromParams = String(resolvedParams?.id || "").trim();
  if (fromParams) return fromParams;

  try {
    const segments = new URL(req.url).pathname.split("/").filter(Boolean);
    return String(segments[2] || "").trim();
  } catch {
    return "";
  }
}

export async function GET(req, { params }) {
  try {
    const id = await getRouteId(req, params);

    if (!id) {
      return jsonNoCache({ error: "Geofence ID is required" }, { status: 400 });
    }

    const geofence = await prisma.geofence.findUnique({
      where: { id },
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
        parolee: {
          select: {
            paroleeNo: true,
            fullName: true,
          },
        },
      },
    });

    if (!geofence) {
      return jsonNoCache({ error: "Geofence not found" }, { status: 404 });
    }

    return jsonNoCache(
      {
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
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/geofences/[id] error:", error);

    return jsonNoCache(
      { error: "Failed to fetch geofence detail" },
      { status: 500 }
    );
  }
}

export async function PUT(req, { params }) {
  try {
    const id = await getRouteId(req, params);
    const body = await req.json();

    if (!id) {
      return jsonNoCache({ error: "Geofence ID is required" }, { status: 400 });
    }

    const existing = await prisma.geofence.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return jsonNoCache({ error: "Geofence not found" }, { status: 404 });
    }

    const name = String(body.name || "").trim();
    const paroleeId = String(body.paroleeId || "").trim();
    const allowedTypes = ["INCLUSION", "EXCLUSION"];
    const type = allowedTypes.includes(body.type) ? body.type : "";
    const allowedStatuses = ["ACTIVE", "DISABLED"];
    const status = allowedStatuses.includes(body.status) ? body.status : "ACTIVE";

    const radiusMeters = Number(body.radiusMeters);
    const centerLat = Number(body.centerLat);
    const centerLng = Number(body.centerLng);

    if (
      !name ||
      !paroleeId ||
      !type ||
      !Number.isFinite(radiusMeters) ||
      !Number.isFinite(centerLat) ||
      !Number.isFinite(centerLng)
    ) {
      return jsonNoCache(
        {
          error:
            "name, paroleeId, type, radiusMeters, centerLat, centerLng are required",
        },
        { status: 400 }
      );
    }

    if (radiusMeters <= 0) {
      return jsonNoCache(
        { error: "radiusMeters must be greater than 0" },
        { status: 400 }
      );
    }

    const parolee = await prisma.parolee.findUnique({
      where: { id: paroleeId },
      select: { id: true },
    });

    if (!parolee) {
      return jsonNoCache(
        { error: "Parolee not found" },
        { status: 404 }
      );
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
    console.error("PUT /api/geofences/[id] error:", error);

    return jsonNoCache(
      { error: "Failed to update geofence" },
      { status: 500 }
    );
  }
}
