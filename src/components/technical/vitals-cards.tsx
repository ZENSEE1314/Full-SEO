"use client";

import { useMemo } from "react";
import {
  Gauge,
  MousePointerClick,
  Move,
  Timer,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface VitalMetric {
  label: string;
  key: "lcp" | "fid" | "cls" | "ttfb";
  value: number | null;
  unit: string;
  icon: React.ElementType;
  thresholds: { good: number; poor: number };
  format: (v: number) => string;
}

const VITAL_CONFIGS: Omit<VitalMetric, "value">[] = [
  {
    label: "LCP",
    key: "lcp",
    unit: "s",
    icon: Gauge,
    thresholds: { good: 2500, poor: 4000 },
    format: (v) => (v / 1000).toFixed(2),
  },
  {
    label: "FID",
    key: "fid",
    unit: "ms",
    icon: MousePointerClick,
    thresholds: { good: 100, poor: 300 },
    format: (v) => Math.round(v).toString(),
  },
  {
    label: "CLS",
    key: "cls",
    unit: "",
    icon: Move,
    thresholds: { good: 0.1, poor: 0.25 },
    format: (v) => v.toFixed(3),
  },
  {
    label: "TTFB",
    key: "ttfb",
    unit: "ms",
    icon: Timer,
    thresholds: { good: 800, poor: 1800 },
    format: (v) => Math.round(v).toString(),
  },
];

type Rating = "good" | "needs-improvement" | "poor";

const RATING_STYLES: Record<Rating, { bg: string; text: string; glow: string; label: string }> = {
  good: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    glow: "shadow-[inset_0_1px_0_0_rgba(16,185,129,0.15)]",
    label: "Good",
  },
  "needs-improvement": {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    glow: "shadow-[inset_0_1px_0_0_rgba(245,158,11,0.15)]",
    label: "Needs work",
  },
  poor: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    glow: "shadow-[inset_0_1px_0_0_rgba(239,68,68,0.15)]",
    label: "Poor",
  },
};

function getRating(value: number, thresholds: { good: number; poor: number }): Rating {
  if (value <= thresholds.good) return "good";
  if (value <= thresholds.poor) return "needs-improvement";
  return "poor";
}

interface SparklineProps {
  data: number[];
  rating: Rating;
}

function Sparkline({ data, rating }: SparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const height = 32;
  const width = 80;
  const step = width / (data.length - 1);

  const points = data
    .map((v, i) => `${i * step},${height - ((v - min) / range) * (height - 4) - 2}`)
    .join(" ");

  const strokeColor =
    rating === "good"
      ? "rgb(16,185,129)"
      : rating === "needs-improvement"
        ? "rgb(245,158,11)"
        : "rgb(239,68,68)";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible opacity-60"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface VitalsCardsProps {
  vitals: {
    lcp: number | null;
    fid: number | null;
    cls: number | null;
    ttfb: number | null;
  };
  history?: {
    lcp: number[];
    fid: number[];
    cls: number[];
    ttfb: number[];
  };
}

export function VitalsCards({ vitals, history }: VitalsCardsProps) {
  const metrics = useMemo(
    () =>
      VITAL_CONFIGS.map((config) => ({
        ...config,
        value: vitals[config.key],
      })),
    [vitals],
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric, index) => {
        const hasValue = metric.value !== null && metric.value !== undefined;
        const rating = hasValue
          ? getRating(metric.value!, metric.thresholds)
          : null;
        const style = rating ? RATING_STYLES[rating] : null;
        const Icon = metric.icon;
        const sparkData = history?.[metric.key] ?? [];

        return (
          <div
            key={metric.key}
            className={cn(
              "group relative overflow-hidden rounded-xl border border-white/[0.06] bg-slate-900/70 backdrop-blur-sm p-5",
              "transition-all duration-200 hover:border-white/[0.1] hover:bg-slate-900/80",
              style?.glow,
            )}
            style={{
              animationDelay: `${index * 80}ms`,
            }}
          >
            {/* Background gradient based on rating */}
            {style && (
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 opacity-[0.03]",
                  style.bg,
                )}
                aria-hidden="true"
              />
            )}

            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg",
                    style?.bg ?? "bg-slate-800",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4",
                      style?.text ?? "text-muted-foreground",
                    )}
                    aria-hidden="true"
                  />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {metric.label}
                  </p>
                  {style && (
                    <span
                      className={cn(
                        "mt-0.5 inline-block text-[10px] font-semibold uppercase tracking-wide",
                        style.text,
                      )}
                    >
                      {style.label}
                    </span>
                  )}
                </div>
              </div>

              <Sparkline data={sparkData} rating={rating ?? "good"} />
            </div>

            <div className="mt-4">
              {hasValue ? (
                <p
                  className={cn(
                    "font-heading text-3xl font-extrabold tabular-nums tracking-tight",
                    style?.text ?? "text-foreground",
                  )}
                >
                  {metric.format(metric.value!)}
                  {metric.unit && (
                    <span className="ml-0.5 text-base font-medium text-muted-foreground">
                      {metric.unit}
                    </span>
                  )}
                </p>
              ) : (
                <p className="font-heading text-3xl font-extrabold text-muted-foreground/40">
                  --
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
