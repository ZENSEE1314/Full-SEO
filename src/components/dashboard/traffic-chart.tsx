"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";

import { cn } from "@/lib/utils";

interface TrafficDataPoint {
  date: string;
  sessions: number;
}

interface TrafficChartProps {
  data: TrafficDataPoint[];
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length || !label) return null;

  return (
    <div className="rounded-lg border border-border/50 bg-card/95 px-3 py-2 shadow-lg backdrop-blur-sm">
      <p className="text-xs text-muted-foreground">
        {format(parseISO(label), "MMM d, yyyy")}
      </p>
      <p className="text-sm font-semibold text-foreground">
        {payload[0].value.toLocaleString()} sessions
      </p>
    </div>
  );
}

export function TrafficChart({ data }: TrafficChartProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 bg-card/80 p-5 backdrop-blur-sm",
        "animate-[slide-up_0.4s_ease-out_both]",
      )}
      style={{ animationDelay: "320ms" }}
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="font-heading text-base font-semibold text-foreground">
            Traffic Overview
          </h3>
          <p className="text-sm text-muted-foreground">
            Sessions over the last 30 days
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block size-2 rounded-full bg-nexus-accent" />
          Sessions
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(148,163,184,0.06)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickFormatter={(val: string) => format(parseISO(val), "MMM d")}
              tick={{ fill: "#64748b", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickMargin={8}
            />
            <YAxis
              tick={{ fill: "#64748b", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(val: number) =>
                val >= 1000 ? `${(val / 1000).toFixed(1)}k` : String(val)
              }
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{
                stroke: "rgba(16,185,129,0.2)",
                strokeWidth: 1,
              }}
            />
            <Area
              type="monotone"
              dataKey="sessions"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#emeraldGradient)"
              dot={false}
              activeDot={{
                r: 4,
                fill: "#10b981",
                stroke: "#022c22",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
