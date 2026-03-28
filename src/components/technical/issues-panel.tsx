"use client";

import { useState, useTransition } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Filter,
  Wrench,
  XCircle,
  AlertCircle,
  Info,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Severity = "critical" | "warning" | "info";

interface Issue {
  id: string;
  issue_type: string;
  severity: Severity;
  description: string | null;
  page_url: string | null;
  auto_fixable: boolean;
  fixed_at: string | null;
  detected_at: string;
}

interface IssuesPanelProps {
  issues: Issue[];
  clientId: string;
}

const SEVERITY_CONFIG: Record<
  Severity,
  {
    icon: React.ElementType;
    borderColor: string;
    textColor: string;
    bgColor: string;
    barColor: string;
    label: string;
  }
> = {
  critical: {
    icon: XCircle,
    borderColor: "border-l-red-500",
    textColor: "text-red-400",
    bgColor: "bg-red-500/10",
    barColor: "bg-red-500",
    label: "Critical",
  },
  warning: {
    icon: AlertCircle,
    borderColor: "border-l-amber-500",
    textColor: "text-amber-400",
    bgColor: "bg-amber-500/10",
    barColor: "bg-amber-500",
    label: "Warning",
  },
  info: {
    icon: Info,
    borderColor: "border-l-blue-500",
    textColor: "text-blue-400",
    bgColor: "bg-blue-500/10",
    barColor: "bg-blue-400",
    label: "Info",
  },
};

const SEVERITY_ORDER: Severity[] = ["critical", "warning", "info"];

