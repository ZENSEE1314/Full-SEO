import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { getGoogleAuthUrl } from "@/lib/google/oauth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const provider = request.nextUrl.searchParams.get("provider") ?? "google-search-console";

  // Build redirect URI from the request origin
  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/google/callback`;

  // State encodes org ID + provider for the callback
  const state = Buffer.from(
    JSON.stringify({ orgId: session.orgId, provider }),
  ).toString("base64url");

  const authUrl = getGoogleAuthUrl(state, redirectUri);

  return NextResponse.redirect(authUrl);
}
