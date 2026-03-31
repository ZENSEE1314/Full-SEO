"use client";

import { useState } from "react";
import {
  Play,
  Loader2,
  Check,
  X,
  TrendingUp,
  Users,
  Mail,
  Heart,
  BarChart3,
  Clock,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface TaskConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  schedule: string;
  color: string;
}

const TASKS: TaskConfig[] = [
  {
    id: "rank-tracker",
    name: "Rank Tracker",
    description: "Update keyword SERP positions for all tracked keywords",
    icon: BarChart3,
    schedule: "Daily 6AM",
    color: "text-blue-400",
  },
  {
    id: "competitor-monitor",
    name: "Competitor Monitor",
    description: "Track competitor rankings on shared keywords",
    icon: Users,
    schedule: "Daily 7AM",
    color: "text-purple-400",
  },
  {
    id: "outreach-runner",
    name: "Outreach Runner",
    description: "Send outreach emails to new backlink prospects",
    icon: Mail,
    schedule: "Daily 9AM",
    color: "text-amber-400",
  },
  {
    id: "health-score",
    name: "Health Score",
    description: "Recalculate health scores for all active clients",
    icon: Heart,
    schedule: "Daily",
    color: "text-rose-400",
  },
  {
    id: "seed-ranks",
    name: "Seed Ranks",
    description: "Generate initial rank data for new keywords",
    icon: TrendingUp,
    schedule: "On demand",
    color: "text-emerald-400",
  },
];

interface TaskResult {
  ok: boolean;
  data: Record<string, unknown>;
}

export function AutomationPanel() {
  const [running, setRunning] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, TaskResult>>({});
  const [isRunningAll, setIsRunningAll] = useState(false);

  async function runTask(taskId: string) {
    setRunning((prev) => ({ ...prev, [taskId]: true }));
    setResults((prev) => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });

    try {
      const res = await fetch(`/api/cron/${taskId}`, { method: "POST" });
      const data = await res.json();
      setResults((prev) => ({
        ...prev,
        [taskId]: { ok: res.ok, data },
      }));
    } catch {
      setResults((prev) => ({
        ...prev,
        [taskId]: { ok: false, data: { error: "Network error" } },
      }));
    } finally {
      setRunning((prev) => ({ ...prev, [taskId]: false }));
    }
  }

  async function runAll() {
    setIsRunningAll(true);
    setResults({});

    try {
      const res = await fetch("/api/cron?task=all");
      const data = await res.json();
      const taskResults = (data.results || {}) as Record<string, TaskResult>;

      setResults(taskResults);
    } catch {
      // ignore
    } finally {
      setIsRunningAll(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="size-5 text-emerald-400" />
          <h2 className="text-sm font-semibold text-foreground">
            Automation Tasks
          </h2>
        </div>
        <Button
          size="sm"
          onClick={runAll}
          disabled={isRunningAll}
          className="gap-1.5"
        >
          {isRunningAll ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Play className="size-3" />
          )}
          {isRunningAll ? "Running all..." : "Run All"}
        </Button>
      </div>

      {/* Task Cards */}
      <div className="grid gap-3">
        {TASKS.map((task) => {
          const isRunning = running[task.id] || isRunningAll;
          const result = results[task.id];
          const Icon = task.icon;

          return (
            <div
              key={task.id}
              className={cn(
                "flex items-center gap-4 rounded-xl border border-white/[0.06] bg-slate-900/70 backdrop-blur-sm px-4 py-3",
                "transition-all duration-200",
                isRunning && "border-emerald-500/20",
              )}
            >
              <div
                className={cn(
                  "flex size-9 items-center justify-center rounded-lg bg-white/[0.04]",
                  task.color,
                )}
              >
                <Icon className="size-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">
                    {task.name}
                  </p>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="size-2.5" />
                    {task.schedule}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {task.description}
                </p>
              </div>

              {/* Status */}
              {result && !isRunning && (
                <div className="flex items-center gap-1.5">
                  {result.ok ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-400">
                      <Check className="size-3" /> Done
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-red-400">
                      <X className="size-3" /> Failed
                    </span>
                  )}
                </div>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={() => runTask(task.id)}
                disabled={isRunning}
                className="shrink-0 gap-1.5"
              >
                {isRunning ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Play className="size-3" />
                )}
                {isRunning ? "Running..." : "Run"}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Results summary */}
      {Object.keys(results).length > 0 && !isRunningAll && (
        <div className="rounded-lg border border-white/[0.06] bg-black/20 px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Last Run Results
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.entries(results).map(([taskId, result]) => {
              const data = (result as TaskResult).data || {};
              const summary = Object.entries(data)
                .filter(([k]) => k !== "success" && k !== "error")
                .map(([k, v]) => `${k}: ${v}`)
                .join(", ");

              return (
                <div key={taskId} className="text-xs">
                  <span className="font-medium text-foreground">{taskId}</span>
                  {summary && (
                    <span className="text-muted-foreground ml-1">
                      ({summary})
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
