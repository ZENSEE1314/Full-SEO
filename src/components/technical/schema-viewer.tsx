"use client";

import { useState } from "react";
import {
  Check,
  X,
  ExternalLink,
  Code2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SchemaMarkup {
  id: string;
  page_url: string;
  schema_type: string;
  json_ld: string;
  is_valid: boolean;
  errors: string[];
}

interface SchemaViewerProps {
  schemas: SchemaMarkup[];
}

const SCHEMA_TYPE_COLORS: Record<string, string> = {
  Article: "bg-blue-500/10 text-blue-400",
  Product: "bg-violet-500/10 text-violet-400",
  LocalBusiness: "bg-amber-500/10 text-amber-400",
  Organization: "bg-emerald-500/10 text-emerald-400",
  BreadcrumbList: "bg-cyan-500/10 text-cyan-400",
  FAQPage: "bg-pink-500/10 text-pink-400",
  WebSite: "bg-indigo-500/10 text-indigo-400",
  Person: "bg-orange-500/10 text-orange-400",
};

const DEFAULT_SCHEMA_COLOR = "bg-slate-500/10 text-slate-400";

function formatJsonLd(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function buildRichResultsUrl(pageUrl: string): string {
  return `https://search.google.com/test/rich-results?url=${encodeURIComponent(pageUrl)}`;
}

export function SchemaViewer({ schemas }: SchemaViewerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (schemas.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-slate-900/70 backdrop-blur-sm px-5 py-10 text-center">
        <Code2 className="mx-auto size-8 text-muted-foreground/30 mb-3" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">No schema markup detected</p>
      </div>
    );
  }

  const validCount = schemas.filter((s) => s.is_valid).length;
  const invalidCount = schemas.length - validCount;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-slate-900/70 backdrop-blur-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/[0.04] px-5 py-4">
        <div className="flex items-center gap-3">
          <Code2 className="size-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="font-heading text-sm font-bold text-foreground">
            Schema Markup
          </h2>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {validCount > 0 && (
            <span className="flex items-center gap-1 text-emerald-400">
              <Check className="size-3" aria-hidden="true" />
              {validCount} valid
            </span>
          )}
          {invalidCount > 0 && (
            <span className="flex items-center gap-1 text-red-400">
              <X className="size-3" aria-hidden="true" />
              {invalidCount} invalid
            </span>
          )}
        </div>
      </div>

      <div className="divide-y divide-white/[0.03]">
        {schemas.map((schema) => {
          const isExpanded = expandedId === schema.id;
          const typeColor = SCHEMA_TYPE_COLORS[schema.schema_type] ?? DEFAULT_SCHEMA_COLOR;

          return (
            <div key={schema.id}>
              <button
                onClick={() => setExpandedId(isExpanded ? null : schema.id)}
                className={cn(
                  "flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors duration-150",
                  "hover:bg-white/[0.02] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500/50",
                )}
                aria-expanded={isExpanded}
              >
                {isExpanded ? (
                  <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
                )}

                <Badge variant="secondary" className={cn("capitalize", typeColor)}>
                  {schema.schema_type}
                </Badge>

                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                  {schema.page_url}
                </span>

                {schema.is_valid ? (
                  <Check className="size-3.5 text-emerald-400 shrink-0" aria-label="Valid" />
                ) : (
                  <X className="size-3.5 text-red-400 shrink-0" aria-label="Invalid" />
                )}
              </button>

              {isExpanded && (
                <div className="mx-5 mb-4 space-y-3">
                  {/* JSON-LD preview */}
                  <div className="overflow-hidden rounded-lg border border-white/[0.06] bg-slate-950/80">
                    <div className="flex items-center justify-between border-b border-white/[0.04] px-4 py-2">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        JSON-LD
                      </span>
                      <a
                        href={buildRichResultsUrl(schema.page_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        Test in Google
                        <ExternalLink className="size-3" aria-hidden="true" />
                      </a>
                    </div>
                    <pre className="overflow-x-auto p-4 text-xs leading-relaxed">
                      <code className="text-slate-300">
                        {highlightJsonLd(formatJsonLd(schema.json_ld))}
                      </code>
                    </pre>
                  </div>

                  {/* Validation errors */}
                  {!schema.is_valid && schema.errors.length > 0 && (
                    <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                      <p className="mb-2 text-xs font-semibold text-red-400">
                        Validation Errors
                      </p>
                      <ul className="space-y-1">
                        {schema.errors.map((error, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-xs text-red-300/80"
                          >
                            <X className="mt-0.5 size-3 shrink-0 text-red-400" aria-hidden="true" />
                            {error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Minimal JSON syntax highlighting via React elements.
 * Keys in emerald, strings in cyan, numbers/booleans in amber, nulls muted.
 */
function highlightJsonLd(json: string): React.ReactNode[] {
  const lines = json.split("\n");
  return lines.map((line, i) => {
    const highlighted = line
      .replace(
        /"([^"]+)"(\s*:)/g,
        '<k>"$1"</k>$2',
      )
      .replace(
        /:\s*"([^"]*)"([,\s]*)/g,
        ': <s>"$1"</s>$2',
      )
      .replace(
        /:\s*(\d+\.?\d*)([,\s]*)/g,
        ': <n>$1</n>$2',
      )
      .replace(
        /:\s*(true|false)([,\s]*)/g,
        ': <n>$1</n>$2',
      )
      .replace(
        /:\s*(null)([,\s]*)/g,
        ': <m>$1</m>$2',
      );

    const parts: React.ReactNode[] = [];
    let remaining = highlighted;
    let partIdx = 0;

    const tagRegex = /<(k|s|n|m)>(.*?)<\/\1>/g;
    let match: RegExpExecArray | null;
    let lastIndex = 0;

    while ((match = tagRegex.exec(remaining)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <span key={`${i}-${partIdx++}`}>{remaining.slice(lastIndex, match.index)}</span>,
        );
      }

      const tag = match[1];
      const content = match[2];
      const colorClass =
        tag === "k"
          ? "text-emerald-400"
          : tag === "s"
            ? "text-cyan-300"
            : tag === "n"
              ? "text-amber-300"
              : "text-slate-500";

      parts.push(
        <span key={`${i}-${partIdx++}`} className={colorClass}>
          {content}
        </span>,
      );

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < remaining.length) {
      parts.push(<span key={`${i}-${partIdx++}`}>{remaining.slice(lastIndex)}</span>);
    }

    return (
      <span key={i}>
        {parts}
        {i < lines.length - 1 && "\n"}
      </span>
    );
  });
}
