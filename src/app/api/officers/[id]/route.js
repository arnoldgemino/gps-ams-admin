export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

function jsonNoCache(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Cache-Control", "no-store, max-age=0");
  return NextResponse.json(data, { ...init, headers });
}

function getRouteId(req, params, paramName = "id") {
  if (params?.[paramName]) return params[paramName];
  try {
    const url = new URL(req.url);
    const segments = url.pathname.split("/").filter(Boolean);
    return segments[segments.length - 1] || null;
  } catch {
    return null;
  }
}

export async function GET(req, { params }) {
  try {
    const id = getRouteId(req, params);

    if (!id) {
      return jsonNoCache({ error: "Officer ID is required" }, { status: 400 });
    }

    const officer = await prisma.officer.findUnique({
      where: { id },
      select: {
        id: true,
        badgeId: true,
        fullName: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!officer) {
      return jsonNoCache({ error: "Officer not found" }, { status: 404 });
    }

    const assignments = await prisma.officerParoleeAssignment.findMany({
      where: {
        officerId: id,
        status: "ACTIVE",
      },
      orderBy: { startAt: "desc" },
      select: {
        paroleeId: true,
        startAt: true,
      },
    });

    const paroleeIds = assignments.map((a) => a.paroleeId);

    const parolees = paroleeIds.length
      ? await prisma.parolee.findMany({
          where: {
            id: { in: paroleeIds },
          },
          select: {
            id: true,
            paroleeNo: true,
            fullName: true,
          },
        })
      : [];

    const paroleeMap = new Map(parolees.map((p) => [p.id, p]));

    const telemetryRows = paroleeIds.length
      ? await prisma.telemetry.findMany({
          where: {
            paroleeId: { in: paroleeIds },
          },
          orderBy: [
            { paroleeId: "asc" },
            { createdAt: "desc" },
          ],
          distinct: ["paroleeId"],
          select: {
            paroleeId: true,
            deviceId: true,
            lat: true,
            lng: true,
            batteryLevel: true,
            signalRssiDbm: true,
            tamperStatus: true,
            createdAt: true,
          },
        })
      : [];

    const telemetryMap = new Map(telemetryRows.map((t) => [t.paroleeId, t]));

    const assignedParolees = assignments.map((a) => {
      const parolee = paroleeMap.get(a.paroleeId);
      const telemetry = telemetryMap.get(a.paroleeId);

      return {
        id: a.paroleeId,
        paroleeNo: parolee?.paroleeNo || "—",
        fullName: parolee?.fullName || "—",
        startAt: a.startAt,
        deviceId: telemetry?.deviceId || "—",
        lat: telemetry?.lat ?? null,
        lng: telemetry?.lng ?? null,
        batteryLevel:
          telemetry?.batteryLevel !== null && telemetry?.batteryLevel !== undefined
            ? telemetry.batteryLevel
            : "—",
        signal:
          telemetry?.signalRssiDbm !== null && telemetry?.signalRssiDbm !== undefined
            ? `${telemetry.signalRssiDbm} dBm`
            : "—",
        tamper: telemetry?.tamperStatus || "OK",
        lastSeen: telemetry?.createdAt
          ? new Date(telemetry.createdAt).toISOString()
          : null,
        status: telemetry ? "COMPLIANT" : "OFFLINE",
      };
    });

    return jsonNoCache(
      {
        ...officer,
        assignedParolees,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/officers/[id] error:", error);
    return jsonNoCache(
      { error: "Failed to fetch officer detail" },
      { status: 500 }
    );
  }
}

export async function PUT(req, { params }) {
  try {
    const id = getRouteId(req, params);
    const body = await req.json();

    if (!id) {
      return jsonNoCache({ error: "Officer ID is required" }, { status: 400 });
    }

    const existing = await prisma.officer.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return jsonNoCache({ error: "Officer not found" }, { status: 404 });
    }

    const badgeId = String(body.badgeId || "").trim();
    const fullName = String(body.fullName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "").trim();
    const phone =
      body.phone === undefined || body.phone === null || body.phone === ""
        ? null
        : String(body.phone).trim();

    const allowedStatuses = ["ACTIVE", "ON_LEAVE", "INACTIVE"];
    const status = allowedStatuses.includes(body.status)
      ? body.status
      : "ACTIVE";

    if (!badgeId || !fullName || !email) {
      return jsonNoCache(
        { error: "badgeId, fullName, and email are required" },
        { status: 400 }
      );
    }

    const data = {
      badgeId,
      fullName,
      email,
      phone,
      status,
    };

    if (password) {
      if (password.length < 6) {
        return jsonNoCache(
          { error: "Password must be at least 6 characters" },
          { status: 400 }
        );
      }

      data.password = await bcrypt.hash(password, 10);
    }

    const officer = await prisma.officer.update({
      where: { id },
      data,
      select: {
        id: true,
        badgeId: true,
        fullName: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return jsonNoCache({ ok: true, data: officer }, { status: 200 });
  } catch (error) {
    console.error("PUT /api/officers/[id] error:", error);

    if (error?.code === "P2002") {
      return jsonNoCache(
        { error: "Duplicate badgeId or email" },
        { status: 409 }
      );
    }

    return jsonNoCache(
      { error: "Failed to update officer" },
      { status: 500 }
    );
  }
}