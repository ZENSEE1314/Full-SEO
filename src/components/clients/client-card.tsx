"use client";

import Link from "next/link";
import { Globe, Search, FileText, AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";
import { HealthScoreRing } from "@/components/clients/health-score-ring";

interface ClientCardProps {
  id: string;
  name: string;
  domain: string;
  status: "active" | "paused" | "archived";
  healthScore: number | null;
  keywordCount: number;
  pageCount: number;
  issueCount: number;
  index: number;
}

const STATUS_STYLES = {
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  paused: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  archived: "bg-slate-500/10 text-slate-400 border-slate-500/20",
} as const;

export function ClientCard({
  id,
  name,
  domain,
  status,
  healthScore,
  keywordCount,
  pageCount,
  issueCount,
  index,
}: ClientCardProps) {
  return (
    <Link
      href={`/clients/${id}`}
      className={cn(
        "group relative flex flex-col gap-5 overflow-hidden rounded-xl p-5",
        "bg-slate-900/70 backdrop-blur-sm border border-white/[0.06]",
        "transition-all duration-300 ease-out",
        "hover:border-emerald-500/20 hover:shadow-[0_0_32px_-8px_rgba(16,185,129,0.15)]",
        "hover:-translate-y-0.5",
        "outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/30",
        "animate-[slide-up_0.4s_ease-out_both]",
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Hover glow overlay */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300",
          "bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,0.06),transparent_60%)]",
          "group-hover:opacity-100",
        )}
        aria-hidden="true"
      />

      {/* Header row */}
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-heading text-base font-bold text-foreground group-hover:text-emerald-400 transition-colors duration-200">
            {name}
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground truncate">
            <Globe className="size-3.5 shrink-0" aria-hidden="true" />
            {domain}
          </p>
        </div>
        <HealthScoreRing score={healthScore} />
      </div>

      {/* Status badge */}
      <div className="relative">
        <span
          className={cn(
            "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize",
            STATUS_STYLES[status],
          )}
        >
          {status}
        </span>
      </div>

      {/* Stats row */}
      <div className="relative grid grid-cols-3 gap-3 border-t border-white/[0.04] pt-4">
        <StatItem
          icon={<Search className="size-3.5" />}
          label="Keywords"
          value={keywordCount}
        />
        <StatItem
          icon={<FileText className="size-3.5" />}
          label="Pages"
          value={pageCount}
        />
        <StatItem
          icon={<AlertTriangle className="size-3.5" />}
          label="Issues"
          value={issueCount}
          isWarning={issueCount > 0}
        />
      </div>
    </Link>
  );
}

function StatItem({
  icon,
  label,
  value,
  isWarning = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  isWarning?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <div
        className={cn(
          "flex items-center gap-1 text-muted-foreground",
          isWarning && "text-amber-400",
        )}
      >
        {icon}
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      <span
        className={cn(
          "font-heading text-lg font-bold tabular-nums",
          isWarning ? "text-amber-400" : "text-foreground",
        )}
      >
        {value.toLocaleString()}
      </span>
    </div>
  );
}
