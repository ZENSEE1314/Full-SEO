import { NextRequest, NextResponse } from "next/server";

import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { generateArticleFromBrief } from "@/lib/content/generator";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
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
  } catch (error) {
    console.error("[content/articles] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch articles" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { brief_id } = body;

    if (!brief_id) {
      return NextResponse.json(
        { error: "Brief ID is required" },
        { status: 400 },
      );
    }

    const briefRows = await sql`
      SELECT cb.*, c.domain, k.keyword AS target_keyword
      FROM content_briefs cb
      JOIN clients c ON cb.client_id = c.id
      LEFT JOIN keywords k ON cb.target_keyword_id = k.id
      WHERE cb.id = ${brief_id} AND c.org_id = ${session.orgId}
    `;

    if (briefRows.length === 0) {
      return NextResponse.json(
        { error: "Brief not found" },
        { status: 404 },
      );
    }

    const brief = briefRows[0];

    const generated = generateArticleFromBrief({
      title: brief.title as string,
      targetKeyword: (brief.target_keyword as string) ?? null,
      secondaryKeywords: Array.isArray(brief.secondary_keywords)
        ? (brief.secondary_keywords as string[])
        : [],
      briefText: (brief.brief_text as string) ?? null,
      outline: brief.outline ?? null,
      domain: (brief.domain as string) ?? "example.com",
    });

    const result = await sql`
      INSERT INTO content_articles (
        brief_id, client_id, title, slug, body,
        meta_title, meta_description, word_count, seo_score,
        status, llm_model
      )
      VALUES (
        ${brief_id},
        ${brief.client_id},
        ${generated.title},
        ${generated.slug},
        ${generated.body},
        ${generated.metaTitle},
        ${generated.metaDescription},
        ${generated.wordCount},
        ${generated.seoScore},
        'review',
        'nexus-template-v1'
      )
      RETURNING *
    `;

    await sql`
      UPDATE content_briefs
      SET status = 'in_progress', updated_at = NOW()
      WHERE id = ${brief_id}
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("[content/articles] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create article" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      id,
      status,
      title,
      body: articleBody,
      meta_title,
      meta_description,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Article ID is required" },
        { status: 400 },
      );
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
  } catch (error) {
    console.error("[content/articles] PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update article" },
      { status: 500 },
    );
  }
}
