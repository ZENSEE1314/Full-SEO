import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { sql } from "@/lib/db";

const AddCompetitorSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  domain: z
    .string()
    .min(1, "Domain is required")
    .max(255)
    .transform((d) => d.replace(/^https?:\/\//, "").replace(/\/+$/, "")),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const orgId = request.headers.get("x-org-id");
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const client = await sql`
      SELECT id FROM clients WHERE id = ${id} AND org_id = ${orgId} LIMIT 1
    `;
    if (client.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const competitors = await sql`
      SELECT id, name, domain, is_active, created_at
      FROM competitors
      WHERE client_id = ${id}
      ORDER BY name
    `;

    return NextResponse.json(competitors);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch competitors" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const orgId = request.headers.get("x-org-id");
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const client = await sql`
      SELECT id FROM clients WHERE id = ${id} AND org_id = ${orgId} LIMIT 1
    `;
    if (client.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const body = await request.json();
    const result = AddCompetitorSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.format() },
        { status: 400 },
      );
    }

    const { name, domain } = result.data;

    const existing = await sql`
      SELECT id FROM competitors
      WHERE client_id = ${id} AND domain = ${domain}
      LIMIT 1
    `;
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "A competitor with this domain already exists" },
        { status: 409 },
      );
    }

    const rows = await sql`
      INSERT INTO competitors (client_id, name, domain, is_active)
      VALUES (${id}, ${name}, ${domain}, true)
      RETURNING *
    `;

    return NextResponse.json(rows[0], { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to add competitor" },
      { status: 500 },
    );
  }
}
