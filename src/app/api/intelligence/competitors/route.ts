import { NextRequest, NextResponse } from "next/server";

import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const competitors = await sql`
    SELECT comp.*, c.name as client_name,
           COUNT(cr.id)::int as tracked_keywords
    FROM competitors comp
    JOIN clients c ON comp.client_id = c.id
    LEFT JOIN competitor_ranks cr ON cr.competitor_id = comp.id
    WHERE c.org_id = ${session.orgId}
    GROUP BY comp.id, c.name
    ORDER BY comp.domain
  `;

  return NextResponse.json({ competitors });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { client_id, domain, name } = body as {
    client_id: string;
    domain: string;
    name: string;
  };

  if (!client_id || !domain) {
    return NextResponse.json(
      { error: "client_id and domain are required" },
      { status: 400 },
    );
  }

  const clientCheck = await sql`
    SELECT id FROM clients WHERE id = ${client_id} AND org_id = ${session.orgId}
  `;

  if (clientCheck.length === 0) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const result = await sql`
    INSERT INTO competitors (client_id, domain, name, is_active)
    VALUES (${client_id}, ${domain}, ${name || null}, true)
    RETURNING *
  `;

  return NextResponse.json({ competitor: result[0] }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const competitorId = searchParams.get("id");

  if (!competitorId) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const check = await sql`
    SELECT comp.id FROM competitors comp
    JOIN clients c ON comp.client_id = c.id
    WHERE comp.id = ${competitorId} AND c.org_id = ${session.orgId}
  `;

  if (check.length === 0) {
    return NextResponse.json(
      { error: "Competitor not found" },
      { status: 404 },
    );
  }

  await sql`DELETE FROM competitors WHERE id = ${competitorId}`;

  return NextResponse.json({ success: true });
}
