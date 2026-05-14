import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    const officer = await prisma.officer.findUnique({
      where: { id },
    });

    if (!officer) {
      return NextResponse.json({ error: "Officer not found" }, { status: 404 });
    }

    const assignments = await prisma.officerParoleeAssignment.findMany({
      where: {
        officerId: id,
        status: "ACTIVE",
      },
      orderBy: { startAt: "desc" },
    });

    const paroleeIds = assignments.map((a) => a.paroleeId);

    const parolees = paroleeIds.length
      ? await prisma.parolee.findMany({
          where: {
            id: { in: paroleeIds },
          },
        })
      : [];

    const paroleeMap = new Map(parolees.map((p) => [p.id, p]));

    const assignedParolees = assignments.map((a) => ({
      id: a.paroleeId,
      paroleeNo: paroleeMap.get(a.paroleeId)?.paroleeNo || "—",
      fullName: paroleeMap.get(a.paroleeId)?.fullName || "—",
      startAt: a.startAt,
    }));

    return NextResponse.json({
      ...officer,
      assignedParolees,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch officer detail" }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const { badgeId, fullName, email, password, phone, status } = body;

    const existing = await prisma.officer.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Officer not found" }, { status: 404 });
    }

    const data = {
      badgeId,
      fullName,
      email,
      phone,
      status,
    };

    if (password && password.trim()) {
      data.password = password;
    }

    const officer = await prisma.officer.update({
      where: { id },
      data,
    });

    return NextResponse.json({ ok: true, data: officer });
  } catch (error) {
    console.error(error);

    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Duplicate badgeId or email" },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: "Failed to update officer" }, { status: 500 });
  }
}