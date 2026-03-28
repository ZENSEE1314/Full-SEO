const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || "http://localhost:5678/webhook";

export async function triggerWorkflow(
  workflowSlug: string,
  payload: Record<string, unknown>
) {
  const url = `${N8N_WEBHOOK_URL}/${workflowSlug}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`n8n webhook failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
