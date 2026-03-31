"use client";

import dynamic from "next/dynamic";

const VitalsCards = dynamic(
  () => import("@/components/technical/vitals-cards").then((m) => m.VitalsCards),
  { ssr: false, loading: () => <div className="h-32 rounded-xl bg-slate-900/50 animate-pulse" /> },
);

const IssuesPanel = dynamic(
  () => import("@/components/technical/issues-panel").then((m) => m.IssuesPanel),
  { ssr: false, loading: () => <div className="h-64 rounded-xl bg-slate-900/50 animate-pulse" /> },
);

const PagesTable = dynamic(
  () => import("@/components/technical/pages-table").then((m) => m.PagesTable),
  { ssr: false, loading: () => <div className="h-48 rounded-xl bg-slate-900/50 animate-pulse" /> },
);

const SpeedChart = dynamic(
  () => import("@/components/technical/speed-chart").then((m) => m.SpeedChart),
  { ssr: false, loading: () => <div className="h-64 rounded-xl bg-slate-900/50 animate-pulse" /> },
);

const SchemaViewer = dynamic(
  () => import("@/components/technical/schema-viewer").then((m) => m.SchemaViewer),
  { ssr: false, loading: () => <div className="h-32 rounded-xl bg-slate-900/50 animate-pulse" /> },
);

interface TechnicalContentProps {
  vitals: { lcp: number | null; fid: number | null; cls: number | null; ttfb: number | null };
  vitalsHistory: { lcp: number[]; fid: number[]; cls: number[]; ttfb: number[] };
  totalIssues: number;
  pages: Record<string, unknown>[];
  issues: Record<string, unknown>[];
  speedHistory: Record<string, unknown>[];
  schemas: Record<string, unknown>[];
  clientId: string;
}

export function TechnicalContent({
  vitals,
  vitalsHistory,
  totalIssues,
  pages,
  issues,
  speedHistory,
  schemas,
  clientId,
}: TechnicalContentProps) {
  return (
    <>
      <section className="animate-[slide-up_0.4s_ease-out_0.1s_both]">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Core Web Vitals
        </h2>
        <VitalsCards vitals={vitals} history={vitalsHistory} />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 animate-[slide-up_0.4s_ease-out_0.2s_both]">
        <IssuesPanel issues={issues as never[]} clientId={clientId} />
        <div className="flex flex-col gap-6">
          <SpeedChart records={speedHistory as never[]} />
          <SchemaViewer schemas={schemas as never[]} />
        </div>
      </div>

      <section className="animate-[slide-up_0.4s_ease-out_0.3s_both]">
        <PagesTable pages={pages as never[]} />
      </section>
    </>
  );
}
