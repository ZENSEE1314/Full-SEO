import { NextRequest, NextResponse } from "next/server";

import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { generateArticleFromBrief } from "@/lib/content/generator";

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
      SELECT cb.*, c.org_id, c.domain, k.keyword AS target_keyword
      FROM content_briefs cb
      JOIN clients c ON cb.client_id = c.id
      LEFT JOIN keywords k ON cb.target_keyword_id = k.id
      WHERE cb.id = ${brief_id} AND c.org_id = ${session.orgId}
    `;

    if (briefRows.length === 0) {
      return NextResponse.json({ error: "Brief not found" }, { status: 404 });
    }

    const brief = briefRows[0];

    // Generate the article inline
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

    // Insert article
    const articleRows = await sql`
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

    // Update brief status
    await sql`
      UPDATE content_briefs
      SET status = 'in_progress', updated_at = NOW()
      WHERE id = ${brief_id}
    `;

    // Log the action
    await sql`
      INSERT INTO agent_action_log (client_id, module, action_type, summary, status, created_at)
      VALUES (
        ${brief.client_id},
        'content_factory',
        'generate_article',
        ${`Generated "${generated.title}" (${generated.wordCount} words, SEO score: ${generated.seoScore}/100)`},
        'success',
        NOW()
      )
    `;

    return NextResponse.json(
      {
        message: "Article generated successfully",
        article: articleRows[0],
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[content/generate] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate article" },
      { status: 500 },
    );
  }
}
