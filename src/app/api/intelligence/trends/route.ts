import { NextRequest, NextResponse } from "next/server";

import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { triggerWorkflow } from "@/lib/n8n/client";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const clientId = searchParams.get("client_id");
  const days = Number(searchParams.get("days")) || 30;

  const trends = clientId
    ? await sql`
        SELECT t.*, c.name as client_name
        FROM trends t
        LEFT JOIN clients c ON t.client_id = c.id
        WHERE t.client_id = ${clientId}
          AND t.detected_at > NOW() - INTERVAL '1 day' * ${days}
        ORDER BY t.detected_at DESC
        LIMIT 50
      `
    : await sql`
        SELECT t.*, c.name as client_name
        FROM trends t
        LEFT JOIN clients c ON t.client_id = c.id
        LEFT JOIN clients c2 ON t.client_id = c2.id AND c2.org_id = ${session.orgId}
        WHERE (t.client_id IS NULL OR c2.id IS NOT NULL)
          AND t.detected_at > NOW() - INTERVAL '1 day' * ${days}
        ORDER BY t.detected_at DESC
        LIMIT 50
      `;

  return NextResponse.json({ trends });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const clientId = body.client_id as string | undefined;

  const result = await triggerWorkflow("discover-trends", {
    orgId: session.orgId,
    clientId: clientId ?? null,
    triggeredBy: session.userId,
  });

  return NextResponse.json({ success: true, workflow: result });
}
