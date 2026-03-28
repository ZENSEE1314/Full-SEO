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
  const status = searchParams.get("status");

  let articles;

  if (clientId && status) {
    articles = await sql`
      SELECT ca.*, c.name as client_name
      FROM content_articles ca
      JOIN clients c ON ca.client_id = c.id
      WHERE c.org_id = ${session.orgId}
        AND ca.client_id = ${clientId}
        AND ca.status = ${status}
      ORDER BY ca.updated_at DESC
    `;
  } else if (clientId) {
    articles = await sql`
      SELECT ca.*, c.name as client_name
      FROM content_articles ca
      JOIN clients c ON ca.client_id = c.id
      WHERE c.org_id = ${session.orgId}
        AND ca.client_id = ${clientId}
      ORDER BY ca.updated_at DESC
    `;
  } else if (status) {
    articles = await sql`
      SELECT ca.*, c.name as client_name
      FROM content_articles ca
      JOIN clients c ON ca.client_id = c.id
      WHERE c.org_id = ${session.orgId}
        AND ca.status = ${status}
      ORDER BY ca.updated_at DESC
    `;
  } else {
    articles = await sql`
      SELECT ca.*, c.name as client_name
      FROM content_articles ca
      JOIN clients c ON ca.client_id = c.id
      WHERE c.org_id = ${session.orgId}
      ORDER BY ca.updated_at DESC
    `;
  }

  return NextResponse.json(articles);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { brief_id } = body;

  if (!brief_id) {
    return NextResponse.json({ error: "Brief ID is required" }, { status: 400 });
  }

  const briefRows = await sql`
    SELECT * FROM content_briefs WHERE id = ${brief_id}
  `;

  if (briefRows.length === 0) {
    return NextResponse.json({ error: "Brief not found" }, { status: 404 });
  }

  const brief = briefRows[0];

  const result = await sql`
    INSERT INTO content_articles (brief_id, client_id, title, slug, status)
    VALUES (
      ${brief_id},
      ${brief.client_id},
      ${brief.title},
      ${brief.title.toString().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")},
      'draft'
    )
    RETURNING *
  `;

  try {
    await triggerWorkflow("content-generator", {
      briefId: brief_id,
      articleId: result[0].id,
    });
  } catch {
    // NOTE: Article is created even if n8n trigger fails; generation can be retried
  }

  return NextResponse.json(result[0], { status: 202 });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, status, title, body: articleBody, meta_title, meta_description } = body;

  if (!id) {
    return NextResponse.json({ error: "Article ID is required" }, { status: 400 });
  }

  const VALID_STATUSES = ["draft", "review", "approved", "published"];

  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  if (status) {
    const result = await sql`
      UPDATE content_articles SET status = ${status}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    return NextResponse.json(result[0]);
  }

  const result = await sql`
    UPDATE content_articles
    SET title = COALESCE(${title || null}, title),
        body = COALESCE(${articleBody || null}, body),
        meta_title = COALESCE(${meta_title || null}, meta_title),
        meta_description = COALESCE(${meta_description || null}, meta_description),
        word_count = CASE WHEN ${articleBody || null} IS NOT NULL
          THEN array_length(regexp_split_to_array(trim(${articleBody || ""}), '\s+'), 1)
          ELSE word_count END,
        updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;

  return NextResponse.json(result[0]);
}
