"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import { format } from "date-fns";

import { cn } from "@/lib/utils";

interface SpeedRecord {
  recorded_at: string;
  performance_score: number | null;
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  ttfb: number | null;
  device: "mobile" | "desktop";
}

interface SpeedChartProps {
  records: SpeedRecord[];
}

interface ChartDataPoint {
  date: string;
  dateLabel: string;
  mobile: number | null;
  desktop: number | null;
  mobileLcp: number | null;
  desktopLcp: number | null;
  mobileCls: number | null;
  desktopCls: number | null;
  mobileFid: number | null;
  desktopFid: number | null;
  mobileTtfb: number | null;
  desktopTtfb: number | null;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number | null; name: string; color: string; payload: ChartDataPoint }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;

  return (
    <div className="rounded-lg border border-white/[0.08] bg-slate-900/95 backdrop-blur-md px-4 py-3 shadow-xl">
      <p className="mb-2 text-xs font-medium text-muted-foreground">{data.dateLabel}</p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Mobile</p>
          <p className={cn("text-lg font-bold tabular-nums", getScoreColor(data.mobile))}>
            {data.mobile ?? "--"}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Desktop</p>
          <p className={cn("text-lg font-bold tabular-nums", getScoreColor(data.desktop))}>
            {data.desktop ?? "--"}
          </p>
        </div>
      </div>
      <div className="mt-2 border-t border-white/[0.06] pt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
        {data.mobileLcp !== null && (
          <span>LCP: {((data.mobileLcp ?? 0) / 1000).toFixed(2)}s (m)</span>
        )}
        {data.desktopLcp !== null && (
          <span>LCP: {((data.desktopLcp ?? 0) / 1000).toFixed(2)}s (d)</span>
        )}
        {data.mobileCls !== null && (
          <span>CLS: {(data.mobileCls ?? 0).toFixed(3)} (m)</span>
        )}
        {data.desktopCls !== null && (
          <span>CLS: {(data.desktopCls ?? 0).toFixed(3)} (d)</span>
        )}
      </div>
    </div>
  );
}

function getScoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 90) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
}

export function SpeedChart({ records }: SpeedChartProps) {
  const chartData = useMemo(() => {
    const byDate = new Map<string, ChartDataPoint>();

    for (const record of records) {
      const date = record.recorded_at.split("T")[0];
      if (!byDate.has(date)) {
        byDate.set(date, {
          date,
          dateLabel: format(new Date(record.recorded_at), "MMM d, yyyy"),
          mobile: null,
          desktop: null,
          mobileLcp: null,
          desktopLcp: null,
          mobileCls: null,
          desktopCls: null,
          mobileFid: null,
          desktopFid: null,
          mobileTtfb: null,
          desktopTtfb: null,
        });
      }

      const point = byDate.get(date)!;
      if (record.device === "mobile") {
        point.mobile = record.performance_score;
        point.mobileLcp = record.lcp;
        point.mobileCls = record.cls;
        point.mobileFid = record.fid;
        point.mobileTtfb = record.ttfb;
      } else {
        point.desktop = record.performance_score;
        point.desktopLcp = record.lcp;
        point.desktopCls = record.cls;
        point.desktopFid = record.fid;
        point.desktopTtfb = record.ttfb;
      }
    }

    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [records]);

  if (chartData.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-slate-900/70 backdrop-blur-sm px-5 py-10 text-center">
        <p className="text-sm text-muted-foreground">No speed data recorded yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-slate-900/70 backdrop-blur-sm overflow-hidden">
      <div className="border-b border-white/[0.04] px-5 py-4">
        <h2 className="font-heading text-sm font-bold text-foreground">
          Performance Score History
        </h2>
      </div>

      <div className="px-4 py-5">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(148,163,184,0.06)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickFormatter={(v: string) => format(new Date(v), "MMM d")}
              tick={{ fill: "rgb(100,116,139)", fontSize: 11 }}
              axisLine={{ stroke: "rgba(148,163,184,0.08)" }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: "rgb(100,116,139)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="line"
              wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
            />
            <ReferenceLine
              y={90}
              stroke="rgba(16,185,129,0.3)"
              strokeDasharray="4 4"
              label={{
                value: "Good",
                position: "right",
                fill: "rgb(16,185,129)",
                fontSize: 10,
              }}
            />
            <ReferenceLine
              y={50}
              stroke="rgba(239,68,68,0.3)"
              strokeDasharray="4 4"
              label={{
                value: "Poor",
                position: "right",
                fill: "rgb(239,68,68)",
                fontSize: 10,
              }}
            />
            <Line
              type="monotone"
              dataKey="desktop"
              name="Desktop"
              stroke="rgb(16,185,129)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "rgb(16,185,129)" }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="mobile"
              name="Mobile"
              stroke="rgb(6,182,212)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "rgb(6,182,212)" }}
              connectNulls
              strokeDasharray="6 3"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
