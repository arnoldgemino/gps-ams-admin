import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const admin = await prisma.admin.findUnique({
      where: { email: normalizedEmail },
    });

    if (admin) {
      console.log(`Forgot password requested for admin: ${normalizedEmail}`);
    }

    return NextResponse.json({
      ok: true,
      message:
        "If that email is registered, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Unable to process forgot password request" },
      { status: 500 }
    );
  }
}
