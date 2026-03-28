import { redirect } from "next/navigation";

import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import type { Competitor } from "@/types";
import { CompetitorTable } from "@/components/intelligence/competitor-table";

export const metadata = {
  title: "Competitor Intelligence | NEXUS SEO",
};

export default async function CompetitorsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [competitorsResult, clientsResult] = await Promise.all([
    sql`
      SELECT comp.*, c.name as client_name,
             COUNT(cr.id)::int as tracked_keywords
      FROM competitors comp
      JOIN clients c ON comp.client_id = c.id
      LEFT JOIN competitor_ranks cr ON cr.competitor_id = comp.id
      WHERE c.org_id = ${session.orgId}
      GROUP BY comp.id, c.name
      ORDER BY comp.domain
    `,
    sql`
      SELECT id, name FROM clients
      WHERE org_id = ${session.orgId}
      ORDER BY name
    `,
  ]);

  const competitors = competitorsResult as unknown as Array<
    Competitor & { client_name: string; tracked_keywords: number }
  >;
  const clients = clientsResult as unknown as Array<{
    id: string;
    name: string;
  }>;

  return (
    <div className="min-h-screen bg-background">
      {/* Atmospheric gradient */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(16,185,129,0.08), transparent)",
        }}
      />

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="animate-[fade-in_0.5s_ease-out_both]">
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Competitor Intelligence
          </h1>
          <p className="mt-1 text-base text-muted-foreground">
            Track competitor rankings and identify keyword opportunities
          </p>
        </header>

        {/* Table */}
        <div className="animate-[slide-up_0.4s_ease-out_both]" style={{ animationDelay: "80ms" }}>
          <CompetitorTable competitors={competitors} clients={clients} />
        </div>
      </div>
    </div>
  );
}
