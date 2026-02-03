"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";


export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });
      if (res?.error) {
        setMsg(res.error.includes("CredentialsSignin") ? "No account found. Please register first." : res.error);
      } else {
        router.push("/");
      }
    } catch {
      setMsg("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur">
        <h1 className="text-2xl font-semibold mb-2">Sign in</h1>
        <p className="text-sm text-slate-300 mb-6">
          Use the email/password you registered for the dashboard.
        </p>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="text-xs uppercase tracking-[0.14em] text-slate-400">
              Email
            </label>
            <input
              type="email"
              className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400/60 focus:outline-none"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.14em] text-slate-400">
              Password
            </label>
            <input
              type="password"
              className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400/60 focus:outline-none"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        {msg && (
          <div className="mt-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
            {msg}
          </div>
        )}
        <div className="mt-6 text-sm text-slate-300">
          No account yet?{" "}
          <Link className="text-emerald-300 hover:text-emerald-200" href="/register">
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
}
