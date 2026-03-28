"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { cn } from "@/lib/utils";

const MODULES = ["intelligence", "content", "technical", "outreach"] as const;
const STATUSES = ["success", "failure", "warning", "info"] as const;

const MODULE_COLORS: Record<string, string> = {
  intelligence: "bg-blue-500/15 text-blue-400 hover:bg-blue-500/25",
  content: "bg-purple-500/15 text-purple-400 hover:bg-purple-500/25",
  technical: "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25",
  outreach: "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25",
};

const STATUS_COLORS: Record<string, string> = {
  success: "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25",
  failure: "bg-red-500/15 text-red-400 hover:bg-red-500/25",
  warning: "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25",
  info: "bg-blue-500/15 text-blue-400 hover:bg-blue-500/25",
};

interface ActivityFiltersProps {
  currentModule?: string;
  currentStatus?: string;
  currentClientId?: string;
  clients: Array<{ id: string; name: string }>;
}

export function ActivityFilters({
  currentModule,
  currentStatus,
  currentClientId,
  clients,
}: ActivityFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = useCallback(
    (key: string, value: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/activity-log?${params.toString()}`);
    },
    [router, searchParams],
  );

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/50 bg-card/80 px-5 py-4 backdrop-blur-sm">
      <span className="mr-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Filters
      </span>

      {/* Module filters */}
      <div className="flex flex-wrap items-center gap-1.5">
        {MODULES.map((mod) => (
          <button
            key={mod}
            onClick={() =>
              updateFilter("module", currentModule === mod ? undefined : mod)
            }
            className={cn(
              "rounded-md px-2 py-1 text-xs font-medium capitalize transition-colors duration-150",
              currentModule === mod
                ? MODULE_COLORS[mod]
                : "bg-muted/50 text-muted-foreground hover:bg-muted",
            )}
          >
            {mod}
          </button>
        ))}
      </div>

      <div className="h-4 w-px bg-border/50" />

      {/* Status filters */}
      <div className="flex flex-wrap items-center gap-1.5">
        {STATUSES.map((status) => (
          <button
            key={status}
            onClick={() =>
              updateFilter(
                "status",
                currentStatus === status ? undefined : status,
              )
            }
            className={cn(
              "rounded-md px-2 py-1 text-xs font-medium capitalize transition-colors duration-150",
              currentStatus === status
                ? STATUS_COLORS[status]
                : "bg-muted/50 text-muted-foreground hover:bg-muted",
            )}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Client filter */}
      {clients.length > 0 && (
        <>
          <div className="h-4 w-px bg-border/50" />
          <select
            value={currentClientId ?? ""}
            onChange={(e) =>
              updateFilter("clientId", e.target.value || undefined)
            }
            className="rounded-md border border-border/50 bg-muted/50 px-2 py-1 text-xs text-foreground transition-colors focus:border-nexus-accent/50 focus:outline-none"
            aria-label="Filter by client"
          >
            <option value="">All clients</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </>
      )}

      {/* Clear all */}
      {(currentModule || currentStatus || currentClientId) && (
        <button
          onClick={() => router.push("/activity-log")}
          className="ml-auto text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
