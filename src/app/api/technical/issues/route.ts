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
  const severity = searchParams.get("severity");
  const isFixed = searchParams.get("fixed");

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

  const issues = await sql`
    SELECT
      ti.id,
      ti.client_id,
      ti.page_id,
      ti.issue_type,
      ti.severity,
      ti.description,
      ti.auto_fixable,
      ti.fixed_at,
      ti.detected_at,
      p.url AS page_url
    FROM technical_issues ti
    LEFT JOIN pages p ON p.id = ti.page_id
    WHERE ti.client_id = ${clientId}
      AND (${severity}::text IS NULL OR ti.severity = ${severity})
      AND (
        ${isFixed}::text IS NULL
        OR (${isFixed} = 'true' AND ti.fixed_at IS NOT NULL)
        OR (${isFixed} = 'false' AND ti.fixed_at IS NULL)
      )
    ORDER BY
      CASE ti.severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,
      ti.detected_at DESC
  `;

  return NextResponse.json({ data: issues });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { issueId, clientId } = body as {
    issueId: string;
    clientId: string;
  };

  if (!issueId || !clientId) {
    return NextResponse.json(
      { error: "issueId and clientId are required" },
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

  const updated = await sql`
    UPDATE technical_issues
    SET fixed_at = NOW()
    WHERE id = ${issueId} AND client_id = ${clientId} AND fixed_at IS NULL
    RETURNING id
  `;

  if (updated.length === 0) {
    return NextResponse.json(
      { error: "Issue not found or already fixed" },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, data: updated[0] });
}
