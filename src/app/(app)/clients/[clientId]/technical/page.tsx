import { redirect, notFound } from "next/navigation";

import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { ClientDetailTabs } from "@/components/clients/client-detail-tabs";
import { VitalsCards } from "@/components/technical/vitals-cards";
import { IssuesPanel } from "@/components/technical/issues-panel";
import { PagesTable } from "@/components/technical/pages-table";
import { SpeedChart } from "@/components/technical/speed-chart";
import { SchemaViewer } from "@/components/technical/schema-viewer";
import { RunAuditButton } from "@/components/technical/run-audit-button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const rows = await sql`SELECT name FROM clients WHERE id = ${clientId} LIMIT 1`;
  const name = (rows[0] as { name: string } | undefined)?.name ?? "Client";
  return { title: `Technical SEO - ${name} | NEXUS SEO` };
}

interface VitalsAvg {
  avg_lcp: number | null;
  avg_fid: number | null;
  avg_cls: number | null;
  avg_ttfb: number | null;
}

interface IssueSeverityCount {
  severity: "critical" | "warning" | "info";
  count: number;
}

interface PageRow {
  id: string;
  url: string;
  title: string | null;
  status_code: number | null;
  is_indexed: boolean | null;
  page_type: string | null;
  speed_score: number | null;
  issue_count: number;
}

interface IssueRow {
  id: string;
  issue_type: string;
  severity: "critical" | "warning" | "info";
  description: string | null;
  page_url: string | null;
  auto_fixable: boolean;
  fixed_at: string | null;
  detected_at: string;
}

interface SpeedRecord {
  recorded_at: string;
  performance_score: number | null;
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  ttfb: number | null;
  device: "mobile" | "desktop";
}

interface SchemaRow {
  id: string;
  page_url: string;
  schema_type: string;
  json_ld: string;
  is_valid: boolean;
  errors: string[];
}

export default async function TechnicalPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { clientId } = await params;

  let vitals: VitalsAvg = { avg_lcp: null, avg_fid: null, avg_cls: null, avg_ttfb: null };
  let vitalsHistory = { lcp: [] as number[], fid: [] as number[], cls: [] as number[], ttfb: [] as number[] };
  let issueCounts: IssueSeverityCount[] = [];
  let totalIssues = 0;
  let pages: PageRow[] = [];
  let issues: IssueRow[] = [];
  let speedHistory: SpeedRecord[] = [];
  let schemas: SchemaRow[] = [];

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
          AVG(pss.lcp) AS avg_lcp,
          AVG(pss.fid) AS avg_fid,
          AVG(pss.cls) AS avg_cls,
          AVG(pss.ttfb) AS avg_ttfb
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
            (SELECT pss.performance_score
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
          ti.detected_at,
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
          pss.recorded_at,
          pss.performance_score,
          pss.lcp,
          pss.fid,
          pss.cls,
          pss.ttfb,
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
          sm.json_ld,
          sm.is_valid,
          COALESCE(sm.validation_errors, '{}') AS errors
        FROM schema_markups sm
        JOIN pages p ON p.id = sm.page_id
        WHERE p.client_id = ${clientId}
        ORDER BY sm.schema_type ASC
      `,
      sql`
        SELECT
          pss.lcp,
          pss.fid,
          pss.cls,
          pss.ttfb,
          pss.recorded_at
        FROM page_speed_scores pss
        JOIN pages p ON p.id = pss.page_id
        WHERE p.client_id = ${clientId}
          AND pss.recorded_at >= NOW() - INTERVAL '30 days'
        ORDER BY pss.recorded_at ASC
        LIMIT 30
      `,
    ]);

    vitals = (vitalsRows[0] as VitalsAvg | undefined) ?? {
      avg_lcp: null,
      avg_fid: null,
      avg_cls: null,
      avg_ttfb: null,
    };

    vitalsHistory = {
      lcp: vitalsHistoryRows.map((r) => (r as { lcp: number | null }).lcp).filter((v): v is number => v !== null),
      fid: vitalsHistoryRows.map((r) => (r as { fid: number | null }).fid).filter((v): v is number => v !== null),
      cls: vitalsHistoryRows.map((r) => (r as { cls: number | null }).cls).filter((v): v is number => v !== null),
      ttfb: vitalsHistoryRows.map((r) => (r as { ttfb: number | null }).ttfb).filter((v): v is number => v !== null),
    };

    issueCounts = issueCountRows as unknown as IssueSeverityCount[];
    totalIssues = issueCounts.reduce((sum, r) => sum + Number(r.count), 0);
    pages = pagesRows as unknown as PageRow[];
    issues = issuesRows as unknown as IssueRow[];
    speedHistory = speedHistoryRows as unknown as SpeedRecord[];
    schemas = schemaRows as unknown as SchemaRow[];
  } catch {
    // Use default empty values
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Atmospheric emerald glow */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(16,185,129,0.08), transparent)",
        }}
        aria-hidden="true"
      />

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
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

        {/* Tab navigation */}
        <ClientDetailTabs clientId={clientId} />

        {/* Core Web Vitals */}
        <section className="animate-[slide-up_0.4s_ease-out_0.1s_both]">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Core Web Vitals
          </h2>
          <VitalsCards
            vitals={{
              lcp: vitals.avg_lcp ? Number(vitals.avg_lcp) : null,
              fid: vitals.avg_fid ? Number(vitals.avg_fid) : null,
              cls: vitals.avg_cls ? Number(vitals.avg_cls) : null,
              ttfb: vitals.avg_ttfb ? Number(vitals.avg_ttfb) : null,
            }}
            history={vitalsHistory}
          />
        </section>

        {/* Two-column layout: Issues + Speed Chart */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 animate-[slide-up_0.4s_ease-out_0.2s_both]">
          <IssuesPanel issues={issues} clientId={clientId} />
          <div className="flex flex-col gap-6">
            <SpeedChart records={speedHistory} />
            <SchemaViewer schemas={schemas} />
          </div>
        </div>

        {/* Pages table */}
        <section className="animate-[slide-up_0.4s_ease-out_0.3s_both]">
          <PagesTable pages={pages} />
        </section>
      </div>
    </div>
  );
}
