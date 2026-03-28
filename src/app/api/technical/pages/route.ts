import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { sql } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const clientId = searchParams.get("clientId");

  if (!clientId) {
    return NextResponse.json(
      { error: "clientId is required" },
      { status: 400 },
    );
  }

  const clientRows = await sql`
    SELECT id FROM clients
    WHERE id = ${clientId} AND org_id = ${session.orgId}
  `;

  if (clientRows.length === 0) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const pages = await sql`
    SELECT
      p.id,
      p.url,
      p.title,
      p.status_code,
      p.is_indexed,
      p.page_type,
      COALESCE(
        (SELECT pss.performance_score
         FROM page_speed_scores pss
         WHERE pss.page_id = p.id
         ORDER BY pss.recorded_at DESC
         LIMIT 1),
        NULL
      ) AS speed_score,
      COALESCE(
        (SELECT COUNT(*)
         FROM technical_issues ti
         WHERE ti.page_id = p.id AND ti.fixed_at IS NULL),
        0
      ) AS issue_count
    FROM pages p
    WHERE p.client_id = ${clientId}
    ORDER BY p.url ASC
  `;

  return NextResponse.json({ data: pages });
}
