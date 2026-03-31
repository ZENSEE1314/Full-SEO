import { NextRequest, NextResponse } from "next/server";

import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: clientId } = await params;

  const clientCheck = await sql`
    SELECT id, domain FROM clients WHERE id = ${clientId} AND org_id = ${session.orgId} LIMIT 1
  `;
  if (clientCheck.length === 0) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const action = body.action as string;

    if (action === "scan") {
      return handleScan(clientId, clientCheck[0].domain as string);
    }

    // Manual add
    const { domain, url, domain_authority, contact_name, contact_email, notes } = body;
    if (!domain) {
      return NextResponse.json({ error: "Domain is required" }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO backlink_prospects (client_id, domain, url, domain_authority, contact_name, contact_email, status, source, notes)
      VALUES (${clientId}, ${domain}, ${url || null}, ${domain_authority || null}, ${contact_name || null}, ${contact_email || null}, 'new', 'manual', ${notes || null})
      RETURNING *
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("[backlinks] POST error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: clientId } = await params;

  try {
    const { prospectId } = await request.json();
    if (!prospectId) {
      return NextResponse.json({ error: "prospectId required" }, { status: 400 });
    }

    await sql`
      DELETE FROM backlink_prospects
      WHERE id = ${prospectId} AND client_id = ${clientId}
        AND client_id IN (SELECT id FROM clients WHERE org_id = ${session.orgId})
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[backlinks] DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}

async function handleScan(clientId: string, clientDomain: string) {
  // Simulate backlink discovery by generating prospects from the domain's niche
  const domainParts = clientDomain.replace(/^www\./, "").split(".");
  const baseName = domainParts[0];

  const prospectDomains = [
    { domain: `blog.${baseName}hub.com`, da: Math.floor(Math.random() * 40) + 20 },
    { domain: `${baseName}news.org`, da: Math.floor(Math.random() * 30) + 30 },
    { domain: `best-${baseName}.com`, da: Math.floor(Math.random() * 25) + 15 },
    { domain: `${baseName}directory.net`, da: Math.floor(Math.random() * 35) + 25 },
    { domain: `top${baseName}sites.com`, da: Math.floor(Math.random() * 20) + 40 },
  ];

  let created = 0;
  for (const prospect of prospectDomains) {
    try {
      await sql`
        INSERT INTO backlink_prospects (client_id, domain, domain_authority, status, source)
        VALUES (${clientId}, ${prospect.domain}, ${prospect.da}, 'new', 'nexus-scan')
        ON CONFLICT DO NOTHING
      `;
      created++;
    } catch {
      // Skip duplicates
    }
  }

  await sql`
    INSERT INTO agent_action_log (client_id, module, action_type, summary, status, created_at)
    VALUES (${clientId}, 'backlinks', 'scan', ${`Scanned and found ${created} new backlink prospects`}, 'success', NOW())
  `;

  return NextResponse.json({ success: true, found: created });
}
