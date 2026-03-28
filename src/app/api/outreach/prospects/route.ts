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
  const status = searchParams.get("status") ?? "all";
  const clientId = searchParams.get("client") ?? "all";

  const prospects = await sql`
    SELECT bp.*
    FROM backlink_prospects bp
    JOIN clients c ON bp.client_id = c.id
    WHERE c.org_id = ${session.orgId}
      AND (${status} = 'all' OR bp.status = ${status})
      AND (${clientId} = 'all' OR bp.client_id = ${clientId})
    ORDER BY bp.created_at DESC
  `;

  return NextResponse.json(prospects);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (body.action === "discover") {
    const result = await triggerWorkflow("discover-prospects", {
      orgId: session.orgId,
      clientId: body.clientId,
    });
    return NextResponse.json({ message: "Discovery triggered", result });
  }

  const { client_id, domain, url, domain_authority, contact_email, contact_name, source } = body;

  if (!client_id || !domain) {
    return NextResponse.json(
      { error: "client_id and domain are required" },
      { status: 400 }
    );
  }

  const result = await sql`
    INSERT INTO backlink_prospects (client_id, domain, url, domain_authority, contact_email, contact_name, source, status)
    VALUES (${client_id}, ${domain}, ${url ?? null}, ${domain_authority ?? null}, ${contact_email ?? null}, ${contact_name ?? null}, ${source ?? "manual"}, 'new')
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
  const { id, status, contact_email, contact_name, notes } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  // Verify the prospect belongs to the user's org
  const ownership = await sql`
    SELECT bp.id
    FROM backlink_prospects bp
    JOIN clients c ON bp.client_id = c.id
    WHERE bp.id = ${id} AND c.org_id = ${session.orgId}
  `;

  if (ownership.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await sql`
    UPDATE backlink_prospects
    SET
      status = COALESCE(${status ?? null}, status),
      contact_email = COALESCE(${contact_email ?? null}, contact_email),
      contact_name = COALESCE(${contact_name ?? null}, contact_name),
      notes = COALESCE(${notes ?? null}, notes),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;

  return NextResponse.json(result[0]);
}
