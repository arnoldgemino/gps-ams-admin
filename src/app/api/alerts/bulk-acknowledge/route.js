export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function jsonNoCache(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Cache-Control", "no-store, max-age=0");
  return NextResponse.json(data, { ...init, headers });
}

export async function POST(req) {
  try {
    const body = await req.json();

    const ids = Array.isArray(body.ids)
      ? body.ids.map((id) => String(id).trim()).filter(Boolean)
      : [];

    if (!ids.length) {
      return jsonNoCache(
        { error: "No alert ids provided" },
        { status: 400 }
      );
    }

    const result = await prisma.alert.updateMany({
      where: {
        id: { in: ids },
        status: "OPEN",
      },
      data: {
        status: "ACKNOWLEDGED",
      },
    });

    return jsonNoCache(
      {
        ok: true,
        updatedCount: result.count,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/alerts/bulk-acknowledge error:", error);

    return jsonNoCache(
      { error: "Failed to acknowledge alerts" },
      { status: 500 }
    );
  }
}