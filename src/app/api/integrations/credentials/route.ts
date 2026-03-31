import { NextRequest, NextResponse } from "next/server";

import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

const ALLOWED_PROVIDERS = [
  "google-credentials",
  "replicate-api",
  "n8n",
  "whatsapp",
  "smtp-email",
] as const;

const RESERVED_KEYS = ["provider", "action"];

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const provider = (body.provider as string) ?? "google-credentials";

    if (!ALLOWED_PROVIDERS.includes(provider as (typeof ALLOWED_PROVIDERS)[number])) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    // Build properties from all non-reserved keys
    const properties: Record<string, string> = {};
    for (const [key, value] of Object.entries(body)) {
      if (RESERVED_KEYS.includes(key)) continue;
      if (typeof value === "string" && value.trim()) {
        properties[key] = value.trim();
      }
    }

    if (Object.keys(properties).length === 0) {
      return NextResponse.json({ error: "No configuration values provided" }, { status: 400 });
    }

    const propsJson = JSON.stringify(properties);

    await sql`
      INSERT INTO integrations (org_id, user_id, provider, properties, is_active, updated_at)
      VALUES (
        ${session.orgId}::uuid,
        ${session.userId}::uuid,
        ${provider},
        ${propsJson}::jsonb,
        true,
        NOW()
      )
      ON CONFLICT (user_id, provider)
      DO UPDATE SET
        properties = ${propsJson}::jsonb,
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
      WHERE user_id = ${session.userId}::uuid AND is_active = true
    `;

    const configured: Record<string, boolean> = {};
    for (const row of rows) {
      const r = row as { provider: string; properties: Record<string, string> | null };
      if (r.properties && Object.keys(r.properties).length > 0) {
        configured[r.provider] = true;
      }
    }

    return NextResponse.json(configured);
  } catch {
    return NextResponse.json({});
  }
}
