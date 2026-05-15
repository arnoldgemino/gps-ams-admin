export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function jsonNoCache(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Cache-Control", "no-store, max-age=0");
  return NextResponse.json(data, { ...init, headers });
}

export async function POST(req, { params }) {
  try {
    const { id: officerId } = params;
    const body = await req.json();
    const paroleeId = String(body.paroleeId || "").trim();

    if (!officerId) {
      return jsonNoCache({ error: "Officer ID is required" }, { status: 400 });
    }

    if (!paroleeId) {
      return jsonNoCache({ error: "paroleeId is required" }, { status: 400 });
    }

    const officer = await prisma.officer.findUnique({
      where: { id: officerId },
      select: { id: true },
    });

    if (!officer) {
      return jsonNoCache({ error: "Officer not found" }, { status: 404 });
    }

    const parolee = await prisma.parolee.findUnique({
      where: { id: paroleeId },
      select: { id: true },
    });

    if (!parolee) {
      return jsonNoCache({ error: "Parolee not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.officerParoleeAssignment.updateMany({
        where: {
          paroleeId,
          status: "ACTIVE",
        },
        data: {
          status: "ENDED",
          endAt: new Date(),
        },
      });

      await tx.officerParoleeAssignment.create({
        data: {
          officerId,
          paroleeId,
          status: "ACTIVE",
          assignedByAdminId: null,
        },
      });
    });

    return jsonNoCache(
      {
        ok: true,
        message: "Parolee assigned successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/officers/[id]/assign error:", error);

    return jsonNoCache(
      { error: "Failed to assign parolee" },
      { status: 500 }
    );
  }
}