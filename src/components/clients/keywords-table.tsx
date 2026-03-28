"use client";

import { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Keyword } from "@/types";

type SortKey =
  | "keyword"
  | "search_volume"
  | "difficulty"
  | "current_rank"
  | "change";
type SortDir = "asc" | "desc";

interface KeywordsTableProps {
  keywords: Keyword[];
}

function getDifficultyColor(difficulty: number | null): string {
  if (difficulty === null) return "text-muted-foreground";
  if (difficulty >= 70) return "text-red-400";
  if (difficulty >= 40) return "text-amber-400";
  return "text-emerald-400";
}

function getDifficultyBg(difficulty: number | null): string {
  if (difficulty === null) return "bg-white/5";
  if (difficulty >= 70) return "bg-red-500/10";
  if (difficulty >= 40) return "bg-amber-500/10";
  return "bg-emerald-500/10";
}

export function KeywordsTable({ keywords }: KeywordsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("search_volume");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = useMemo(() => {
    const items = keywords.map((kw) => ({
      ...kw,
      change:
        kw.current_rank != null && kw.previous_rank != null
          ? kw.previous_rank - kw.current_rank
          : 0,
    }));

    items.sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      switch (sortKey) {
        case "keyword":
          aVal = a.keyword.toLowerCase();
          bVal = b.keyword.toLowerCase();
          break;
        case "search_volume":
          aVal = a.search_volume ?? -1;
          bVal = b.search_volume ?? -1;
          break;
        case "difficulty":
          aVal = a.difficulty ?? -1;
          bVal = b.difficulty ?? -1;
          break;
        case "current_rank":
          aVal = a.current_rank ?? 999;
          bVal = b.current_rank ?? 999;
          break;
        case "change":
          aVal = a.change;
          bVal = b.change;
          break;
      }

      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return items;
  }, [keywords, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "keyword" ? "asc" : "desc");
    }
  }

  if (keywords.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.04] bg-slate-900/40 py-20 text-center">
        <p className="font-heading text-lg font-bold text-foreground">
          No keywords tracked
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add keywords to start monitoring rankings.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-slate-900/70 backdrop-blur-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06]">
            <SortableHeader
              label="Keyword"
              sortKey="keyword"
              currentKey={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
              className="text-left pl-5"
            />
            <SortableHeader
              label="Volume"
              sortKey="search_volume"
              currentKey={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
              className="text-right"
            />
            <SortableHeader
              label="Difficulty"
              sortKey="difficulty"
              currentKey={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
              className="text-right"
            />
            <SortableHeader
              label="Rank"
              sortKey="current_rank"
              currentKey={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
              className="text-right"
            />
            <SortableHeader
              label="Change"
              sortKey="change"
              currentKey={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
              className="text-right"
            />
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              URL
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.03]">
          {sorted.map((kw) => (
            <tr
              key={kw.id}
              className="transition-colors hover:bg-white/[0.02]"
            >
              <td className="py-3 pl-5 pr-4">
                <span className="font-medium text-foreground">{kw.keyword}</span>
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                {kw.search_volume?.toLocaleString() ?? "--"}
              </td>
              <td className="px-4 py-3 text-right">
                {kw.difficulty != null ? (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium tabular-nums",
                      getDifficultyBg(kw.difficulty),
                      getDifficultyColor(kw.difficulty),
                    )}
                  >
                    {kw.difficulty}
                  </span>
                ) : (
                  <span className="text-muted-foreground">--</span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <span className="font-heading font-bold tabular-nums text-foreground">
                  {kw.current_rank != null ? `#${kw.current_rank}` : "--"}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <RankChange change={kw.change} />
              </td>
              <td className="px-4 py-3">
                {kw.ranking_url ? (
                  <span className="truncate block max-w-[200px] text-xs text-muted-foreground">
                    {kw.ranking_url}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">--</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  currentKey,
  currentDir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const isActive = currentKey === sortKey;

  return (
    <th className={cn("px-4 py-3", className)}>
      <Button
        variant="ghost"
        size="xs"
        className="gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground -ml-2"
        onClick={() => onSort(sortKey)}
        aria-label={`Sort by ${label}`}
      >
        {label}
        {isActive ? (
          currentDir === "asc" ? (
            <ArrowUp className="size-3" />
          ) : (
            <ArrowDown className="size-3" />
          )
        ) : (
          <ArrowUpDown className="size-3 opacity-40" />
        )}
      </Button>
    </th>
  );
}

function RankChange({ change }: { change: number }) {
  if (change === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="size-3" aria-hidden="true" />
        <span className="sr-only">No change</span>
      </span>
    );
  }

  const isImproved = change > 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        isImproved ? "text-emerald-400" : "text-red-400",
      )}
    >
      {isImproved ? (
        <TrendingUp className="size-3" aria-hidden="true" />
      ) : (
        <TrendingDown className="size-3" aria-hidden="true" />
      )}
      <span className="tabular-nums">{Math.abs(change)}</span>
      <span className="sr-only">
        {isImproved ? "positions improved" : "positions dropped"}
      </span>
    </span>
  );
}
