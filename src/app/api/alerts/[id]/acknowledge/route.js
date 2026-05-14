import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req, { params }) {
  try {
    const { id } = await params;

    const existing = await prisma.alert.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    if (existing.status === "ACKNOWLEDGED") {
      return NextResponse.json({
        ok: true,
        message: "Alert already acknowledged",
      });
    }

    if (existing.status === "RESOLVED") {
      return NextResponse.json({
        ok: true,
        message: "Alert already resolved",
      });
    }

    const updated = await prisma.alert.update({
      where: { id },
      data: {
        status: "ACKNOWLEDGED",
      },
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to acknowledge alert" }, { status: 500 });
  }
}