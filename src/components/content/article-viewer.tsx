"use client";

import * as React from "react";
import {
  CheckCircle2,
  Globe,
  RefreshCw,
  Pencil,
  Eye,
  FileText,
  Hash,
  BarChart3,
  Type,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface ArticleDetail {
  id: string;
  title: string;
  slug: string | null;
  body: string | null;
  meta_title: string | null;
  meta_description: string | null;
  word_count: number | null;
  seo_score: number | null;
  status: "draft" | "review" | "approved" | "published";
  client_name: string;
  created_at: string;
}

interface ArticleViewerProps {
  article: ArticleDetail;
  onApprove: (id: string) => void;
  onPublish: (id: string) => void;
  onRegenerate: (id: string) => void;
  onSave: (id: string, data: { title: string; body: string; meta_title: string; meta_description: string }) => void;
}

function SeoGauge({ score }: { score: number | null }) {
  const displayScore = score ?? 0;
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (displayScore / 100) * circumference;
  const color =
    displayScore >= 80
      ? "text-emerald-500"
      : displayScore >= 60
        ? "text-amber-500"
        : "text-red-500";
  const trackColor =
    displayScore >= 80
      ? "stroke-emerald-500/15"
      : displayScore >= 60
        ? "stroke-amber-500/15"
        : "stroke-red-500/15";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="88" height="88" viewBox="0 0 88 88" className="-rotate-90">
        <circle
          cx="44"
          cy="44"
          r="36"
          fill="none"
          strokeWidth="6"
          className={trackColor}
        />
        <circle
          cx="44"
          cy="44"
          r="36"
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn("transition-all duration-700", color)}
          style={{ stroke: "currentColor" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-xl font-bold tabular-nums", color)}>
          {score ?? "--"}
        </span>
        <span className="text-[10px] text-muted-foreground">SEO</span>
      </div>
    </div>
  );
}

export function ArticleViewer({
  article,
  onApprove,
  onPublish,
  onRegenerate,
  onSave,
}: ArticleViewerProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editTitle, setEditTitle] = React.useState(article.title);
  const [editBody, setEditBody] = React.useState(article.body ?? "");
  const [editMetaTitle, setEditMetaTitle] = React.useState(article.meta_title ?? "");
  const [editMetaDesc, setEditMetaDesc] = React.useState(article.meta_description ?? "");

  function handleSave() {
    onSave(article.id, {
      title: editTitle,
      body: editBody,
      meta_title: editMetaTitle,
      meta_description: editMetaDesc,
    });
    setIsEditing(false);
  }

  function handleCancelEdit() {
    setEditTitle(article.title);
    setEditBody(article.body ?? "");
    setEditMetaTitle(article.meta_title ?? "");
    setEditMetaDesc(article.meta_description ?? "");
    setIsEditing(false);
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Article content — left panel */}
      <div className="lg:col-span-2">
        <div className="rounded-xl border border-white/[0.06] bg-slate-900/70 backdrop-blur-sm">
          {/* Toolbar */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Article Content</span>
            </div>
            <Button
              variant={isEditing ? "default" : "outline"}
              size="sm"
              onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
            >
              {isEditing ? (
                <>
                  <CheckCircle2 className="size-3.5" data-icon="inline-start" />
                  Save
                </>
              ) : (
                <>
                  <Pencil className="size-3.5" data-icon="inline-start" />
                  Edit
                </>
              )}
            </Button>
          </div>

          {/* Content */}
          <div className="p-6">
            {isEditing ? (
              <div className="space-y-4">
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="font-heading text-xl font-bold"
                  aria-label="Article title"
                />
                <Textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  className="min-h-96 font-mono text-sm leading-relaxed"
                  aria-label="Article body"
                />
              </div>
            ) : (
              <article className="prose prose-invert max-w-none">
                <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
                  {article.title}
                </h1>
                {article.body ? (
                  <div
                    className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80"
                  >
                    {article.body}
                  </div>
                ) : (
                  <div className="mt-8 flex flex-col items-center gap-3 py-12 text-center">
                    <Eye className="size-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      No content generated yet. Click "Regenerate" to start the AI pipeline.
                    </p>
                  </div>
                )}
              </article>
            )}
          </div>

          {isEditing && (
            <div className="flex justify-end gap-2 border-t border-white/[0.06] px-4 py-3">
              <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                Save Changes
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Meta panel — right */}
      <div className="space-y-4">
        {/* SEO Score */}
        <div className="rounded-xl border border-white/[0.06] bg-slate-900/70 p-4 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <SeoGauge score={article.seo_score} />
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Type className="size-3" />
                {article.word_count?.toLocaleString() ?? "0"} words
              </span>
              <span className="flex items-center gap-1">
                <BarChart3 className="size-3" />
                {article.status}
              </span>
            </div>
          </div>
        </div>

        {/* Meta info */}
        <div className="rounded-xl border border-white/[0.06] bg-slate-900/70 p-4 backdrop-blur-sm">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Meta Information
          </h3>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[11px] text-muted-foreground">Title Tag</label>
              {isEditing ? (
                <Input
                  value={editMetaTitle}
                  onChange={(e) => setEditMetaTitle(e.target.value)}
                  className="text-xs"
                />
              ) : (
                <p className="text-sm text-foreground">
                  {article.meta_title || <span className="text-muted-foreground/40">Not set</span>}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-muted-foreground">
                Meta Description
              </label>
              {isEditing ? (
                <Textarea
                  value={editMetaDesc}
                  onChange={(e) => setEditMetaDesc(e.target.value)}
                  className="min-h-16 text-xs"
                />
              ) : (
                <p className="text-sm text-foreground/80">
                  {article.meta_description || (
                    <span className="text-muted-foreground/40">Not set</span>
                  )}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-muted-foreground">Slug</label>
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <Hash className="size-3" />
                {article.slug || "auto-generated"}
              </p>
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-muted-foreground">Client</label>
              <p className="text-sm text-foreground">{article.client_name}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="rounded-xl border border-white/[0.06] bg-slate-900/70 p-4 backdrop-blur-sm">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Actions
          </h3>
          <div className="flex flex-col gap-2">
            {article.status === "draft" || article.status === "review" ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => onApprove(article.id)}
              >
                <CheckCircle2 className="size-4 text-amber-500" data-icon="inline-start" />
                Approve Article
              </Button>
            ) : null}

            {article.status === "approved" && (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => onPublish(article.id)}
              >
                <Globe className="size-4 text-emerald-500" data-icon="inline-start" />
                Publish Article
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => onRegenerate(article.id)}
            >
              <RefreshCw className="size-4 text-blue-500" data-icon="inline-start" />
              Regenerate Content
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
