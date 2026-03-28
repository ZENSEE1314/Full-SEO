import { redirect } from "next/navigation";

import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { ActionFeed } from "@/components/dashboard/action-feed";
import { ActivityFilters } from "@/components/dashboard/activity-filters";
import type { AgentAction } from "@/types";

export const metadata = {
  title: "Activity Log | NEXUS SEO",
};

interface ActivityLogPageProps {
  searchParams: Promise<{
    module?: string;
    status?: string;
    clientId?: string;
  }>;
}

export default async function ActivityLogPage({
  searchParams,
}: ActivityLogPageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const moduleFilter = params.module;
  const statusFilter = params.status;
  const clientFilter = params.clientId;

  let query = `
    SELECT aal.* FROM agent_action_log aal
    WHERE 1=1
  `;
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (moduleFilter) {
    values.push(moduleFilter);
    conditions.push(`aal.module = $${values.length}`);
  }
  if (statusFilter) {
    values.push(statusFilter);
    conditions.push(`aal.status = $${values.length}`);
  }
  if (clientFilter) {
    values.push(clientFilter);
    conditions.push(`aal.client_id = $${values.length}`);
  }

  if (conditions.length > 0) {
    query += ` AND ${conditions.join(" AND ")}`;
  }

  query += ` ORDER BY aal.created_at DESC LIMIT 100`;

  let actions: AgentAction[] = [];
  let clients: Array<{ id: string; name: string }> = [];
  try {
    actions = (await sql.query(query, values)) as unknown as AgentAction[];
    clients = (await sql`
      SELECT id, name FROM clients WHERE org_id = ${session.orgId} ORDER BY name
    `) as unknown as Array<{ id: string; name: string }>;
  } catch {
    actions = [];
    clients = [];
  }

  return (
    <div className="min-h-screen bg-background">
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(16,185,129,0.08), transparent)",
        }}
      />

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <header>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Activity Log
          </h1>
          <p className="mt-1 text-base text-muted-foreground">
            Complete history of agent actions across all modules
          </p>
        </header>

        <ActivityFilters
          currentModule={moduleFilter}
          currentStatus={statusFilter}
          currentClientId={clientFilter}
          clients={clients}
        />

        <ActionFeed
          initialActions={actions}
          clientId={clientFilter}
          isFullPage
        />
      </div>
    </div>
  );
}
