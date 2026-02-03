import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";

const handler = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = (credentials?.email || "").toLowerCase().trim();
        const password = credentials?.password || "";
        console.log("[nextauth] authorize attempt", { email });
        if (!email || !password) return null;

        const { rows } = await pool.query(
          `SELECT id, email, name, department, role, password_hash FROM users WHERE email = $1 LIMIT 1`,
          [email],
        );
        if (!rows.length) {
          console.log("[nextauth] user not found", { email });
          return null;
        }
        const user = rows[0];
        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) {
          console.log("[nextauth] invalid password", { email });
          return null;
        }

        console.log("[nextauth] success", {
          email,
          role: user.role,
          department: user.department,
        });
        return {
          id: user.id,
          email: user.email,
          name: user.name || undefined,
          department: user.department,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.department = (user as { department?: string }).department;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = session.user || {};
      (session.user as { department?: string }).department = token.department as
        | string
        | undefined;
      (session.user as { role?: string }).role = token.role as string | undefined;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});

export { handler as GET, handler as POST };
