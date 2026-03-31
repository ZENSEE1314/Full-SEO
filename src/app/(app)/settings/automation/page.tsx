import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { AutomationPanel } from "@/components/automation/automation-panel";

export const metadata = {
  title: "Automation | NEXUS SEO",
};

export default async function AutomationPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="space-y-6 animate-[fade-in_0.5s_ease-out_both]">
      <section className="rounded-xl border border-white/[0.06] bg-slate-900/70 backdrop-blur-sm p-5">
        <AutomationPanel />
      </section>

      <section className="rounded-xl border border-white/[0.06] bg-slate-900/70 backdrop-blur-sm p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          How it works
        </h3>
        <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
          <p>
            All automation runs natively inside your app — no external tools needed.
            Click <strong>Run</strong> to trigger any task manually, or set up a cron
            service to call them on schedule.
          </p>
          <p className="font-medium text-foreground">Scheduled automation:</p>
          <p>
            Set the <code className="rounded bg-black/30 px-1.5 py-0.5 text-emerald-400">CRON_SECRET</code> environment
            variable, then use any cron service (Railway Cron, cron-job.org, GitHub Actions) to call:
          </p>
          <code className="block rounded-lg bg-black/30 px-3 py-2 text-emerald-400">
            GET /api/cron?task=all
          </code>
          <p>
            Or run individual tasks:
          </p>
          <code className="block rounded-lg bg-black/30 px-3 py-2 text-emerald-400">
            POST /api/cron/rank-tracker<br />
            POST /api/cron/competitor-monitor<br />
            POST /api/cron/outreach-runner<br />
            POST /api/cron/health-score
          </code>
        </div>
      </section>
    </div>
  );
}
