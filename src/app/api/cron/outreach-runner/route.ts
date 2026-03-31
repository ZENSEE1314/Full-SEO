import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { runOutreachRunner } from "@/lib/automation/tasks";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runOutreachRunner();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[cron/outreach-runner] Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
