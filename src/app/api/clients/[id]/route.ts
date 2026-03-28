import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { sql } from "@/lib/db";

const UpdateClientSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  domain: z
    .string()
    .min(1)
    .max(255)
    .transform((d) => d.replace(/^https?:\/\//, "").replace(/\/+$/, ""))
    .optional(),
  status: z.enum(["active", "paused", "archived"]).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const orgId = request.headers.get("x-org-id");
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const rows = await sql`
      SELECT
        c.*,
        COUNT(DISTINCT k.id) FILTER (WHERE k.is_tracked = true) AS keyword_count,
        COUNT(DISTINCT p.id) AS page_count,
        COUNT(DISTINCT ti.id) FILTER (WHERE ti.fixed_at IS NULL) AS issue_count
      FROM clients c
      LEFT JOIN keywords k ON k.client_id = c.id
      LEFT JOIN pages p ON p.client_id = c.id
      LEFT JOIN technical_issues ti ON ti.client_id = c.id
      WHERE c.id = ${id} AND c.org_id = ${orgId}
      GROUP BY c.id
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch client" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const orgId = request.headers.get("x-org-id");
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const result = UpdateClientSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.format() },
        { status: 400 },
      );
    }

    const data = result.data;

    const rows = await sql`
      UPDATE clients
      SET
        name = COALESCE(${data.name ?? null}, name),
        domain = COALESCE(${data.domain ?? null}, domain),
        status = COALESCE(${data.status ?? null}, status),
        settings = COALESCE(${data.settings ? JSON.stringify(data.settings) : null}::jsonb, settings),
        updated_at = NOW()
      WHERE id = ${id} AND org_id = ${orgId}
      RETURNING *
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch {
    return NextResponse.json(
      { error: "Failed to update client" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const orgId = request.headers.get("x-org-id");
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const rows = await sql`
      UPDATE clients
      SET status = 'archived', updated_at = NOW()
      WHERE id = ${id} AND org_id = ${orgId}
      RETURNING id
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to archive client" },
      { status: 500 },
    );
  }
}
