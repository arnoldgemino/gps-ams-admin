import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const admins = await prisma.admin.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(admins);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch admins" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { fullName, email, password } = body;

    if (!fullName || !email || !password) {
      return NextResponse.json(
        { error: "fullName, email, and password are required" },
        { status: 400 }
      );
    }

    const admin = await prisma.admin.create({
      data: {
        fullName,
        email,
        password,
        role: "ADMIN",
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: `Created admin: ${admin.email}`,
      },
    });

    return NextResponse.json({ ok: true, data: admin }, { status: 201 });
  } catch (error) {
    console.error(error);

    if (error.code === "P2002") {
      return NextResponse.json({ error: "Duplicate admin email" }, { status: 409 });
    }

    return NextResponse.json({ error: "Failed to create admin" }, { status: 500 });
  }
}