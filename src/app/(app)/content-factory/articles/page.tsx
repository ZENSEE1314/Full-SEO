import { redirect } from "next/navigation";

import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import type { ContentArticle } from "@/types";
import { ArticlesPageClient } from "./client";

export const metadata = {
  title: "Articles | NEXUS SEO",
};

interface ArticleWithClient extends ContentArticle {
  client_name: string;
}

export default async function ArticlesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  let articles: ArticleWithClient[] = [];
  let approvedBriefs: Array<{
    id: string;
    title: string;
    client_id: string;
    client_name: string;
  }> = [];
  try {
    const [articlesResult, briefsResult] = await Promise.all([
      sql`
        SELECT ca.*, c.name as client_name
        FROM content_articles ca
        JOIN clients c ON ca.client_id = c.id
        WHERE c.org_id = ${session.orgId}
        ORDER BY ca.updated_at DESC
      `,
      sql`
        SELECT cb.id, cb.title, cb.client_id, c.name as client_name
        FROM content_briefs cb
        JOIN clients c ON cb.client_id = c.id
        WHERE c.org_id = ${session.orgId}
          AND cb.status IN ('approved', 'in_progress')
        ORDER BY cb.title
      `,
    ]);

    articles = articlesResult as unknown as ArticleWithClient[];
    approvedBriefs = briefsResult as unknown as Array<{
      id: string;
      title: string;
      client_id: string;
      client_name: string;
    }>;
  } catch {
    articles = [];
    approvedBriefs = [];
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
        <ArticlesPageClient
          initialArticles={articles}
          approvedBriefs={approvedBriefs}
        />
      </div>
    </div>
  );
}
