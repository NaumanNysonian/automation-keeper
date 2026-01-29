import { NextRequest, NextResponse } from "next/server";
import { buildAuthUrl, getRedirectUriFromRequest } from "@/lib/google";

export async function GET(req: NextRequest) {
  try {
    const redirectUri = getRedirectUriFromRequest(req);
    const url = buildAuthUrl(redirectUri);
    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to build auth url" },
      { status: 500 },
    );
  }
}
