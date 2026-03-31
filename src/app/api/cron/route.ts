import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { runAllTasks, runTask, type TaskName } from "@/lib/automation/tasks";

const VALID_TASKS: TaskName[] = [
  "rank-tracker",
  "competitor-monitor",
  "outreach-runner",
  "health-score",
  "seed-ranks",
];

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const task = request.nextUrl.searchParams.get("task") ?? "all";

  try {
    if (task === "all") {
      const results = await runAllTasks();
      const hasFailure = Object.values(results).some((r) => !r.ok);
      return NextResponse.json({ task: "all", results }, { status: hasFailure ? 207 : 200 });
    }

    if (!VALID_TASKS.includes(task as TaskName)) {
      return NextResponse.json({ error: `Invalid task. Valid: all, ${VALID_TASKS.join(", ")}` }, { status: 400 });
    }

    const data = await runTask(task as TaskName);
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    console.error("[cron] Error:", error);
    return NextResponse.json({ error: "Task failed" }, { status: 500 });
  }
}
