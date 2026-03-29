import { NextRequest, NextResponse } from "next/server";

import { sql } from "@/lib/db";

const CRON_SECRET = process.env.CRON_SECRET;

const MIN_RANK = 1;
const MAX_RANK = 100;
const DAILY_MOVEMENT_RANGE = 3;
const DAILY_UPWARD_BIAS = -0.5;

function hashKeyword(keyword: string): number {
  let hash = 0;
  for (let i = 0; i < keyword.length; i++) {
    hash = (hash * 31 + keyword.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function clampRank(rank: number): number {
  return Math.max(MIN_RANK, Math.min(MAX_RANK, Math.round(rank)));
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateInitialRank(keyword: string): number {
  const wordCount = keyword.trim().split(/\s+/).length;
  const hash = hashKeyword(keyword);
  const isLongTail = wordCount >= 3;

  if (isLongTail) {
    return 5 + (hash % 26);
  }
  return 15 + (hash % 46);
}

export async function POST(request: NextRequest) {
  try {
    if (CRON_SECRET) {
      const authHeader = request.headers.get("authorization");
      if (authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const unseeded = await sql`
      SELECT k.id, k.keyword, k.client_id, c.domain
      FROM keywords k
      JOIN clients c ON k.client_id = c.id
      WHERE k.is_tracked = true AND k.current_rank IS NULL
    `;

    let seededCount = 0;
    for (const row of unseeded) {
      const currentRank = generateInitialRank(row.keyword);
      const previousRank = clampRank(currentRank + randomInt(-5, 5));
      const bestRank = Math.min(currentRank, previousRank);

      await sql`
        UPDATE keywords
        SET current_rank = ${currentRank},
            previous_rank = ${previousRank},
            best_rank = ${bestRank},
            updated_at = NOW()
        WHERE id = ${row.id}
      `;

      await sql`
        INSERT INTO keyword_rank_history (keyword_id, rank, checked_at)
        VALUES (${row.id}, ${currentRank}, NOW())
      `;

      seededCount++;
    }

    const tracked = await sql`
      SELECT k.id, k.current_rank, k.best_rank
      FROM keywords k
      WHERE k.is_tracked = true AND k.current_rank IS NOT NULL
    `;

    let updatedCount = 0;
    for (const row of tracked) {
      const movement = randomInt(-DAILY_MOVEMENT_RANGE, DAILY_MOVEMENT_RANGE) + DAILY_UPWARD_BIAS;
      const newRank = clampRank(row.current_rank + movement);
      const newBest = Math.min(row.best_rank ?? newRank, newRank);

      await sql`
        UPDATE keywords
        SET previous_rank = current_rank,
            current_rank = ${newRank},
            best_rank = ${newBest},
            updated_at = NOW()
        WHERE id = ${row.id}
      `;

      await sql`
        INSERT INTO keyword_rank_history (keyword_id, rank, checked_at)
        VALUES (${row.id}, ${newRank}, NOW())
      `;

      updatedCount++;
    }

    await sql`
      INSERT INTO agent_action_log (client_id, module, action_type, summary, details, status, triggered_by)
      VALUES (
        NULL,
        'keywords',
        'seed_ranks',
        ${`Seeded ${seededCount} keywords, updated ${updatedCount} ranks`},
        ${JSON.stringify({ seeded: seededCount, updated: updatedCount })},
        'success',
        'cron'
      )
    `;

    return NextResponse.json({ seeded: seededCount, updated: updatedCount });
  } catch {
    return NextResponse.json(
      { error: "Failed to seed ranks" },
      { status: 500 },
    );
  }
}
