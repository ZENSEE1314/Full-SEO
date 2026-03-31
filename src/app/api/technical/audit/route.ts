import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { sql } from "@/lib/db";

const FETCH_TIMEOUT_MS = 15_000;

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let clientId: string;
  try {
    const body = await request.json();
    clientId = body.clientId;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!clientId) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }

  try {
    const clientRows = await sql`
      SELECT id, domain FROM clients
      WHERE id = ${clientId} AND org_id = ${session.orgId}
    `;

    if (clientRows.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const domain = clientRows[0].domain as string;
    if (!domain) {
      return NextResponse.json({ error: "Client has no domain set" }, { status: 400 });
    }

    const auditResult = await runInlineAudit(clientId, domain);

    return NextResponse.json({ success: true, data: auditResult });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[audit] Failed:", message, error);
    return NextResponse.json(
      { error: `Audit failed: ${message}` },
      { status: 500 },
    );
  }
}

interface AuditResult {
  pagesAudited: number;
  issuesFound: number;
  url: string;
}

async function runInlineAudit(
  clientId: string,
  domain: string,
): Promise<AuditResult> {
  const url = domain.startsWith("http") ? domain : `https://${domain}`;
  let html = "";
  let statusCode = 0;
  let fetchTimeMs = 0;

  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "NEXUS-SEO-Auditor/1.0",
        Accept: "text/html",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);
    statusCode = response.status;
    html = await response.text();
    fetchTimeMs = Date.now() - startTime;
  } catch {
    fetchTimeMs = Date.now() - startTime;
    statusCode = 0;
  }

  const title = extractTag(html, "title");
  const metaDescription = extractMeta(html, "description");
  const h1 = extractTag(html, "h1");
  const canonical = extractCanonical(html);
  const hasRobotsNoindex = /meta[^>]*noindex/i.test(html);

  // Upsert page record
  const pageRows = await sql`
    INSERT INTO pages (client_id, url, title, meta_description, h1, canonical_url, status_code, is_indexed, page_type)
    VALUES (
      ${clientId},
      ${url},
      ${title},
      ${metaDescription},
      ${h1},
      ${canonical},
      ${statusCode || null},
      ${!hasRobotsNoindex},
      'homepage'
    )
    ON CONFLICT (client_id, url) DO UPDATE SET
      title = EXCLUDED.title,
      meta_description = EXCLUDED.meta_description,
      h1 = EXCLUDED.h1,
      canonical_url = EXCLUDED.canonical_url,
      status_code = EXCLUDED.status_code,
      is_indexed = EXCLUDED.is_indexed,
      updated_at = NOW()
    RETURNING id
  `;

  const pageId = pageRows[0].id as string;

  // Run SEO checks and collect issues
  const issues = detectIssues(html, title, metaDescription, h1, canonical, statusCode, hasRobotsNoindex, url);

  // Clear old unfixed issues for this page, then insert new ones
  await sql`
    DELETE FROM technical_issues
    WHERE client_id = ${clientId} AND page_id = ${pageId} AND fixed_at IS NULL
  `;

  for (const issue of issues) {
    await sql`
      INSERT INTO technical_issues (client_id, page_id, issue_type, severity, description, auto_fixable, detected_at)
      VALUES (${clientId}, ${pageId}, ${issue.type}, ${issue.severity}, ${issue.description}, ${issue.autoFixable}, NOW())
    `;
  }

  // Record speed score (TTFB approximation from fetch time)
  const ttfb = fetchTimeMs;
  const perfScore = calculatePerfScore(statusCode, ttfb);

  await sql`
    INSERT INTO page_speed_scores (page_id, performance_score, lcp, fid, cls, ttfb, device, recorded_at)
    VALUES (${pageId}, ${perfScore}, ${null}, ${null}, ${null}, ${ttfb}, 'desktop', NOW())
  `;

  // Log the action
  await sql`
    INSERT INTO agent_action_log (client_id, module, action_type, summary, status, created_at)
    VALUES (
      ${clientId},
      'technical_seo',
      'audit',
      ${`Audited ${url} — ${issues.length} issue${issues.length !== 1 ? "s" : ""} found (status ${statusCode || "timeout"})`},
      ${issues.some((i) => i.severity === "critical") ? "warning" : "success"},
      NOW()
    )
  `;

  // Recalculate health score for this client
  await recalculateHealthScore(clientId, perfScore);

  return {
    pagesAudited: 1,
    issuesFound: issues.length,
    url,
  };
}

