import { NextRequest, NextResponse } from "next/server";

import { sql } from "@/lib/db";
import { exchangeCodeForTokens, getGoogleUserEmail } from "@/lib/google/oauth";

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

    // Decode state
    let state: { orgId: string; provider: string };
    try {
      state = JSON.parse(Buffer.from(stateParam, "base64url").toString());
    } catch {
      return NextResponse.redirect(
        new URL("/settings/integrations?error=invalid_state", request.url),
      );
    }

    const origin = request.nextUrl.origin;
    const redirectUri = `${origin}/api/auth/google/callback`;

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    const email = await getGoogleUserEmail(tokens.access_token);

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    const scopes = tokens.scope.split(" ");

    // Upsert integration
    await sql`
      INSERT INTO integrations (org_id, provider, access_token, refresh_token, token_expires_at, scopes, account_email, is_active, updated_at)
      VALUES (
        ${state.orgId}::uuid,
        ${state.provider},
        ${tokens.access_token},
        ${tokens.refresh_token},
        ${expiresAt.toISOString()}::timestamptz,
        ${scopes}::text[],
        ${email},
        true,
        NOW()
      )
      ON CONFLICT (org_id, provider)
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
