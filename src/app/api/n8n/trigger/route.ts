import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { triggerWorkflow } from "@/lib/n8n/client";
import { sql } from "@/lib/db";

const ALLOWED_WORKFLOWS = [
  "content-generator",
  "technical-audit",
  "backlink-prospector",
] as const;

type WorkflowSlug = (typeof ALLOWED_WORKFLOWS)[number];

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const workflow = body.workflow as string;
    const clientId = body.client_id as string;

    if (!ALLOWED_WORKFLOWS.includes(workflow as WorkflowSlug)) {
      return NextResponse.json({ error: "Invalid workflow" }, { status: 400 });
    }

    if (!clientId) {
      return NextResponse.json({ error: "client_id required" }, { status: 400 });
    }

    const clientCheck = await sql`
      SELECT id FROM clients WHERE id = ${clientId} AND org_id = ${session.orgId} LIMIT 1
    `;
    if (clientCheck.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const payload: Record<string, unknown> = { client_id: clientId, ...body };
    delete payload.workflow;

    const result = await triggerWorkflow(workflow, payload);

    await sql`
      INSERT INTO agent_action_log (client_id, module, action_type, summary, status, triggered_by, created_at)
      VALUES (${clientId}, 'automation', 'workflow_triggered', ${`n8n workflow "${workflow}" triggered by ${session.name}`}, 'info', 'nexus-app', NOW())
    `;

    return NextResponse.json({ success: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
