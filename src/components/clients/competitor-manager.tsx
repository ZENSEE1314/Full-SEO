"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Globe } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Competitor } from "@/types";

interface CompetitorManagerProps {
  clientId: string;
  competitors: Competitor[];
}

export function CompetitorManager({
  clientId,
  competitors,
}: CompetitorManagerProps) {
  const router = useRouter();
  const [newDomain, setNewDomain] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const domain = newDomain.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");

    if (!domain) {
      setError("Enter a domain");
      return;
    }

    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/clients/${clientId}/competitors`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Failed to add");
          return;
        }

        setNewDomain("");
        router.refresh();
      } catch {
        setError("Network error");
      }
    });
  }

  function handleRemove(competitorId: string) {
    startTransition(async () => {
      try {
        await fetch(`/api/clients/${clientId}/competitors/${competitorId}`, {
          method: "DELETE",
        });
        router.refresh();
      } catch {
        // Silently fail, user can retry
      }
    });
  }

  return (
    <section className="rounded-xl border border-white/[0.06] bg-slate-900/70 backdrop-blur-sm p-5">
      <h2 className="font-heading text-sm font-bold text-foreground mb-5">
        Competitors
      </h2>

      {/* Add competitor form */}
      <form onSubmit={handleAdd} className="flex gap-2 mb-4">
        <Input
          value={newDomain}
          onChange={(e) => setNewDomain(e.target.value)}
          placeholder="competitor.com"
          className="flex-1"
          aria-label="Competitor domain"
        />
        <Button type="submit" size="default" disabled={isPending}>
          <Plus className="size-4" data-icon="inline-start" aria-hidden="true" />
          Add
        </Button>
      </form>

      {error && (
        <p className="mb-4 text-xs text-destructive">{error}</p>
      )}

      {/* Competitor list */}
      <div className="space-y-2">
        {competitors.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No competitors added yet
          </p>
        ) : (
          competitors.map((comp) => (
            <div
              key={comp.id}
              className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.02] px-4 py-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Globe
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="text-sm font-medium text-foreground truncate">
                  {comp.domain}
                </span>
                {comp.name && (
                  <span className="text-xs text-muted-foreground truncate">
                    ({comp.name})
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => handleRemove(comp.id)}
                disabled={isPending}
                aria-label={`Remove ${comp.domain}`}
              >
                <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive transition-colors" />
              </Button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
