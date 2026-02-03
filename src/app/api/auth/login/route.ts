import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ensureUserSchema, pool } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body?.email || "").toLowerCase().trim();
    const password = body?.password as string;

    if (!email || !password) {
      return NextResponse.json(
        { error: "email and password are required" },
        { status: 400 },
      );
    }

    await ensureUserSchema();

    const { rows } = await pool.query(
      `SELECT id, email, name, department, role, password_hash FROM users WHERE email = $1 LIMIT 1;`,
      [email],
    );

    if (!rows.length) {
      return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
    }

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
    }

    delete user.password_hash;
    return NextResponse.json({ user });
  } catch (err) {
    console.error("login error", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
