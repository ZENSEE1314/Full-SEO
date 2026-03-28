import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { sql } from "@/lib/db";
import { triggerWorkflow } from "@/lib/n8n/client";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { clientId } = body as { clientId: string };

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

  const result = await triggerWorkflow("technical-audit", {
    clientId,
    orgId: session.orgId,
    triggeredBy: session.userId,
  });

  return NextResponse.json({ success: true, data: result });
}
