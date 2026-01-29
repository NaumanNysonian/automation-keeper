import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForTokens,
  getRedirectUriFromRequest,
  sealTokens,
  TOKEN_COOKIE,
} from "@/lib/google";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }
  try {
    const redirectUri = getRedirectUriFromRequest(req);
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    if (!tokens.refresh_token && !tokens.access_token) {
      return NextResponse.json(
        { error: "No tokens returned from Google" },
        { status: 500 },
      );
    }
    const sealed = await sealTokens(tokens);
    const res = NextResponse.redirect(new URL("/", req.nextUrl));
    res.cookies.set(TOKEN_COOKIE, sealed, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Auth exchange failed" },
      { status: 500 },
    );
  }
}
