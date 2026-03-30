import { NextRequest, NextResponse } from "next/server";

import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { getGoogleCredentials, refreshAccessToken } from "@/lib/google/oauth";

interface GscRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

async function getValidToken(userId: string): Promise<string> {
  const rows = await sql`
    SELECT access_token, refresh_token, token_expires_at
    FROM integrations
    WHERE user_id = ${userId}::uuid
      AND provider = 'google-search-console'
      AND is_active = true
    LIMIT 1
  `;

  if (rows.length === 0) throw new Error("GSC not connected");

  const integration = rows[0] as {
    access_token: string;
    refresh_token: string;
    token_expires_at: string;
  };

  const expiresAt = new Date(integration.token_expires_at);

  if (new Date() >= expiresAt) {
    const credentials = await getGoogleCredentials(userId);
    const refreshed = await refreshAccessToken(integration.refresh_token, credentials);
    const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000);

    await sql`
      UPDATE integrations
      SET access_token = ${refreshed.access_token},
          token_expires_at = ${newExpiry.toISOString()}::timestamptz,
          updated_at = NOW()
      WHERE user_id = ${userId}::uuid AND provider = 'google-search-console'
    `;

    return refreshed.access_token;
  }

  return integration.access_token;
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { client_id } = body as { client_id: string };

    if (!client_id) {
      return NextResponse.json({ error: "client_id required" }, { status: 400 });
    }

    // Get client domain
    const clientRows = await sql`
      SELECT domain FROM clients
      WHERE id = ${client_id} AND org_id = ${session.orgId}
      LIMIT 1
    `;
    if (clientRows.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const domain = (clientRows[0] as { domain: string }).domain;
    const siteUrl = `sc-domain:${domain}`;

    // Get valid access token
    const accessToken = await getValidToken(session.userId);

    // Fetch last 28 days of search performance data
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - 28 * 86400000).toISOString().split("T")[0];

    const gscRes = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: ["query"],
          rowLimit: 500,
          dataState: "all",
        }),
      },
    );

    if (!gscRes.ok) {
      const err = await gscRes.json();
      return NextResponse.json(
        { error: err.error?.message ?? "GSC API error" },
        { status: 502 },
      );
    }

    const gscData = await gscRes.json();
    const gscRows: GscRow[] = gscData.rows ?? [];

    let synced = 0;

    for (const row of gscRows) {
      const keyword = row.keys[0];
      const position = Math.round(row.position);
      const volume = Math.round(row.impressions * (28 / 7)); // Rough monthly estimate

      // Upsert keyword with GSC data
      await sql`
        INSERT INTO keywords (client_id, keyword, search_volume, current_rank, ranking_url, is_tracked, source)
        VALUES (
          ${client_id},
          ${keyword},
          ${volume},
          ${position},
          ${`https://${domain}`},
          true,
          'search_console'
        )
        ON CONFLICT (client_id, keyword)
        DO UPDATE SET
          search_volume = EXCLUDED.search_volume,
          previous_rank = keywords.current_rank,
          current_rank = EXCLUDED.current_rank,
          best_rank = LEAST(COALESCE(keywords.best_rank, 999), EXCLUDED.current_rank),
          updated_at = NOW()
      `;

      // Add to rank history
      await sql`
        INSERT INTO keyword_rank_history (keyword_id, rank, recorded_at)
        SELECT id, ${position}, NOW()
        FROM keywords
        WHERE client_id = ${client_id} AND keyword = ${keyword}
      `;

      synced++;
    }

    // Update integration last sync
    await sql`
      UPDATE integrations
      SET properties = jsonb_set(
        COALESCE(properties, '{}'::jsonb),
        '{last_sync_at}',
        to_jsonb(NOW()::text)
      ),
      updated_at = NOW()
      WHERE user_id = ${session.userId}::uuid AND provider = 'google-search-console'
    `;

    // Log action
    await sql`
      INSERT INTO agent_action_log (client_id, module, action_type, summary, status, created_at)
      VALUES (
        ${client_id},
        'integrations',
        'gsc_sync',
        ${`Synced ${synced} keywords from Google Search Console (${startDate} to ${endDate})`},
        'success',
        NOW()
      )
    `;

    return NextResponse.json({
      success: true,
      synced,
      period: { startDate, endDate },
      message: `Synced ${synced} keywords from Search Console`,
    });
  } catch (error) {
    console.error("[gsc/sync] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 },
    );
  }
}
