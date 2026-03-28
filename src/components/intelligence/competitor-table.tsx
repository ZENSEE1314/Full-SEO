"use client";

import { useState, useTransition } from "react";
import {
  ChevronDown,
  ChevronRight,
  Globe,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RankComparisonChart } from "./rank-comparison-chart";
import type { Competitor } from "@/types";

interface CompetitorRow extends Competitor {
  client_name: string;
  tracked_keywords: number;
}

interface RankData {
  keyword: string;
  your_rank: number | null;
  competitor_rank: number | null;
}

interface CompetitorTableProps {
  competitors: CompetitorRow[];
  clients: Array<{ id: string; name: string }>;
}

export function CompetitorTable({
  competitors: initialCompetitors,
  clients,
}: CompetitorTableProps) {
  const [competitors, setCompetitors] =
    useState<CompetitorRow[]>(initialCompetitors);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rankData, setRankData] = useState<Record<string, RankData[]>>({});
  const [isLoadingRanks, setIsLoadingRanks] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleToggleExpand(competitor: CompetitorRow) {
    if (expandedId === competitor.id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(competitor.id);

    if (!rankData[competitor.id]) {
      setIsLoadingRanks(competitor.id);
      try {
        const res = await fetch(
          `/api/intelligence/competitors?id=${competitor.id}&ranks=true`,
        );
        const data = await res.json();
        setRankData((prev) => ({
          ...prev,
          [competitor.id]: data.ranks ?? [],
        }));
      } finally {
        setIsLoadingRanks(null);
      }
    }
  }

  async function handleToggleStatus(id: string, currentStatus: boolean) {
    startTransition(async () => {
      await fetch(`/api/intelligence/competitors`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_active: !currentStatus }),
      });

      setCompetitors((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, is_active: !currentStatus } : c,
        ),
      );
    });
  }

  async function handleDelete(id: string) {
    setDeletingId(null);
    await fetch(`/api/intelligence/competitors?id=${id}`, {
      method: "DELETE",
    });
    setCompetitors((prev) => prev.filter((c) => c.id !== id));
  }

  async function handleAddCompetitor(formData: FormData) {
    const clientId = formData.get("client_id") as string;
    const domain = formData.get("domain") as string;
    const name = formData.get("name") as string;

    const res = await fetch("/api/intelligence/competitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, domain, name }),
    });

    if (res.ok) {
      const { competitor } = await res.json();
      const client = clients.find((c) => c.id === clientId);
      setCompetitors((prev) => [
        ...prev,
        {
          ...competitor,
          client_name: client?.name ?? "",
          tracked_keywords: 0,
        },
      ]);
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {competitors.length} competitor{competitors.length !== 1 && "s"}{" "}
          tracked
        </p>

        <Dialog>
          <DialogTrigger
            render={
              <Button variant="default" size="sm" className="gap-1.5" />
            }
          >
            <Plus className="size-3.5" />
            Add Competitor
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Competitor</DialogTitle>
              <DialogDescription>
                Track a competitor domain for rank comparison.
              </DialogDescription>
            </DialogHeader>
            <form
              action={handleAddCompetitor}
              className="grid gap-4"
            >
              <div className="grid gap-2">
                <Label htmlFor="add-client">Client</Label>
                <select
                  id="add-client"
                  name="client_id"
                  required
                  className={cn(
                    "flex h-8 w-full items-center rounded-lg border border-input bg-transparent px-2.5 text-sm",
                    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                    "dark:bg-input/30",
                  )}
                >
                  <option value="">Select client...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="add-domain">Domain</Label>
                <Input
                  id="add-domain"
                  name="domain"
                  placeholder="competitor.com"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="add-name">Display Name</Label>
                <Input
                  id="add-name"
                  name="name"
                  placeholder="Competitor Inc."
                />
              </div>
              <DialogFooter>
                <Button type="submit" size="sm">
                  Add Competitor
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <div
        className={cn(
          "overflow-hidden rounded-xl",
          "border border-white/[0.06]",
          "bg-slate-900/70 backdrop-blur-sm",
        )}
      >
        <Table>
          <TableHeader>
            <TableRow className="border-white/[0.06] hover:bg-transparent">
              <TableHead className="w-8" />
              <TableHead>Domain</TableHead>
              <TableHead>Client</TableHead>
              <TableHead className="text-right">Keywords</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {competitors.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  No competitors tracked yet. Add one to get started.
                </TableCell>
              </TableRow>
            )}
            {competitors.map((competitor) => {
              const isExpanded = expandedId === competitor.id;
              const isLoading = isLoadingRanks === competitor.id;
              const ranks = rankData[competitor.id] ?? [];

              return (
                <CompetitorRow
                  key={competitor.id}
                  competitor={competitor}
                  isExpanded={isExpanded}
                  isLoading={isLoading}
                  isPending={isPending}
                  ranks={ranks}
                  deletingId={deletingId}
                  onToggleExpand={() => handleToggleExpand(competitor)}
                  onToggleStatus={() =>
                    handleToggleStatus(competitor.id, competitor.is_active)
                  }
                  onDeleteClick={() => setDeletingId(competitor.id)}
                  onDeleteCancel={() => setDeletingId(null)}
                  onDeleteConfirm={() => handleDelete(competitor.id)}
                />
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function CompetitorRow({
  competitor,
  isExpanded,
  isLoading,
  isPending,
  ranks,
  deletingId,
  onToggleExpand,
  onToggleStatus,
  onDeleteClick,
  onDeleteCancel,
  onDeleteConfirm,
}: {
  competitor: CompetitorRow;
  isExpanded: boolean;
  isLoading: boolean;
  isPending: boolean;
  ranks: RankData[];
  deletingId: string | null;
  onToggleExpand: () => void;
  onToggleStatus: () => void;
  onDeleteClick: () => void;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
}) {
  const isConfirmingDelete = deletingId === competitor.id;

  return (
    <>
      <TableRow
        className={cn(
          "cursor-pointer border-white/[0.04] transition-colors",
          isExpanded && "bg-white/[0.02]",
        )}
        onClick={onToggleExpand}
      >
        <TableCell className="pr-0">
          {isExpanded ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Globe className="size-4 text-muted-foreground" />
            <span className="font-medium text-foreground">
              {competitor.domain}
            </span>
            {competitor.name && (
              <span className="text-xs text-muted-foreground">
                ({competitor.name})
              </span>
            )}
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="secondary" className="text-xs">
            {competitor.client_name}
          </Badge>
        </TableCell>
        <TableCell className="text-right tabular-nums">
          {competitor.tracked_keywords}
        </TableCell>
        <TableCell>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleStatus();
            }}
            disabled={isPending}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium transition-colors",
              competitor.is_active
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-slate-500/10 text-slate-400",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                competitor.is_active ? "bg-emerald-400" : "bg-slate-500",
              )}
            />
            {competitor.is_active ? "Active" : "Inactive"}
          </button>
        </TableCell>
        <TableCell>
          {isConfirmingDelete ? (
            <div
              className="flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="destructive"
                size="icon-xs"
                onClick={onDeleteConfirm}
                aria-label="Confirm delete"
              >
                <Trash2 className="size-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={onDeleteCancel}
                aria-label="Cancel delete"
              >
                &times;
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteClick();
              }}
              aria-label={`Delete ${competitor.domain}`}
            >
              <Trash2 className="size-3 text-muted-foreground" />
            </Button>
          )}
        </TableCell>
      </TableRow>

      {/* Expanded rank comparison */}
      {isExpanded && (
        <TableRow className="border-white/[0.04] hover:bg-transparent">
          <TableCell colSpan={6} className="bg-white/[0.01] px-6 py-4">
            {isLoading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <RankComparisonChart
                data={ranks}
                competitorDomain={competitor.domain}
              />
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
