import { redirect } from "next/navigation";
import Link from "next/link";

import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { CreateSequenceDialog } from "@/components/outreach/create-sequence-dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import type { OutreachSequence, Client } from "@/types";
import { Mail, MessageCircle, Layers, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Outreach Sequences | NEXUS SEO",
};

interface SequenceWithStats extends OutreachSequence {
  client_name: string;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  replied_count: number;
}

export default async function SequencesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [sequenceRows, clientRows] = await Promise.all([
    sql`
      SELECT
        os.*,
        c.name as client_name,
        COALESCE(stats.sent_count, 0) as sent_count,
        COALESCE(stats.delivered_count, 0) as delivered_count,
        COALESCE(stats.opened_count, 0) as opened_count,
        COALESCE(stats.replied_count, 0) as replied_count
      FROM outreach_sequences os
      JOIN clients c ON os.client_id = c.id
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
          COUNT(*) FILTER (WHERE status = 'delivered') as delivered_count,
          COUNT(*) FILTER (WHERE status = 'opened') as opened_count,
          COUNT(*) FILTER (WHERE status = 'replied') as replied_count
        FROM outreach_messages om
        WHERE om.sequence_id = os.id
      ) stats ON true
      WHERE c.org_id = ${session.orgId}
      ORDER BY os.created_at DESC
    `,
    sql`
      SELECT id, name, domain, status, health_score
      FROM clients
      WHERE org_id = ${session.orgId}
      ORDER BY name
    `,
  ]);

  const sequences = sequenceRows as unknown as SequenceWithStats[];
  const clients = clientRows as unknown as Client[];

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

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-[fade-in_0.5s_ease-out_both]">
          <div>
            <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Outreach Sequences
            </h1>
            <p className="mt-1 text-base text-muted-foreground">
              Automate your link building outreach campaigns
            </p>
          </div>
          <CreateSequenceDialog clients={clients} />
        </header>

        {/* Sequence list */}
        {sequences.length === 0 ? (
          <SequencesEmptyState />
        ) : (
          <div className="grid gap-4">
            {sequences.map((sequence, index) => (
              <SequenceCard
                key={sequence.id}
                sequence={sequence}
                index={index}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SequenceCard({
  sequence,
  index,
}: {
  sequence: SequenceWithStats;
  index: number;
}) {
  const ChannelIcon =
    sequence.channel === "email"
      ? Mail
      : sequence.channel === "whatsapp"
        ? MessageCircle
        : Layers;

  const channelLabel =
    sequence.channel === "both" ? "Email + WhatsApp" : sequence.channel;

  const sentCount = Number(sequence.sent_count);
  const deliveredRate =
    sentCount > 0
      ? Math.round((Number(sequence.delivered_count) / sentCount) * 100)
      : 0;
  const openedRate =
    sentCount > 0
      ? Math.round((Number(sequence.opened_count) / sentCount) * 100)
      : 0;
  const repliedRate =
    sentCount > 0
      ? Math.round((Number(sequence.replied_count) / sentCount) * 100)
      : 0;

  const steps = Array.isArray(sequence.steps) ? sequence.steps : [];

  return (
    <Link
      href={`/outreach/sequences/${sequence.id}`}
      className="group relative flex flex-col gap-4 rounded-xl border border-white/[0.06] bg-slate-900/70 backdrop-blur-sm p-5 transition-all hover:border-white/[0.10] hover:bg-slate-900/80 sm:flex-row sm:items-center sm:justify-between"
      style={{
        animationDelay: `${index * 60}ms`,
        animation: "slide-up 0.4s ease-out both",
      }}
    >
      {/* Left: Info */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl border ${
            sequence.channel === "email"
              ? "border-blue-500/20 bg-blue-500/10 text-blue-400"
              : sequence.channel === "whatsapp"
                ? "border-green-500/20 bg-green-500/10 text-green-400"
                : "border-purple-500/20 bg-purple-500/10 text-purple-400"
          }`}
        >
          <ChannelIcon className="size-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground truncate">
              {sequence.name}
            </h3>
            {sequence.is_active ? (
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                Active
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">
                Paused
              </Badge>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="capitalize">{channelLabel}</span>
            <span className="size-0.5 rounded-full bg-white/20" />
            <span>
              {steps.length} {steps.length === 1 ? "step" : "steps"}
            </span>
            <span className="size-0.5 rounded-full bg-white/20" />
            <span>{sequence.client_name}</span>
          </div>
        </div>
      </div>

      {/* Center: Stats */}
      <div className="flex items-center gap-6 text-center sm:gap-8">
        <StatBlock label="Sent" value={sentCount} />
        <StatBlock label="Delivered" value={`${deliveredRate}%`} />
        <StatBlock label="Opened" value={`${openedRate}%`} />
        <StatBlock
          label="Replied"
          value={`${repliedRate}%`}
          isHighlight={repliedRate > 0}
        />
      </div>

      {/* Right: Arrow */}
      <ArrowRight className="hidden size-4 text-muted-foreground transition-transform group-hover:translate-x-1 sm:block" />
    </Link>
  );
}

function StatBlock({
  label,
  value,
  isHighlight = false,
}: {
  label: string;
  value: number | string;
  isHighlight?: boolean;
}) {
  return (
    <div className="min-w-[48px]">
      <p
        className={`text-base font-bold tabular-nums ${
          isHighlight ? "text-emerald-400" : "text-foreground"
        }`}
      >
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function SequencesEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.04] bg-slate-900/40 py-20 text-center animate-[fade-in_0.5s_ease-out_both]">
      <div className="rounded-xl bg-emerald-500/10 p-4 mb-4">
        <Mail className="size-8 text-emerald-400" />
      </div>
      <h3 className="font-heading text-lg font-bold text-foreground">
        No sequences yet
      </h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Create your first outreach sequence to automate link building campaigns
        across email and WhatsApp.
      </p>
    </div>
  );
}
