"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "archived", label: "Archived" },
] as const;

export function ClientFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentStatus = searchParams.get("status") ?? "all";
  const currentSearch = searchParams.get("q") ?? "";

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative max-w-xs flex-1">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          placeholder="Search clients..."
          defaultValue={currentSearch}
          className="pl-9"
          onChange={(e) => {
            const value = e.target.value.trim();
            updateParams("q", value);
          }}
          aria-label="Search clients by name or domain"
        />
      </div>

      <div className="flex gap-1 rounded-lg border border-white/[0.06] bg-slate-900/50 p-1">
        {STATUS_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant="ghost"
            size="sm"
            className={cn(
              "rounded-md px-3 text-xs font-medium",
              currentStatus === opt.value
                ? "bg-white/10 text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => updateParams("status", opt.value)}
            aria-pressed={currentStatus === opt.value}
          >
            {opt.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
