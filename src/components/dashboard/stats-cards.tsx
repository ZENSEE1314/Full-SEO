"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, BarChart3, Globe, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";

interface StatCard {
  label: string;
  value: number;
  trend: number;
  icon: React.ReactNode;
  format?: "number" | "percent";
}

interface StatsCardsProps {
  totalClients: number;
  activeKeywords: number;
  avgHealthScore: number;
  totalActions24h: number;
  clientsTrend?: number;
  keywordsTrend?: number;
  healthTrend?: number;
  actionsTrend?: number;
}

function AnimatedCounter({
  target,
  format = "number",
}: {
  target: number;
  format?: "number" | "percent";
}) {
  const [current, setCurrent] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    const duration = 1000;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(target * eased));

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }, [target]);

  const formatted =
    format === "percent"
      ? `${current}%`
      : current.toLocaleString();

  return <span ref={ref}>{formatted}</span>;
}

function TrendBadge({ value }: { value: number }) {
  const isPositive = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium",
        isPositive
          ? "bg-emerald-500/10 text-emerald-400"
          : "bg-red-500/10 text-red-400",
      )}
    >
      {isPositive ? (
        <TrendingUp className="size-3" />
      ) : (
        <TrendingUp className="size-3 rotate-180" />
      )}
      {Math.abs(value)}%
    </span>
  );
}

export function StatsCards({
  totalClients,
  activeKeywords,
  avgHealthScore,
  totalActions24h,
  clientsTrend = 12,
  keywordsTrend = 8,
  healthTrend = 3,
  actionsTrend = -5,
}: StatsCardsProps) {
  const cards: StatCard[] = [
    {
      label: "Total Clients",
      value: totalClients,
      trend: clientsTrend,
      icon: <Globe className="size-5" />,
    },
    {
      label: "Active Keywords",
      value: activeKeywords,
      trend: keywordsTrend,
      icon: <BarChart3 className="size-5" />,
    },
    {
      label: "Avg Health Score",
      value: avgHealthScore,
      trend: healthTrend,
      icon: <Activity className="size-5" />,
      format: "percent",
    },
    {
      label: "Actions (24h)",
      value: totalActions24h,
      trend: actionsTrend,
      icon: <TrendingUp className="size-5" />,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, index) => (
        <div
          key={card.label}
          className={cn(
            "group relative overflow-hidden rounded-xl border border-border/50 bg-card/80 p-5",
            "backdrop-blur-sm transition-all duration-300",
            "hover:border-nexus-accent/30 hover:shadow-[0_0_24px_-4px_var(--nexus-glow)]",
            "animate-[slide-up_0.4s_ease-out_both]",
          )}
          style={{ animationDelay: `${index * 80}ms` }}
        >
          {/* Glow gradient on hover */}
          <div
            className={cn(
              "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300",
              "bg-[radial-gradient(ellipse_at_top_right,var(--nexus-glow),transparent_70%)]",
              "group-hover:opacity-100",
            )}
          />

          <div className="relative flex items-start justify-between">
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">
                {card.label}
              </p>
              <p className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
                <AnimatedCounter
                  target={card.value}
                  format={card.format}
                />
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="rounded-lg bg-nexus-accent/10 p-2 text-nexus-accent">
                {card.icon}
              </div>
              <TrendBadge value={card.trend} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
