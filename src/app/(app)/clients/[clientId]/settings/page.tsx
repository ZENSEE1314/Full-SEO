import { redirect, notFound } from "next/navigation";

import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { ClientDetailTabs } from "@/components/clients/client-detail-tabs";
import { ClientSettingsForm } from "@/components/clients/client-settings-form";
import { CompetitorManager } from "@/components/clients/competitor-manager";
import { DangerZone } from "@/components/clients/danger-zone";
import type { Client, Competitor } from "@/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const rows = await sql`SELECT name FROM clients WHERE id = ${clientId} LIMIT 1`;
  const name = (rows[0] as { name: string } | undefined)?.name ?? "Client";
  return { title: `Settings - ${name} | NEXUS SEO` };
}

export default async function ClientSettingsPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { clientId } = await params;

  let client: Client | null = null;
  let competitors: Competitor[] = [];
  let hasSearchConsole = false;
  let hasAnalytics = false;

  try {
    const [clientRows, competitorRows, integrationRows] = await Promise.all([
      sql`
        SELECT id, name, domain, status, settings
        FROM clients
        WHERE id = ${clientId} AND org_id = ${session.orgId}
      `,
      sql`
        SELECT id, domain, name, is_active, created_at
        FROM competitors
        WHERE client_id = ${clientId}
        ORDER BY created_at
      `,
      sql`
        SELECT provider FROM integrations
        WHERE user_id = ${session.userId}::uuid AND is_active = true
          AND provider IN ('google-search-console', 'google-analytics')
      `,
    ]);

    if (clientRows.length === 0) notFound();

    client = clientRows[0] as unknown as Client;
    competitors = competitorRows as unknown as Competitor[];

    for (const row of integrationRows) {
      const r = row as { provider: string };
      if (r.provider === "google-search-console") hasSearchConsole = true;
      if (r.provider === "google-analytics") hasAnalytics = true;
    }
  } catch {
    notFound();
  }

  if (!client) notFound();

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
            Settings
          </h1>
          <p className="mt-1 text-base text-muted-foreground">
            Configure {client.name}
          </p>
        </header>

        <ClientDetailTabs clientId={clientId} />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 animate-[slide-up_0.4s_ease-out_0.1s_both]">
          {/* Main settings column */}
          <div className="lg:col-span-2 space-y-8">
            <ClientSettingsForm client={client} />
            <CompetitorManager
              clientId={clientId}
              competitors={competitors}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Google Connections */}
            <section className="rounded-xl border border-white/[0.06] bg-slate-900/70 backdrop-blur-sm p-5">
              <h2 className="font-heading text-sm font-bold text-foreground mb-4">
                Google Connections
              </h2>
              <div className="space-y-3">
                <ConnectionStatus
                  service="Search Console"
                  isConnected={hasSearchConsole}
                />
                <ConnectionStatus
                  service="Analytics"
                  isConnected={hasAnalytics}
                />
              </div>
            </section>

            {/* Danger zone */}
            <DangerZone clientId={clientId} clientName={client.name} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ConnectionStatus({
  service,
  isConnected,
}: {
  service: string;
  isConnected: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.02] px-4 py-3">
      <span className="text-sm font-medium text-foreground">{service}</span>
      <span
        className={
          isConnected
            ? "inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400"
            : "inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
        }
      >
        <span
          className={
            isConnected
              ? "size-1.5 rounded-full bg-emerald-400"
              : "size-1.5 rounded-full bg-slate-600"
          }
          aria-hidden="true"
        />
        {isConnected ? "Connected" : "Not connected"}
      </span>
    </div>
  );
}
