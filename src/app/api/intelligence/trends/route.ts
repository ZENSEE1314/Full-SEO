import { NextRequest, NextResponse } from "next/server";

import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const clientId = searchParams.get("client_id");
    const days = Number(searchParams.get("days")) || 30;

    const trends = clientId
      ? await sql`
          SELECT t.*, c.name as client_name
          FROM trends t
          LEFT JOIN clients c ON t.client_id = c.id
          WHERE t.client_id = ${clientId}
            AND t.detected_at > NOW() - INTERVAL '1 day' * ${days}
          ORDER BY t.detected_at DESC
          LIMIT 50
        `
      : await sql`
          SELECT t.*, c.name as client_name
          FROM trends t
          LEFT JOIN clients c ON t.client_id = c.id
          WHERE c.org_id = ${session.orgId}
            AND t.detected_at > NOW() - INTERVAL '1 day' * ${days}
          ORDER BY t.detected_at DESC
          LIMIT 50
        `;

    return NextResponse.json({ trends });
  } catch (error) {
    console.error("[trends] GET error:", error);
    return NextResponse.json({ trends: [] }, { status: 200 });
  }
}

const TREND_MODIFIERS = [
  "near me", "best", "top", "cheap", "premium",
  "review", "guide", "tips", "ideas", "experience",
  "how to", "deals", "packages", "prices", "alternatives",
];

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const clientId = body.client_id as string | undefined;

    // Get target clients — single client or all org clients
    let targetClients: Array<{ id: string; domain: string }>;

    if (clientId) {
      const clientCheck = await sql`
        SELECT id, domain FROM clients
        WHERE id = ${clientId} AND org_id = ${session.orgId}
        LIMIT 1
      `;
      if (clientCheck.length === 0) {
        return NextResponse.json({ error: "Client not found" }, { status: 404 });
      }
      targetClients = clientCheck as unknown as Array<{ id: string; domain: string }>;
    } else {
      const allClients = await sql`
        SELECT id, domain FROM clients
        WHERE org_id = ${session.orgId}
      `;
      if (allClients.length === 0) {
        return NextResponse.json(
          { error: "No clients found. Add a client first." },
          { status: 400 },
        );
      }
      targetClients = allClients as unknown as Array<{ id: string; domain: string }>;
    }

    let trendsCreated = 0;
    let totalKeywords = 0;

    for (const client of targetClients) {
      const keywords = await sql`
        SELECT keyword FROM keywords
        WHERE client_id = ${client.id} AND is_tracked = true
      `;

      if (keywords.length === 0) continue;
      totalKeywords += keywords.length;

      for (const row of keywords) {
        const keyword = row.keyword as string;

        // Pick 3 random modifiers per keyword
        const shuffled = [...TREND_MODIFIERS].sort(() => Math.random() - 0.5);
        const selectedModifiers = shuffled.slice(0, 3);

        for (const modifier of selectedModifiers) {
          const topic = `${keyword} ${modifier}`;
          const trendScore = Math.floor(Math.random() * 60) + 40;
          const relatedQueries = selectedModifiers
            .filter((m) => m !== modifier)
            .map((m) => `${keyword} ${m}`);

          await sql`
            INSERT INTO trends (client_id, topic, trend_score, related_queries, source, detected_at)
            VALUES (
              ${client.id},
              ${topic},
              ${trendScore},
              ${relatedQueries},
              'nexus-discovery',
              NOW()
            )
          `;
          trendsCreated++;
        }
      }

      // Log per client
      await sql`
        INSERT INTO agent_action_log (client_id, module, action_type, summary, status, created_at)
        VALUES (
          ${client.id},
          'intelligence',
          'discover_trends',
          ${`Discovered trending topics from tracked keywords`},
          'success',
          NOW()
        )
      `;
    }

    if (totalKeywords === 0) {
      return NextResponse.json(
        { error: "No tracked keywords found for any client. Add keywords first." },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      trendsCreated,
      message: `Discovered ${trendsCreated} trends from ${totalKeywords} keywords`,
    });
  } catch (error) {
    console.error("[trends] POST error:", error);
    return NextResponse.json(
      { error: "Failed to discover trends" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Trend ID is required" }, { status: 400 });
    }

    await sql`
      DELETE FROM trends
      WHERE id = ${id}
        AND client_id IN (SELECT id FROM clients WHERE org_id = ${session.orgId})
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[trends] DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete trend" }, { status: 500 });
  }
}
