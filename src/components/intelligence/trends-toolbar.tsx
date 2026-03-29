"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Radar, SlidersHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const TIME_RANGES = [
  { label: "7d", value: 7 },
  { label: "14d", value: 14 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
] as const;

interface TrendsToolbarProps {
  clients: Array<{ id: string; name: string }>;
  currentClientId: string | null;
  currentDays: number;
}

export function TrendsToolbar({
  clients,
  currentClientId,
  currentDays,
}: TrendsToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function handleFilterChange(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`?${params.toString()}`);
  }

  async function handleDiscover() {
    setIsDiscovering(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch("/api/intelligence/trends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: currentClientId ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to discover trends");
        return;
      }
      setSuccessMessage(data.message ?? `Discovered ${data.trendsCreated} trends`);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsDiscovering(false);
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        "animate-[slide-up_0.4s_ease-out_both]",
      )}
      style={{ animationDelay: "60ms" }}
    >
      {/* Filters */}
      <div className="flex items-center gap-3">
        <SlidersHorizontal className="size-4 text-muted-foreground" />

        {/* Client filter */}
        <select
          value={currentClientId ?? ""}
          onChange={(e) =>
            handleFilterChange("client_id", e.target.value || null)
          }
          aria-label="Filter by client"
          className={cn(
            "flex h-8 items-center rounded-lg border border-input bg-transparent px-2.5 text-sm",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            "dark:bg-input/30",
          )}
        >
          <option value="">All clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Time range */}
        <div className="flex items-center rounded-lg border border-input p-0.5 dark:bg-input/30">
          {TIME_RANGES.map((range) => (
            <button
              key={range.value}
              type="button"
              onClick={() => handleFilterChange("days", String(range.value))}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                currentDays === range.value
                  ? "bg-nexus-accent text-nexus-accent-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Discover button + feedback */}
      <div className="flex items-center gap-3">
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
        {successMessage && !error && (
          <p className="text-xs text-emerald-400">{successMessage}</p>
        )}
        <Button
          onClick={handleDiscover}
          disabled={isDiscovering}
          className="gap-1.5"
          size="sm"
        >
          {isDiscovering ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Radar className="size-3.5" />
          )}
          Discover Trends
        </Button>
      </div>
    </div>
  );
}
