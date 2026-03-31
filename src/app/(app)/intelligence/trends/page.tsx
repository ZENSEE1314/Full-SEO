import { redirect } from "next/navigation";
import { Suspense } from "react";

import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import type { Trend } from "@/types";
import { TrendsGrid } from "@/components/intelligence/trends-grid";
import { TrendsToolbar } from "@/components/intelligence/trends-toolbar";

export const metadata = {
  title: "Trend Intelligence | NEXUS SEO",
};

interface TrendsPageProps {
  searchParams: Promise<{
    client_id?: string;
    days?: string;
  }>;
}

export default async function TrendsPage({ searchParams }: TrendsPageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const clientId = params.client_id ?? null;
  const days = Number(params.days) || 30;

  let trends: Array<Trend & { client_name: string | null }> = [];
  let clients: Array<{ id: string; name: string }> = [];
  try {
    const [trendsResult, clientsResult] = await Promise.all([
      clientId
        ? sql`
            SELECT t.*, c.name as client_name
            FROM trends t
            LEFT JOIN clients c ON t.client_id = c.id
            WHERE t.client_id = ${clientId}
              AND t.detected_at > NOW() - INTERVAL '1 day' * ${days}
            ORDER BY t.detected_at DESC
            LIMIT 50
          `
        : sql`
            SELECT t.*, c.name as client_name
            FROM trends t
            LEFT JOIN clients c ON t.client_id = c.id
            LEFT JOIN clients c2 ON t.client_id = c2.id AND c2.org_id = ${session.orgId}
            WHERE (t.client_id IS NULL OR c2.id IS NOT NULL)
              AND t.detected_at > NOW() - INTERVAL '1 day' * ${days}
            ORDER BY t.detected_at DESC
            LIMIT 50
          `,
      sql`
        SELECT id, name FROM clients
        WHERE org_id = ${session.orgId}
        ORDER BY name
      `,
    ]);

    trends = trendsResult as unknown as Array<
      Trend & { client_name: string | null }
    >;
    clients = clientsResult as unknown as Array<{
      id: string;
      name: string;
    }>;
  } catch {
    trends = [];
    clients = [];
  }

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
            Trend Intelligence
          </h1>
          <p className="mt-1 text-base text-muted-foreground">
            Discover emerging topics and content opportunities
          </p>
        </header>

        {/* Toolbar: filters + discover button */}
        <Suspense fallback={null}>
          <TrendsToolbar
            clients={clients}
            currentClientId={clientId}
            currentDays={days}
          />
        </Suspense>

        {/* Trends grid */}
        <TrendsGrid initialTrends={trends} />
      </div>
    </div>
  );
}
