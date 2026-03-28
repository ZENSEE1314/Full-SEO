import { sql } from "@/lib/db";

const POLL_INTERVAL_MS = 3000;
const HEARTBEAT_INTERVAL_MS = 15000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");

  const encoder = new TextEncoder();
  let isClosed = false;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      let lastSeenId: string | null = null;

      const sendEvent = (eventType: string, data: string, id?: string) => {
        if (isClosed) return;
        try {
          let message = `event: ${eventType}\n`;
          if (id) message += `id: ${id}\n`;
          message += `data: ${data}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch {
          cleanup();
        }
      };

      const poll = async () => {
        if (isClosed) return;
        try {
          const query = lastSeenId
            ? clientId
              ? sql`SELECT * FROM agent_action_log WHERE id > ${lastSeenId} AND client_id = ${clientId} ORDER BY created_at ASC LIMIT 50`
              : sql`SELECT * FROM agent_action_log WHERE id > ${lastSeenId} ORDER BY created_at ASC LIMIT 50`
            : clientId
              ? sql`SELECT * FROM agent_action_log WHERE client_id = ${clientId} ORDER BY created_at DESC LIMIT 1`
              : sql`SELECT * FROM agent_action_log ORDER BY created_at DESC LIMIT 1`;

          const rows = await query;

          for (const row of rows) {
            sendEvent("action", JSON.stringify(row), row.id);
            lastSeenId = row.id;
          }
        } catch {
          // DB query failed -- will retry on next poll
        }
      };

      const cleanup = () => {
        isClosed = true;
        if (pollTimer) clearInterval(pollTimer);
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      };

      request.signal.addEventListener("abort", cleanup);

      await poll();

      pollTimer = setInterval(poll, POLL_INTERVAL_MS);
      heartbeatTimer = setInterval(() => {
        sendEvent("heartbeat", JSON.stringify({ time: Date.now() }));
      }, HEARTBEAT_INTERVAL_MS);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
