"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Clock,
  Sparkles,
  FileText,
  Loader2,
  Check,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Trend } from "@/types";

interface TrendCardProps {
  trend: Trend & { client_name?: string | null };
  style?: React.CSSProperties;
}

const SCORE_THRESHOLDS = {
  HIGH: 75,
  MEDIUM: 40,
} as const;

function getScoreColor(score: number): string {
  if (score >= SCORE_THRESHOLDS.HIGH) return "bg-emerald-500";
  if (score >= SCORE_THRESHOLDS.MEDIUM) return "bg-amber-500";
  return "bg-slate-500";
}

function getScoreGradient(score: number): string {
  if (score >= SCORE_THRESHOLDS.HIGH) return "from-emerald-500 to-emerald-400";
  if (score >= SCORE_THRESHOLDS.MEDIUM) return "from-amber-500 to-amber-400";
  return "from-slate-500 to-slate-400";
}

function getSourceLabel(source: string): string {
  const labels: Record<string, string> = {
    google_trends: "Google Trends",
    search_console: "Search Console",
    manual: "Manual",
    n8n: "Automated",
  };
  return labels[source] ?? source;
}

export function TrendCard({ trend, style }: TrendCardProps) {
  const router = useRouter();
  const [isCreatingBrief, setIsCreatingBrief] = useState(false);
  const [isBriefCreated, setIsBriefCreated] = useState(false);
  const score = trend.trend_score ?? 0;
  const relatedQueries = trend.related_queries ?? [];
  const detectedAt = trend.detected_at
    ? formatDistanceToNow(new Date(trend.detected_at), { addSuffix: true })
    : "Unknown";

  function buildBriefText(topic: string, queries: string[]): string {
    const queriesSection =
      queries.length > 0
        ? `\n\nRelated queries to cover:\n${queries.map((q) => `- ${q}`).join("\n")}`
        : "";
    return `Content brief generated from trending topic: "${topic}".\n\nSuggested outline:\n- Introduction to ${topic}\n- Key insights and current developments\n- Actionable takeaways${queriesSection}`;
  }

  async function handleCreateBrief() {
    setIsCreatingBrief(true);
    try {
      const response = await fetch("/api/content/briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trend.topic,
          client_id: trend.client_id,
          source: "trend",
          brief_text: buildBriefText(trend.topic, relatedQueries),
          secondary_keywords: relatedQueries,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to create brief");
      }

      setIsBriefCreated(true);
      router.refresh();
    } catch (error) {
      console.error("[TrendCard] Failed to create brief:", error);
      setIsCreatingBrief(false);
    }
  }

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-xl",
        "bg-slate-900/70 backdrop-blur-sm",
        "border border-white/[0.06]",
        "p-5 transition-all duration-200",
        "hover:border-white/[0.1] hover:bg-slate-900/80",
        "animate-[slide-up_0.4s_ease-out_both]",
      )}
      style={style}
    >
      {/* Subtle top-edge glow on high-score trends */}
      {score >= SCORE_THRESHOLDS.HIGH && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(16,185,129,0.4), transparent)",
          }}
        />
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Source + time */}
          <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="size-3 text-nexus-accent" />
            <span>{getSourceLabel(trend.source)}</span>
            <span className="text-white/10">|</span>
            <Clock className="size-3" />
            <span>{detectedAt}</span>
          </div>

          {/* Topic */}
          <h3 className="font-heading text-lg font-bold leading-tight text-foreground">
            {trend.topic}
          </h3>
        </div>

        {/* Score meter */}
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Score
          </span>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-xl font-extrabold tabular-nums",
                score >= SCORE_THRESHOLDS.HIGH && "text-emerald-400",
                score >= SCORE_THRESHOLDS.MEDIUM &&
                  score < SCORE_THRESHOLDS.HIGH &&
                  "text-amber-400",
                score < SCORE_THRESHOLDS.MEDIUM && "text-slate-400",
              )}
            >
              {score}
            </span>
          </div>
        </div>
      </div>

      {/* Score bar */}
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.04]">
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r transition-all duration-500",
            getScoreGradient(score),
          )}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>

      {/* Client badge */}
      {trend.client_name && (
        <div className="mt-3">
          <Badge variant="secondary" className="text-xs">
            {trend.client_name}
          </Badge>
        </div>
      )}

      {/* Related queries */}
      {relatedQueries.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Related queries
          </p>
          <div className="flex flex-wrap gap-1.5">
            {relatedQueries.slice(0, 6).map((query) => (
              <span
                key={query}
                className={cn(
                  "inline-flex items-center rounded-md px-2 py-0.5",
                  "bg-white/[0.04] text-xs text-slate-300",
                  "border border-white/[0.04]",
                )}
              >
                {query}
              </span>
            ))}
            {relatedQueries.length > 6 && (
              <span className="inline-flex items-center px-1 text-xs text-muted-foreground">
                +{relatedQueries.length - 6} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2 border-t border-white/[0.04] pt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCreateBrief}
          disabled={isCreatingBrief || isBriefCreated}
          className="gap-1.5"
        >
          {isBriefCreated ? (
            <Check className="size-3 text-emerald-400" />
          ) : isCreatingBrief ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <FileText className="size-3" />
          )}
          {isBriefCreated ? "Brief Created" : "Create Brief"}
        </Button>
        <div className="flex-1" />
        <div
          className={cn(
            "size-2 rounded-full",
            getScoreColor(score),
          )}
          title={`Score: ${score}`}
        />
        <Sparkles className="size-3 text-muted-foreground" />
      </div>
    </article>
  );
}
