import { redirect } from "next/navigation";

import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { MediaPageClient } from "./client";

export const metadata = {
  title: "Media Library | NEXUS SEO",
};

interface MediaRow {
  id: string;
  url: string | null;
  type: "header_image" | "social_image" | "infographic";
  alt_text: string | null;
  article_title: string | null;
  created_at: string;
}

export default async function MediaPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  let media: MediaRow[] = [];
  try {
    const mediaResult = await sql`
      SELECT cm.id, cm.url, cm.media_type as type, cm.alt_text, ca.title as article_title, cm.created_at
      FROM content_media cm
      LEFT JOIN content_articles ca ON cm.article_id = ca.id
      JOIN clients c ON cm.client_id = c.id
      WHERE c.org_id = ${session.orgId}
      ORDER BY cm.created_at DESC
    `;
    media = mediaResult as unknown as MediaRow[];
  } catch {
    media = [];
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
        <MediaPageClient initialMedia={media} />
      </div>
    </div>
  );
}
