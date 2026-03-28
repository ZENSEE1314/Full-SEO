"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, LayoutGrid, Filter } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BriefBoard } from "@/components/content/brief-board";
import { BriefDialog } from "@/components/content/brief-dialog";

interface BriefCard {
  id: string;
  title: string;
  target_keyword: string | null;
  client_name: string;
  source: "manual" | "trend" | "gap_analysis";
  status: "draft" | "approved" | "in_progress" | "published";
  created_at: string;
}

interface ClientOption {
  id: string;
  name: string;
}

interface KeywordOption {
  id: string;
  keyword: string;
  client_id: string;
}

interface BriefsPageClientProps {
  initialBriefs: BriefCard[];
  clients: ClientOption[];
  keywords: KeywordOption[];
  initialClientFilter: string;
  initialStatusFilter: string;
}

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "approved", label: "Approved" },
  { value: "in_progress", label: "In Progress" },
  { value: "published", label: "Published" },
];

export function BriefsPageClient({
  initialBriefs,
  clients,
  keywords,
  initialClientFilter,
  initialStatusFilter,
}: BriefsPageClientProps) {
  const router = useRouter();
  const [briefs, setBriefs] = React.useState(initialBriefs);
  const [clientFilter, setClientFilter] = React.useState(initialClientFilter);
  const [statusFilter, setStatusFilter] = React.useState(initialStatusFilter);

  const filteredBriefs = React.useMemo(() => {
    let result = briefs;
    if (clientFilter) {
      const clientName = clients.find((c) => c.id === clientFilter)?.name;
      result = result.filter((b) => b.client_name === clientName);
    }
    if (statusFilter) {
      result = result.filter((b) => b.status === statusFilter);
    }
    return result;
  }, [briefs, clientFilter, statusFilter, clients]);

  async function handleStatusChange(briefId: string, newStatus: BriefCard["status"]) {
    setBriefs((prev) =>
      prev.map((b) => (b.id === briefId ? { ...b, status: newStatus } : b))
    );

    try {
      await fetch("/api/content/briefs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: briefId, status: newStatus }),
      });
    } catch {
      router.refresh();
    }
  }

  function handleCardClick(briefId: string) {
    // Could navigate to detail or open a sheet
    router.push(`/content-factory/briefs?detail=${briefId}`);
  }

  async function handleCreateBrief(data: {
    title: string;
    client_id: string;
    target_keyword_id: string | null;
    secondary_keywords: string[];
    brief_text: string;
    source: "manual" | "trend" | "gap_analysis";
  }) {
    try {
      const response = await fetch("/api/content/briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        router.refresh();
      }
    } catch {
      // Handled by refresh
    }
  }

  return (
    <>
      {/* Header */}
      <header className="animate-[fade-in_0.5s_ease-out_both]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Content Briefs
            </h1>
            <p className="mt-1 text-base text-muted-foreground">
              Plan and track content from ideation to publication
            </p>
          </div>
          <BriefDialog
            clients={clients}
            keywords={keywords}
            trigger={
              <Button>
                <Plus className="size-4" data-icon="inline-start" />
                New Brief
              </Button>
            }
            onSubmit={handleCreateBrief}
          />
        </div>
      </header>

      {/* Filters */}
      <div className="flex items-center gap-3 animate-[fade-in_0.5s_ease-out_0.1s_both]">
        <Filter className="size-4 text-muted-foreground" />

        <Select value={clientFilter} onValueChange={(v) => setClientFilter(v ?? "")}>
          <SelectTrigger>
            <SelectValue placeholder="All Clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Clients</SelectItem>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "")}>
          <SelectTrigger>
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          <LayoutGrid className="size-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {filteredBriefs.length} brief{filteredBriefs.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Board */}
      <div className="animate-[slide-up_0.4s_ease-out_0.2s_both]">
        <BriefBoard
          briefs={filteredBriefs}
          onStatusChange={handleStatusChange}
          onCardClick={handleCardClick}
        />
      </div>
    </>
  );
}
