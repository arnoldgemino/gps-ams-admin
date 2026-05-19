export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runOfflineAlertCheck } from "@/lib/offline-alerts";

function jsonNoCache(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Cache-Control", "no-store, max-age=0");
  return NextResponse.json(data, { ...init, headers });
}

export async function GET() {
  try {
    await runOfflineAlertCheck();

    const alerts = await prisma.alert.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        type: true,
        details: true,
        createdAt: true,
        paroleeId: true,
        parolee: {
          select: {
            fullName: true,
          },
        },
        officer: {
          select: {
            fullName: true,
          },
        },
      },
    });

    const items = alerts.map((a) => ({
      id: a.id,
      parolee: a.parolee?.fullName || a.paroleeId,
      type: a.type,
      details: a.details || "—",
      time: new Date(a.createdAt).toLocaleString(),
      officer: a.officer?.fullName || "—",
    }));

    return jsonNoCache({ items }, { status: 200 });
  } catch (error) {
    console.error("GET /api/admin/recent-alerts error:", error);

    return jsonNoCache(
      { error: "Failed to load alerts" },
      { status: 500 }
    );
  }
}
