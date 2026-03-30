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

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      ?? (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null)
      ?? `${request.headers.get("x-forwarded-proto") ?? "https"}://${request.headers.get("host") ?? request.nextUrl.host}`;
    const redirectUri = `${baseUrl}/api/auth/google/callback`;

    if (debug) {
      return NextResponse.json({
        redirectUri,
        baseUrl,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? null,
        RAILWAY_PUBLIC_DOMAIN: process.env.RAILWAY_PUBLIC_DOMAIN ?? null,
        host: request.headers.get("host"),
        xForwardedProto: request.headers.get("x-forwarded-proto"),
        nextUrlOrigin: request.nextUrl.origin,
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
