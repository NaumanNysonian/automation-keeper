import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

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
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

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
        token.email = (user as { email?: string }).email;
      }
      return token;
    },
    async session({ session, token }) {
      // Validate user still exists (e.g., if deleted)
      const email = token.email as string | undefined;
      if (email) {
        const dbUser = await prisma.user.findUnique({
          where: { email },
          select: { email: true, name: true, department: true, role: true, id: true },
        });
        if (!dbUser) {
          return { ...session, user: undefined };
        }
        session.user = {
          ...session.user,
          email: dbUser.email,
          name: dbUser.name || undefined,
        };
        (session.user as { department?: string }).department = dbUser.department;
        (session.user as { role?: string }).role = dbUser.role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});

export { handler as GET, handler as POST };
