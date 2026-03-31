import { NextRequest, NextResponse } from "next/server";

const CRON_SECRET = process.env.CRON_SECRET;

const VALID_TASKS = [
  "all",
  "seed-ranks",
  "health-score",
  "rank-tracker",
  "competitor-monitor",
  "outreach-runner",
] as const;

type CronTask = (typeof VALID_TASKS)[number];

const TASK_PATHS: Record<Exclude<CronTask, "all">, string> = {
  "seed-ranks": "/api/cron/seed-ranks",
  "health-score": "/api/cron/health-score",
  "rank-tracker": "/api/cron/rank-tracker",
  "competitor-monitor": "/api/cron/competitor-monitor",
  "outreach-runner": "/api/cron/outreach-runner",
};

// Tasks to run when task=all (daily automation)
const ALL_TASKS: Exclude<CronTask, "all">[] = [
  "rank-tracker",
  "competitor-monitor",
  "outreach-runner",
  "health-score",
];

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

  try {
    const response = await fetch(url, { method: "POST", headers });
    const data = await response.json();
    return { ok: response.ok, data };
  } catch (error) {
    return { ok: false, data: { error: String(error) } };
  }
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
        { error: `Invalid task. Valid: ${VALID_TASKS.join(", ")}` },
        { status: 400 },
      );
    }

    const authHeader = request.headers.get("authorization");
    const results: Record<string, unknown> = {};

    const tasksToRun = task === "all"
      ? ALL_TASKS
      : [task as Exclude<CronTask, "all">];

    for (const t of tasksToRun) {
      const url = buildInternalUrl(TASK_PATHS[t], request);
      results[t] = await callCronEndpoint(url, authHeader);
    }

    const hasFailure = Object.values(results).some(
      (r) => !(r as { ok: boolean }).ok,
    );

    return NextResponse.json(
      { task, results, ran: tasksToRun.length },
      { status: hasFailure ? 207 : 200 },
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to run cron tasks" },
      { status: 500 },
    );
  }
}
