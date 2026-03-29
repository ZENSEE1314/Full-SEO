import { NextRequest, NextResponse } from "next/server";

const CRON_SECRET = process.env.CRON_SECRET;
const VALID_TASKS = ["all", "seed-ranks", "health-score"] as const;

type CronTask = (typeof VALID_TASKS)[number];

function buildInternalUrl(path: string, request: NextRequest): string {
  const { protocol, host } = request.nextUrl;
  return `${protocol}//${host}${path}`;
}

async function callCronEndpoint(
  url: string,
  authHeader: string | null,
): Promise<{ ok: boolean; data: unknown }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authHeader) {
    headers["authorization"] = authHeader;
  }

  const response = await fetch(url, { method: "POST", headers });
  const data = await response.json();
  return { ok: response.ok, data };
}

export async function GET(request: NextRequest) {
  try {
    if (CRON_SECRET) {
      const authHeader = request.headers.get("authorization");
      if (authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const task = (request.nextUrl.searchParams.get("task") ?? "all") as string;

    if (!VALID_TASKS.includes(task as CronTask)) {
      return NextResponse.json(
        { error: `Invalid task. Valid values: ${VALID_TASKS.join(", ")}` },
        { status: 400 },
      );
    }

    const authHeader = request.headers.get("authorization");
    const results: Record<string, unknown> = {};

    const shouldRunSeedRanks = task === "all" || task === "seed-ranks";
    const shouldRunHealthScore = task === "all" || task === "health-score";

    if (shouldRunSeedRanks) {
      const url = buildInternalUrl("/api/cron/seed-ranks", request);
      results["seed-ranks"] = await callCronEndpoint(url, authHeader);
    }

    if (shouldRunHealthScore) {
      const url = buildInternalUrl("/api/cron/health-score", request);
      results["health-score"] = await callCronEndpoint(url, authHeader);
    }

    const hasFailure = Object.values(results).some(
      (r) => !(r as { ok: boolean }).ok,
    );

    return NextResponse.json(
      { task, results },
      { status: hasFailure ? 207 : 200 },
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to run cron tasks" },
      { status: 500 },
    );
  }
}
