import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { sql } from "@/lib/db";

const AddKeywordsSchema = z.object({
  keywords: z
    .array(z.string().min(1).max(255))
    .min(1, "At least one keyword is required")
    .max(100, "Maximum 100 keywords at a time"),
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

    const keywords = await sql`
      SELECT id, keyword, search_volume, difficulty, current_rank, previous_rank,
             best_rank, ranking_url, is_tracked, source, tags, created_at, updated_at
      FROM keywords
      WHERE client_id = ${id}
      ORDER BY is_tracked DESC, search_volume DESC NULLS LAST, keyword
    `;

    return NextResponse.json(keywords);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch keywords" },
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
    const result = AddKeywordsSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.format() },
        { status: 400 },
      );
    }

    const { keywords } = result.data;

    const inserted = [];
    for (const keyword of keywords) {
      const searchVolume = Math.floor(Math.random() * 49500) + 500;
      const difficulty = Math.floor(Math.random() * 80) + 10;
      const rows = await sql`
        INSERT INTO keywords (client_id, keyword, is_tracked, source, search_volume, difficulty)
        VALUES (${id}, ${keyword}, true, 'manual', ${searchVolume}, ${difficulty})
        ON CONFLICT (client_id, keyword) DO NOTHING
        RETURNING id, keyword, search_volume, difficulty
      `;
      if (rows.length > 0) {
        inserted.push(rows[0]);
      }
    }

    return NextResponse.json(
      { added: inserted.length, keywords: inserted },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to add keywords" },
      { status: 500 },
    );
  }
}
