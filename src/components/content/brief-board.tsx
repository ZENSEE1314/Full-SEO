"use client";

import * as React from "react";
import {
  FileText,
  CheckCircle2,
  Loader2,
  Globe,
  Sparkles,
  TrendingUp,
  Search,
  GripVertical,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface BriefCard {
  id: string;
  title: string;
  target_keyword: string | null;
  client_name: string;
  source: "manual" | "trend" | "gap_analysis";
  status: "draft" | "approved" | "in_progress" | "published";
  created_at: string;
}

interface BriefBoardProps {
  briefs: BriefCard[];
  onStatusChange: (briefId: string, newStatus: BriefCard["status"]) => void;
  onCardClick: (briefId: string) => void;
}

const COLUMNS: Array<{
  key: BriefCard["status"];
  label: string;
  icon: React.ElementType;
  borderColor: string;
  dotColor: string;
}> = [
  {
    key: "draft",
    label: "Draft",
    icon: FileText,
    borderColor: "border-l-slate-500",
    dotColor: "bg-slate-500",
  },
  {
    key: "approved",
    label: "Approved",
    icon: CheckCircle2,
    borderColor: "border-l-blue-500",
    dotColor: "bg-blue-500",
  },
  {
    key: "in_progress",
    label: "In Progress",
    icon: Loader2,
    borderColor: "border-l-amber-500",
    dotColor: "bg-amber-500",
  },
  {
    key: "published",
    label: "Published",
    icon: Globe,
    borderColor: "border-l-emerald-500",
    dotColor: "bg-emerald-500",
  },
];

const SOURCE_CONFIG: Record<BriefCard["source"], { icon: React.ElementType; label: string }> = {
  manual: { icon: FileText, label: "Manual" },
  trend: { icon: TrendingUp, label: "Trend" },
  gap_analysis: { icon: Search, label: "Gap Analysis" },
};

export function BriefBoard({ briefs, onStatusChange, onCardClick }: BriefBoardProps) {
  const [draggedId, setDraggedId] = React.useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = React.useState<BriefCard["status"] | null>(null);

  function handleDragStart(e: React.DragEvent, briefId: string) {
    setDraggedId(briefId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", briefId);
  }

  function handleDragOver(e: React.DragEvent, columnKey: BriefCard["status"]) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(columnKey);
  }

  function handleDragLeave() {
    setDragOverColumn(null);
  }

  function handleDrop(e: React.DragEvent, columnKey: BriefCard["status"]) {
    e.preventDefault();
    const briefId = e.dataTransfer.getData("text/plain");
    if (briefId && columnKey) {
      onStatusChange(briefId, columnKey);
    }
    setDraggedId(null);
    setDragOverColumn(null);
  }

  function handleDragEnd() {
    setDraggedId(null);
    setDragOverColumn(null);
  }

  const groupedBriefs = React.useMemo(() => {
    const groups: Record<BriefCard["status"], BriefCard[]> = {
      draft: [],
      approved: [],
      in_progress: [],
      published: [],
    };
    for (const brief of briefs) {
      groups[brief.status]?.push(brief);
    }
    return groups;
  }, [briefs]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {COLUMNS.map((column) => {
        const columnBriefs = groupedBriefs[column.key];
        const isDropTarget = dragOverColumn === column.key;
        const Icon = column.icon;

        return (
          <div
            key={column.key}
            className={cn(
              "flex flex-col rounded-xl border border-white/[0.06] bg-slate-900/40 backdrop-blur-sm transition-colors",
              isDropTarget && "border-emerald-500/30 bg-emerald-500/5"
            )}
            onDragOver={(e) => handleDragOver(e, column.key)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.key)}
          >
            {/* Column header */}
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
              <span className={cn("size-2 rounded-full", column.dotColor)} />
              <Icon className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{column.label}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {columnBriefs.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2 p-3" style={{ minHeight: 120 }}>
              {columnBriefs.map((brief) => {
                const sourceConfig = SOURCE_CONFIG[brief.source];
                const SourceIcon = sourceConfig.icon;
                const isDragging = draggedId === brief.id;

                return (
                  <div
                    key={brief.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, brief.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onCardClick(brief.id)}
                    className={cn(
                      "group cursor-pointer rounded-lg border-l-2 bg-slate-900/70 px-3 py-2.5 backdrop-blur-sm transition-all",
                      "border border-white/[0.06] hover:border-white/[0.12] hover:bg-slate-800/70",
                      column.borderColor,
                      isDragging && "opacity-40"
                    )}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onCardClick(brief.id);
                      }
                    }}
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h4 className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
                        {brief.title}
                      </h4>
                      <GripVertical className="mt-0.5 size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-60" />
                    </div>

                    {brief.target_keyword && (
                      <Badge variant="secondary" className="mb-2 text-[10px]">
                        <Sparkles className="size-2.5" data-icon="inline-start" />
                        {brief.target_keyword}
                      </Badge>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-muted-foreground">
                        {brief.client_name}
                      </span>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <SourceIcon className="size-3" />
                        <span className="text-[10px]">{sourceConfig.label}</span>
                      </div>
                    </div>

                    <div className="mt-1.5 text-[10px] text-muted-foreground/60">
                      {new Date(brief.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                );
              })}

              {columnBriefs.length === 0 && (
                <div className="flex flex-1 items-center justify-center py-8 text-xs text-muted-foreground/40">
                  {isDropTarget ? "Drop here" : "No briefs"}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
