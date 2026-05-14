import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [officers, assignments] = await Promise.all([
      prisma.officer.findMany({
        orderBy: { createdAt: "desc" },
      }),
      prisma.officerParoleeAssignment.findMany({
        where: { status: "ACTIVE" },
      }),
    ]);

    const countMap = new Map();

    for (const a of assignments) {
      countMap.set(a.officerId, (countMap.get(a.officerId) || 0) + 1);
    }

    const items = officers.map((o) => ({
      ...o,
      activeParolees: countMap.get(o.id) || 0,
    }));

    return NextResponse.json(items);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch officers" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();

    const {
      badgeId,
      fullName,
      email,
      password,
      phone = null,
      status = "ACTIVE",
    } = body;

    if (!badgeId || !fullName || !email || !password) {
      return NextResponse.json(
        { error: "badgeId, fullName, email, and password are required" },
        { status: 400 }
      );
    }

    const officer = await prisma.officer.create({
      data: {
        badgeId,
        fullName,
        email,
        password,
        phone,
        status,
      },
    });

    return NextResponse.json({ ok: true, data: officer }, { status: 201 });
  } catch (error) {
    console.error(error);

    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Duplicate badgeId or email" },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: "Failed to create officer" }, { status: 500 });
  }
}