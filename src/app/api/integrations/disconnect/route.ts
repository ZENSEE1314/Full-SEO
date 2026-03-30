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
    const { provider } = body as { provider: string };

    if (!provider) {
      return NextResponse.json({ error: "provider required" }, { status: 400 });
    }

    await sql`
      UPDATE integrations
      SET is_active = false, access_token = NULL, updated_at = NOW()
      WHERE org_id = ${session.orgId}::uuid AND provider = ${provider}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[disconnect] error:", error);
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }
}
