"use client";

import { useState } from "react";
import { PagesList } from "./pages-list";
import { PageEditor } from "./page-editor";

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

interface WebsiteContentProps {
  pages: Page[];
  issues: Record<string, unknown>[];
  schemas: Record<string, unknown>[];
  clientId: string;
  clientDomain: string;
}

export function WebsiteContent({ pages, issues, schemas, clientId, clientDomain }: WebsiteContentProps) {
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

  const selectedPage = pages.find((p) => p.id === selectedPageId) ?? null;

  const pageIssues = selectedPageId
    ? issues.filter((i) => (i as { page_id: string }).page_id === selectedPageId)
    : [];

  const pageSchemas = selectedPageId
    ? schemas.filter((s) => (s as { page_id: string }).page_id === selectedPageId)
    : [];

  if (selectedPage) {
    return (
      <PageEditor
        page={selectedPage}
        issues={pageIssues}
        schemas={pageSchemas}
        clientId={clientId}
        clientDomain={clientDomain}
        onBack={() => setSelectedPageId(null)}
      />
    );
  }

  return (
    <PagesList
      pages={pages}
      issues={issues}
      onSelectPage={setSelectedPageId}
    />
  );
}
