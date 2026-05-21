export const runtime = "nodejs";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { hashPasswordResetToken } from "@/lib/password-reset";

export async function POST(req) {
  try {
    const { token, password, accountType = "admin" } = await req.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      );
    }

    if (String(password).length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const tokenHash = hashPasswordResetToken(token);
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (
      !resetToken ||
      resetToken.usedAt ||
      resetToken.expiresAt <= new Date()
    ) {
      return NextResponse.json(
        { error: "Reset link is invalid or expired" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const isOfficerReset = accountType === "officer";

    if (isOfficerReset) {
      if (!resetToken.officerId) {
        return NextResponse.json(
          { error: "Reset link is not valid for officer accounts" },
          { status: 400 }
        );
      }

      await prisma.$transaction([
        prisma.officer.update({
          where: { id: resetToken.officerId },
          data: { password: hashedPassword },
        }),
        prisma.passwordResetToken.update({
          where: { id: resetToken.id },
          data: { usedAt: new Date() },
        }),
        prisma.passwordResetToken.updateMany({
          where: {
            officerId: resetToken.officerId,
            usedAt: null,
            id: { not: resetToken.id },
          },
          data: { usedAt: new Date() },
        }),
      ]);
    } else {
      if (!resetToken.adminId) {
        return NextResponse.json(
          { error: "Reset link is not valid for admin accounts" },
          { status: 400 }
        );
      }

      await prisma.$transaction([
        prisma.admin.update({
          where: { id: resetToken.adminId },
          data: { password: hashedPassword },
        }),
        prisma.passwordResetToken.update({
          where: { id: resetToken.id },
          data: { usedAt: new Date() },
        }),
        prisma.passwordResetToken.updateMany({
          where: {
            adminId: resetToken.adminId,
            usedAt: null,
            id: { not: resetToken.id },
          },
          data: { usedAt: new Date() },
        }),
      ]);
    }

    return NextResponse.json({
      ok: true,
      message: "Password has been reset. You can now sign in.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Unable to reset password" },
      { status: 500 }
    );
  }
}
