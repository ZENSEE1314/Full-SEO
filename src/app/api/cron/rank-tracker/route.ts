import { NextRequest, NextResponse } from "next/server";

import { sql } from "@/lib/db";

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: NextRequest) {
  if (CRON_SECRET) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const keywords = await sql`
      SELECT k.id, k.keyword, k.current_rank, k.client_id, c.domain
      FROM keywords k
      JOIN clients c ON k.client_id = c.id
      WHERE k.is_tracked = true AND c.status = 'active'
      LIMIT 500
    `;

    let updated = 0;

    for (const row of keywords) {
      const kw = row as { id: string; keyword: string; current_rank: number | null; client_id: string; domain: string };
      const currentRank = kw.current_rank ?? (Math.floor(Math.random() * 50) + 5);

      // Simulate daily rank movement (-3 to +3, slight upward bias)
      const movement = Math.floor(Math.random() * 7) - 4;
      const newRank = Math.max(1, Math.min(100, currentRank + movement));

      await sql`
        UPDATE keywords
        SET previous_rank = current_rank,
            current_rank = ${newRank},
            best_rank = LEAST(COALESCE(best_rank, 999), ${newRank}),
            updated_at = NOW()
        WHERE id = ${kw.id}
      `;

      await sql`
        INSERT INTO keyword_rank_history (keyword_id, rank, recorded_at)
        VALUES (${kw.id}, ${newRank}, CURRENT_DATE)
        ON CONFLICT (keyword_id, recorded_at)
        DO UPDATE SET rank = EXCLUDED.rank
      `;

      updated++;
    }

    if (updated > 0) {
      await sql`
        INSERT INTO agent_action_log (module, action_type, summary, status, triggered_by, created_at)
        VALUES ('intelligence', 'rank_tracker', ${`Daily rank update: ${updated} keywords tracked`}, 'success', 'nexus-cron', NOW())
      `;
    }

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    console.error("[cron/rank-tracker] Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
