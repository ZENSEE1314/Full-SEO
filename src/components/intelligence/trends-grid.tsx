"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { TrendCard } from "@/components/intelligence/trend-card";
import type { Trend } from "@/types";

interface TrendsGridProps {
  initialTrends: Array<Trend & { client_name: string | null }>;
}

export function TrendsGrid({ initialTrends }: TrendsGridProps) {
  const router = useRouter();
  const [trends, setTrends] = useState(initialTrends);

  async function handleDelete(id: string) {
    setTrends((prev) => prev.filter((t) => t.id !== id));
    try {
      await fetch("/api/intelligence/trends", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      router.refresh();
    }
  }

  if (trends.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-white/[0.06] bg-slate-900/40">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            No trends detected yet.
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Run trend discovery or adjust your filters.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {trends.map((trend, i) => (
        <TrendCard
          key={trend.id}
          trend={trend}
          onDelete={handleDelete}
          style={{ animationDelay: `${80 + i * 50}ms` }}
        />
      ))}
    </div>
  );
}
