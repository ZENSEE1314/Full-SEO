import { redirect } from "next/navigation";

import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import type { ContentBrief, Client, Keyword } from "@/types";
import { BriefsPageClient } from "./client";

export const metadata = {
  title: "Content Briefs | NEXUS SEO",
};

interface BriefWithRelations extends ContentBrief {
  client_name: string;
  target_keyword: string | null;
}

export default async function BriefsPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; status?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;

  const [briefsResult, clientsResult, keywordsResult] = await Promise.all([
    params.client && params.status
      ? sql`
          SELECT cb.*, c.name as client_name, k.keyword as target_keyword
          FROM content_briefs cb
          JOIN clients c ON cb.client_id = c.id
          LEFT JOIN keywords k ON cb.target_keyword_id = k.id
          WHERE c.org_id = ${session.orgId}
            AND cb.client_id = ${params.client}
            AND cb.status = ${params.status}
          ORDER BY cb.updated_at DESC
        `
      : params.client
        ? sql`
            SELECT cb.*, c.name as client_name, k.keyword as target_keyword
            FROM content_briefs cb
            JOIN clients c ON cb.client_id = c.id
            LEFT JOIN keywords k ON cb.target_keyword_id = k.id
            WHERE c.org_id = ${session.orgId}
              AND cb.client_id = ${params.client}
            ORDER BY cb.updated_at DESC
          `
        : params.status
          ? sql`
              SELECT cb.*, c.name as client_name, k.keyword as target_keyword
              FROM content_briefs cb
              JOIN clients c ON cb.client_id = c.id
              LEFT JOIN keywords k ON cb.target_keyword_id = k.id
              WHERE c.org_id = ${session.orgId}
                AND cb.status = ${params.status}
              ORDER BY cb.updated_at DESC
            `
          : sql`
              SELECT cb.*, c.name as client_name, k.keyword as target_keyword
              FROM content_briefs cb
              JOIN clients c ON cb.client_id = c.id
              LEFT JOIN keywords k ON cb.target_keyword_id = k.id
              WHERE c.org_id = ${session.orgId}
              ORDER BY cb.updated_at DESC
            `,
    sql`
      SELECT id, name FROM clients
      WHERE org_id = ${session.orgId} AND status = 'active'
      ORDER BY name
    `,
    sql`
      SELECT k.id, k.keyword, k.client_id
      FROM keywords k
      JOIN clients c ON k.client_id = c.id
      WHERE c.org_id = ${session.orgId} AND k.is_tracked = true
      ORDER BY k.keyword
    `,
  ]);

  const briefs = briefsResult as unknown as BriefWithRelations[];
  const clients = clientsResult as unknown as Pick<Client, "id" | "name">[];
  const keywords = keywordsResult as unknown as Pick<Keyword, "id" | "keyword" | "client_id">[];

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
        <BriefsPageClient
          initialBriefs={briefs}
          clients={clients}
          keywords={keywords}
          initialClientFilter={params.client ?? ""}
          initialStatusFilter={params.status ?? ""}
        />
      </div>
    </div>
  );
}
