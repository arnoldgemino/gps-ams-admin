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

    await prisma.$transaction(async (tx) => {
      if (officerId) {
        const officer = await tx.officer.findUnique({
          where: { id: officerId },
          select: { id: true },
        });

        if (!officer) {
          throw new Error("Officer not found");
        }

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
      } else {
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
      }

      const activeDeviceAssignments = await tx.deviceAssignment.findMany({
        where: {
          paroleeId,
          status: "ACTIVE",
        },
        select: {
          deviceId: true,
        },
      });

      const activeDeviceIds = activeDeviceAssignments.map((assignment) => assignment.deviceId);

      if (activeDeviceIds.length) {
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

        await tx.device.updateMany({
          where: {
            id: { in: activeDeviceIds },
          },
          data: {
            status: "IN_STOCK",
          },
        });
      }

      if (deviceId) {
        const device = await tx.device.findUnique({
          where: { id: deviceId },
          select: { id: true },
        });

        if (!device) {
          throw new Error("Device not found");
        }

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

    if (String(error?.message).includes("Officer not found")) {
      return jsonNoCache({ error: "Officer not found" }, { status: 404 });
    }

    if (String(error?.message).includes("Device not found")) {
      return jsonNoCache({ error: "Device not found" }, { status: 404 });
    }

    return jsonNoCache(
      { error: "Failed to assign officer or device" },
      { status: 500 }
    );
  }
}
