import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { getGoogleCredentials, buildGoogleAuthUrl } from "@/lib/google/oauth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const provider = request.nextUrl.searchParams.get("provider") ?? "google-search-console";
    const credentials = await getGoogleCredentials(session.userId);

    const origin = request.nextUrl.origin;
    const redirectUri = `${origin}/api/auth/google/callback`;

    const state = Buffer.from(
      JSON.stringify({ userId: session.userId, orgId: session.orgId, provider }),
    ).toString("base64url");

    const authUrl = buildGoogleAuthUrl(credentials.clientId, state, redirectUri);
    return NextResponse.redirect(authUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Configuration error";
    return NextResponse.redirect(
      new URL(`/settings/integrations?error=${encodeURIComponent(message)}`, request.url),
    );
  }
}
