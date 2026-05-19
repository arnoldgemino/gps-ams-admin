export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function jsonNoCache(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Cache-Control", "no-store, max-age=0");
  return NextResponse.json(data, { ...init, headers });
}

async function getRouteId(req, params) {
  const resolvedParams = await params;
  const fromParams = String(resolvedParams?.id || "").trim();
  if (fromParams) return fromParams;

  try {
    const segments = new URL(req.url).pathname.split("/").filter(Boolean);
    return String(segments[2] || "").trim();
  } catch {
    return "";
  }
}

export async function POST(req, { params }) {
  try {
    const id = await getRouteId(req, params);

    if (!id) {
      return jsonNoCache({ error: "Alert ID is required" }, { status: 400 });
    }

    const existing = await prisma.alert.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
      },
    });

    if (!existing) {
      return jsonNoCache({ error: "Alert not found" }, { status: 404 });
    }

    if (existing.status === "ACKNOWLEDGED") {
      return jsonNoCache(
        {
          ok: true,
          message: "Alert already acknowledged",
        },
        { status: 200 }
      );
    }

    if (existing.status === "RESOLVED") {
      return jsonNoCache(
        {
          ok: true,
          message: "Alert already resolved",
        },
        { status: 200 }
      );
    }

    const updated = await prisma.alert.update({
      where: { id },
      data: {
        status: "ACKNOWLEDGED",
      },
      select: {
        id: true,
        paroleeId: true,
        officerId: true,
        type: true,
        details: true,
        status: true,
        createdAt: true,
        resolvedAt: true,
      },
    });

    return jsonNoCache({ ok: true, data: updated }, { status: 200 });
  } catch (error) {
    console.error("POST /api/alerts/[id]/acknowledge error:", error);

    return jsonNoCache(
      { error: "Failed to acknowledge alert" },
      { status: 500 }
    );
  }
}
