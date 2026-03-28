"use client";

import * as React from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface ArticleRow {
  id: string;
  title: string;
  client_name: string;
  word_count: number | null;
  seo_score: number | null;
  status: "draft" | "review" | "approved" | "published";
  created_at: string;
}

interface ArticleTableProps {
  articles: ArticleRow[];
  onRowClick: (articleId: string) => void;
}

type SortField = "title" | "client_name" | "word_count" | "seo_score" | "created_at";
type SortDirection = "asc" | "desc";

const STATUS_PIPELINE: Array<{
  key: ArticleRow["status"];
  label: string;
  activeColor: string;
}> = [
  { key: "draft", label: "Draft", activeColor: "bg-slate-400" },
  { key: "review", label: "Review", activeColor: "bg-blue-500" },
  { key: "approved", label: "Approved", activeColor: "bg-amber-500" },
  { key: "published", label: "Published", activeColor: "bg-emerald-500" },
];

function PipelineDots({ status }: { status: ArticleRow["status"] }) {
  const statusIndex = STATUS_PIPELINE.findIndex((s) => s.key === status);

  return (
    <div className="flex items-center gap-1" role="img" aria-label={`Status: ${status}`}>
      {STATUS_PIPELINE.map((step, i) => {
        const isActive = i <= statusIndex;
        const isCurrent = i === statusIndex;
        return (
          <div
            key={step.key}
            className={cn(
              "size-2 rounded-full transition-all",
              isActive
                ? step.activeColor
                : "bg-muted-foreground/20",
              isCurrent && "ring-2 ring-offset-1 ring-offset-background",
              isCurrent && step.key === "draft" && "ring-slate-400/40",
              isCurrent && step.key === "review" && "ring-blue-500/40",
              isCurrent && step.key === "approved" && "ring-amber-500/40",
              isCurrent && step.key === "published" && "ring-emerald-500/40"
            )}
            title={step.label}
          />
        );
      })}
      <span className="ml-1.5 text-xs capitalize text-muted-foreground">{status}</span>
    </div>
  );
}

function SeoScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <span className="text-xs text-muted-foreground/40">--</span>
    );
  }

  const variant = score >= 80
    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
    : score >= 60
      ? "bg-amber-500/15 text-amber-400 border-amber-500/20"
      : "bg-red-500/15 text-red-400 border-red-500/20";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold tabular-nums",
        variant
      )}
    >
      <Sparkles className="size-3" />
      {score}
    </span>
  );
}

export function ArticleTable({ articles, onRowClick }: ArticleTableProps) {
  const [sortField, setSortField] = React.useState<SortField>("created_at");
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("desc");

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  }

  const sortedArticles = React.useMemo(() => {
    return [...articles].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      if (valA === null && valB === null) return 0;
      if (valA === null) return 1;
      if (valB === null) return -1;

      let comparison: number;
      if (typeof valA === "number" && typeof valB === "number") {
        comparison = valA - valB;
      } else {
        comparison = String(valA).localeCompare(String(valB));
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [articles, sortField, sortDirection]);

  function SortButton({ field, children }: { field: SortField; children: React.ReactNode }) {
    const isActive = sortField === field;
    return (
      <button
        onClick={() => handleSort(field)}
        className={cn(
          "inline-flex items-center gap-1 transition-colors hover:text-foreground",
          isActive ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {children}
        {isActive ? (
          sortDirection === "asc" ? (
            <ArrowUp className="size-3" />
          ) : (
            <ArrowDown className="size-3" />
          )
        ) : (
          <ArrowUpDown className="size-3 opacity-40" />
        )}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-slate-900/70 backdrop-blur-sm">
      <Table>
        <TableHeader>
          <TableRow className="border-white/[0.06] hover:bg-transparent">
            <TableHead>
              <SortButton field="title">Title</SortButton>
            </TableHead>
            <TableHead>
              <SortButton field="client_name">Client</SortButton>
            </TableHead>
            <TableHead className="text-right">
              <SortButton field="word_count">Words</SortButton>
            </TableHead>
            <TableHead className="text-center">
              <SortButton field="seo_score">SEO Score</SortButton>
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead>
              <SortButton field="created_at">Created</SortButton>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedArticles.map((article) => (
            <TableRow
              key={article.id}
              onClick={() => onRowClick(article.id)}
              className="cursor-pointer border-white/[0.04] transition-colors hover:bg-white/[0.03]"
              role="link"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onRowClick(article.id);
                }
              }}
            >
              <TableCell className="max-w-xs">
                <span className="line-clamp-1 font-medium text-foreground">
                  {article.title}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-muted-foreground">{article.client_name}</span>
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {article.word_count?.toLocaleString() ?? "--"}
              </TableCell>
              <TableCell className="text-center">
                <SeoScoreBadge score={article.seo_score} />
              </TableCell>
              <TableCell>
                <PipelineDots status={article.status} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(article.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </TableCell>
            </TableRow>
          ))}
          {sortedArticles.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-12 text-center text-muted-foreground/60">
                No articles yet. Generate your first article from a content brief.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
