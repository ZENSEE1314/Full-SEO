import { redirect } from "next/navigation";

import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { TeamTable } from "@/components/settings/team-table";
import { InviteDialog } from "@/components/settings/invite-dialog";

export const metadata = {
  title: "Team Settings | NEXUS SEO",
};

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member" | "viewer";
  created_at: string;
}

export default async function TeamSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const memberRows = await sql`
    SELECT
      u.id,
      u.name,
      u.email,
      om.role,
      om.created_at
    FROM org_members om
    JOIN users u ON om.user_id = u.id
    WHERE om.org_id = ${session.orgId}
    ORDER BY
      CASE om.role
        WHEN 'owner' THEN 0
        WHEN 'admin' THEN 1
        WHEN 'member' THEN 2
        WHEN 'viewer' THEN 3
      END,
      u.name
  `;

  const members = memberRows as unknown as TeamMember[];

  return (
    <div className="min-h-screen bg-background">
      {/* Atmospheric background */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(16,185,129,0.08), transparent)",
        }}
        aria-hidden="true"
      />

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-[fade-in_0.5s_ease-out_both]">
          <div>
            <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Team
            </h1>
            <p className="mt-1 text-base text-muted-foreground">
              Manage members and roles in your organization
            </p>
          </div>
          {session.role === "owner" && <InviteDialog />}
        </header>

        {/* Stats summary */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 animate-[fade-in_0.5s_ease-out_0.1s_both]">
          {[
            {
              label: "Total Members",
              value: members.length,
            },
            {
              label: "Admins",
              value: members.filter((m) => m.role === "admin").length,
            },
            {
              label: "Members",
              value: members.filter((m) => m.role === "member").length,
            },
            {
              label: "Viewers",
              value: members.filter((m) => m.role === "viewer").length,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-white/[0.06] bg-slate-900/70 backdrop-blur-sm p-4"
            >
              <p className="text-2xl font-bold text-foreground tabular-nums">
                {stat.value}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="animate-[slide-up_0.4s_ease-out_0.2s_both]">
          <TeamTable
            members={members}
            currentUserId={session.userId}
            currentUserRole={session.role}
          />
        </div>
      </div>
    </div>
  );
}
