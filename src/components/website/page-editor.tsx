"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Loader2,
  Monitor,
  Smartphone,
  Globe,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileCode,
  Wand2,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SerpPreview } from "./serp-preview";
import { SchemaEditor } from "./schema-editor";
import { SeoChecklist } from "./seo-checklist";

interface Page {
  id: string;
  url: string;
  title: string | null;
  meta_description: string | null;
  h1: string | null;
  canonical_url: string | null;
  status_code: number | null;
  is_indexed: boolean;
  page_type: string | null;
  issue_count: number;
  has_schema: boolean;
  schema_count: number;
  speed_score: number | null;
}

interface PageEditorProps {
  page: Page;
  issues: Record<string, unknown>[];
  schemas: Record<string, unknown>[];
  clientId: string;
  clientDomain: string;
  onBack: () => void;
}

type PreviewMode = "desktop" | "mobile";

export function PageEditor({ page, issues, schemas, clientId, clientDomain, onBack }: PageEditorProps) {
  const router = useRouter();

  // Editable fields
  const [title, setTitle] = useState(page.title ?? "");
  const [metaDescription, setMetaDescription] = useState(page.meta_description ?? "");
  const [h1, setH1] = useState(page.h1 ?? "");
  const [canonicalUrl, setCanonicalUrl] = useState(page.canonical_url ?? page.url);

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop");
  const [isGeneratingMeta, setIsGeneratingMeta] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [showIssues, setShowIssues] = useState(true);
  const [showPreview, setShowPreview] = useState(true);

  const hasChanges =
    title !== (page.title ?? "") ||
    metaDescription !== (page.meta_description ?? "") ||
    h1 !== (page.h1 ?? "") ||
    canonicalUrl !== (page.canonical_url ?? page.url);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const res = await fetch("/api/website/pages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: page.id,
          clientId,
          title,
          meta_description: metaDescription,
          h1,
          canonical_url: canonicalUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setSaveSuccess(true);
      router.refresh();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  }, [page.id, clientId, title, metaDescription, h1, canonicalUrl, router]);

  const handleGenerateMeta = useCallback(async () => {
    setIsGeneratingMeta(true);
    try {
      const res = await fetch("/api/website/generate-meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: page.id,
          clientId,
          url: page.url,
          currentTitle: title,
          currentH1: h1,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      if (data.title && !title) setTitle(data.title);
      if (data.meta_description && !metaDescription) setMetaDescription(data.meta_description);
      if (data.h1 && !h1) setH1(data.h1);
      if (data.canonical_url && canonicalUrl === page.url) setCanonicalUrl(data.canonical_url);
    } catch {
      setSaveError("Failed to generate meta tags");
    } finally {
      setIsGeneratingMeta(false);
    }
  }, [page.id, page.url, clientId, title, h1, canonicalUrl]);

  const htmlSnippet = generateHtmlSnippet({ title, metaDescription, h1, canonicalUrl, page });

  const handleCopySnippet = useCallback(() => {
    navigator.clipboard.writeText(htmlSnippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  }, [htmlSnippet]);

  return (
    <div className="space-y-6 animate-[fade-in_0.3s_ease-out_both]">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            aria-label="Go back to pages list"
            className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-foreground truncate">{getPathFromUrl(page.url) || "/"}</h2>
            <p className="text-xs text-muted-foreground truncate">{page.url}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={page.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            <ExternalLink className="size-3.5" /> Visit
          </a>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="gap-1.5"
          >
            {isSaving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : saveSuccess ? (
              <Check className="size-3.5" />
            ) : (
              <Save className="size-3.5" />
            )}
            {isSaving ? "Saving..." : saveSuccess ? "Saved!" : "Save Changes"}
          </Button>
        </div>
      </div>

      {saveError && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {saveError}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Editor */}
        <div className="lg:col-span-2 space-y-6">
          {/* SEO Fields */}
          <section className="rounded-xl border border-white/[0.06] bg-slate-900/70 p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FileCode className="size-4 text-emerald-400" />
                SEO Elements
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateMeta}
                disabled={isGeneratingMeta}
                className="gap-1.5 text-xs"
              >
                {isGeneratingMeta ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Wand2 className="size-3" />
                )}
                Auto-Generate
              </Button>
            </div>

            {/* Title Tag */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="page-title" className="text-xs font-medium text-muted-foreground">
                  Title Tag
                </label>
                <span className={cn("text-xs", title.length > 60 ? "text-amber-400" : "text-muted-foreground/50")}>
                  {title.length}/60
                </span>
              </div>
              <Input
                id="page-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter page title..."
                className="text-sm"
              />
              {!title && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <XCircle className="size-3" /> Missing title tag — critical for SEO
                </p>
              )}
              {title.length > 60 && (
                <p className="text-xs text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="size-3" /> Title may be truncated in search results
                </p>
              )}
            </div>

            {/* Meta Description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="meta-desc" className="text-xs font-medium text-muted-foreground">
                  Meta Description
                </label>
                <span className={cn(
                  "text-xs",
                  metaDescription.length > 160 ? "text-red-400" :
                  metaDescription.length > 155 ? "text-amber-400" :
                  "text-muted-foreground/50"
                )}>
                  {metaDescription.length}/160
                </span>
              </div>
              <textarea
                id="meta-desc"
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="Enter meta description..."
                rows={3}
                className="w-full rounded-lg border border-white/[0.06] bg-slate-900/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/20 resize-none"
              />
              {!metaDescription && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <XCircle className="size-3" /> Missing meta description — hurts click-through rate
                </p>
              )}
              {metaDescription.length > 160 && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <XCircle className="size-3" /> Too long — will be truncated in search results
                </p>
              )}
            </div>

            {/* H1 Heading */}
            <div className="space-y-1.5">
              <label htmlFor="page-h1" className="text-xs font-medium text-muted-foreground">
                H1 Heading
              </label>
              <Input
                id="page-h1"
                value={h1}
                onChange={(e) => setH1(e.target.value)}
                placeholder="Enter H1 heading..."
                className="text-sm"
              />
              {!h1 && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <XCircle className="size-3" /> Missing H1 — every page needs one primary heading
                </p>
              )}
            </div>

            {/* Canonical URL */}
            <div className="space-y-1.5">
              <label htmlFor="canonical" className="text-xs font-medium text-muted-foreground">
                Canonical URL
              </label>
              <Input
                id="canonical"
                value={canonicalUrl}
                onChange={(e) => setCanonicalUrl(e.target.value)}
                placeholder="https://example.com/page"
                className="text-sm font-mono"
              />
              {!canonicalUrl && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <XCircle className="size-3" /> Missing canonical — can cause duplicate content issues
                </p>
              )}
            </div>
          </section>

          {/* SERP Preview */}
          <section className="rounded-xl border border-white/[0.06] bg-slate-900/70 overflow-hidden">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex w-full items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors"
            >
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Eye className="size-4 text-blue-400" />
                Search Preview
              </h3>
              <div className="flex items-center gap-2">
                <div className="flex rounded-md border border-white/[0.06] overflow-hidden">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setPreviewMode("desktop"); }}
                    aria-label="Desktop preview"
                    className={cn(
                      "px-2 py-1",
                      previewMode === "desktop"
                        ? "bg-white/10 text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Monitor className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setPreviewMode("mobile"); }}
                    aria-label="Mobile preview"
                    className={cn(
                      "px-2 py-1",
                      previewMode === "mobile"
                        ? "bg-white/10 text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Smartphone className="size-3.5" />
                  </button>
                </div>
                {showPreview ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
              </div>
            </button>
            {showPreview && (
              <div className="px-5 pb-5 -mt-2">
                <SerpPreview
                  title={title}
                  description={metaDescription}
                  url={page.url}
                  mode={previewMode}
                />
              </div>
            )}
          </section>

          {/* JSON-LD Schema Editor */}
          <SchemaEditor
            schemas={schemas}
            pageId={page.id}
            clientId={clientId}
            pageUrl={page.url}
            pageTitle={title}
            clientDomain={clientDomain}
          />

          {/* HTML Snippet */}
          <section className="rounded-xl border border-white/[0.06] bg-slate-900/70 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FileCode className="size-4 text-purple-400" />
                HTML Snippet
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopySnippet}
                className="gap-1.5 text-xs"
              >
                {copiedSnippet ? <Check className="size-3" /> : <Copy className="size-3" />}
                {copiedSnippet ? "Copied!" : "Copy"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Copy this into your page&apos;s {"<head>"} section to apply these SEO changes.
            </p>
            <pre className="overflow-x-auto rounded-lg bg-black/40 p-4 text-xs text-emerald-300 font-mono leading-relaxed">
              {htmlSnippet}
            </pre>
          </section>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* SEO Checklist */}
          <SeoChecklist
            title={title}
            metaDescription={metaDescription}
            h1={h1}
            canonicalUrl={canonicalUrl}
            hasSchema={schemas.length > 0}
            statusCode={page.status_code}
            isIndexed={page.is_indexed}
            speedScore={page.speed_score}
          />

          {/* Page Issues */}
          {issues.length > 0 && (
            <section className="rounded-xl border border-white/[0.06] bg-slate-900/70 overflow-hidden">
              <button
                onClick={() => setShowIssues(!showIssues)}
                className="flex w-full items-center justify-between p-4 text-left hover:bg-white/[0.02] transition-colors"
              >
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <AlertTriangle className="size-4 text-amber-400" />
                  Issues ({issues.length})
                </h3>
                {showIssues ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
              </button>
              {showIssues && (
                <div className="px-4 pb-4 space-y-2">
                  {issues.map((issue) => {
                    const i = issue as {
                      id: string;
                      issue_type: string;
                      severity: string;
                      description: string | null;
                    };
                    return (
                      <div
                        key={i.id}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-xs",
                          i.severity === "critical"
                            ? "border-red-500/20 bg-red-500/5"
                            : i.severity === "warning"
                            ? "border-amber-500/20 bg-amber-500/5"
                            : "border-blue-500/20 bg-blue-500/5"
                        )}
                      >
                        <p className={cn(
                          "font-medium",
                          i.severity === "critical" ? "text-red-400" :
                          i.severity === "warning" ? "text-amber-400" : "text-blue-400"
                        )}>
                          {formatIssueType(i.issue_type)}
                        </p>
                        {i.description && (
                          <p className="text-muted-foreground mt-0.5 line-clamp-2">{i.description}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Page Info */}
          <section className="rounded-xl border border-white/[0.06] bg-slate-900/70 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Globe className="size-4 text-cyan-400" />
              Page Info
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className={cn(
                  "font-medium",
                  page.status_code === 200 ? "text-emerald-400" : "text-red-400"
                )}>
                  {page.status_code ?? "Unknown"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Indexed</span>
                <span className={page.is_indexed ? "text-emerald-400" : "text-amber-400"}>
                  {page.is_indexed ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Speed Score</span>
                <span className={cn(
                  "font-medium",
                  page.speed_score === null ? "text-muted-foreground/50" :
                  page.speed_score >= 80 ? "text-emerald-400" :
                  page.speed_score >= 50 ? "text-amber-400" : "text-red-400"
                )}>
                  {page.speed_score !== null ? Math.round(page.speed_score) : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="text-foreground">{page.page_type ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Schemas</span>
                <span className="text-foreground">{page.schema_count}</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function getPathFromUrl(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function formatIssueType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function generateHtmlSnippet({
  title,
  metaDescription,
  h1,
  canonicalUrl,
  page,
}: {
  title: string;
  metaDescription: string;
  h1: string;
  canonicalUrl: string;
  page: { url: string };
}): string {
  const lines: string[] = ["<!-- SEO Meta Tags -->"];

  if (title) {
    lines.push(`<title>${escapeHtml(title)}</title>`);
  }
  if (metaDescription) {
    lines.push(`<meta name="description" content="${escapeHtml(metaDescription)}" />`);
  }
  if (canonicalUrl) {
    lines.push(`<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`);
  }

  lines.push("");
  lines.push("<!-- Open Graph -->");
  if (title) {
    lines.push(`<meta property="og:title" content="${escapeHtml(title)}" />`);
  }
  if (metaDescription) {
    lines.push(`<meta property="og:description" content="${escapeHtml(metaDescription)}" />`);
  }
  lines.push(`<meta property="og:url" content="${escapeHtml(canonicalUrl || page.url)}" />`);
  lines.push(`<meta property="og:type" content="website" />`);

  if (h1) {
    lines.push("");
    lines.push("<!-- H1 (place in body) -->");
    lines.push(`<h1>${escapeHtml(h1)}</h1>`);
  }

  return lines.join("\n");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