export function IssuesPanel({ issues, clientId }: IssuesPanelProps) {
  const [filterSeverity, setFilterSeverity] = useState<Severity | "all">("all");
  const [expandedGroups, setExpandedGroups] = useState<Set<Severity>>(
    new Set(["critical", "warning"]),
  );
  const [fixingIds, setFixingIds] = useState<Set<string>>(new Set());
  const [fixedIds, setFixedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const unfixedIssues = issues.filter(
    (i) => i.fixed_at === null && !fixedIds.has(i.id),
  );

  const counts: Record<Severity, number> = {
    critical: unfixedIssues.filter((i) => i.severity === "critical").length,
    warning: unfixedIssues.filter((i) => i.severity === "warning").length,
    info: unfixedIssues.filter((i) => i.severity === "info").length,
  };

  const totalCount = counts.critical + counts.warning + counts.info;

  const filteredIssues =
    filterSeverity === "all"
      ? unfixedIssues
      : unfixedIssues.filter((i) => i.severity === filterSeverity);

  const grouped = SEVERITY_ORDER.reduce(
    (acc, sev) => {
      acc[sev] = filteredIssues.filter((i) => i.severity === sev);
      return acc;
    },
    {} as Record<Severity, Issue[]>,
  );

  function toggleGroup(severity: Severity) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(severity)) {
        next.delete(severity);
      } else {
        next.add(severity);
      }
      return next;
    });
  }

  function handleFix(issueId: string) {
    setFixingIds((prev) => new Set(prev).add(issueId));

    startTransition(async () => {
      try {
        const response = await fetch("/api/technical/issues", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ issueId, clientId }),
        });

        if (response.ok) {
          setFixedIds((prev) => new Set(prev).add(issueId));
        }
      } finally {
        setFixingIds((prev) => {
          const next = new Set(prev);
          next.delete(issueId);
          return next;
        });
      }
    });
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-slate-900/70 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-white/[0.04] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="size-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="font-heading text-sm font-bold text-foreground">
            Issues
          </h2>
          <span className="text-xs tabular-nums text-muted-foreground">
            {totalCount} open
          </span>
        </div>

        {/* Severity filter pills */}
        <div className="flex items-center gap-1.5">
          <Filter className="size-3.5 text-muted-foreground mr-1" aria-hidden="true" />
          {(["all", ...SEVERITY_ORDER] as const).map((sev) => {
            const isActive = filterSeverity === sev;
            const config = sev !== "all" ? SEVERITY_CONFIG[sev] : null;
            return (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-150",
                  "outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50",
                  isActive
                    ? cn("text-foreground", config?.bgColor ?? "bg-white/10")
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                )}
                aria-pressed={isActive}
              >
                {sev === "all" ? "All" : config?.label}
                {sev !== "all" && (
                  <span className="ml-1 tabular-nums">
                    ({counts[sev]})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stacked severity bar */}
      {totalCount > 0 && (
        <div className="px-5 pt-4 pb-2">
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-800">
            {SEVERITY_ORDER.map((sev) => {
              const percentage = (counts[sev] / totalCount) * 100;
              if (percentage === 0) return null;
              return (
                <div
                  key={sev}
                  className={cn(
                    "transition-all duration-500",
                    SEVERITY_CONFIG[sev].barColor,
                  )}
                  style={{ width: `${percentage}%` }}
                  title={`${SEVERITY_CONFIG[sev].label}: ${counts[sev]}`}
                  role="meter"
                  aria-valuenow={counts[sev]}
                  aria-valuemin={0}
                  aria-valuemax={totalCount}
                  aria-label={`${SEVERITY_CONFIG[sev].label} issues`}
                />
              );
            })}
          </div>
          <div className="mt-2 flex gap-4">
            {SEVERITY_ORDER.map((sev) =>
              counts[sev] > 0 ? (
                <div key={sev} className="flex items-center gap-1.5">
                  <div className={cn("size-2 rounded-full", SEVERITY_CONFIG[sev].barColor)} />
                  <span className="text-[11px] text-muted-foreground">
                    {counts[sev]} {SEVERITY_CONFIG[sev].label.toLowerCase()}
                  </span>
                </div>
              ) : null,
            )}
          </div>
        </div>
      )}

      {/* Grouped issue list */}
      <div className="divide-y divide-white/[0.03]">
        {SEVERITY_ORDER.map((severity) => {
          const groupIssues = grouped[severity];
          if (groupIssues.length === 0) return null;

          const config = SEVERITY_CONFIG[severity];
          const isExpanded = expandedGroups.has(severity);
          const Icon = config.icon;

          return (
            <div key={severity}>
              <button
                onClick={() => toggleGroup(severity)}
                className={cn(
                  "flex w-full items-center gap-3 px-5 py-3 text-left transition-colors duration-150",
                  "hover:bg-white/[0.02] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500/50",
                )}
                aria-expanded={isExpanded}
              >
                {isExpanded ? (
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                )}
                <Icon className={cn("size-4", config.textColor)} aria-hidden="true" />
                <span className={cn("text-sm font-semibold", config.textColor)}>
                  {config.label}
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  ({groupIssues.length})
                </span>
              </button>

              {isExpanded && (
                <div className="pb-2">
                  {groupIssues.map((issue) => {
                    const isFixing = fixingIds.has(issue.id);

                    return (
                      <div
                        key={issue.id}
                        className={cn(
                          "mx-3 mb-1.5 flex items-start gap-3 rounded-lg border-l-2 bg-white/[0.02] px-4 py-3",
                          config.borderColor,
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground capitalize">
                              {issue.issue_type.replace(/_/g, " ")}
                            </p>
                            {issue.auto_fixable && (
                              <Badge
                                variant="secondary"
                                className="gap-1 bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              >
                                <Wrench className="size-2.5" aria-hidden="true" />
                                Auto-fix
                              </Badge>
                            )}
                          </div>
                          {issue.description && (
                            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                              {issue.description}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                            {issue.page_url && (
                              <span className="truncate max-w-[240px]" title={issue.page_url}>
                                {issue.page_url}
                              </span>
                            )}
                            <span>
                              {formatDistanceToNow(new Date(issue.detected_at), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                        </div>

                        {issue.auto_fixable && (
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => handleFix(issue.id)}
                            disabled={isFixing || isPending}
                            className="shrink-0"
                          >
                            {isFixing ? "Fixing..." : "Fix"}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {totalCount === 0 && (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-muted-foreground">No open issues</p>
          </div>
        )}
      </div>
    </div>
  );
}
