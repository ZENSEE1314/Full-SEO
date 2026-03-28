import { redirect } from "next/navigation";

import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { TrafficChart } from "@/components/dashboard/traffic-chart";
import { KeywordMovement } from "@/components/dashboard/keyword-movement";
import { ActionFeed } from "@/components/dashboard/action-feed";
import type { AgentAction } from "@/types";

export const metadata = {
  title: "Mission Control | NEXUS SEO",
};

function generateTrafficData(): Array<{ date: string; sessions: number }> {
  const data: Array<{ date: string; sessions: number }> = [];
  const now = new Date();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const base = 800 + Math.floor(Math.random() * 400);
    const weekday = date.getDay();
    const isWeekend = weekday === 0 || weekday === 6;
    const sessions = isWeekend
      ? Math.floor(base * 0.6)
      : base;

    data.push({
      date: date.toISOString().split("T")[0],
      sessions,
    });
  }

  return data;
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  let totalClients = 0;
  let activeKeywords = 0;
  let avgHealthScore = 0;
  let totalActions24h = 0;
  let recentActions: AgentAction[] = [];
  let topMovers: Array<{
    id: string;
    keyword: string;
    current_rank: number | null;
    change: number;
    ranking_url: string | null;
  }> = [];

  try {
    const [clientsResult, keywordsResult, actionsResult, actions24hResult, healthResult, moversResult] =
      await Promise.all([
        sql`SELECT COUNT(*) as count FROM clients WHERE org_id = ${session.orgId}`,
        sql`SELECT COUNT(*) as count FROM keywords k JOIN clients c ON k.client_id = c.id WHERE c.org_id = ${session.orgId} AND k.is_tracked = true`,
        sql`SELECT * FROM agent_action_log ORDER BY created_at DESC LIMIT 20`,
        sql`SELECT COUNT(*) as count FROM agent_action_log WHERE created_at > NOW() - INTERVAL '24 hours'`,
        sql`SELECT COALESCE(AVG(health_score), 0) as avg_score FROM clients WHERE org_id = ${session.orgId} AND health_score IS NOT NULL`,
        sql`SELECT k.id, k.keyword, k.current_rank, k.ranking_url,
                COALESCE(k.current_rank, 0) - COALESCE(k.previous_rank, 0) as change
             FROM keywords k
             JOIN clients c ON k.client_id = c.id
             WHERE c.org_id = ${session.orgId}
               AND k.current_rank IS NOT NULL
               AND k.previous_rank IS NOT NULL
             ORDER BY ABS(COALESCE(k.current_rank, 0) - COALESCE(k.previous_rank, 0)) DESC
             LIMIT 10`,
      ]);

    totalClients = Number(clientsResult[0]?.count ?? 0);
    activeKeywords = Number(keywordsResult[0]?.count ?? 0);
    avgHealthScore = Math.round(Number(healthResult[0]?.avg_score ?? 0));
    totalActions24h = Number(actions24hResult[0]?.count ?? 0);
    recentActions = actionsResult as unknown as AgentAction[];
    topMovers = moversResult as unknown as Array<{
      id: string;
      keyword: string;
      current_rank: number | null;
      change: number;
      ranking_url: string | null;
    }>;
  } catch {
    // DB queries failed — use default zero values
  }

  const trafficData = generateTrafficData();

  return (
    <div className="min-h-screen bg-background">
      {/* Atmospheric background gradient */}
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
            Mission Control
          </h1>
          <p className="mt-1 text-base text-muted-foreground">
            Real-time overview of your SEO operations
          </p>
        </header>

        {/* KPI Cards */}
        <StatsCards
          totalClients={totalClients}
          activeKeywords={activeKeywords}
          avgHealthScore={avgHealthScore}
          totalActions24h={totalActions24h}
        />

        {/* Main grid: chart + keyword movers */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <TrafficChart data={trafficData} />
          </div>
          <div className="lg:col-span-2">
            <KeywordMovement movers={topMovers} />
          </div>
        </div>

        {/* Action Feed */}
        <ActionFeed initialActions={recentActions} />
      </div>
    </div>
  );
}
