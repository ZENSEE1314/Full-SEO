import { redirect } from "next/navigation";

import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { ProfileClient } from "./client";

export const metadata = {
  title: "Profile | NEXUS SEO",
};

export default async function ProfilePage() {
  let session;
  try {
    session = await getSession();
  } catch (e) {
    console.error("[profile] Session error:", e);
    redirect("/login");
  }
  if (!session) redirect("/login");

  let hasGoogleCredentials = false;
  let hasReplicateKey = false;

  try {
    const rows = await sql`
      SELECT provider, properties FROM integrations
      WHERE user_id = ${session.userId}::uuid AND is_active = true
        AND provider IN ('google-credentials', 'replicate-api')
    `;

    for (const row of rows) {
      const r = row as { provider: string; properties: Record<string, string> | null };
      if (r.provider === "google-credentials" && r.properties?.client_id) {
        hasGoogleCredentials = true;
      }
      if (r.provider === "replicate-api" && r.properties?.api_token) {
        hasReplicateKey = true;
      }
    }
  } catch (e) {
    console.error("[profile] Integrations query error:", e);
  }

  return (
    <ProfileClient
      session={{
        name: session.name,
        email: session.email,
        role: session.role,
      }}
      hasGoogleCredentials={hasGoogleCredentials}
      hasReplicateKey={hasReplicateKey}
    />
  );
}
