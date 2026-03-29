import { NextRequest, NextResponse } from "next/server";

import { sql } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string; competitorId: string }> };

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const orgId = request.headers.get("x-org-id");
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, competitorId } = await context.params;

    const client = await sql`
      SELECT id FROM clients WHERE id = ${id} AND org_id = ${orgId} LIMIT 1
    `;
    if (client.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const rows = await sql`
      DELETE FROM competitors
      WHERE id = ${competitorId} AND client_id = ${id}
      RETURNING id
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Competitor not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete competitor" },
      { status: 500 },
    );
  }
}
