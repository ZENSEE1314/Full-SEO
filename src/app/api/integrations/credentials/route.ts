import { NextRequest, NextResponse } from "next/server";

import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

const ALLOWED_PROVIDERS = ["google-credentials", "replicate-api"] as const;

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const provider = (body.provider as string) ?? "google-credentials";

    if (!ALLOWED_PROVIDERS.includes(provider as typeof ALLOWED_PROVIDERS[number])) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    let properties: Record<string, string>;

    if (provider === "google-credentials") {
      const { client_id, client_secret } = body as { client_id: string; client_secret: string };
      if (!client_id?.trim() || !client_secret?.trim()) {
        return NextResponse.json(
          { error: "Both Client ID and Client Secret are required" },
          { status: 400 },
        );
      }
      properties = { client_id: client_id.trim(), client_secret: client_secret.trim() };
    } else if (provider === "replicate-api") {
      const { api_token } = body as { api_token: string };
      if (!api_token?.trim()) {
        return NextResponse.json({ error: "API token is required" }, { status: 400 });
      }
      properties = { api_token: api_token.trim() };
    } else {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    await sql`
      INSERT INTO integrations (org_id, user_id, provider, properties, is_active, updated_at)
      VALUES (
        ${session.orgId}::uuid,
        ${session.userId}::uuid,
        ${provider},
        ${JSON.stringify(properties)}::jsonb,
        true,
        NOW()
      )
      ON CONFLICT (user_id, provider)
      DO UPDATE SET
        properties = ${JSON.stringify(properties)}::jsonb,
        is_active = true,
        updated_at = NOW()
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[credentials] POST error:", error);
    return NextResponse.json({ error: "Failed to save credentials" }, { status: 500 });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await sql`
      SELECT provider, properties FROM integrations
      WHERE user_id = ${session.userId}::uuid
        AND provider IN ('google-credentials', 'replicate-api')
        AND is_active = true
    `;

    const result: Record<string, boolean> = {
      hasGoogleCredentials: false,
      hasReplicateKey: false,
    };

    for (const row of rows) {
      const r = row as { provider: string; properties: Record<string, string> | null };
      if (r.provider === "google-credentials" && r.properties?.client_id) {
        result.hasGoogleCredentials = true;
      }
      if (r.provider === "replicate-api" && r.properties?.api_token) {
        result.hasReplicateKey = true;
      }
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ hasGoogleCredentials: false, hasReplicateKey: false });
  }
}
