export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function jsonNoCache(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Cache-Control", "no-store, max-age=0");
  return NextResponse.json(data, { ...init, headers });
}

async function getRouteIds(req, params) {
  const resolvedParams = await params;
  const officerId = String(resolvedParams?.id || "").trim();
  const alertId = String(resolvedParams?.alertId || "").trim();

  if (officerId && alertId) {
    return { officerId, alertId };
  }

  try {
    const segments = new URL(req.url).pathname.split("/").filter(Boolean);
    return {
      officerId: String(segments[2] || "").trim(),
      alertId: String(segments[4] || "").trim(),
    };
  } catch {
    return { officerId: "", alertId: "" };
  }
}

async function findAssignedAlert(officerId, alertId) {
  const alert = await prisma.alert.findUnique({
    where: { id: alertId },
    select: {
      id: true,
      paroleeId: true,
      status: true,
    },
  });

  if (!alert) return null;

  const assignment = await prisma.officerParoleeAssignment.findFirst({
    where: {
      officerId,
      paroleeId: alert.paroleeId,
      status: "ACTIVE",
    },
    select: { id: true },
  });

  return assignment ? alert : null;
}

export async function POST(req, { params }) {
  try {
    const { officerId, alertId } = await getRouteIds(req, params);

    if (!officerId) {
      return jsonNoCache({ error: "Officer ID is required" }, { status: 400 });
    }

    if (!alertId) {
      return jsonNoCache({ error: "Alert ID is required" }, { status: 400 });
    }

    const alert = await findAssignedAlert(officerId, alertId);

    if (!alert) {
      return jsonNoCache({ error: "Alert not found for this officer" }, { status: 404 });
    }

    if (alert.status === "RESOLVED") {
      return jsonNoCache({ ok: true, message: "Alert already resolved" }, { status: 200 });
    }

    const updated = await prisma.alert.update({
      where: { id: alertId },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
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
    console.error("POST /api/officers/[id]/alerts/[alertId]/resolve error:", error);

    return jsonNoCache(
      { error: "Failed to resolve alert" },
      { status: 500 }
    );
  }
}
