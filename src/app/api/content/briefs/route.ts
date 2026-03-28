import { NextRequest, NextResponse } from "next/server";

import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const clientId = searchParams.get("client_id");
  const status = searchParams.get("status");

  let briefs;

  if (clientId && status) {
    briefs = await sql`
      SELECT cb.*, c.name as client_name, k.keyword as target_keyword
      FROM content_briefs cb
      JOIN clients c ON cb.client_id = c.id
      LEFT JOIN keywords k ON cb.target_keyword_id = k.id
      WHERE c.org_id = ${session.orgId}
        AND cb.client_id = ${clientId}
        AND cb.status = ${status}
      ORDER BY cb.updated_at DESC
    `;
  } else if (clientId) {
    briefs = await sql`
      SELECT cb.*, c.name as client_name, k.keyword as target_keyword
      FROM content_briefs cb
      JOIN clients c ON cb.client_id = c.id
      LEFT JOIN keywords k ON cb.target_keyword_id = k.id
      WHERE c.org_id = ${session.orgId}
        AND cb.client_id = ${clientId}
      ORDER BY cb.updated_at DESC
    `;
  } else if (status) {
    briefs = await sql`
      SELECT cb.*, c.name as client_name, k.keyword as target_keyword
      FROM content_briefs cb
      JOIN clients c ON cb.client_id = c.id
      LEFT JOIN keywords k ON cb.target_keyword_id = k.id
      WHERE c.org_id = ${session.orgId}
        AND cb.status = ${status}
      ORDER BY cb.updated_at DESC
    `;
  } else {
    briefs = await sql`
      SELECT cb.*, c.name as client_name, k.keyword as target_keyword
      FROM content_briefs cb
      JOIN clients c ON cb.client_id = c.id
      LEFT JOIN keywords k ON cb.target_keyword_id = k.id
      WHERE c.org_id = ${session.orgId}
      ORDER BY cb.updated_at DESC
    `;
  }

  return NextResponse.json(briefs);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, client_id, target_keyword_id, secondary_keywords, outline, brief_text, source } = body;

  if (!title || !client_id) {
    return NextResponse.json({ error: "Title and client are required" }, { status: 400 });
  }

  const result = await sql`
    INSERT INTO content_briefs (client_id, title, target_keyword_id, secondary_keywords, outline, brief_text, source, status, created_by)
    VALUES (
      ${client_id},
      ${title},
      ${target_keyword_id || null},
      ${JSON.stringify(secondary_keywords || [])},
      ${outline ? JSON.stringify(outline) : null},
      ${brief_text || null},
      ${source || "manual"},
      'draft',
      ${session.userId}
    )
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
  const { id, status, title, brief_text, outline } = body;

  if (!id) {
    return NextResponse.json({ error: "Brief ID is required" }, { status: 400 });
  }

  const VALID_STATUSES = ["draft", "approved", "in_progress", "published"];

  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  if (status) {
    const result = await sql`
      UPDATE content_briefs SET status = ${status}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    return NextResponse.json(result[0]);
  }

  const result = await sql`
    UPDATE content_briefs
    SET title = COALESCE(${title || null}, title),
        brief_text = COALESCE(${brief_text || null}, brief_text),
        outline = COALESCE(${outline ? JSON.stringify(outline) : null}, outline),
        updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;

  return NextResponse.json(result[0]);
}
