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
    const { id: paroleeId } = params;
    const body = await req.json();

    const officerId = String(body.officerId || "").trim();
    const deviceId = String(body.deviceId || "").trim();

    if (!paroleeId) {
      return jsonNoCache({ error: "Parolee ID is required" }, { status: 400 });
    }

    const parolee = await prisma.parolee.findUnique({
      where: { id: paroleeId },
      select: { id: true },
    });

    if (!parolee) {
      return jsonNoCache({ error: "Parolee not found" }, { status: 404 });
    }

    if (officerId) {
      const officer = await prisma.officer.findUnique({
        where: { id: officerId },
        select: { id: true },
      });

      if (!officer) {
        return jsonNoCache({ error: "Officer not found" }, { status: 404 });
      }
    }

    if (deviceId) {
      const device = await prisma.device.findUnique({
        where: { id: deviceId },
        select: { id: true },
      });

      if (!device) {
        return jsonNoCache({ error: "Device not found" }, { status: 404 });
      }
    }

    await prisma.$transaction(async (tx) => {
      // end current active officer assignment for this parolee
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

      // create new officer assignment if provided
      if (officerId) {
        await tx.officerParoleeAssignment.create({
          data: {
            officerId,
            paroleeId,
            status: "ACTIVE",
            assignedByAdminId: null,
          },
        });
      }

      // end current active device assignment for this parolee
      await tx.deviceAssignment.updateMany({
        where: {
          paroleeId,
          status: "ACTIVE",
        },
        data: {
          status: "ENDED",
          endAt: new Date(),
        },
      });

      // if device is being assigned, also unassign it from any other parolee first
      if (deviceId) {
        await tx.deviceAssignment.updateMany({
          where: {
            deviceId,
            status: "ACTIVE",
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
      }
    });

    return jsonNoCache(
      {
        ok: true,
        message: "Assignments updated successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/parolees/[id]/assign error:", error);

    return jsonNoCache(
      { error: "Failed to update assignments" },
      { status: 500 }
    );
  }
}