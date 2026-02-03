import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body?.email || "").toLowerCase().trim();
    const password = body?.password as string;
    const name = (body?.name || "").trim();
    const department = (body?.department || "general").trim() || "general";

    if (!email || !password) {
      return NextResponse.json(
        { error: "email and password are required" },
        { status: 400 },
      );
    }

    const hash = await bcrypt.hash(password, 10);
    const role =
      process.env.ADMIN_EMAIL &&
      process.env.ADMIN_EMAIL.toLowerCase().trim() === email
        ? "admin"
        : "user";

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "email already exists" },
        { status: 409 },
      );
    }

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hash,
        name: name || null,
        department,
        role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        department: true,
        role: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ user });
  } catch (err) {
    console.error("register error", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
