import { Suspense } from "react";
import { redirect } from "next/navigation";

import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { ClientCard } from "@/components/clients/client-card";
import { ClientFilters } from "@/components/clients/client-filters";
import { AddClientDialog } from "@/components/clients/add-client-dialog";

export const metadata = {
  title: "Clients | NEXUS SEO",
};

interface ClientRow {
  id: string;
  name: string;
  domain: string;
  status: "active" | "paused" | "archived";
  health_score: number | null;
  keyword_count: number;
  page_count: number;
  issue_count: number;
}

interface PageProps {
  searchParams: Promise<{ status?: string; q?: string }>;
}

export default async function ClientsPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const statusFilter = params.status ?? "all";
  const searchQuery = params.q ?? "";

  const clients = (await sql`
    SELECT
      c.id,
      c.name,
      c.domain,
      c.status,
      c.health_score,
      COUNT(DISTINCT k.id) FILTER (WHERE k.is_tracked = true) AS keyword_count,
      COUNT(DISTINCT p.id) AS page_count,
      COUNT(DISTINCT ti.id) FILTER (WHERE ti.fixed_at IS NULL) AS issue_count
    FROM clients c
    LEFT JOIN keywords k ON k.client_id = c.id
    LEFT JOIN pages p ON p.client_id = c.id
    LEFT JOIN technical_issues ti ON ti.client_id = c.id
    WHERE c.org_id = ${session.orgId}
      AND (${statusFilter} = 'all' OR c.status = ${statusFilter})
      AND (
        ${searchQuery} = '' OR
        c.name ILIKE ${"%" + searchQuery + "%"} OR
        c.domain ILIKE ${"%" + searchQuery + "%"}
      )
    GROUP BY c.id
    ORDER BY c.name
  `) as unknown as ClientRow[];

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
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-[fade-in_0.5s_ease-out_both]">
          <div>
            <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Clients
            </h1>
            <p className="mt-1 text-base text-muted-foreground">
              Manage and monitor all your SEO clients
            </p>
          </div>
          <AddClientDialog />
        </header>

        {/* Filters */}
        <Suspense fallback={null}>
          <ClientFilters />
        </Suspense>

        {/* Client grid */}
        {clients.length === 0 ? (
          <EmptyState hasFilters={statusFilter !== "all" || searchQuery !== ""} />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {clients.map((client, index) => (
              <ClientCard
                key={client.id}
                id={client.id}
                name={client.name}
                domain={client.domain}
                status={client.status}
                healthScore={client.health_score}
                keywordCount={Number(client.keyword_count)}
                pageCount={Number(client.page_count)}
                issueCount={Number(client.issue_count)}
                index={index}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.04] bg-slate-900/40 py-20 text-center animate-[fade-in_0.5s_ease-out_both]">
      <div className="rounded-xl bg-emerald-500/10 p-4 mb-4">
        <svg
          className="size-8 text-emerald-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
          />
        </svg>
      </div>
      <h3 className="font-heading text-lg font-bold text-foreground">
        {hasFilters ? "No matching clients" : "No clients yet"}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {hasFilters
          ? "Try adjusting your filters or search query."
          : "Add your first client to start tracking their SEO performance."}
      </p>
    </div>
  );
}
