"use client";

import { useState } from "react";
import {
  Search,
  Globe,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileCode,
  Zap,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Page {
  id: string;
  url: string;
  title: string | null;
  meta_description: string | null;
  h1: string | null;
  canonical_url: string | null;
  status_code: number | null;
  is_indexed: boolean;
  page_type: string | null;
  issue_count: number;
  has_schema: boolean;
  schema_count: number;
  speed_score: number | null;
}

interface PagesListProps {
  pages: Page[];
  issues: Record<string, unknown>[];
  onSelectPage: (pageId: string) => void;
}

type FilterType = "all" | "issues" | "no-schema" | "no-meta" | "no-h1" | "no-canonical";

const FILTERS: { value: FilterType; label: string }[] = [
  { value: "all", label: "All Pages" },
  { value: "issues", label: "Has Issues" },
  { value: "no-meta", label: "Missing Meta" },
  { value: "no-h1", label: "Missing H1" },
  { value: "no-schema", label: "No Schema" },
  { value: "no-canonical", label: "No Canonical" },
];

function getSeoScore(page: Page): number {
  let score = 0;
  const max = 6;
  if (page.title) score++;
  if (page.meta_description) score++;
  if (page.h1) score++;
  if (page.canonical_url) score++;
  if (page.has_schema) score++;
  if (page.status_code === 200) score++;
  return Math.round((score / max) * 100);
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
}

function getScoreBg(score: number): string {
  if (score >= 80) return "bg-emerald-400/10 border-emerald-400/20";
  if (score >= 50) return "bg-amber-400/10 border-amber-400/20";
  return "bg-red-400/10 border-red-400/20";
}

function getPathFromUrl(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

export function PagesList({ pages, onSelectPage }: PagesListProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered = pages.filter((page) => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !page.url.toLowerCase().includes(q) &&
        !(page.title ?? "").toLowerCase().includes(q)
      )
        return false;
    }

    switch (filter) {
      case "issues":
        return page.issue_count > 0;
      case "no-meta":
        return !page.meta_description;
      case "no-h1":
        return !page.h1;
      case "no-schema":
        return !page.has_schema;
      case "no-canonical":
        return !page.canonical_url;
      default:
        return true;
    }
  });

  const totalIssues = pages.reduce((sum, p) => sum + p.issue_count, 0);
  const missingMeta = pages.filter((p) => !p.meta_description).length;
  const missingSchema = pages.filter((p) => !p.has_schema).length;
  const avgScore = pages.length
    ? Math.round(pages.reduce((sum, p) => sum + getSeoScore(p), 0) / pages.length)
    : 0;

  return (
    <div className="space-y-6 animate-[slide-up_0.4s_ease-out_0.1s_both]">
      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-white/[0.06] bg-slate-900/70 p-4">
          <p className="text-xs text-muted-foreground">Total Pages</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{pages.length}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-slate-900/70 p-4">
          <p className="text-xs text-muted-foreground">Avg SEO Score</p>
          <p className={cn("mt-1 text-2xl font-bold", getScoreColor(avgScore))}>{avgScore}%</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-slate-900/70 p-4">
          <p className="text-xs text-muted-foreground">Open Issues</p>
          <p className="mt-1 text-2xl font-bold text-amber-400">{totalIssues}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-slate-900/70 p-4">
          <p className="text-xs text-muted-foreground">Missing Schema</p>
          <p className="mt-1 text-2xl font-bold text-red-400">{missingSchema}</p>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search pages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-white/[0.06] bg-slate-900/50 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/20"
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          <Filter className="size-3.5 text-muted-foreground mr-1 shrink-0" />
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                filter === f.value
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              {f.label}
              {f.value === "issues" && totalIssues > 0 && (
                <span className="ml-1 text-amber-400">({totalIssues})</span>
              )}
              {f.value === "no-meta" && missingMeta > 0 && (
                <span className="ml-1 text-red-400">({missingMeta})</span>
              )}
              {f.value === "no-schema" && missingSchema > 0 && (
                <span className="ml-1 text-red-400">({missingSchema})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Pages grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.06] bg-slate-900/50 py-16">
          <Globe className="size-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            {pages.length === 0
              ? "No pages crawled yet. Run a technical audit to discover pages."
              : "No pages match your filter."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((page) => {
            const score = getSeoScore(page);
            return (
              <button
                key={page.id}
                onClick={() => onSelectPage(page.id)}
                className="group rounded-xl border border-white/[0.06] bg-slate-900/70 p-4 text-left transition-all hover:border-emerald-500/20 hover:bg-slate-900/90 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                {/* URL + score */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-emerald-400 transition-colors">
                      {getPathFromUrl(page.url) || "/"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {page.title || "No title"}
                    </p>
                  </div>
                  <div className={cn("shrink-0 rounded-lg border px-2 py-1 text-center", getScoreBg(score))}>
                    <p className={cn("text-lg font-bold leading-none", getScoreColor(score))}>{score}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">SEO</p>
                  </div>
                </div>

                {/* SEO element indicators */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    {page.meta_description ? (
                      <CheckCircle className="size-3 text-emerald-400" />
                    ) : (
                      <XCircle className="size-3 text-red-400" />
                    )}
                    <span className="text-muted-foreground">Meta</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {page.h1 ? (
                      <CheckCircle className="size-3 text-emerald-400" />
                    ) : (
                      <XCircle className="size-3 text-red-400" />
                    )}
                    <span className="text-muted-foreground">H1</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {page.canonical_url ? (
                      <CheckCircle className="size-3 text-emerald-400" />
                    ) : (
                      <XCircle className="size-3 text-red-400" />
                    )}
                    <span className="text-muted-foreground">Canonical</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {page.has_schema ? (
                      <CheckCircle className="size-3 text-emerald-400" />
                    ) : (
                      <XCircle className="size-3 text-red-400" />
                    )}
                    <span className="text-muted-foreground">Schema</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {page.status_code === 200 ? (
                      <CheckCircle className="size-3 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="size-3 text-amber-400" />
                    )}
                    <span className="text-muted-foreground">{page.status_code ?? "?"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {page.speed_score !== null && page.speed_score >= 80 ? (
                      <Zap className="size-3 text-emerald-400" />
                    ) : page.speed_score !== null ? (
                      <Zap className="size-3 text-amber-400" />
                    ) : (
                      <Zap className="size-3 text-muted-foreground/30" />
                    )}
                    <span className="text-muted-foreground">
                      {page.speed_score !== null ? `${Math.round(page.speed_score)}` : "—"}
                    </span>
                  </div>
                </div>

                {/* Issues badge */}
                {page.issue_count > 0 && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-400">
                    <AlertTriangle className="size-3" />
                    {page.issue_count} issue{page.issue_count !== 1 ? "s" : ""} to fix
                  </div>
                )}

                {/* Page type */}
                {page.page_type && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground/60">
                    <FileCode className="size-3" />
                    {page.page_type}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
