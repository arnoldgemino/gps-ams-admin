import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req, { params }) {
  try {
    const { id: officerId } = await params;
    const body = await req.json();
    const { paroleeId } = body;

    if (!paroleeId) {
      return NextResponse.json(
        { error: "paroleeId is required" },
        { status: 400 }
      );
    }

    const [officer, parolee] = await Promise.all([
      prisma.officer.findUnique({ where: { id: officerId } }),
      prisma.parolee.findUnique({ where: { id: paroleeId } }),
    ]);

    if (!officer) {
      return NextResponse.json({ error: "Officer not found" }, { status: 404 });
    }

    if (!parolee) {
      return NextResponse.json({ error: "Parolee not found" }, { status: 404 });
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

    return NextResponse.json({
      ok: true,
      message: "Parolee assigned successfully",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to assign parolee" }, { status: 500 });
  }
}