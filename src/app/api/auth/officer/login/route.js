export const runtime = "nodejs";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  OFFICER_SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  sessionMaxAge,
} from "@/lib/auth-cookies";

export async function POST(req) {
  try {
    const { email, password, stayLoggedIn } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ message: "Missing fields" }, { status: 400 });
    }

    const officer = await prisma.officer.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!officer) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }

    if (officer.status !== "ACTIVE") {
      return NextResponse.json(
        { message: "Officer account is not active" },
        { status: 403 }
      );
    }

    let ok = false;

    // If hashed password
    if (typeof officer.password === "string" && officer.password.startsWith("$2")) {
      ok = await bcrypt.compare(password, officer.password);
    } else {
      // Plain text fallback
      ok = password === officer.password;
    }

    if (!ok) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }

    const res = NextResponse.json(
      {
        message: "Logged in",
        officer: {
          id: officer.id,
          fullName: officer.fullName,
          email: officer.email,
          status: officer.status,
          badgeId: officer.badgeId,
        },
      },
      { status: 200 }
    );

    res.cookies.set(OFFICER_SESSION_COOKIE, officer.id, {
      ...SESSION_COOKIE_OPTIONS,
      maxAge: sessionMaxAge(Boolean(stayLoggedIn)),
    });

    return res;
  } catch (e) {
    console.error("Officer login error:", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
