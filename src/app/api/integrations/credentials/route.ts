import { NextRequest, NextResponse } from "next/server";

import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { client_id, client_secret } = body as {
      client_id: string;
      client_secret: string;
    };

    if (!client_id?.trim() || !client_secret?.trim()) {
      return NextResponse.json(
        { error: "Both Client ID and Client Secret are required" },
        { status: 400 },
      );
    }

    await sql`
      INSERT INTO integrations (org_id, user_id, provider, properties, is_active, updated_at)
      VALUES (
        ${session.orgId}::uuid,
        ${session.userId}::uuid,
        'google-credentials',
        ${JSON.stringify({ client_id: client_id.trim(), client_secret: client_secret.trim() })}::jsonb,
        true,
        NOW()
      )
      ON CONFLICT (user_id, provider)
      DO UPDATE SET
        properties = ${JSON.stringify({ client_id: client_id.trim(), client_secret: client_secret.trim() })}::jsonb,
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
      SELECT properties FROM integrations
      WHERE user_id = ${session.userId}::uuid AND provider = 'google-credentials' AND is_active = true
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ hasCredentials: false });
    }

    const props = (rows[0] as { properties: { client_id?: string } }).properties;
    return NextResponse.json({
      hasCredentials: !!props.client_id,
      clientId: props.client_id ? `${props.client_id.slice(0, 12)}...` : null,
    });
  } catch {
    return NextResponse.json({ hasCredentials: false });
  }
}
