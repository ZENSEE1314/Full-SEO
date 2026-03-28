import { redirect, notFound } from "next/navigation";

import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { ClientDetailTabs } from "@/components/clients/client-detail-tabs";
import { KeywordsTable } from "@/components/clients/keywords-table";
import { AddKeywordDialog } from "@/components/clients/add-keyword-dialog";
import type { Keyword } from "@/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const rows = await sql`SELECT name FROM clients WHERE id = ${clientId} LIMIT 1`;
  const name = (rows[0] as { name: string } | undefined)?.name ?? "Client";
  return { title: `Keywords - ${name} | NEXUS SEO` };
}

export default async function KeywordsPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { clientId } = await params;

  let keywords: Keyword[] = [];
  try {
    const [clientRows, keywordRows] = await Promise.all([
      sql`
        SELECT id, name FROM clients
        WHERE id = ${clientId} AND org_id = ${session.orgId}
      `,
      sql`
        SELECT
          k.id, k.keyword, k.search_volume, k.difficulty,
          k.current_rank, k.previous_rank, k.best_rank,
          k.ranking_url, k.is_tracked, k.source, k.tags
        FROM keywords k
        WHERE k.client_id = ${clientId} AND k.is_tracked = true
        ORDER BY k.search_volume DESC NULLS LAST
      `,
    ]);

    if (clientRows.length === 0) notFound();

    keywords = keywordRows as unknown as Keyword[];
  } catch {
    notFound();
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
              Keywords
            </h1>
            <p className="mt-1 text-base text-muted-foreground">
              {keywords.length} keyword{keywords.length !== 1 ? "s" : ""} tracked
            </p>
          </div>
          <AddKeywordDialog clientId={clientId} />
        </header>

        <ClientDetailTabs clientId={clientId} />

        <div className="animate-[slide-up_0.4s_ease-out_0.1s_both]">
          <KeywordsTable keywords={keywords} />
        </div>
      </div>
    </div>
  );
}
