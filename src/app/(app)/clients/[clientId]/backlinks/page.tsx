import { redirect, notFound } from "next/navigation";

import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { ClientDetailTabs } from "@/components/clients/client-detail-tabs";
import { cn } from "@/lib/utils";
import type { BacklinkProspect } from "@/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const rows = await sql`SELECT name FROM clients WHERE id = ${clientId} LIMIT 1`;
  const name = (rows[0] as { name: string } | undefined)?.name ?? "Client";
  return { title: `Backlinks - ${name} | NEXUS SEO` };
}

const STATUS_CONFIG: Record<
  BacklinkProspect["status"],
  { label: string; className: string }
> = {
  new: {
    label: "Prospect",
    className: "bg-blue-500/15 text-blue-400 ring-blue-500/25",
  },
  contacted: {
    label: "Contacted",
    className: "bg-amber-500/15 text-amber-400 ring-amber-500/25",
  },
  replied: {
    label: "Replied",
    className: "bg-purple-500/15 text-purple-400 ring-purple-500/25",
  },
  won: {
    label: "Secured",
    className: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/25",
  },
  lost: {
    label: "Lost",
    className: "bg-slate-500/15 text-slate-400 ring-slate-500/25",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-500/15 text-red-400 ring-red-500/25",
  },
};

function getDomainAuthorityColor(da: number | null): string {
  if (da === null) return "text-muted-foreground";
  if (da >= 70) return "text-emerald-400";
  if (da >= 40) return "text-amber-400";
  return "text-red-400";
}

export default async function BacklinksPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { clientId } = await params;

  let prospects: BacklinkProspect[] = [];
  try {
    const [clientRows, prospectRows] = await Promise.all([
      sql`
        SELECT id FROM clients
        WHERE id = ${clientId} AND org_id = ${session.orgId}
      `,
      sql`
        SELECT
          bp.id, bp.domain, bp.url, bp.domain_authority,
          bp.contact_name, bp.contact_email, bp.status,
          bp.source, bp.notes, bp.created_at
        FROM backlink_prospects bp
        JOIN clients c ON bp.client_id = c.id
        WHERE bp.client_id = ${clientId} AND c.org_id = ${session.orgId}
        ORDER BY bp.domain_authority DESC NULLS LAST, bp.created_at DESC
      `,
    ]);

    if (clientRows.length === 0) notFound();

    prospects = prospectRows as unknown as BacklinkProspect[];
  } catch {
    notFound();
  }

  const securedCount = prospects.filter((p) => p.status === "won").length;

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
              Backlinks
            </h1>
            <p className="mt-1 text-base text-muted-foreground">
              {prospects.length} prospect{prospects.length !== 1 ? "s" : ""}
              {securedCount > 0 && (
                <span className="text-emerald-400">
                  {" "}&middot; {securedCount} secured
                </span>
              )}
            </p>
          </div>
        </header>

        <ClientDetailTabs clientId={clientId} />

        <div className="animate-[slide-up_0.4s_ease-out_0.1s_both]">
          {prospects.length === 0 ? (
            <div className="rounded-xl border border-white/[0.06] bg-slate-900/70 backdrop-blur-sm px-6 py-16 text-center">
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
                    d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                No backlink prospects yet
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Add prospects to start building your backlink pipeline.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-slate-900/70 backdrop-blur-sm">
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="px-4 py-3 font-medium text-muted-foreground">
                        Domain
                      </th>
                      <th className="px-4 py-3 font-medium text-muted-foreground text-right">
                        DA
                      </th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">
                        Contact
                      </th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">
                        Email
                      </th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">
                        Source
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {prospects.map((prospect) => {
                      const statusInfo =
                        STATUS_CONFIG[prospect.status] ?? STATUS_CONFIG.new;
                      return (
                        <tr
                          key={prospect.id}
                          className="transition-colors hover:bg-white/[0.02]"
                        >
                          <td className="px-4 py-3">
                            <span className="font-medium text-foreground">
                              {prospect.domain}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            <span
                              className={cn(
                                "font-semibold",
                                getDomainAuthorityColor(
                                  prospect.domain_authority
                                )
                              )}
                            >
                              {prospect.domain_authority ?? "\u2014"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {prospect.contact_name ?? "\u2014"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {prospect.contact_email ? (
                              <a
                                href={`mailto:${prospect.contact_email}`}
                                className="hover:text-emerald-400 transition-colors"
                              >
                                {prospect.contact_email}
                              </a>
                            ) : (
                              "\u2014"
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
                                statusInfo.className
                              )}
                            >
                              {statusInfo.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {prospect.source ?? "\u2014"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <div className="sm:hidden divide-y divide-white/[0.04]">
                {prospects.map((prospect) => {
                  const statusInfo =
                    STATUS_CONFIG[prospect.status] ?? STATUS_CONFIG.new;
                  return (
                    <div key={prospect.id} className="px-4 py-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-foreground truncate">
                          {prospect.domain}
                        </span>
                        <span
                          className={cn(
                            "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
                            statusInfo.className
                          )}
                        >
                          {statusInfo.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                          DA:{" "}
                          <span
                            className={cn(
                              "font-semibold",
                              getDomainAuthorityColor(
                                prospect.domain_authority
                              )
                            )}
                          >
                            {prospect.domain_authority ?? "\u2014"}
                          </span>
                        </span>
                        {prospect.source && (
                          <span className="truncate">{prospect.source}</span>
                        )}
                      </div>
                      {(prospect.contact_name || prospect.contact_email) && (
                        <div className="text-sm text-muted-foreground">
                          {prospect.contact_name}
                          {prospect.contact_name && prospect.contact_email && (
                            <span> &middot; </span>
                          )}
                          {prospect.contact_email && (
                            <a
                              href={`mailto:${prospect.contact_email}`}
                              className="hover:text-emerald-400 transition-colors"
                            >
                              {prospect.contact_email}
                            </a>
                          )}
                        </div>
                      )}
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
