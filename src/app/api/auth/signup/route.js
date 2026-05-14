import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../../lib/prisma.js";

export async function POST(req) {
  try {
    const { fullName, email, password } = await req.json();

    // 1️⃣ Validation
    if (!fullName || !email || !password) {
      return NextResponse.json(
        { message: "All fields are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // 2️⃣ Check if email already exists
    const existing = await prisma.admin.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { message: "Email already exists" },
        { status: 409 }
      );
    }

    // 3️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4️⃣ Create admin
    const admin = await prisma.admin.create({
      data: {
        fullName,
        email,
        password: hashedPassword,
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

    // 5️⃣ Return success
    return NextResponse.json(
      {
        message: "Signup successful",
        admin,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("SIGNUP ERROR:", error);
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}
