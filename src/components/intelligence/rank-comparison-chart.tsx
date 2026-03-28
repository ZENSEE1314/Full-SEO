"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/lib/utils";

interface RankData {
  keyword: string;
  your_rank: number | null;
  competitor_rank: number | null;
}

interface RankComparisonChartProps {
  data: RankData[];
  competitorDomain: string;
  className?: string;
}

const EMERALD = "#10b981";
const RED = "#ef4444";
const SLATE = "#475569";

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; fill: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-white/[0.06] bg-slate-900/95 px-3 py-2 shadow-lg backdrop-blur-sm">
      <p className="mb-1 text-xs font-medium text-foreground">{label}</p>
      {payload.map((entry) => (
        <p
          key={entry.dataKey}
          className="text-xs"
          style={{ color: entry.fill }}
        >
          {entry.dataKey === "your_rank" ? "Your rank" : "Competitor"}: #
          {entry.value}
        </p>
      ))}
    </div>
  );
}

export function RankComparisonChart({
  data,
  competitorDomain,
  className,
}: RankComparisonChartProps) {
  if (data.length === 0) {
    return (
      <div
        className={cn(
          "flex h-48 items-center justify-center text-sm text-muted-foreground",
          className,
        )}
      >
        No shared keyword data available
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-sm bg-emerald-500" />
          Your rank
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-sm bg-red-500" />
          {competitorDomain}
        </div>
      </div>

      <div style={{ height: Math.max(data.length * 44, 120) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 12, left: 0, bottom: 0 }}
            barGap={2}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(148,163,184,0.06)"
              horizontal={false}
            />
            <XAxis
              type="number"
              reversed
              domain={[0, "auto"]}
              tick={{ fill: "#64748b", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(val: number) => `#${val}`}
            />
            <YAxis
              type="category"
              dataKey="keyword"
              width={140}
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<ChartTooltip />} cursor={false} />
            <Bar dataKey="your_rank" barSize={14} radius={[0, 3, 3, 0]}>
              {data.map((entry, index) => {
                const isWinning =
                  entry.your_rank !== null &&
                  entry.competitor_rank !== null &&
                  entry.your_rank <= entry.competitor_rank;
                return (
                  <Cell
                    key={`your-${index}`}
                    fill={isWinning ? EMERALD : SLATE}
                    fillOpacity={0.85}
                  />
                );
              })}
            </Bar>
            <Bar
              dataKey="competitor_rank"
              barSize={14}
              radius={[0, 3, 3, 0]}
            >
              {data.map((entry, index) => {
                const isCompetitorWinning =
                  entry.competitor_rank !== null &&
                  entry.your_rank !== null &&
                  entry.competitor_rank < entry.your_rank;
                return (
                  <Cell
                    key={`comp-${index}`}
                    fill={isCompetitorWinning ? RED : SLATE}
                    fillOpacity={0.85}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
