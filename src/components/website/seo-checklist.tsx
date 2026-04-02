"use client";

import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SeoChecklistProps {
  title: string;
  metaDescription: string;
  h1: string;
  canonicalUrl: string;
  hasSchema: boolean;
  statusCode: number | null;
  isIndexed: boolean;
  speedScore: number | null;
}

type CheckStatus = "pass" | "fail" | "warn";

interface CheckItem {
  label: string;
  status: CheckStatus;
  detail: string;
}

function getChecks(props: SeoChecklistProps): CheckItem[] {
  const { title, metaDescription, h1, canonicalUrl, hasSchema, statusCode, isIndexed, speedScore } = props;
  const checks: CheckItem[] = [];

  // Title
  if (!title) {
    checks.push({ label: "Title Tag", status: "fail", detail: "Missing — add a title tag" });
  } else if (title.length > 60) {
    checks.push({ label: "Title Tag", status: "warn", detail: `${title.length} chars — may truncate (max 60)` });
  } else if (title.length < 30) {
    checks.push({ label: "Title Tag", status: "warn", detail: `${title.length} chars — consider making longer (30-60)` });
  } else {
    checks.push({ label: "Title Tag", status: "pass", detail: `${title.length} chars — good length` });
  }

  // Meta Description
  if (!metaDescription) {
    checks.push({ label: "Meta Description", status: "fail", detail: "Missing — add a description" });
  } else if (metaDescription.length > 160) {
    checks.push({ label: "Meta Description", status: "warn", detail: `${metaDescription.length} chars — will truncate (max 160)` });
  } else if (metaDescription.length < 70) {
    checks.push({ label: "Meta Description", status: "warn", detail: `${metaDescription.length} chars — too short (aim 120-160)` });
  } else {
    checks.push({ label: "Meta Description", status: "pass", detail: `${metaDescription.length} chars — good length` });
  }

  // H1
  if (!h1) {
    checks.push({ label: "H1 Heading", status: "fail", detail: "Missing — every page needs one H1" });
  } else {
    checks.push({ label: "H1 Heading", status: "pass", detail: "Present" });
  }

  // Canonical
  if (!canonicalUrl) {
    checks.push({ label: "Canonical URL", status: "fail", detail: "Missing — risk of duplicate content" });
  } else {
    checks.push({ label: "Canonical URL", status: "pass", detail: "Set" });
  }

  // Schema
  if (!hasSchema) {
    checks.push({ label: "Structured Data", status: "fail", detail: "No JSON-LD found — add schema markup" });
  } else {
    checks.push({ label: "Structured Data", status: "pass", detail: "JSON-LD present" });
  }

  // Status Code
  if (statusCode === 200) {
    checks.push({ label: "HTTP Status", status: "pass", detail: "200 OK" });
  } else if (statusCode) {
    checks.push({ label: "HTTP Status", status: "fail", detail: `${statusCode} — should be 200` });
  } else {
    checks.push({ label: "HTTP Status", status: "warn", detail: "Unknown" });
  }

  // Indexed
  if (isIndexed) {
    checks.push({ label: "Indexing", status: "pass", detail: "Page is indexed" });
  } else {
    checks.push({ label: "Indexing", status: "warn", detail: "Not indexed by search engines" });
  }

  // Speed
  if (speedScore === null) {
    checks.push({ label: "Page Speed", status: "warn", detail: "No data — run audit" });
  } else if (speedScore >= 80) {
    checks.push({ label: "Page Speed", status: "pass", detail: `${Math.round(speedScore)}/100` });
  } else if (speedScore >= 50) {
    checks.push({ label: "Page Speed", status: "warn", detail: `${Math.round(speedScore)}/100 — needs improvement` });
  } else {
    checks.push({ label: "Page Speed", status: "fail", detail: `${Math.round(speedScore)}/100 — poor` });
  }

  return checks;
}

export function SeoChecklist(props: SeoChecklistProps) {
  const checks = getChecks(props);
  const passCount = checks.filter((c) => c.status === "pass").length;
  const score = Math.round((passCount / checks.length) * 100);

  return (
    <section className="rounded-xl border border-white/[0.06] bg-slate-900/70 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">SEO Checklist</h3>
        <div className={cn(
          "rounded-full px-2.5 py-0.5 text-xs font-bold",
          score >= 80 ? "bg-emerald-400/10 text-emerald-400" :
          score >= 50 ? "bg-amber-400/10 text-amber-400" :
          "bg-red-400/10 text-red-400"
        )}>
          {score}%
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden" role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100} aria-label={`SEO score: ${score}%`}>
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            score >= 80 ? "bg-emerald-400" :
            score >= 50 ? "bg-amber-400" :
            "bg-red-400"
          )}
          style={{ width: `${score}%` }}
        />
      </div>

      {/* Check items */}
      <div className="space-y-1.5">
        {checks.map((check) => (
          <div
            key={check.label}
            className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-white/[0.02] transition-colors"
          >
            {check.status === "pass" ? (
              <CheckCircle className="size-3.5 text-emerald-400 mt-0.5 shrink-0" />
            ) : check.status === "warn" ? (
              <AlertTriangle className="size-3.5 text-amber-400 mt-0.5 shrink-0" />
            ) : (
              <XCircle className="size-3.5 text-red-400 mt-0.5 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="font-medium text-foreground">{check.label}</p>
              <p className="text-muted-foreground">{check.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground/50 text-center">
        {passCount}/{checks.length} checks passing
      </p>
    </section>
  );
}
