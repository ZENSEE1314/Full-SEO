import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

interface SeoIssue {
  type: string;
  severity: "critical" | "warning" | "info";
  message: string;
  line?: number;
  fix?: string;
}

export async function POST(req: NextRequest) {
  try {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { fileId, clientId, content, filePath } = body;

  if (!clientId || !content) {
    return NextResponse.json({ error: "Missing clientId or content" }, { status: 400 });
  }

  const clientCheck = await sql`
    SELECT id, name, domain FROM clients WHERE id = ${clientId} AND org_id = ${session.orgId}
  `;
  if (clientCheck.length === 0) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const client = clientCheck[0] as { name: string; domain: string };
  const issues = analyzeHtml(content, filePath || "index.html");
  const autoFixedContent = applyAutoFixes(content, issues, client.name, client.domain);

  return NextResponse.json({ issues, autoFixedContent });
  } catch (error) {
    console.error("[website/analyze] POST error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

function analyzeHtml(html: string, filePath: string): SeoIssue[] {
  const issues: SeoIssue[] = [];
  const lower = html.toLowerCase();

  // Only analyze HTML files
  if (!filePath.match(/\.(html?|php|jsx|tsx|vue|svelte|astro)$/i)) {
    return issues;
  }

  // Missing <title>
  if (!/<title[^>]*>(.+?)<\/title>/i.test(html)) {
    issues.push({
      type: "missing_title",
      severity: "critical",
      message: "Missing <title> tag — critical for SEO rankings and click-through rate",
      fix: "add_title",
    });
  } else {
    const titleMatch = html.match(/<title[^>]*>(.+?)<\/title>/i);
    if (titleMatch) {
      const titleLen = titleMatch[1].trim().length;
      if (titleLen > 60) {
        issues.push({
          type: "title_too_long",
          severity: "warning",
          message: `Title tag is ${titleLen} characters — may be truncated (recommended: 50-60)`,
        });
      } else if (titleLen < 30) {
        issues.push({
          type: "title_too_short",
          severity: "warning",
          message: `Title tag is ${titleLen} characters — consider making it longer (recommended: 50-60)`,
        });
      }
    }
  }

  // Missing meta description
  if (!/<meta\s[^>]*name=["']description["'][^>]*>/i.test(html)) {
    issues.push({
      type: "missing_meta_description",
      severity: "critical",
      message: "Missing meta description — hurts click-through rate in search results",
      fix: "add_meta_description",
    });
  } else {
    const descMatch = html.match(/<meta\s[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
    if (descMatch) {
      const descLen = descMatch[1].length;
      if (descLen > 160) {
        issues.push({
          type: "meta_description_too_long",
          severity: "warning",
          message: `Meta description is ${descLen} characters — will be truncated (recommended: 120-160)`,
        });
      }
    }
  }

  // Missing H1
  if (!/<h1[^>]*>/i.test(html)) {
    issues.push({
      type: "missing_h1",
      severity: "critical",
      message: "Missing H1 heading — every page needs exactly one H1 for SEO",
      fix: "add_h1",
    });
  }

  // Multiple H1s
  const h1Matches = html.match(/<h1[^>]*>/gi);
  if (h1Matches && h1Matches.length > 1) {
    issues.push({
      type: "multiple_h1",
      severity: "warning",
      message: `Found ${h1Matches.length} H1 tags — use only one H1 per page`,
    });
  }

  // Missing canonical
  if (!/<link\s[^>]*rel=["']canonical["'][^>]*>/i.test(html)) {
    issues.push({
      type: "missing_canonical",
      severity: "warning",
      message: "Missing canonical URL — can cause duplicate content issues",
      fix: "add_canonical",
    });
  }

  // Missing viewport meta
  if (!/<meta\s[^>]*name=["']viewport["'][^>]*>/i.test(html)) {
    issues.push({
      type: "missing_viewport",
      severity: "critical",
      message: "Missing viewport meta tag — page won't be mobile-friendly",
      fix: "add_viewport",
    });
  }

  // Missing charset
  if (!/<meta\s[^>]*charset/i.test(html)) {
    issues.push({
      type: "missing_charset",
      severity: "warning",
      message: "Missing charset declaration",
      fix: "add_charset",
    });
  }

  // Missing Open Graph tags
  if (!/<meta\s[^>]*property=["']og:title["']/i.test(html)) {
    issues.push({
      type: "missing_og_tags",
      severity: "info",
      message: "Missing Open Graph tags — improves social media sharing previews",
      fix: "add_og_tags",
    });
  }

  // No structured data / JSON-LD
  if (!/<script\s[^>]*type=["']application\/ld\+json["'][^>]*>/i.test(html)) {
    issues.push({
      type: "no_structured_data",
      severity: "warning",
      message: "No JSON-LD structured data found — helps search engines understand your content",
      fix: "add_json_ld",
    });
  }

  // Missing alt attributes on images
  const imgWithoutAlt = html.match(/<img(?![^>]*\balt\s*=)[^>]*>/gi);
  if (imgWithoutAlt && imgWithoutAlt.length > 0) {
    issues.push({
      type: "images_missing_alt",
      severity: "warning",
      message: `${imgWithoutAlt.length} image(s) missing alt attribute — hurts accessibility and image SEO`,
    });
  }

  // Missing lang attribute
  if (/<html/i.test(html) && !/<html\s[^>]*lang=/i.test(html)) {
    issues.push({
      type: "missing_lang",
      severity: "info",
      message: "Missing lang attribute on <html> — helps search engines detect page language",
      fix: "add_lang",
    });
  }

  // HTTP links (mixed content)
  if (/(?:src|href)=["']http:\/\//i.test(html)) {
    issues.push({
      type: "mixed_content",
      severity: "warning",
      message: "Found HTTP links — use HTTPS to avoid mixed content warnings",
    });
  }

  return issues;
}

function applyAutoFixes(html: string, issues: SeoIssue[], brandName: string, domain: string): string {
  let fixed = html;
  const fixTypes = new Set(issues.filter((i) => i.fix).map((i) => i.fix));

  // Find or create <head> section
  const hasHead = /<head[^>]*>/i.test(fixed);

  const metaTags: string[] = [];

  if (fixTypes.has("add_charset")) {
    metaTags.push('  <meta charset="UTF-8" />');
  }

  if (fixTypes.has("add_viewport")) {
    metaTags.push('  <meta name="viewport" content="width=device-width, initial-scale=1.0" />');
  }

  if (fixTypes.has("add_title")) {
    metaTags.push(`  <title>${brandName} - Official Website</title>`);
  }

  if (fixTypes.has("add_meta_description")) {
    metaTags.push(`  <meta name="description" content="Welcome to ${brandName}. Discover our products, services, and latest updates." />`);
  }

  if (fixTypes.has("add_canonical")) {
    const canonUrl = domain ? `https://${domain}` : "https://example.com";
    metaTags.push(`  <link rel="canonical" href="${canonUrl}" />`);
  }

  if (fixTypes.has("add_og_tags")) {
    metaTags.push(`  <meta property="og:title" content="${brandName}" />`);
    metaTags.push(`  <meta property="og:description" content="Welcome to ${brandName}." />`);
    metaTags.push(`  <meta property="og:type" content="website" />`);
    if (domain) metaTags.push(`  <meta property="og:url" content="https://${domain}" />`);
  }

  if (fixTypes.has("add_json_ld")) {
    const schema = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: brandName,
      url: domain ? `https://${domain}` : "https://example.com",
    };
    metaTags.push(`  <script type="application/ld+json">\n${JSON.stringify(schema, null, 4)}\n  </script>`);
  }

  if (metaTags.length > 0) {
    const injection = "\n" + metaTags.join("\n") + "\n";
    if (hasHead) {
      fixed = fixed.replace(/(<head[^>]*>)/i, `$1${injection}`);
    } else if (/<html/i.test(fixed)) {
      fixed = fixed.replace(/(<html[^>]*>)/i, `$1\n<head>${injection}</head>`);
    } else {
      fixed = `<!DOCTYPE html>\n<html lang="en">\n<head>${injection}</head>\n${fixed}`;
    }
  }

  // Add lang attribute
  if (fixTypes.has("add_lang") && /<html/i.test(fixed) && !/<html\s[^>]*lang=/i.test(fixed)) {
    fixed = fixed.replace(/<html/i, '<html lang="en"');
  }

  // Add H1 after <body> if missing
  if (fixTypes.has("add_h1")) {
    if (/<body[^>]*>/i.test(fixed)) {
      fixed = fixed.replace(/(<body[^>]*>)/i, `$1\n  <h1>${brandName}</h1>`);
    }
  }

  return fixed;
}
