"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Code,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Schema {
  id: string;
  page_id: string;
  page_url: string;
  schema_type: string;
  json_ld: string;
  is_valid: boolean;
  errors: string[];
  created_at: string;
}

interface SchemaEditorProps {
  schemas: Record<string, unknown>[];
  pageId: string;
  clientId: string;
  pageUrl: string;
  pageTitle: string;
  clientDomain: string;
}

const SCHEMA_TEMPLATES = [
  { type: "WebPage", label: "Web Page" },
  { type: "Article", label: "Article" },
  { type: "Organization", label: "Organization" },
  { type: "BreadcrumbList", label: "Breadcrumbs" },
  { type: "LocalBusiness", label: "Local Business" },
  { type: "FAQPage", label: "FAQ Page" },
  { type: "Product", label: "Product" },
];

export function SchemaEditor({ schemas, pageId, clientId, pageUrl, pageTitle, clientDomain }: SchemaEditorProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(true);
  const [generatingType, setGeneratingType] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const typedSchemas = schemas as unknown as Schema[];

  const handleGenerate = useCallback(async (schemaType: string) => {
    setGeneratingType(schemaType);
    setError(null);
    try {
      const res = await fetch("/api/website/generate-schema", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId,
          clientId,
          url: pageUrl,
          title: pageTitle,
          domain: clientDomain,
          schemaType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate schema");
    } finally {
      setGeneratingType(null);
    }
  }, [pageId, clientId, pageUrl, pageTitle, clientDomain, router]);

  const handleEdit = useCallback((schema: Schema) => {
    setEditingId(schema.id);
    try {
      const parsed = typeof schema.json_ld === "string" ? JSON.parse(schema.json_ld) : schema.json_ld;
      setEditValue(JSON.stringify(parsed, null, 2));
    } catch {
      setEditValue(schema.json_ld);
    }
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingId) return;
    setIsSaving(true);
    setError(null);
    try {
      JSON.parse(editValue);
    } catch {
      setError("Invalid JSON — please fix syntax errors");
      setIsSaving(false);
      return;
    }
    try {
      const res = await fetch("/api/website/generate-schema", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemaId: editingId,
          clientId,
          json_ld: editValue,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setEditingId(null);
      setEditValue("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  }, [editingId, editValue, clientId, router]);

  const handleDelete = useCallback(async (schemaId: string) => {
    try {
      const res = await fetch("/api/website/generate-schema", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schemaId, clientId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Delete failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }, [clientId, router]);

  const handleCopy = useCallback((schema: Schema) => {
    try {
      const parsed = typeof schema.json_ld === "string" ? JSON.parse(schema.json_ld) : schema.json_ld;
      const snippet = `<script type="application/ld+json">\n${JSON.stringify(parsed, null, 2)}\n</script>`;
      navigator.clipboard.writeText(snippet);
      setCopiedId(schema.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      navigator.clipboard.writeText(schema.json_ld);
    }
  }, []);

  return (
    <section className="rounded-xl border border-white/[0.06] bg-slate-900/70 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Code className="size-4 text-orange-400" />
          Structured Data (JSON-LD)
          {typedSchemas.length > 0 && (
            <span className="text-xs text-muted-foreground font-normal">({typedSchemas.length})</span>
          )}
        </h3>
        {isExpanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
      </button>

      {isExpanded && (
        <div className="px-5 pb-5 -mt-2 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}

          {/* Existing schemas */}
          {typedSchemas.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/[0.1] bg-white/[0.02] px-4 py-8 text-center">
              <XCircle className="size-6 text-red-400/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No structured data found</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Add JSON-LD schema to help search engines understand your content
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {typedSchemas.map((schema) => (
                <div
                  key={schema.id}
                  className="rounded-lg border border-white/[0.06] bg-black/20 overflow-hidden"
                >
                  <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.04]">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-orange-400/10 px-1.5 py-0.5 text-xs font-medium text-orange-400">
                        {schema.schema_type}
                      </span>
                      {schema.is_valid ? (
                        <CheckCircle className="size-3 text-emerald-400" />
                      ) : (
                        <XCircle className="size-3 text-red-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopy(schema)}
                        className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                        aria-label="Copy as script tag"
                      >
                        {copiedId === schema.id ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                      </button>
                      <button
                        onClick={() => handleEdit(schema)}
                        className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                        aria-label="Edit schema"
                      >
                        <Code className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(schema.id)}
                        className="rounded p-1 text-muted-foreground hover:text-red-400 hover:bg-red-400/5 transition-colors"
                        aria-label="Delete schema"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {editingId === schema.id ? (
                    <div className="p-3 space-y-2">
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        rows={12}
                        className="w-full rounded-lg bg-black/40 p-3 text-xs text-emerald-300 font-mono outline-none focus:ring-1 focus:ring-emerald-500/30 resize-y"
                        spellCheck={false}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveEdit} disabled={isSaving} className="gap-1.5 text-xs">
                          {isSaving ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setEditingId(null); setEditValue(""); }}
                          className="text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <pre className="p-3 text-xs text-emerald-300/80 font-mono overflow-x-auto max-h-40 overflow-y-auto">
                      {formatJsonLd(schema.json_ld)}
                    </pre>
                  )}

                  {(schema.errors ?? []).length > 0 && (
                    <div className="px-3 pb-2 space-y-0.5">
                      {(schema.errors ?? []).map((err, i) => (
                        <p key={i} className="text-xs text-red-400">{err}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add schema buttons */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Add Schema</p>
            <div className="flex flex-wrap gap-2">
              {SCHEMA_TEMPLATES.map((tmpl) => {
                const exists = typedSchemas.some((s) => s.schema_type === tmpl.type);
                return (
                  <Button
                    key={tmpl.type}
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerate(tmpl.type)}
                    disabled={generatingType !== null || exists}
                    className={cn(
                      "gap-1.5 text-xs",
                      exists && "opacity-50"
                    )}
                  >
                    {generatingType === tmpl.type ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
                    {tmpl.label}
                    {exists && <CheckCircle className="size-3 text-emerald-400" />}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function formatJsonLd(jsonLd: string): string {
  try {
    const parsed = typeof jsonLd === "string" ? JSON.parse(jsonLd) : jsonLd;
    return JSON.stringify(parsed, null, 2);
  } catch {
    return jsonLd;
  }
}
