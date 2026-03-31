import { redirect, notFound } from "next/navigation";

import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { ClientDetailTabs } from "@/components/clients/client-detail-tabs";
import { BacklinksClient } from "@/components/backlinks/backlinks-client";

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

export default async function BacklinksPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { clientId } = await params;

  let prospects: Array<{
    id: string;
    domain: string;
    url: string | null;
    domain_authority: number | null;
    contact_name: string | null;
    contact_email: string | null;
    status: string;
    source: string | null;
  }> = [];

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
          bp.source
        FROM backlink_prospects bp
        JOIN clients c ON bp.client_id = c.id
        WHERE bp.client_id = ${clientId} AND c.org_id = ${session.orgId}
        ORDER BY bp.domain_authority DESC NULLS LAST, bp.created_at DESC
      `,
    ]);

    if (clientRows.length === 0) notFound();

    prospects = prospectRows as typeof prospects;
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
        <header className="animate-[fade-in_0.5s_ease-out_both]">
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Backlinks
          </h1>
        </header>

        <ClientDetailTabs clientId={clientId} />

        <div className="animate-[slide-up_0.4s_ease-out_0.1s_both]">
          <BacklinksClient clientId={clientId} initialProspects={prospects} />
        </div>
      </div>
    </div>
  );
}
