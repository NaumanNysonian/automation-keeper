import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { listAppsScripts, loadTokensFromSerialized, TOKEN_COOKIE } from "@/lib/google";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(TOKEN_COOKIE)?.value;
    const auth = await loadTokensFromSerialized(raw);
    if (!auth) {
      return NextResponse.json(
        { error: "not_authenticated" },
        { status: 401 },
      );
    }
    const automations = await listAppsScripts(auth);
    return NextResponse.json({ automations });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to sync" },
      { status: 500 },
    );
  }
}
