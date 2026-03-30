import { NextRequest, NextResponse } from "next/server";

import { sql } from "@/lib/db";
import { getGoogleCredentials, exchangeCodeForTokens, getGoogleUserEmail } from "@/lib/google/oauth";

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const stateParam = request.nextUrl.searchParams.get("state");
    const error = request.nextUrl.searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL(`/settings/integrations?error=${encodeURIComponent(error)}`, request.url),
      );
    }

    if (!code || !stateParam) {
      return NextResponse.redirect(
        new URL("/settings/integrations?error=missing_params", request.url),
      );
    }

    let state: { userId: string; orgId: string; provider: string };
    try {
      state = JSON.parse(Buffer.from(stateParam, "base64url").toString());
    } catch {
      return NextResponse.redirect(
        new URL("/settings/integrations?error=invalid_state", request.url),
      );
    }

    const credentials = await getGoogleCredentials(state.userId);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      ?? (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null)
      ?? `${request.headers.get("x-forwarded-proto") ?? "https"}://${request.headers.get("host") ?? request.nextUrl.host}`;
    const redirectUri = `${baseUrl}/api/auth/google/callback`;

    const tokens = await exchangeCodeForTokens(code, redirectUri, credentials);
    const email = await getGoogleUserEmail(tokens.access_token);

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    const scopes = tokens.scope.split(" ");

    await sql`
      INSERT INTO integrations (org_id, user_id, provider, access_token, refresh_token, token_expires_at, scopes, account_email, is_active, updated_at)
      VALUES (
        ${state.orgId}::uuid,
        ${state.userId}::uuid,
        ${state.provider},
        ${tokens.access_token},
        ${tokens.refresh_token},
        ${expiresAt.toISOString()}::timestamptz,
        ${scopes}::text[],
        ${email},
        true,
        NOW()
      )
      ON CONFLICT (user_id, provider)
      DO UPDATE SET
        access_token = EXCLUDED.access_token,
        refresh_token = COALESCE(EXCLUDED.refresh_token, integrations.refresh_token),
        token_expires_at = EXCLUDED.token_expires_at,
        scopes = EXCLUDED.scopes,
        account_email = EXCLUDED.account_email,
        is_active = true,
        updated_at = NOW()
    `;

    return NextResponse.redirect(
      new URL(`/settings/integrations?connected=${state.provider}`, request.url),
    );
  } catch (err) {
    console.error("[google/callback] error:", err);
    return NextResponse.redirect(
      new URL(
        `/settings/integrations?error=${encodeURIComponent(
          err instanceof Error ? err.message : "OAuth failed",
        )}`,
        request.url,
      ),
    );
  }
}
