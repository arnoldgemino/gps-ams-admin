export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createPasswordResetToken,
  getPasswordResetExpiry,
  hashPasswordResetToken,
} from "@/lib/password-reset";

export async function POST(req) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const officer = await prisma.officer.findUnique({
      where: { email: normalizedEmail },
    });

    let resetUrl = "";

    if (officer) {
      const token = createPasswordResetToken();

      await prisma.passwordResetToken.create({
        data: {
          tokenHash: hashPasswordResetToken(token),
          officerId: officer.id,
          expiresAt: getPasswordResetExpiry(),
        },
      });

      resetUrl = `/officer/forgot-password?token=${encodeURIComponent(token)}`;
      console.log(`Password reset link for officer ${normalizedEmail}: ${resetUrl}`);
    }

    return NextResponse.json({
      ok: true,
      message:
        "If that email is registered, a password reset link has been sent.",
      resetUrl,
    });
  } catch (error) {
    console.error("Officer forgot password error:", error);
    return NextResponse.json(
      { error: "Unable to process forgot password request" },
      { status: 500 }
    );
  }
}