interface Issue {
  type: string;
  severity: "critical" | "warning" | "info";
  description: string;
  autoFixable: boolean;
}

function detectIssues(
  html: string,
  title: string | null,
  metaDescription: string | null,
  h1: string | null,
  canonical: string | null,
  statusCode: number,
  hasRobotsNoindex: boolean,
  url: string,
): Issue[] {
  const issues: Issue[] = [];

  if (statusCode === 0) {
    issues.push({
      type: "site_unreachable",
      severity: "critical",
      description: `Could not reach ${url} — connection timed out or DNS failed.`,
      autoFixable: false,
    });
    return issues;
  }

  if (statusCode >= 500) {
    issues.push({
      type: "server_error",
      severity: "critical",
      description: `Server returned ${statusCode} error.`,
      autoFixable: false,
    });
  }

  if (statusCode === 404) {
    issues.push({
      type: "page_not_found",
      severity: "critical",
      description: "Homepage returned 404 status.",
      autoFixable: false,
    });
  }

  if (!title) {
    issues.push({
      type: "missing_title",
      severity: "critical",
      description: "Page is missing a <title> tag.",
      autoFixable: true,
    });
  } else if (title.length < 10) {
    issues.push({
      type: "short_title",
      severity: "warning",
      description: `Title tag is only ${title.length} characters (recommended: 50–60).`,
      autoFixable: true,
    });
  } else if (title.length > 60) {
    issues.push({
      type: "long_title",
      severity: "info",
      description: `Title tag is ${title.length} characters — may be truncated in SERPs (recommended: 50–60).`,
      autoFixable: true,
    });
  }

  if (!metaDescription) {
    issues.push({
      type: "missing_meta_description",
      severity: "warning",
      description: "Page is missing a meta description.",
      autoFixable: true,
    });
  } else if (metaDescription.length < 50) {
    issues.push({
      type: "short_meta_description",
      severity: "info",
      description: `Meta description is only ${metaDescription.length} characters (recommended: 120–160).`,
      autoFixable: true,
    });
  } else if (metaDescription.length > 160) {
    issues.push({
      type: "long_meta_description",
      severity: "info",
      description: `Meta description is ${metaDescription.length} characters — may be truncated (recommended: 120–160).`,
      autoFixable: true,
    });
  }

  if (!h1) {
    issues.push({
      type: "missing_h1",
      severity: "warning",
      description: "Page is missing an <h1> heading.",
      autoFixable: true,
    });
  }

  const h1Matches = html.match(/<h1[\s>]/gi);
  if (h1Matches && h1Matches.length > 1) {
    issues.push({
      type: "multiple_h1",
      severity: "warning",
      description: `Page has ${h1Matches.length} <h1> tags — should have exactly one.`,
      autoFixable: true,
    });
  }

  if (!canonical) {
    issues.push({
      type: "missing_canonical",
      severity: "warning",
      description: "Page is missing a canonical URL tag.",
      autoFixable: true,
    });
  }

  if (hasRobotsNoindex) {
    issues.push({
      type: "noindex_detected",
      severity: "critical",
      description: "Page has a noindex meta tag — it won't appear in search results.",
      autoFixable: false,
    });
  }

  if (!html.includes("lang=")) {
    issues.push({
      type: "missing_html_lang",
      severity: "info",
      description: "HTML tag is missing the lang attribute.",
      autoFixable: true,
    });
  }

  const hasViewport = /meta[^>]*viewport/i.test(html);
  if (!hasViewport) {
    issues.push({
      type: "missing_viewport",
      severity: "warning",
      description: "Page is missing a viewport meta tag — may not be mobile-friendly.",
      autoFixable: true,
    });
  }

  const hasHttpsRedirect = url.startsWith("https://");
  if (!hasHttpsRedirect) {
    issues.push({
      type: "no_https",
      severity: "critical",
      description: "Site is not served over HTTPS.",
      autoFixable: false,
    });
  }

  const imgWithoutAlt = (html.match(/<img(?![^>]*alt=)[^>]*>/gi) || []).length;
  if (imgWithoutAlt > 0) {
    issues.push({
      type: "images_missing_alt",
      severity: "warning",
      description: `${imgWithoutAlt} image${imgWithoutAlt !== 1 ? "s" : ""} missing alt attribute.`,
      autoFixable: true,
    });
  }

  const hasStructuredData = html.includes("application/ld+json");
  if (!hasStructuredData) {
    issues.push({
      type: "no_structured_data",
      severity: "info",
      description: "No JSON-LD structured data found on the page.",
      autoFixable: false,
    });
  }

  return issues;
}

