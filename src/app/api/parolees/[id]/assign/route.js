import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req, { params }) {
  try {
    const { id: paroleeId } = await params;
    const body = await req.json();

    const { officerId = "", deviceId = "" } = body;

    const parolee = await prisma.parolee.findUnique({
      where: { id: paroleeId },
    });

    if (!parolee) {
      return NextResponse.json({ error: "Parolee not found" }, { status: 404 });
    }

    if (officerId) {
      const officer = await prisma.officer.findUnique({ where: { id: officerId } });
      if (!officer) {
        return NextResponse.json({ error: "Officer not found" }, { status: 404 });
      }
    }

    if (deviceId) {
      const device = await prisma.device.findUnique({ where: { id: deviceId } });
      if (!device) {
        return NextResponse.json({ error: "Device not found" }, { status: 404 });
      }
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

    return NextResponse.json({
      ok: true,
      message: "Assignments updated successfully",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update assignments" }, { status: 500 });
  }
}