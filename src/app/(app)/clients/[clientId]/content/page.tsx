import { redirect, notFound } from "next/navigation";

import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { ClientDetailTabs } from "@/components/clients/client-detail-tabs";
import { cn } from "@/lib/utils";
import type { ContentArticle } from "@/types";

const STATUS_CONFIG = {
  draft: { label: "Draft", bg: "bg-slate-500/15", text: "text-slate-400", dot: "bg-slate-400" },
  review: { label: "Review", bg: "bg-amber-500/15", text: "text-amber-400", dot: "bg-amber-400" },
  approved: { label: "Approved", bg: "bg-sky-500/15", text: "text-sky-400", dot: "bg-sky-400" },
  published: { label: "Published", bg: "bg-emerald-500/15", text: "text-emerald-400", dot: "bg-emerald-400" },
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const rows = await sql`SELECT name FROM clients WHERE id = ${clientId} LIMIT 1`;
  const name = (rows[0] as { name: string } | undefined)?.name ?? "Client";
  return { title: `Content - ${name} | NEXUS SEO` };
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getSeoScoreColor(score: number | null): string {
  if (score === null) return "text-slate-500";
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
}

export default async function ContentPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { clientId } = await params;

  let articles: ContentArticle[] = [];
  try {
    const [clientRows, articleRows] = await Promise.all([
      sql`
        SELECT id, name FROM clients
        WHERE id = ${clientId} AND org_id = ${session.orgId}
      `,
      sql`
        SELECT
          ca.id, ca.brief_id, ca.client_id, ca.title, ca.slug,
          ca.meta_title, ca.meta_description, ca.word_count,
          ca.seo_score, ca.status, ca.published_url,
          ca.created_at, ca.updated_at
        FROM content_articles ca
        JOIN clients c ON c.id = ca.client_id AND c.org_id = ${session.orgId}
        WHERE ca.client_id = ${clientId}
        ORDER BY ca.updated_at DESC
      `,
    ]);

    if (clientRows.length === 0) notFound();

    articles = articleRows as unknown as ContentArticle[];
  } catch {
    notFound();
  }

  const publishedCount = articles.filter((a) => a.status === "published").length;
  const draftCount = articles.filter((a) => a.status === "draft").length;

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
              Content
            </h1>
            <p className="mt-1 text-base text-muted-foreground">
              {articles.length} article{articles.length !== 1 ? "s" : ""}
              {publishedCount > 0 && (
                <span className="text-emerald-400">
                  {" "}&middot; {publishedCount} published
                </span>
              )}
              {draftCount > 0 && (
                <span className="text-slate-400">
                  {" "}&middot; {draftCount} draft{draftCount !== 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>
        </header>

        <ClientDetailTabs clientId={clientId} />

        <div className="animate-[slide-up_0.4s_ease-out_0.1s_both]">
          {articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.06] bg-slate-900/70 backdrop-blur-sm px-6 py-20 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
                <svg
                  className="h-7 w-7 text-emerald-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                No articles yet
              </h2>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Content articles will appear here once they are generated from
                briefs or created manually.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-slate-900/70 backdrop-blur-sm">
              {/* Table header */}
              <div className="hidden border-b border-white/[0.06] px-6 py-3 sm:grid sm:grid-cols-[1fr_100px_90px_90px_110px] sm:gap-4">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Title
                </span>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Status
                </span>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground text-right">
                  Words
                </span>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground text-right">
                  SEO
                </span>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground text-right">
                  Created
                </span>
              </div>

              {/* Table rows */}
              <div role="list" aria-label="Content articles">
                {articles.map((article, index) => {
                  const statusConfig = STATUS_CONFIG[article.status];

                  return (
                    <div
                      key={article.id}
                      role="listitem"
                      className={cn(
                        "group flex flex-col gap-3 px-6 py-4 transition-colors duration-150 hover:bg-white/[0.03]",
                        "sm:grid sm:grid-cols-[1fr_100px_90px_90px_110px] sm:items-center sm:gap-4",
                        index !== articles.length - 1 &&
                          "border-b border-white/[0.04]",
                      )}
                    >
                      {/* Title */}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground group-hover:text-emerald-400 transition-colors duration-150">
                          {article.title}
                        </p>
                        {article.slug && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            /{article.slug}
                          </p>
                        )}
                      </div>

                      {/* Status badge */}
                      <div>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                            statusConfig.bg,
                            statusConfig.text,
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              statusConfig.dot,
                            )}
                            aria-hidden="true"
                          />
                          {statusConfig.label}
                        </span>
                      </div>

                      {/* Word count */}
                      <div className="text-sm tabular-nums text-muted-foreground sm:text-right">
                        {article.word_count !== null ? (
                          <span>
                            {article.word_count.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-600">&mdash;</span>
                        )}
                      </div>

                      {/* SEO score */}
                      <div className="text-sm tabular-nums sm:text-right">
                        {article.seo_score !== null ? (
                          <span
                            className={cn(
                              "font-medium",
                              getSeoScoreColor(article.seo_score),
                            )}
                          >
                            {article.seo_score}
                          </span>
                        ) : (
                          <span className="text-slate-600">&mdash;</span>
                        )}
                      </div>

                      {/* Created date */}
                      <div className="text-xs text-muted-foreground sm:text-right">
                        {formatDate(article.created_at)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
