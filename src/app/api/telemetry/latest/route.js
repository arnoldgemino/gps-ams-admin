import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const paroleeId = searchParams.get("paroleeId");

    if (!paroleeId) {
      return NextResponse.json(
        { error: "paroleeId is required" },
        { status: 400 }
      );
    }

    const latest = await prisma.telemetry.findFirst({
      where: {
        paroleeId,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        device: {
          select: {
            id: true,
            deviceCode: true,
            serialNumber: true,
            status: true,
          },
        },
        parolee: {
          select: {
            id: true,
            paroleeNo: true,
            fullName: true,
          },
        },
      },
    });

    return NextResponse.json(latest || null);
  } catch (error) {
    console.error("Latest telemetry GET error:", error);

    return NextResponse.json(
      { error: "Server error", message: error.message },
      { status: 500 }
    );
  }
}