"use client";

import { useEffect, useRef } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { cn } from "@/lib/utils";
import { useSse } from "@/hooks/use-sse";
import type { AgentAction } from "@/types";

const MODULE_COLORS: Record<string, { bg: string; text: string }> = {
  intelligence: { bg: "bg-blue-500/15", text: "text-blue-400" },
  content: { bg: "bg-purple-500/15", text: "text-purple-400" },
  technical: { bg: "bg-amber-500/15", text: "text-amber-400" },
  outreach: { bg: "bg-emerald-500/15", text: "text-emerald-400" },
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  success: <CheckCircle2 className="size-4 text-emerald-400" />,
  failure: <XCircle className="size-4 text-red-400" />,
  warning: <AlertTriangle className="size-4 text-amber-400" />,
  info: <Info className="size-4 text-blue-400" />,
};

function ModuleBadge({ module }: { module: string }) {
  const colors = MODULE_COLORS[module] ?? {
    bg: "bg-muted",
    text: "text-muted-foreground",
  };

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        colors.bg,
        colors.text,
      )}
    >
      {module}
    </span>
  );
}

function LiveIndicator({ isConnected }: { isConnected: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span
        className={cn(
          "relative inline-block size-2 rounded-full",
          isConnected ? "bg-emerald-400" : "bg-muted-foreground",
        )}
      >
        {isConnected && (
          <span
            className="absolute inset-0 rounded-full bg-emerald-400"
            style={{ animation: "live-pulse 2s ease-in-out infinite" }}
          />
        )}
      </span>
      <span className={isConnected ? "text-emerald-400" : "text-muted-foreground"}>
        {isConnected ? "Live" : "Disconnected"}
      </span>
    </span>
  );
}

interface ActionFeedProps {
  initialActions: AgentAction[];
  clientId?: string;
  maxHeight?: string;
  isFullPage?: boolean;
}

export function ActionFeed({
  initialActions,
  clientId,
  maxHeight = "28rem",
  isFullPage = false,
}: ActionFeedProps) {
  const { events, isConnected } = useSse({
    clientId,
    initialData: initialActions,
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && !isFullPage) {
      scrollRef.current.scrollTop = 0;
    }
  }, [events.length, isFullPage]);

  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm",
        !isFullPage && "animate-[slide-up_0.4s_ease-out_both]",
      )}
      style={!isFullPage ? { animationDelay: "480ms" } : undefined}
    >
      <div className="flex items-center justify-between border-b border-border/30 px-5 py-4">
        <div>
          <h3 className="font-heading text-base font-semibold text-foreground">
            Action Feed
          </h3>
          <p className="text-sm text-muted-foreground">
            Real-time agent activity
          </p>
        </div>
        <LiveIndicator isConnected={isConnected} />
      </div>

      <div
        ref={scrollRef}
        className="overflow-y-auto"
        style={{ maxHeight: isFullPage ? "none" : maxHeight }}
      >
        {events.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            No actions recorded yet
          </div>
        ) : (
          <div className="divide-y divide-border/20">
            {events.map((action) => (
              <div
                key={action.id}
                className="flex items-start gap-3 px-5 py-3 transition-colors duration-150 hover:bg-nexus-accent/5"
              >
                <div className="mt-0.5 shrink-0">
                  {STATUS_ICONS[action.status] ?? STATUS_ICONS.info}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <ModuleBadge module={action.module} />
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {action.action_type}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {action.summary}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(action.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
