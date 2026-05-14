import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req, { params }) {
  try {
    const { id: deviceId } = await params;
    const body = await req.json();
    const { paroleeId } = body;

    if (!paroleeId) {
      return NextResponse.json(
        { error: "paroleeId is required" },
        { status: 400 }
      );
    }

    const [device, parolee] = await Promise.all([
      prisma.device.findUnique({ where: { id: deviceId } }),
      prisma.parolee.findUnique({ where: { id: paroleeId } }),
    ]);

    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    if (!parolee) {
      return NextResponse.json({ error: "Parolee not found" }, { status: 404 });
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

    return NextResponse.json({
      ok: true,
      message: "Device assigned successfully",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to assign device" }, { status: 500 });
  }
}