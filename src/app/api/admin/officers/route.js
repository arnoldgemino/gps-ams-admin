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

export async function POST(req) {
  try {
    const body = await req.json();

    const fullName = String(body.fullName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "").trim();
    const badgeId = String(body.badgeId || "").trim();
    const phone =
      body.phone === undefined || body.phone === null || body.phone === ""
        ? null
        : String(body.phone).trim();

    const allowedStatuses = ["ACTIVE", "ON_LEAVE", "INACTIVE"];
    const status = allowedStatuses.includes(body.status)
      ? body.status
      : "ACTIVE";

    if (!fullName || !email || !password || !badgeId) {
      return jsonNoCache(
        { ok: false, message: "fullName, email, password, and badgeId are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return jsonNoCache(
        { ok: false, message: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const existingEmail = await prisma.officer.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingEmail) {
      return jsonNoCache(
        { ok: false, message: "Email already exists" },
        { status: 409 }
      );
    }

    const existingBadge = await prisma.officer.findUnique({
      where: { badgeId },
      select: { id: true },
    });

    if (existingBadge) {
      return jsonNoCache(
        { ok: false, message: "Badge ID already exists" },
        { status: 409 }
      );
    }

    const hash = await bcrypt.hash(password, 10);

    const officer = await prisma.officer.create({
      data: {
        fullName,
        email,
        password: hash,
        badgeId,
        phone,
        status,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        badgeId: true,
        phone: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return jsonNoCache(
      { ok: true, message: "Officer created", officer },
      { status: 201 }
    );
  } catch (e) {
    console.error("POST /api/officers/create error:", e);

    if (e?.code === "P2002") {
      return jsonNoCache(
        { ok: false, message: "Duplicate badgeId or email" },
        { status: 409 }
      );
    }

    return jsonNoCache(
      {
        ok: false,
        message: "Server error",
        details: String(e?.message || e),
      },
      { status: 500 }
    );
  }
}