import { redirect, notFound } from "next/navigation";

import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { ClientDetailTabs } from "@/components/clients/client-detail-tabs";
import { RunAuditButton } from "@/components/technical/run-audit-button";
import { TechnicalContent } from "@/components/technical/technical-content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  try {
    const { clientId } = await params;
    const rows = await sql`SELECT name FROM clients WHERE id = ${clientId} LIMIT 1`;
    const name = (rows[0] as { name: string } | undefined)?.name ?? "Client";
    return { title: `Technical SEO - ${name} | NEXUS SEO` };
  } catch {
    return { title: "Technical SEO | NEXUS SEO" };
  }
}

interface VitalsAvg {
  avg_lcp: string | null;
  avg_fid: string | null;
  avg_cls: string | null;
  avg_ttfb: string | null;
}

export default async function TechnicalPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { clientId } = await params;

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(clientId)) notFound();

  try {
    const clientRows = await sql`
      SELECT id, name FROM clients
      WHERE id = ${clientId} AND org_id = ${session.orgId}
    `;
    if (clientRows.length === 0) notFound();
  } catch (error) {
    console.error("[technical] Client check error:", error);
    notFound();
  }

  let vitals = { lcp: null as number | null, fid: null as number | null, cls: null as number | null, ttfb: null as number | null };
  let vitalsHistory = { lcp: [] as number[], fid: [] as number[], cls: [] as number[], ttfb: [] as number[] };
  let totalIssues = 0;
  let pages: Record<string, unknown>[] = [];
  let issues: Record<string, unknown>[] = [];
  let speedHistory: Record<string, unknown>[] = [];
  let schemas: Record<string, unknown>[] = [];

  try {
    const [
      vitalsRows,
      issueCountRows,
      pagesRows,
      issuesRows,
      speedHistoryRows,
      schemaRows,
      vitalsHistoryRows,
    ] = await Promise.all([
      sql`
        SELECT
          AVG(pss.lcp)::float AS avg_lcp,
          AVG(pss.fid)::float AS avg_fid,
          AVG(pss.cls)::float AS avg_cls,
          AVG(pss.ttfb)::float AS avg_ttfb
        FROM page_speed_scores pss
        JOIN pages p ON p.id = pss.page_id
        WHERE p.client_id = ${clientId}
          AND pss.recorded_at >= NOW() - INTERVAL '30 days'
      `,
      sql`
        SELECT severity, COUNT(*)::int AS count
        FROM technical_issues
        WHERE client_id = ${clientId} AND fixed_at IS NULL
        GROUP BY severity
      `,
      sql`
        SELECT
          p.id,
          p.url,
          p.title,
          p.status_code,
          p.is_indexed,
          p.page_type,
          COALESCE(
            (SELECT pss.performance_score::float
             FROM page_speed_scores pss
             WHERE pss.page_id = p.id
             ORDER BY pss.recorded_at DESC
             LIMIT 1),
            NULL
          ) AS speed_score,
          COALESCE(
            (SELECT COUNT(*)
             FROM technical_issues ti
             WHERE ti.page_id = p.id AND ti.fixed_at IS NULL),
            0
          )::int AS issue_count
        FROM pages p
        WHERE p.client_id = ${clientId}
        ORDER BY p.url ASC
      `,
      sql`
        SELECT
          ti.id,
          ti.issue_type,
          ti.severity,
          ti.description,
          ti.auto_fixable,
          ti.fixed_at,
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
          pss.recorded_at::text AS recorded_at,
          pss.performance_score::float AS performance_score,
          pss.lcp::float,
          pss.fid::float,
          pss.cls::float,
          pss.ttfb::float,
          pss.device
        FROM page_speed_scores pss
        JOIN pages p ON p.id = pss.page_id
        WHERE p.client_id = ${clientId}
        ORDER BY pss.recorded_at ASC
      `,
      sql`
        SELECT
          sm.id,
          p.url AS page_url,
          sm.schema_type,
          sm.json_ld::text AS json_ld,
          sm.is_valid,
          COALESCE(sm.validation_errors, ARRAY[]::text[]) AS errors
        FROM schema_markups sm
        JOIN pages p ON p.id = sm.page_id
        WHERE p.client_id = ${clientId}
        ORDER BY sm.schema_type ASC
      `,
      sql`
        SELECT
          pss.lcp::float,
          pss.fid::float,
          pss.cls::float,
          pss.ttfb::float,
          pss.recorded_at::text
        FROM page_speed_scores pss
        JOIN pages p ON p.id = pss.page_id
        WHERE p.client_id = ${clientId}
          AND pss.recorded_at >= NOW() - INTERVAL '30 days'
        ORDER BY pss.recorded_at ASC
        LIMIT 30
      `,
    ]);

    const v = vitalsRows[0] as VitalsAvg | undefined;
    if (v) {
      vitals = {
        lcp: v.avg_lcp !== null ? Number(v.avg_lcp) : null,
        fid: v.avg_fid !== null ? Number(v.avg_fid) : null,
        cls: v.avg_cls !== null ? Number(v.avg_cls) : null,
        ttfb: v.avg_ttfb !== null ? Number(v.avg_ttfb) : null,
      };
    }

    vitalsHistory = {
      lcp: vitalsHistoryRows.map((r) => Number((r as Record<string, unknown>).lcp)).filter((n) => !isNaN(n)),
      fid: vitalsHistoryRows.map((r) => Number((r as Record<string, unknown>).fid)).filter((n) => !isNaN(n)),
      cls: vitalsHistoryRows.map((r) => Number((r as Record<string, unknown>).cls)).filter((n) => !isNaN(n)),
      ttfb: vitalsHistoryRows.map((r) => Number((r as Record<string, unknown>).ttfb)).filter((n) => !isNaN(n)),
    };

    totalIssues = (issueCountRows as { count: number }[]).reduce((sum, r) => sum + Number(r.count), 0);
    pages = pagesRows as Record<string, unknown>[];
    issues = issuesRows as Record<string, unknown>[];
    speedHistory = speedHistoryRows as Record<string, unknown>[];
    schemas = schemaRows as Record<string, unknown>[];
  } catch (error) {
    console.error("[technical] Data query error:", error);
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
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-[fade-in_0.5s_ease-out_both]">
          <div>
            <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Technical SEO
            </h1>
            <p className="mt-1 text-base text-muted-foreground">
              {pages.length} page{pages.length !== 1 ? "s" : ""} crawled
              {totalIssues > 0 && (
                <span className="text-amber-400">
                  {" "}&middot; {totalIssues} open issue{totalIssues !== 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>
          <RunAuditButton clientId={clientId} />
        </header>

        <ClientDetailTabs clientId={clientId} />

        <TechnicalContent
          vitals={vitals}
          vitalsHistory={vitalsHistory}
          totalIssues={totalIssues}
          pages={pages}
          issues={issues}
          speedHistory={speedHistory}
          schemas={schemas}
          clientId={clientId}
        />
      </div>
    </div>
  );
}
