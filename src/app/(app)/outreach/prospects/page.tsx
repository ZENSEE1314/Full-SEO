import { redirect } from "next/navigation";

import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { ProspectTable } from "@/components/outreach/prospect-table";
import type { BacklinkProspect, Client } from "@/types";

export const metadata = {
  title: "Backlink Prospects | NEXUS SEO",
};

interface PageProps {
  searchParams: Promise<{ status?: string; client?: string }>;
}

export default async function ProspectsPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const statusFilter = params.status ?? "all";
  const clientFilter = params.client ?? "all";

  let prospects: unknown[] = [];
  let clients: unknown[] = [];
  try {
    const [prospectsResult, clientsResult] = await Promise.all([
      sql`
        SELECT bp.*
        FROM backlink_prospects bp
        JOIN clients c ON bp.client_id = c.id
        WHERE c.org_id = ${session.orgId}
          AND (${statusFilter} = 'all' OR bp.status = ${statusFilter})
          AND (${clientFilter} = 'all' OR bp.client_id = ${clientFilter})
        ORDER BY bp.created_at DESC
      `,
      sql`
        SELECT id, name, domain, status, health_score
        FROM clients
        WHERE org_id = ${session.orgId}
        ORDER BY name
      `,
    ]);
    prospects = prospectsResult;
    clients = clientsResult;
  } catch {
    prospects = [];
    clients = [];
  }

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
              Backlink Prospects
            </h1>
            <p className="mt-1 text-base text-muted-foreground">
              Discover and manage link building opportunities
            </p>
          </div>
          <DiscoverButton />
        </header>

        {/* Filters */}
        <ProspectFilters
          statusFilter={statusFilter}
          clientFilter={clientFilter}
          clients={clients as unknown as Client[]}
        />

        {/* Table */}
        <ProspectTable
          prospects={prospects as unknown as BacklinkProspect[]}
          clients={clients as unknown as Client[]}
          statusFilter={statusFilter}
          clientFilter={clientFilter}
        />
      </div>
    </div>
  );
}

function DiscoverButton() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-2 text-sm text-muted-foreground">
      <svg
        className="size-4"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        />
      </svg>
      Add prospects manually via the client backlinks tab
    </span>
  );
}

function ProspectFilters({
  statusFilter,
  clientFilter,
  clients,
}: {
  statusFilter: string;
  clientFilter: string;
  clients: Client[];
}) {
  const STATUS_OPTIONS = [
    { value: "all", label: "All Statuses" },
    { value: "new", label: "New" },
    { value: "contacted", label: "Contacted" },
    { value: "replied", label: "Replied" },
    { value: "won", label: "Won" },
    { value: "lost", label: "Lost" },
    { value: "rejected", label: "Rejected" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 animate-[fade-in_0.5s_ease-out_0.1s_both]">
      {STATUS_OPTIONS.map((opt) => (
        <a
          key={opt.value}
          href={`?status=${opt.value}&client=${clientFilter}`}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            statusFilter === opt.value
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
              : "bg-slate-900/50 text-muted-foreground border border-white/[0.06] hover:text-foreground hover:border-white/[0.12]"
          }`}
        >
          {opt.label}
        </a>
      ))}

      <span className="mx-1 h-4 w-px bg-white/[0.08]" aria-hidden="true" />

      {/* Client filter as plain links */}
      <a
        href={`?status=${statusFilter}&client=all`}
        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
          clientFilter === "all"
            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
            : "bg-slate-900/50 text-muted-foreground border border-white/[0.06] hover:text-foreground hover:border-white/[0.12]"
        }`}
      >
        All Clients
      </a>
      {clients.map((client) => (
        <a
          key={client.id}
          href={`?status=${statusFilter}&client=${client.id}`}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            clientFilter === client.id
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
              : "bg-slate-900/50 text-muted-foreground border border-white/[0.06] hover:text-foreground hover:border-white/[0.12]"
          }`}
        >
          {client.name}
        </a>
      ))}
    </div>
  );
}
