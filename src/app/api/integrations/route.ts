import { NextResponse } from "next/server";

import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await sql`
      SELECT provider, account_email, is_active, properties, updated_at
      FROM integrations
      WHERE user_id = ${session.userId}::uuid AND is_active = true
    `;

    const connected: Record<string, { email: string; lastSync: string | null }> = {};
    for (const row of rows) {
      const r = row as {
        provider: string;
        account_email: string;
        properties: { last_sync_at?: string } | null;
        updated_at: string;
      };
      connected[r.provider] = {
        email: r.account_email,
        lastSync: r.properties?.last_sync_at ?? r.updated_at,
      };
    }

    return NextResponse.json({ connected });
  } catch (error) {
    console.error("[integrations] GET error:", error);
    return NextResponse.json({ connected: {} });
  }
}
