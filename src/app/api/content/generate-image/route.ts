import { NextRequest, NextResponse } from "next/server";

import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { prompt, style, aspect_ratio, client_id } = body as {
      prompt: string;
      style?: string;
      aspect_ratio?: string;
      client_id?: string;
    };

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const fullPrompt = style ? `${prompt}, ${style} style` : prompt;
    let imageUrl: string;

    if (REPLICATE_API_TOKEN) {
      const res = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version: "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
          input: {
            prompt: fullPrompt,
            width: aspect_ratio === "9:16" ? 768 : aspect_ratio === "1:1" ? 1024 : 1216,
            height: aspect_ratio === "9:16" ? 1344 : aspect_ratio === "1:1" ? 1024 : 832,
            num_outputs: 1,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        return NextResponse.json(
          { error: err.detail ?? "Replicate API error" },
          { status: 502 },
        );
      }

      const prediction = await res.json();

      // Poll for completion (max 60s)
      let output = prediction.output;
      if (!output && prediction.urls?.get) {
        for (let i = 0; i < 30; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          const poll = await fetch(prediction.urls.get, {
            headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
          });
          const data = await poll.json();
          if (data.status === "succeeded" && data.output) {
            output = data.output;
            break;
          }
          if (data.status === "failed") {
            return NextResponse.json({ error: "Image generation failed" }, { status: 500 });
          }
        }
      }

      imageUrl = Array.isArray(output) ? output[0] : output ?? `https://picsum.photos/1200/630?random=${Date.now()}`;
    } else {
      // Placeholder when no API key
      const w = aspect_ratio === "9:16" ? 630 : aspect_ratio === "1:1" ? 800 : 1200;
      const h = aspect_ratio === "9:16" ? 1120 : aspect_ratio === "1:1" ? 800 : 630;
      imageUrl = `https://picsum.photos/${w}/${h}?random=${Date.now()}`;
    }

    // Save to content_media if client_id provided
    let mediaId: string | null = null;
    if (client_id) {
      const rows = await sql`
        INSERT INTO content_media (client_id, url, media_type, alt_text, created_at)
        VALUES (${client_id}, ${imageUrl}, 'header_image', ${prompt.slice(0, 255)}, NOW())
        RETURNING id
      `;
      mediaId = (rows[0] as { id: string })?.id ?? null;
    }

    await sql`
      INSERT INTO agent_action_log (client_id, module, action_type, summary, status, created_at)
      VALUES (${client_id ?? null}, 'content', 'generate_image', ${`Generated image: ${prompt.slice(0, 100)}`}, 'success', NOW())
    `;

    return NextResponse.json({
      success: true,
      url: imageUrl,
      id: mediaId,
      provider: REPLICATE_API_TOKEN ? "replicate" : "placeholder",
    });
  } catch (error) {
    console.error("[generate-image] error:", error);
    return NextResponse.json({ error: "Failed to generate image" }, { status: 500 });
  }
}
