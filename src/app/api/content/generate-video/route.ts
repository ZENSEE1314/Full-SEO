import { NextRequest, NextResponse } from "next/server";

import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { prompt, duration, aspect_ratio, client_id } = body as {
      prompt: string;
      duration?: string;
      aspect_ratio?: string;
      client_id?: string;
    };

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Video generation is queued — Remotion/Replicate integration
    // For now, log the request and return queued status
    await sql`
      INSERT INTO agent_action_log (client_id, module, action_type, summary, status, created_at)
      VALUES (
        ${client_id ?? null},
        'content',
        'generate_video',
        ${`Video queued: ${prompt.slice(0, 100)} (${duration ?? "10s"}, ${aspect_ratio ?? "16:9"})`},
        'pending',
        NOW()
      )
    `;

    return NextResponse.json({
      success: true,
      status: "queued",
      message: `Video generation queued: "${prompt.slice(0, 60)}..." (${duration ?? "10s"}, ${aspect_ratio ?? "16:9"})`,
      provider: "remotion",
    });
  } catch (error) {
    console.error("[generate-video] error:", error);
    return NextResponse.json({ error: "Failed to queue video" }, { status: 500 });
  }
}
