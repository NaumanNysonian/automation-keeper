import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ensureUserSchema, pool } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body?.email || "").toLowerCase().trim();
    const password = body?.password as string;
    const name = (body?.name || "").trim();
    const department = (body?.department || "general").trim() || "general";

    console.log("[register] attempt", { email, department });
    if (!email || !password) {
      console.log("[register] missing credentials", { emailPresent: !!email });
      return NextResponse.json(
        { error: "email and password are required" },
        { status: 400 },
      );
    }

    await ensureUserSchema();

    const hash = await bcrypt.hash(password, 10);
    const role =
      process.env.ADMIN_EMAIL &&
      process.env.ADMIN_EMAIL.toLowerCase().trim() === email
        ? "admin"
        : "user";

    const { rows } = await pool.query(
      `
        INSERT INTO users (email, password_hash, name, department, role)
        VALUES ($1, $2, NULLIF($3, ''), $4, $5)
        ON CONFLICT (email) DO NOTHING
        RETURNING id, email, name, department, role, created_at;
      `,
      [email, hash, name, department, role],
    );

    if (!rows.length) {
      console.log("[register] email already exists", { email });
      return NextResponse.json(
        { error: "email already exists" },
        { status: 409 },
      );
    }

    const user = rows[0];
    console.log("[register] success", { email, role: user.role, department: user.department });
    return NextResponse.json({ user });
  } catch (err) {
    console.error("register error", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
