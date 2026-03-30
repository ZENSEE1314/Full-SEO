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
    const debug = request.nextUrl.searchParams.get("debug") === "1";
    const credentials = await getGoogleCredentials(session.userId);

    const host = request.headers.get("host") ?? request.nextUrl.host;
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    const origin = `${proto}://${host}`;
    const redirectUri = `${origin}/api/auth/google/callback`;

    if (debug) {
      return NextResponse.json({
        redirectUri,
        host: request.headers.get("host"),
        xForwardedProto: request.headers.get("x-forwarded-proto"),
        xForwardedHost: request.headers.get("x-forwarded-host"),
        nextUrlOrigin: request.nextUrl.origin,
        nextUrlHost: request.nextUrl.host,
        clientId: credentials.clientId.slice(0, 20) + "...",
      });
    }

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
