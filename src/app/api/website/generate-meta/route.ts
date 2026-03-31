import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { pageId, clientId, url, currentTitle, currentH1 } = body;

  if (!pageId || !clientId) {
    return NextResponse.json({ error: "Missing pageId or clientId" }, { status: 400 });
  }

  // Verify client belongs to org
  const clientRows = await sql`
    SELECT id, name, domain FROM clients WHERE id = ${clientId} AND org_id = ${session.orgId}
  `;
  if (clientRows.length === 0) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const client = clientRows[0] as { name: string; domain: string };
  const domain = client.domain || getDomainFromUrl(url);
  const path = getPathFromUrl(url);
  const pageName = getPageNameFromPath(path);

  // Generate smart meta based on URL structure and existing data
  const title = currentTitle || generateTitle(pageName, client.name);
  const metaDescription = generateDescription(pageName, client.name, domain);
  const h1 = currentH1 || generateH1(pageName);
  const canonicalUrl = url;

  return NextResponse.json({
    title,
    meta_description: metaDescription,
    h1,
    canonical_url: canonicalUrl,
  });
  } catch (error) {
    console.error("[generate-meta] POST error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

function getDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function getPathFromUrl(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function getPageNameFromPath(path: string): string {
  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0) return "Home";
  const last = segments[segments.length - 1];
  return last
    .replace(/[-_]/g, " ")
    .replace(/\.\w+$/, "")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function generateTitle(pageName: string, brand: string): string {
  if (pageName === "Home") {
    return `${brand} - Official Website`;
  }
  const title = `${pageName} | ${brand}`;
  if (title.length > 60) {
    return pageName.slice(0, 56) + "...";
  }
  return title;
}

function generateDescription(pageName: string, brand: string, domain: string): string {
  if (pageName === "Home") {
    return `Welcome to ${brand}. Discover our products, services, and latest updates. Visit ${domain} to learn more.`;
  }

  const templates = [
    `Learn about ${pageName.toLowerCase()} at ${brand}. Find comprehensive information, guides, and resources.`,
    `Explore ${pageName.toLowerCase()} — ${brand} provides expert insights and solutions. Visit us today.`,
    `${pageName} by ${brand}. Get detailed information and discover what we offer. Read more on ${domain}.`,
  ];

  const template = templates[pageName.length % templates.length];
  return template.length > 160 ? template.slice(0, 157) + "..." : template;
}

function generateH1(pageName: string): string {
  return pageName;
}
