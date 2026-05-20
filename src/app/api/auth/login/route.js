import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../../lib/prisma.js";
import {
  ADMIN_SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  sessionMaxAge,
} from "@/lib/auth-cookies";

export async function POST(req) {
  try {
    const { email, password, stayLoggedIn } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ message: "Missing fields" }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const admin = await prisma.admin.findUnique({ where: { email: normalizedEmail } });

    if (!admin) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, admin.password);
    if (!ok) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }

    const res = NextResponse.json({
      message: "OK",
      admin: {
        id: admin.id,
        email: admin.email,
        fullName: admin.fullName,
      },
    });
    res.cookies.set(ADMIN_SESSION_COOKIE, admin.id, {
      ...SESSION_COOKIE_OPTIONS,
      maxAge: sessionMaxAge(Boolean(stayLoggedIn)),
    });
    res.cookies.delete("admin_session");

    return res;
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
