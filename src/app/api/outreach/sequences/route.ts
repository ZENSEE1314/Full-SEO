import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sequences = await sql`
    SELECT
      os.*,
      c.name as client_name,
      COALESCE(stats.sent_count, 0) as sent_count,
      COALESCE(stats.delivered_count, 0) as delivered_count,
      COALESCE(stats.opened_count, 0) as opened_count,
      COALESCE(stats.replied_count, 0) as replied_count
    FROM outreach_sequences os
    JOIN clients c ON os.client_id = c.id
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered_count,
        COUNT(*) FILTER (WHERE status = 'opened') as opened_count,
        COUNT(*) FILTER (WHERE status = 'replied') as replied_count
      FROM outreach_messages om
      WHERE om.sequence_id = os.id
    ) stats ON true
    WHERE c.org_id = ${session.orgId}
    ORDER BY os.created_at DESC
  `;

  return NextResponse.json(sequences);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, channel, client_id } = body;

  if (!name || !channel || !client_id) {
    return NextResponse.json(
      { error: "name, channel, and client_id are required" },
      { status: 400 }
    );
  }

  // Verify client belongs to org
  const clientCheck = await sql`
    SELECT id FROM clients WHERE id = ${client_id} AND org_id = ${session.orgId}
  `;

  if (clientCheck.length === 0) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const result = await sql`
    INSERT INTO outreach_sequences (client_id, name, channel, steps, is_active)
    VALUES (${client_id}, ${name}, ${channel}, '[]'::jsonb, false)
    RETURNING *
  `;

  return NextResponse.json(result[0], { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, steps, is_active, name } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  // Verify ownership
  const ownership = await sql`
    SELECT os.id
    FROM outreach_sequences os
    JOIN clients c ON os.client_id = c.id
    WHERE os.id = ${id} AND c.org_id = ${session.orgId}
  `;

  if (ownership.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const stepsJson = steps !== undefined ? JSON.stringify(steps) : null;

  const result = await sql`
    UPDATE outreach_sequences
    SET
      name = COALESCE(${name ?? null}, name),
      steps = COALESCE(${stepsJson}::jsonb, steps),
      is_active = COALESCE(${is_active ?? null}, is_active)
    WHERE id = ${id}
    RETURNING *
  `;

  return NextResponse.json(result[0]);
}
