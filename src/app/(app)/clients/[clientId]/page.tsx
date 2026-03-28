import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  Globe,
  Search,
  FileText,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import { HealthScoreRing } from "@/components/clients/health-score-ring";
import { ClientDetailTabs } from "@/components/clients/client-detail-tabs";
import type { AgentAction, Keyword } from "@/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const rows = await sql`SELECT name FROM clients WHERE id = ${clientId} LIMIT 1`;
  const name = (rows[0] as { name: string } | undefined)?.name ?? "Client";
  return { title: `${name} | NEXUS SEO` };
}

interface ClientDetail {
  id: string;
  name: string;
  domain: string;
  status: "active" | "paused" | "archived";
  health_score: number | null;
  created_at: string;
  keyword_count: number;
  page_count: number;
  issue_count: number;
}

const STATUS_STYLES = {
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  paused: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  archived: "bg-slate-500/10 text-slate-400 border-slate-500/20",
} as const;

export default async function ClientOverviewPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { clientId } = await params;

  const [clientRows, topKeywordsRows, recentIssuesRows, recentActionsRows] =
    await Promise.all([
      sql`
        SELECT
          c.id, c.name, c.domain, c.status, c.health_score, c.created_at,
          COUNT(DISTINCT k.id) FILTER (WHERE k.is_tracked = true) AS keyword_count,
          COUNT(DISTINCT p.id) AS page_count,
          COUNT(DISTINCT ti.id) FILTER (WHERE ti.fixed_at IS NULL) AS issue_count
        FROM clients c
        LEFT JOIN keywords k ON k.client_id = c.id
        LEFT JOIN pages p ON p.client_id = c.id
        LEFT JOIN technical_issues ti ON ti.client_id = c.id
        WHERE c.id = ${clientId} AND c.org_id = ${session.orgId}
        GROUP BY c.id
      `,
      sql`
        SELECT id, keyword, current_rank, previous_rank, search_volume, ranking_url
        FROM keywords
        WHERE client_id = ${clientId} AND is_tracked = true AND current_rank IS NOT NULL
        ORDER BY search_volume DESC NULLS LAST
        LIMIT 10
      `,
      sql`
        SELECT id, issue_type, severity, description, detected_at
        FROM technical_issues
        WHERE client_id = ${clientId} AND fixed_at IS NULL
        ORDER BY
          CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,
          detected_at DESC
        LIMIT 8
      `,
      sql`
        SELECT id, module, action_type, summary, status, created_at
        FROM agent_action_log
        WHERE client_id = ${clientId}
        ORDER BY created_at DESC
        LIMIT 10
      `,
    ]);

  if (clientRows.length === 0) notFound();

  const client = clientRows[0] as unknown as ClientDetail;
  const topKeywords = topKeywordsRows as unknown as Keyword[];
  const recentIssues = recentIssuesRows as unknown as Array<{
    id: string;
    issue_type: string;
    severity: "critical" | "warning" | "info";
    description: string | null;
    detected_at: string;
  }>;
  const recentActions = recentActionsRows as unknown as AgentAction[];

  return (
    <div className="min-h-screen bg-background">
      {/* Atmospheric background */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(16,185,129,0.08), transparent)",
        }}
        aria-hidden="true"
      />

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* Client header */}
        <header className="animate-[fade-in_0.5s_ease-out_both]">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-5">
              <HealthScoreRing score={client.health_score} size={64} />
              <div>
                <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                  {client.name}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <a
                    href={`https://${client.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-emerald-400 transition-colors"
                  >
                    <Globe className="size-3.5" aria-hidden="true" />
                    {client.domain}
                    <ArrowUpRight className="size-3" aria-hidden="true" />
                  </a>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize",
                      STATUS_STYLES[client.status],
                    )}
                  >
                    {client.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick stat pills */}
            <div className="flex gap-3">
              <QuickStat label="Keywords" value={Number(client.keyword_count)} />
              <QuickStat label="Pages" value={Number(client.page_count)} />
              <QuickStat
                label="Issues"
                value={Number(client.issue_count)}
                isWarning={Number(client.issue_count) > 0}
              />
            </div>
          </div>
        </header>

        {/* Tab navigation */}
        <ClientDetailTabs clientId={clientId} />

        {/* Overview content grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 animate-[slide-up_0.4s_ease-out_0.1s_both]">
          {/* Top keywords */}
          <section className="lg:col-span-3 rounded-xl border border-white/[0.06] bg-slate-900/70 backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-white/[0.04] px-5 py-4">
              <h2 className="font-heading text-sm font-bold text-foreground">
                Top Keywords
              </h2>
              <Link
                href={`/clients/${clientId}/keywords`}
                className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                View all
              </Link>
            </div>
            <div className="divide-y divide-white/[0.03]">
              {topKeywords.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                  No keywords tracked yet
                </p>
              ) : (
                topKeywords.map((kw) => {
                  const change =
                    kw.current_rank != null && kw.previous_rank != null
                      ? kw.previous_rank - kw.current_rank
                      : 0;
                  return (
                    <div
                      key={kw.id}
                      className="flex items-center justify-between px-5 py-3 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">
                          {kw.keyword}
                        </p>
                        {kw.ranking_url && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {kw.ranking_url}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-4 shrink-0 ml-4">
                        <span className="text-xs text-muted-foreground tabular-nums">
                          Vol: {kw.search_volume?.toLocaleString() ?? "--"}
                        </span>
                        <div className="flex items-center gap-1.5 min-w-[4rem] justify-end">
                          <span className="font-heading font-bold tabular-nums text-foreground">
                            #{kw.current_rank}
                          </span>
                          {change !== 0 && (
                            <span
                              className={cn(
                                "flex items-center gap-0.5 text-xs font-medium",
                                change > 0
                                  ? "text-emerald-400"
                                  : "text-red-400",
                              )}
                            >
                              {change > 0 ? (
                                <TrendingUp className="size-3" />
                              ) : (
                                <TrendingDown className="size-3" />
                              )}
                              {Math.abs(change)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Right column */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Recent Issues */}
            <section className="rounded-xl border border-white/[0.06] bg-slate-900/70 backdrop-blur-sm">
              <div className="border-b border-white/[0.04] px-5 py-4">
                <h2 className="font-heading text-sm font-bold text-foreground">
                  Open Issues
                </h2>
              </div>
              <div className="divide-y divide-white/[0.03]">
                {recentIssues.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                    No open issues
                  </p>
                ) : (
                  recentIssues.map((issue) => (
                    <div key={issue.id} className="flex items-start gap-3 px-5 py-3">
                      <AlertTriangle
                        className={cn(
                          "mt-0.5 size-4 shrink-0",
                          issue.severity === "critical"
                            ? "text-red-400"
                            : issue.severity === "warning"
                              ? "text-amber-400"
                              : "text-blue-400",
                        )}
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground capitalize">
                          {issue.issue_type.replace(/_/g, " ")}
                        </p>
                        {issue.description && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {issue.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Recent Actions */}
            <section className="rounded-xl border border-white/[0.06] bg-slate-900/70 backdrop-blur-sm">
              <div className="border-b border-white/[0.04] px-5 py-4">
                <h2 className="font-heading text-sm font-bold text-foreground">
                  Recent Actions
                </h2>
              </div>
              <div className="divide-y divide-white/[0.03]">
                {recentActions.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                    No recent actions
                  </p>
                ) : (
                  recentActions.map((action) => (
                    <div key={action.id} className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "size-1.5 rounded-full shrink-0",
                            action.status === "success"
                              ? "bg-emerald-400"
                              : action.status === "failure"
                                ? "bg-red-400"
                                : action.status === "warning"
                                  ? "bg-amber-400"
                                  : "bg-blue-400",
                          )}
                          aria-hidden="true"
                        />
                        <p className="text-sm text-foreground truncate">
                          {action.summary}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground pl-3.5">
                        {action.module} / {action.action_type}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickStat({
  label,
  value,
  isWarning = false,
}: {
  label: string;
  value: number;
  isWarning?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-lg border border-white/[0.06] bg-slate-900/50 px-4 py-2.5",
        isWarning && "border-amber-500/20",
      )}
    >
      <span
        className={cn(
          "font-heading text-xl font-bold tabular-nums",
          isWarning ? "text-amber-400" : "text-foreground",
        )}
      >
        {value.toLocaleString()}
      </span>
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
    </div>
  );
}
