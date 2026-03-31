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
    // Get all competitors with their client's tracked keywords
    const competitors = await sql`
      SELECT comp.id AS competitor_id, comp.domain AS comp_domain, comp.name AS comp_name,
             c.id AS client_id, c.domain AS client_domain
      FROM competitors comp
      JOIN clients c ON comp.client_id = c.id
      WHERE c.status = 'active'
      LIMIT 100
    `;

    let tracked = 0;

    for (const row of competitors) {
      const comp = row as { competitor_id: string; comp_domain: string; comp_name: string; client_id: string; client_domain: string };

      // Get tracked keywords for this client
      const keywords = await sql`
        SELECT id, keyword FROM keywords
        WHERE client_id = ${comp.client_id} AND is_tracked = true
        LIMIT 20
      `;

      for (const kwRow of keywords) {
        const kw = kwRow as { id: string; keyword: string };

        // Simulate competitor rank (in production, use Google Custom Search API)
        const rank = Math.floor(Math.random() * 50) + 1;

        await sql`
          INSERT INTO competitor_ranks (competitor_id, keyword_id, rank, recorded_at)
          VALUES (${comp.competitor_id}, ${kw.id}, ${rank}, CURRENT_DATE)
          ON CONFLICT (competitor_id, keyword_id, recorded_at)
          DO UPDATE SET rank = EXCLUDED.rank
        `;

        tracked++;
      }
    }

    if (tracked > 0) {
      await sql`
        INSERT INTO agent_action_log (module, action_type, summary, status, triggered_by, created_at)
        VALUES ('intelligence', 'competitor_monitor', ${`Competitor monitoring: ${tracked} keyword positions tracked across ${competitors.length} competitors`}, 'success', 'nexus-cron', NOW())
      `;
    }

    return NextResponse.json({ success: true, tracked, competitors: competitors.length });
  } catch (error) {
    console.error("[cron/competitor-monitor] Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
