import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req) {
  try {
    const body = await req.json();
    const ids = Array.isArray(body.ids) ? body.ids : [];

    if (!ids.length) {
      return NextResponse.json(
        { error: "No alert ids provided" },
        { status: 400 }
      );
    }

    await prisma.alert.updateMany({
      where: {
        id: { in: ids },
        status: "OPEN",
      },
      data: {
        status: "ACKNOWLEDGED",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to acknowledge alerts" },
      { status: 500 }
    );
  }
}