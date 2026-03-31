import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

const ALLOWED_PROVIDERS = [
  "google-credentials",
  "replicate-api",
  "n8n",
  "whatsapp",
  "smtp-email",
] as const;

const RESERVED_KEYS = ["provider", "action"];

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const provider = (body.provider as string) ?? "google-credentials";

    if (!ALLOWED_PROVIDERS.includes(provider as (typeof ALLOWED_PROVIDERS)[number])) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    // Build properties from all non-reserved keys
    const properties: Record<string, string> = {};
    for (const [key, value] of Object.entries(body)) {
      if (RESERVED_KEYS.includes(key)) continue;
      if (typeof value === "string" && value.trim()) {
        properties[key] = value.trim();
      }
    }

    if (Object.keys(properties).length === 0) {
      return NextResponse.json({ error: "No configuration values provided" }, { status: 400 });
    }

    // Validate SMTP credentials before saving
    if (provider === "smtp-email") {
      const { smtp_host, smtp_port, smtp_user, smtp_pass } = properties;
      if (!smtp_host || !smtp_user || !smtp_pass) {
        return NextResponse.json({ error: "SMTP host, username, and password are required" }, { status: 400 });
      }
      try {
        const port = parseInt(smtp_port || "587", 10);
        const transporter = nodemailer.createTransport({
          host: smtp_host,
          port,
          secure: port === 465,
          auth: { user: smtp_user, pass: smtp_pass },
          connectionTimeout: 10000,
        });
        await transporter.verify();
      } catch (smtpError) {
        console.error("[credentials] SMTP verification failed:", smtpError);
        return NextResponse.json(
          { error: "SMTP connection failed. Check your host, port, username, and password." },
          { status: 422 }
        );
      }
    }

    // Validate n8n URL is reachable
    if (provider === "n8n") {
      const { instance_url } = properties;
      if (!instance_url) {
        return NextResponse.json({ error: "n8n instance URL is required" }, { status: 400 });
      }
      try {
        const resp = await fetch(instance_url, { method: "HEAD", signal: AbortSignal.timeout(8000) });
        if (!resp.ok && resp.status !== 401 && resp.status !== 403) {
          return NextResponse.json({ error: `n8n instance not reachable (HTTP ${resp.status})` }, { status: 422 });
        }
      } catch {
        return NextResponse.json({ error: "Cannot reach n8n instance. Check the URL." }, { status: 422 });
      }
    }

    // Validate Replicate API key format
    if (provider === "replicate-api") {
      const { api_token } = properties;
      if (!api_token || api_token.length < 10) {
        return NextResponse.json({ error: "Invalid Replicate API token" }, { status: 400 });
      }
    }

    const propsJson = JSON.stringify(properties);

    await sql`
      INSERT INTO integrations (org_id, user_id, provider, properties, is_active, updated_at)
      VALUES (
        ${session.orgId}::uuid,
        ${session.userId}::uuid,
        ${provider},
        ${propsJson}::jsonb,
        true,
        NOW()
      )
      ON CONFLICT (user_id, provider)
      DO UPDATE SET
        properties = ${propsJson}::jsonb,
        is_active = true,
        updated_at = NOW()
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[credentials] POST error:", error);
    return NextResponse.json({ error: "Failed to save credentials" }, { status: 500 });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await sql`
      SELECT provider, properties FROM integrations
      WHERE user_id = ${session.userId}::uuid AND is_active = true
    `;

    const configured: Record<string, boolean> = {};
    for (const row of rows) {
      const r = row as { provider: string; properties: Record<string, string> | null };
      if (r.properties && Object.keys(r.properties).length > 0) {
        configured[r.provider] = true;
      }
    }

    return NextResponse.json(configured);
  } catch {
    return NextResponse.json({});
  }
}
