import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { pageId, clientId, title, meta_description, h1, canonical_url } = body;

  if (!pageId || !clientId) {
    return NextResponse.json({ error: "Missing pageId or clientId" }, { status: 400 });
  }

  // Verify client belongs to org
  const clientCheck = await sql`
    SELECT id FROM clients WHERE id = ${clientId} AND org_id = ${session.orgId}
  `;
  if (clientCheck.length === 0) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // Verify page belongs to client
  const pageCheck = await sql`
    SELECT id FROM pages WHERE id = ${pageId} AND client_id = ${clientId}
  `;
  if (pageCheck.length === 0) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  // Update page SEO fields
  await sql`
    UPDATE pages SET
      title = ${title || null},
      meta_description = ${meta_description || null},
      h1 = ${h1 || null},
      canonical_url = ${canonical_url || null},
      updated_at = NOW()
    WHERE id = ${pageId}
  `;

  // Resolve related technical issues
  if (title) {
    await sql`
      UPDATE technical_issues SET fixed_at = NOW()
      WHERE page_id = ${pageId} AND issue_type = 'missing_title' AND fixed_at IS NULL
    `;
  }
  if (meta_description) {
    await sql`
      UPDATE technical_issues SET fixed_at = NOW()
      WHERE page_id = ${pageId} AND issue_type IN ('missing_meta_description', 'missing_description') AND fixed_at IS NULL
    `;
  }
  if (h1) {
    await sql`
      UPDATE technical_issues SET fixed_at = NOW()
      WHERE page_id = ${pageId} AND issue_type IN ('missing_h1', 'multiple_h1') AND fixed_at IS NULL
    `;
  }
  if (canonical_url) {
    await sql`
      UPDATE technical_issues SET fixed_at = NOW()
      WHERE page_id = ${pageId} AND issue_type IN ('missing_canonical', 'canonical_mismatch') AND fixed_at IS NULL
    `;
  }

  // Log action
  await sql`
    INSERT INTO agent_action_log (client_id, module, action_type, summary, status, triggered_by)
    VALUES (
      ${clientId}, 'website', 'seo_edit',
      ${"Updated SEO elements for page: " + (title || pageId)},
      'completed', 'user'
    )
  `;

  return NextResponse.json({ ok: true });
}
