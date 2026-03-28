"use client";

import { useState, useMemo, useCallback } from "react";
import {
  ArrowUpDown,
  Check,
  X,
  ExternalLink,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface PageRow {
  id: string;
  url: string;
  title: string | null;
  status_code: number | null;
  is_indexed: boolean | null;
  page_type: string | null;
  speed_score: number | null;
  issue_count: number;
}

interface PagesTableProps {
  pages: PageRow[];
  onSelectPage?: (pageId: string) => void;
}

type SortKey = "url" | "title" | "status_code" | "is_indexed" | "page_type" | "speed_score" | "issue_count";
type SortDir = "asc" | "desc";

function getStatusCodeStyle(code: number | null): string {
  if (code === null) return "text-muted-foreground";
  if (code >= 200 && code < 300) return "text-emerald-400";
  if (code >= 300 && code < 400) return "text-amber-400";
  return "text-red-400";
}

function getSpeedScoreStyle(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 90) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
}

const PAGE_TYPE_STYLES: Record<string, string> = {
  landing: "bg-emerald-500/10 text-emerald-400",
  blog: "bg-blue-500/10 text-blue-400",
  product: "bg-violet-500/10 text-violet-400",
  category: "bg-amber-500/10 text-amber-400",
  other: "bg-slate-500/10 text-slate-400",
};

export function PagesTable({ pages, onSelectPage }: PagesTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("url");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey],
  );

  const sortedPages = useMemo(() => {
    const sorted = [...pages].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === "string" && typeof bVal === "string") {
        return aVal.localeCompare(bVal);
      }
      if (typeof aVal === "number" && typeof bVal === "number") {
        return aVal - bVal;
      }
      if (typeof aVal === "boolean" && typeof bVal === "boolean") {
        return Number(aVal) - Number(bVal);
      }
      return 0;
    });

    return sortDir === "desc" ? sorted.reverse() : sorted;
  }, [pages, sortKey, sortDir]);

  function SortableHead({ column, label }: { column: SortKey; label: string }) {
    const isActive = sortKey === column;
    return (
      <TableHead>
        <button
          onClick={() => handleSort(column)}
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider transition-colors duration-150",
            "outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 rounded px-1 -mx-1",
            isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
          <ArrowUpDown
            className={cn(
              "size-3",
              isActive ? "opacity-100" : "opacity-30",
            )}
            aria-hidden="true"
          />
        </button>
      </TableHead>
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-slate-900/70 backdrop-blur-sm overflow-hidden">
      <div className="border-b border-white/[0.04] px-5 py-4">
        <h2 className="font-heading text-sm font-bold text-foreground">
          Pages
          <span className="ml-2 text-xs font-normal tabular-nums text-muted-foreground">
            {pages.length} total
          </span>
        </h2>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="border-white/[0.04] hover:bg-transparent">
            <SortableHead column="url" label="URL" />
            <SortableHead column="title" label="Title" />
            <SortableHead column="status_code" label="Status" />
            <SortableHead column="is_indexed" label="Indexed" />
            <SortableHead column="page_type" label="Type" />
            <SortableHead column="speed_score" label="Speed" />
            <SortableHead column="issue_count" label="Issues" />
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedPages.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                No pages crawled yet
              </TableCell>
            </TableRow>
          ) : (
            sortedPages.map((page) => (
              <TableRow
                key={page.id}
                className={cn(
                  "border-white/[0.03] cursor-pointer transition-colors duration-150",
                  "hover:bg-white/[0.03]",
                )}
                onClick={() => onSelectPage?.(page.id)}
              >
                <TableCell className="max-w-[200px]">
                  <span className="truncate block text-sm text-foreground" title={page.url}>
                    {page.url.replace(/^https?:\/\/[^/]+/, "")}
                  </span>
                </TableCell>
                <TableCell className="max-w-[180px]">
                  <span className="truncate block text-sm text-muted-foreground" title={page.title ?? ""}>
                    {page.title ?? "--"}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "text-sm font-mono font-semibold tabular-nums",
                      getStatusCodeStyle(page.status_code),
                    )}
                  >
                    {page.status_code ?? "--"}
                  </span>
                </TableCell>
                <TableCell>
                  {page.is_indexed === null ? (
                    <span className="text-muted-foreground">--</span>
                  ) : page.is_indexed ? (
                    <div className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-emerald-400" aria-hidden="true" />
                      <span className="sr-only">Indexed</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <X className="size-3.5 text-red-400" aria-hidden="true" />
                      <span className="sr-only">Not indexed</span>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {page.page_type ? (
                    <Badge
                      variant="secondary"
                      className={cn(
                        "capitalize",
                        PAGE_TYPE_STYLES[page.page_type] ?? PAGE_TYPE_STYLES.other,
                      )}
                    >
                      {page.page_type}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">--</span>
                  )}
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      getSpeedScoreStyle(page.speed_score),
                    )}
                  >
                    {page.speed_score ?? "--"}
                  </span>
                </TableCell>
                <TableCell>
                  {Number(page.issue_count) > 0 ? (
                    <span className="inline-flex items-center justify-center size-6 rounded-full bg-red-500/10 text-xs font-semibold tabular-nums text-red-400">
                      {page.issue_count}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">0</span>
                  )}
                </TableCell>
                <TableCell>
                  <ExternalLink
                    className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-hidden="true"
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
