"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface IntegrationCardProps {
  name: string;
  description: string;
  icon: React.ReactNode;
  isConnected: boolean;
  lastSyncAt?: string | null;
  onConnect?: () => void;
  onManage?: () => void;
  index?: number;
}

export function IntegrationCard({
  name,
  description,
  icon,
  isConnected,
  lastSyncAt,
  onConnect,
  onManage,
  index = 0,
}: IntegrationCardProps) {
  return (
    <div
      className="group relative flex flex-col gap-4 rounded-xl border border-white/[0.06] bg-slate-900/70 backdrop-blur-sm p-5 transition-all hover:border-white/[0.10]"
      style={{
        animationDelay: `${index * 80}ms`,
        animation: "slide-up 0.4s ease-out both",
      }}
    >
      {/* Subtle glow on connected */}
      {isConnected && (
        <div
          className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.06), transparent 70%)",
          }}
          aria-hidden="true"
        />
      )}

      <div className="flex items-start justify-between">
        {/* Icon */}
        <div
          className={cn(
            "flex size-12 items-center justify-center rounded-xl border",
            isConnected
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
              : "border-white/[0.06] bg-slate-800 text-muted-foreground"
          )}
        >
          {icon}
        </div>

        {/* Status dot */}
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "size-2 rounded-full",
              isConnected
                ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]"
                : "bg-slate-600"
            )}
          />
          <span
            className={cn(
              "text-xs font-medium",
              isConnected ? "text-emerald-400" : "text-muted-foreground"
            )}
          >
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 space-y-1">
        <h3 className="font-heading text-sm font-semibold text-foreground">
          {name}
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        {isConnected && lastSyncAt ? (
          <span className="text-[11px] text-muted-foreground">
            Last sync{" "}
            {formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true })}
          </span>
        ) : (
          <span />
        )}

        {isConnected ? (
          <Button variant="outline" size="sm" onClick={onManage}>
            Manage
          </Button>
        ) : (
          <Button size="sm" onClick={onConnect} className="gap-1.5">
            Connect
          </Button>
        )}
      </div>
    </div>
  );
}
