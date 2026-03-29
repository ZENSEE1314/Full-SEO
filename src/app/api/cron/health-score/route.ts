import { NextRequest, NextResponse } from "next/server";

import { sql } from "@/lib/db";

const CRON_SECRET = process.env.CRON_SECRET;

const CRITICAL_PENALTY = 15;
const WARNING_PENALTY = 5;
const INFO_PENALTY = 1;
const MAX_CRITICAL_DEDUCTION = 45;
const MAX_WARNING_DEDUCTION = 25;
const MAX_INFO_DEDUCTION = 10;
const ISSUE_WEIGHT = 0.6;
const PERF_WEIGHT = 0.4;
const BASE_SCORE = 100;

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export async function POST(request: NextRequest) {
  try {
    if (CRON_SECRET) {
      const authHeader = request.headers.get("authorization");
      if (authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const clients = await sql`
      SELECT id FROM clients WHERE status = 'active'
    `;

    const scores: Array<{ clientId: string; score: number }> = [];

    for (const client of clients) {
      const issueCounts = await sql`
        SELECT severity, COUNT(*)::int AS count
        FROM technical_issues
        WHERE client_id = ${client.id} AND fixed_at IS NULL
        GROUP BY severity
      `;

      const severityMap: Record<string, number> = {};
      for (const row of issueCounts) {
        severityMap[row.severity] = row.count;
      }

      const criticalDeduction = Math.min(
        (severityMap["critical"] ?? 0) * CRITICAL_PENALTY,
        MAX_CRITICAL_DEDUCTION,
      );
      const warningDeduction = Math.min(
        (severityMap["warning"] ?? 0) * WARNING_PENALTY,
        MAX_WARNING_DEDUCTION,
      );
      const infoDeduction = Math.min(
        (severityMap["info"] ?? 0) * INFO_PENALTY,
        MAX_INFO_DEDUCTION,
      );

      const issueScore = BASE_SCORE - criticalDeduction - warningDeduction - infoDeduction;

      const perfRows = await sql`
        SELECT AVG(pss.performance_score)::numeric AS avg_score
        FROM page_speed_scores pss
        JOIN pages p ON pss.page_id = p.id
        WHERE p.client_id = ${client.id}
          AND pss.recorded_at > NOW() - INTERVAL '7 days'
      `;

      const perfScore = perfRows[0]?.avg_score != null
        ? Number(perfRows[0].avg_score)
        : BASE_SCORE;

      const finalScore = clampScore(
        issueScore * ISSUE_WEIGHT + perfScore * PERF_WEIGHT,
      );

      await sql`
        UPDATE clients SET health_score = ${finalScore} WHERE id = ${client.id}
      `;

      scores.push({ clientId: client.id, score: finalScore });
    }

    await sql`
      INSERT INTO agent_action_log (client_id, module, action_type, summary, details, status, triggered_by)
      VALUES (
        NULL,
        'health',
        'recalculate_scores',
        ${`Recalculated health scores for ${scores.length} clients`},
        ${JSON.stringify({ scores })},
        'success',
        'cron'
      )
    `;

    return NextResponse.json({ updated: scores.length, scores });
  } catch {
    return NextResponse.json(
      { error: "Failed to recalculate health scores" },
      { status: 500 },
    );
  }
}
