import { NextResponse } from "next/server";
import { z } from "zod";

import { sql } from "@/lib/db";

const ActionPayloadSchema = z.object({
  client_id: z.string().nullable().optional(),
  module: z.string(),
  action_type: z.string(),
  summary: z.string(),
  details: z.record(z.string(), z.unknown()).nullable().optional(),
  status: z.enum(["success", "failure", "warning", "info"]),
  triggered_by: z.string(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = ActionPayloadSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: result.error.format() },
        { status: 400 },
      );
    }

    const data = result.data;

    await sql`
      INSERT INTO agent_action_log (client_id, module, action_type, summary, details, status, triggered_by)
      VALUES (
        ${data.client_id ?? null},
        ${data.module},
        ${data.action_type},
        ${data.summary},
        ${JSON.stringify(data.details ?? null)},
        ${data.status},
        ${data.triggered_by}
      )
    `;

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
