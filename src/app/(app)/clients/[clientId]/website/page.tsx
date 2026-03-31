import { redirect, notFound } from "next/navigation";

import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { ClientDetailTabs } from "@/components/clients/client-detail-tabs";
import { WebsiteContent } from "@/components/website/website-content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  try {
    const { clientId } = await params;
    const rows = await sql`SELECT name FROM clients WHERE id = ${clientId} LIMIT 1`;
    const name = (rows[0] as { name: string } | undefined)?.name ?? "Client";
    return { title: `Website Builder - ${name} | NEXUS SEO` };
  } catch {
    return { title: "Website Builder | NEXUS SEO" };
  }
}

interface PageRow {
  id: string;
  url: string;
  title: string | null;
  meta_description: string | null;
  h1: string | null;
  canonical_url: string | null;
  status_code: number | null;
  is_indexed: boolean;
  page_type: string | null;
  issue_count: number;
  has_schema: boolean;
  schema_count: number;
  speed_score: number | null;
}

export default async function WebsitePage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { clientId } = await params;

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(clientId)) notFound();

  let clientName = "";
  let clientDomain = "";

  try {
    const clientRows = await sql`
      SELECT id, name, domain FROM clients
      WHERE id = ${clientId} AND org_id = ${session.orgId}
    `;
    if (clientRows.length === 0) notFound();
    const client = clientRows[0] as { name: string; domain: string };
    clientName = client.name;
    clientDomain = client.domain ?? "";
  } catch {
    notFound();
  }

  let pages: PageRow[] = [];
  let issues: Record<string, unknown>[] = [];
  let schemas: Record<string, unknown>[] = [];

  try {
    const [pagesRows, issuesRows, schemaRows] = await Promise.all([
      sql`
        SELECT
          p.id,
          p.url,
          p.title,
          p.meta_description,
          p.h1,
          p.canonical_url,
          p.status_code::int,
          p.is_indexed,
          p.page_type,
          COALESCE(
            (SELECT COUNT(*) FROM technical_issues ti
             WHERE ti.page_id = p.id AND ti.fixed_at IS NULL), 0
          )::int AS issue_count,
          COALESCE(
            (SELECT COUNT(*) > 0 FROM schema_markups sm
             WHERE sm.page_id = p.id), false
          ) AS has_schema,
          COALESCE(
            (SELECT COUNT(*) FROM schema_markups sm
             WHERE sm.page_id = p.id), 0
          )::int AS schema_count,
          COALESCE(
            (SELECT pss.performance_score::float
             FROM page_speed_scores pss
             WHERE pss.page_id = p.id
             ORDER BY pss.recorded_at DESC LIMIT 1), NULL
          ) AS speed_score
        FROM pages p
        WHERE p.client_id = ${clientId}
        ORDER BY p.url ASC
      `,
      sql`
        SELECT
          ti.id,
          ti.page_id,
          ti.issue_type,
          ti.severity,
          ti.description,
          ti.auto_fixable,
          ti.detected_at::text AS detected_at,
          p.url AS page_url
        FROM technical_issues ti
        LEFT JOIN pages p ON p.id = ti.page_id
        WHERE ti.client_id = ${clientId} AND ti.fixed_at IS NULL
        ORDER BY
          CASE ti.severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,
          ti.detected_at DESC
      `,
      sql`
        SELECT
          sm.id,
          sm.page_id,
          p.url AS page_url,
          sm.schema_type,
          sm.json_ld::text AS json_ld,
          sm.is_valid,
          COALESCE(sm.validation_errors, ARRAY[]::text[]) AS errors,
          sm.created_at::text AS created_at
        FROM schema_markups sm
        JOIN pages p ON p.id = sm.page_id
        WHERE p.client_id = ${clientId}
        ORDER BY sm.schema_type ASC
      `,
    ]);

    pages = pagesRows as PageRow[];
    issues = issuesRows as Record<string, unknown>[];
    schemas = schemaRows as Record<string, unknown>[];
  } catch (error) {
    console.error("[website] Data query error:", error);
  }

  return (
    <div className="min-h-screen bg-background">
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(16,185,129,0.08), transparent)",
        }}
        aria-hidden="true"
      />

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="animate-[fade-in_0.5s_ease-out_both]">
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Website Builder
          </h1>
          <p className="mt-1 text-base text-muted-foreground">
            Edit SEO elements, fix issues, and optimize {clientName || "your site"} for search engines
          </p>
        </header>

        <ClientDetailTabs clientId={clientId} />

        <WebsiteContent
          pages={pages}
          issues={issues}
          schemas={schemas}
          clientId={clientId}
          clientDomain={clientDomain}
        />
      </div>
    </div>
  );
}
