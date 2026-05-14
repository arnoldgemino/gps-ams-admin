export const runtime = "nodejs";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req) {
  try {
    const body = await req.json();

    const fullName = (body.fullName || "").trim();
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    const badgeId = (body.badgeId || "").trim();

    if (!fullName || !email || !password || !badgeId) {
      return NextResponse.json({ message: "Missing fields" }, { status: 400 });
    }

    const exists = await prisma.officer.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ message: "Email already exists" }, { status: 409 });
    }

    // if badgeId is unique in your schema, check it too:
    const badgeExists = await prisma.officer.findFirst({ where: { badgeId } });
    if (badgeExists) {
      return NextResponse.json({ message: "Badge ID already exists" }, { status: 409 });
    }

    const hash = await bcrypt.hash(password, 10);

    const officer = await prisma.officer.create({
      data: {
        fullName,
        email,
        password: hash,
        badgeId, // ✅ required
        status: "ACTIVE",
      },
      select: { id: true, fullName: true, email: true, badgeId: true, status: true, createdAt: true },
    });

    return NextResponse.json({ message: "Officer created", officer }, { status: 201 });
  } catch (e) {
    console.error("CREATE OFFICER ERROR:", e);
    return NextResponse.json({ message: "Server error", details: String(e?.message || e) }, { status: 500 });
  }
}
