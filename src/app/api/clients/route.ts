import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { sql } from "@/lib/db";

const CreateClientSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  domain: z
    .string()
    .min(1, "Domain is required")
    .max(255)
    .transform((d) => d.replace(/^https?:\/\//, "").replace(/\/+$/, "")),
});

export async function GET(request: NextRequest) {
  try {
    const orgId = request.headers.get("x-org-id");
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clients = await sql`
      SELECT
        c.id,
        c.name,
        c.domain,
        c.status,
        c.health_score,
        c.settings,
        c.created_at,
        c.updated_at,
        COUNT(DISTINCT k.id) FILTER (WHERE k.is_tracked = true) AS keyword_count,
        COUNT(DISTINCT p.id) AS page_count,
        COUNT(DISTINCT ti.id) FILTER (WHERE ti.fixed_at IS NULL) AS issue_count
      FROM clients c
      LEFT JOIN keywords k ON k.client_id = c.id
      LEFT JOIN pages p ON p.client_id = c.id
      LEFT JOIN technical_issues ti ON ti.client_id = c.id
      WHERE c.org_id = ${orgId}
      GROUP BY c.id
      ORDER BY c.name
    `;

    return NextResponse.json(clients);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgId = request.headers.get("x-org-id");
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = CreateClientSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.format() },
        { status: 400 },
      );
    }

    const { name, domain } = result.data;

    const existing = await sql`
      SELECT id FROM clients
      WHERE org_id = ${orgId} AND domain = ${domain} AND status != 'archived'
      LIMIT 1
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "A client with this domain already exists" },
        { status: 409 },
      );
    }

    const rows = await sql`
      INSERT INTO clients (org_id, name, domain, status, settings)
      VALUES (${orgId}, ${name}, ${domain}, 'active', '{}')
      RETURNING *
    `;

    return NextResponse.json(rows[0], { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create client" },
      { status: 500 },
    );
  }
}
