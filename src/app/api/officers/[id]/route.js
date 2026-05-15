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

export async function GET(req, { params }) {
  try {
    const { id } = params;

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

    const assignedParolees = assignments.map((a) => ({
      id: a.paroleeId,
      paroleeNo: paroleeMap.get(a.paroleeId)?.paroleeNo || "—",
      fullName: paroleeMap.get(a.paroleeId)?.fullName || "—",
      startAt: a.startAt,
    }));

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
    const { id } = params;
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