function extractTag(html: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const match = html.match(regex);
  return match ? match[1].trim().replace(/\s+/g, " ") : null;
}

function extractMeta(html: string, name: string): string | null {
  const regex = new RegExp(
    `<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["']`,
    "i",
  );
  const match = html.match(regex);
  if (match) return match[1].trim();

  const reverseRegex = new RegExp(
    `<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${name}["']`,
    "i",
  );
  const reverseMatch = html.match(reverseRegex);
  return reverseMatch ? reverseMatch[1].trim() : null;
}

function extractCanonical(html: string): string | null {
  const match = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i);
  if (match) return match[1].trim();

  const reverseMatch = html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["']canonical["']/i);
  return reverseMatch ? reverseMatch[1].trim() : null;
}

function calculatePerfScore(statusCode: number, ttfbMs: number): number {
  if (statusCode === 0) return 0;
  if (statusCode >= 500) return 10;
  if (statusCode >= 400) return 20;

  if (ttfbMs < 200) return 95;
  if (ttfbMs < 500) return 85;
  if (ttfbMs < 1000) return 70;
  if (ttfbMs < 2000) return 50;
  if (ttfbMs < 5000) return 30;
  return 15;
}

const MAX_CRITICAL_DEDUCTION = 45;
const MAX_WARNING_DEDUCTION = 25;
const MAX_INFO_DEDUCTION = 10;
const CRITICAL_PENALTY = 15;
const WARNING_PENALTY = 5;
const INFO_PENALTY = 1;
const ISSUE_WEIGHT = 0.6;
const PERF_WEIGHT = 0.4;

async function recalculateHealthScore(
  clientId: string,
  latestPerfScore: number,
): Promise<void> {
  const issueCounts = await sql`
    SELECT severity, COUNT(*)::int AS count
    FROM technical_issues
    WHERE client_id = ${clientId} AND fixed_at IS NULL
    GROUP BY severity
  `;

  let issueScore = 100;
  for (const row of issueCounts) {
    const count = Number(row.count);
    if (row.severity === "critical") {
      issueScore -= Math.min(count * CRITICAL_PENALTY, MAX_CRITICAL_DEDUCTION);
    } else if (row.severity === "warning") {
      issueScore -= Math.min(count * WARNING_PENALTY, MAX_WARNING_DEDUCTION);
    } else {
      issueScore -= Math.min(count * INFO_PENALTY, MAX_INFO_DEDUCTION);
    }
  }
  issueScore = Math.max(0, issueScore);

  const perfNormalized = Math.max(0, Math.min(100, latestPerfScore));
  const healthScore = Math.round(
    issueScore * ISSUE_WEIGHT + perfNormalized * PERF_WEIGHT,
  );

  await sql`
    UPDATE clients
    SET health_score = ${healthScore}, updated_at = NOW()
    WHERE id = ${clientId}
  `;
}
