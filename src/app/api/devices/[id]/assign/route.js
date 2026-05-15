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
    const { id: deviceId } = params;
    const body = await req.json();
    const paroleeId = String(body.paroleeId || "").trim();

    if (!deviceId) {
      return jsonNoCache({ error: "Device ID is required" }, { status: 400 });
    }

    if (!paroleeId) {
      return jsonNoCache({ error: "paroleeId is required" }, { status: 400 });
    }

    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      select: { id: true, status: true },
    });

    if (!device) {
      return jsonNoCache({ error: "Device not found" }, { status: 404 });
    }

    const parolee = await prisma.parolee.findUnique({
      where: { id: paroleeId },
      select: { id: true },
    });

    if (!parolee) {
      return jsonNoCache({ error: "Parolee not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.deviceAssignment.updateMany({
        where: {
          OR: [
            { deviceId, status: "ACTIVE" },
            { paroleeId, status: "ACTIVE" },
          ],
        },
        data: {
          status: "ENDED",
          endAt: new Date(),
        },
      });

      await tx.deviceAssignment.create({
        data: {
          deviceId,
          paroleeId,
          status: "ACTIVE",
        },
      });

      await tx.device.update({
        where: { id: deviceId },
        data: { status: "IN_SERVICE" },
      });
    });

    return jsonNoCache(
      {
        ok: true,
        message: "Device assigned successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/devices/[id]/assign error:", error);

    return jsonNoCache(
      { error: "Failed to assign device" },
      { status: 500 }
    );
  }
}