import { redirect } from "next/navigation";

import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { IntegrationsClient } from "./client";

export const metadata = {
  title: "Integrations | NEXUS SEO",
};

interface IntegrationRow {
  provider: string;
  account_email: string;
  is_active: boolean;
  properties: { last_sync_at?: string } | null;
  updated_at: string;
}

export default async function IntegrationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  let connectedMap: Record<string, { email: string; lastSync: string | null }> = {};
  let hasGoogleCredentials = false;

  try {
    const rows = await sql`
      SELECT provider, account_email, is_active, properties, updated_at
      FROM integrations
      WHERE org_id = ${session.orgId}::uuid AND is_active = true
    `;

    for (const row of rows) {
      const r = row as IntegrationRow;
      if (r.provider === "google-credentials") {
        const props = r.properties as { client_id?: string } | null;
        hasGoogleCredentials = !!props?.client_id;
        continue;
      }
      connectedMap[r.provider] = {
        email: r.account_email ?? "",
        lastSync: r.properties?.last_sync_at ?? r.updated_at,
      };
    }
  } catch {
    connectedMap = {};
  }

  return <IntegrationsClient connectedMap={connectedMap} hasGoogleCredentials={hasGoogleCredentials} />;
}
