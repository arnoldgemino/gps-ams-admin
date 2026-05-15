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

export async function GET() {
  try {
    const officers = await prisma.officer.findMany({
      orderBy: { createdAt: "desc" },
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

    if (!officers.length) {
      return jsonNoCache([], { status: 200 });
    }

    const officerIds = officers.map((o) => o.id);

    const assignments = await prisma.officerParoleeAssignment.findMany({
      where: {
        status: "ACTIVE",
        officerId: { in: officerIds },
      },
      select: {
        officerId: true,
      },
    });

    const countMap = new Map();

    for (const a of assignments) {
      countMap.set(a.officerId, (countMap.get(a.officerId) || 0) + 1);
    }

    const items = officers.map((o) => ({
      ...o,
      activeParolees: countMap.get(o.id) || 0,
    }));

    return jsonNoCache(items, { status: 200 });
  } catch (error) {
    console.error("GET /api/officers error:", error);

    return jsonNoCache(
      { error: "Failed to fetch officers" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const body = await req.json();

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

    if (!badgeId || !fullName || !email || !password) {
      return jsonNoCache(
        { error: "badgeId, fullName, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return jsonNoCache(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const existingEmail = await prisma.officer.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingEmail) {
      return jsonNoCache(
        { error: "Email already exists" },
        { status: 409 }
      );
    }

    const existingBadge = await prisma.officer.findUnique({
      where: { badgeId },
      select: { id: true },
    });

    if (existingBadge) {
      return jsonNoCache(
        { error: "Badge ID already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const officer = await prisma.officer.create({
      data: {
        badgeId,
        fullName,
        email,
        password: hashedPassword,
        phone,
        status,
      },
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

    return jsonNoCache(
      { ok: true, data: { ...officer, activeParolees: 0 } },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/officers error:", error);

    if (error?.code === "P2002") {
      return jsonNoCache(
        { error: "Duplicate badgeId or email" },
        { status: 409 }
      );
    }

    return jsonNoCache(
      { error: "Failed to create officer" },
      { status: 500 }
    );
  }
}