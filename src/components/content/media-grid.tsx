"use client";

import * as React from "react";
import {
  Image as ImageIcon,
  Share2,
  BarChart3,
  Download,
  Eye,
  Trash2,
  Filter,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface MediaItem {
  id: string;
  url: string | null;
  type: "header_image" | "social_image" | "infographic";
  alt_text: string | null;
  article_title: string | null;
  created_at: string;
}

interface MediaGridProps {
  items: MediaItem[];
  activeFilter: MediaItem["type"] | "all";
  onFilterChange: (filter: MediaItem["type"] | "all") => void;
  onPreview: (id: string) => void;
  onDelete: (id: string) => void;
}

const TYPE_CONFIG: Record<
  MediaItem["type"],
  { icon: React.ElementType; label: string; color: string }
> = {
  header_image: {
    icon: ImageIcon,
    label: "Header",
    color: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  },
  social_image: {
    icon: Share2,
    label: "Social",
    color: "bg-violet-500/15 text-violet-400 border-violet-500/20",
  },
  infographic: {
    icon: BarChart3,
    label: "Infographic",
    color: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  },
};

const FILTER_OPTIONS: Array<{ key: MediaItem["type"] | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "header_image", label: "Headers" },
  { key: "social_image", label: "Social" },
  { key: "infographic", label: "Infographics" },
];

export function MediaGrid({
  items,
  activeFilter,
  onFilterChange,
  onPreview,
  onDelete,
}: MediaGridProps) {
  const filteredItems = React.useMemo(
    () =>
      activeFilter === "all"
        ? items
        : items.filter((item) => item.type === activeFilter),
    [items, activeFilter]
  );

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-2">
        <Filter className="size-4 text-muted-foreground" />
        {FILTER_OPTIONS.map((option) => (
          <button
            key={option.key}
            onClick={() => onFilterChange(option.key)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              activeFilter === option.key
                ? "bg-emerald-500/15 text-emerald-400"
                : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {filteredItems.map((item) => {
          const config = TYPE_CONFIG[item.type];
          const TypeIcon = config.icon;

          return (
            <div
              key={item.id}
              className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-slate-900/70 backdrop-blur-sm transition-all hover:border-white/[0.12]"
            >
              {/* Image / placeholder */}
              <div className="relative aspect-video bg-slate-800/50">
                {item.url ? (
                  <img
                    src={item.url}
                    alt={item.alt_text ?? ""}
                    className="size-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <TypeIcon className="size-8 text-muted-foreground/20" />
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="bg-white/10 text-white hover:bg-white/20"
                    onClick={() => onPreview(item.id)}
                    aria-label="Preview"
                  >
                    <Eye className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="bg-white/10 text-white hover:bg-white/20"
                    onClick={() => {
                      if (item.url) window.open(item.url, "_blank");
                    }}
                    aria-label="Download"
                  >
                    <Download className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="bg-white/10 text-red-400 hover:bg-red-500/20"
                    onClick={() => onDelete(item.id)}
                    aria-label="Delete"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                {/* Type badge */}
                <span
                  className={cn(
                    "absolute right-2 top-2 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                    config.color
                  )}
                >
                  <TypeIcon className="size-2.5" />
                  {config.label}
                </span>
              </div>

              {/* Info */}
              <div className="p-3">
                <p className="line-clamp-1 text-xs text-foreground">
                  {item.alt_text || "No alt text"}
                </p>
                {item.article_title && (
                  <p className="mt-1 line-clamp-1 text-[10px] text-muted-foreground">
                    {item.article_title}
                  </p>
                )}
                <p className="mt-1 text-[10px] text-muted-foreground/50">
                  {new Date(item.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-white/[0.06] bg-slate-900/40 py-16">
          <ImageIcon className="size-10 text-muted-foreground/20" />
          <p className="text-sm text-muted-foreground">No media found</p>
        </div>
      )}
    </div>
  );
}
