import { NextRequest, NextResponse } from "next/server";

import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { triggerWorkflow } from "@/lib/n8n/client";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { brief_id } = body;

  if (!brief_id) {
    return NextResponse.json({ error: "Brief ID is required" }, { status: 400 });
  }

  const briefRows = await sql`
    SELECT cb.*, c.org_id
    FROM content_briefs cb
    JOIN clients c ON cb.client_id = c.id
    WHERE cb.id = ${brief_id} AND c.org_id = ${session.orgId}
  `;

  if (briefRows.length === 0) {
    return NextResponse.json({ error: "Brief not found" }, { status: 404 });
  }

  await sql`
    UPDATE content_briefs SET status = 'in_progress', updated_at = NOW()
    WHERE id = ${brief_id}
  `;

  const workflowResult = await triggerWorkflow("content-generator", {
    briefId: brief_id,
    orgId: session.orgId,
    userId: session.userId,
  });

  return NextResponse.json(
    {
      message: "Content generation started",
      briefId: brief_id,
      jobId: workflowResult?.jobId ?? null,
    },
    { status: 202 }
  );
}
