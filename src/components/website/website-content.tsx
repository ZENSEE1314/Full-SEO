"use client";

import { useState, useEffect } from "react";
import { PagesList } from "./pages-list";
import { PageEditor } from "./page-editor";
import { FileUpload } from "./file-upload";
import { GithubConnect } from "./github-connect";
import { FileBrowser } from "./file-browser";

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

interface WebsiteFile {
  id: string;
  file_path: string;
  file_type: string;
  file_size: number;
  source: string;
  github_repo: string | null;
  github_branch: string | null;
}

interface WebsiteContentProps {
  pages: Page[];
  issues: Record<string, unknown>[];
  schemas: Record<string, unknown>[];
  clientId: string;
  clientDomain: string;
  initialFiles: WebsiteFile[];
}

type View = "overview" | "seo-editor" | "file-editor";

export function WebsiteContent({ pages, issues, schemas, clientId, clientDomain, initialFiles }: WebsiteContentProps) {
  const [view, setView] = useState<View>(initialFiles.length > 0 ? "file-editor" : "overview");
  const [files, setFiles] = useState<WebsiteFile[]>(initialFiles);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

  const selectedPage = pages.find((p) => p.id === selectedPageId) ?? null;
  const pageIssues = selectedPageId
    ? issues.filter((i) => (i as { page_id: string }).page_id === selectedPageId)
    : [];
  const pageSchemas = selectedPageId
    ? schemas.filter((s) => (s as { page_id: string }).page_id === selectedPageId)
    : [];

  const refreshFiles = async () => {
    try {
      const res = await fetch(`/api/website/files?clientId=${clientId}`);
      const data = await res.json();
      if (res.ok) setFiles(data.files);
    } catch { /* ignore */ }
  };

  // When in SEO editor viewing a specific page
  if (view === "seo-editor" && selectedPage) {
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

  // File editor view
  if (view === "file-editor" && files.length > 0) {
    return (
      <FileBrowser
        files={files}
        clientId={clientId}
        clientDomain={clientDomain}
        onBack={() => setView("overview")}
        onRefresh={refreshFiles}
      />
    );
  }

  // Overview: show tabs for upload/github, SEO editor, file browser
  return (
    <div className="space-y-6 animate-[slide-up_0.4s_ease-out_0.1s_both]">
      {/* View Switcher */}
      <div className="flex gap-2 overflow-x-auto">
        <button
          onClick={() => setView("overview")}
          className={viewTabClass(view === "overview")}
        >
          Upload / Connect
        </button>
        {pages.length > 0 && (
          <button
            onClick={() => { setView("seo-editor"); setSelectedPageId(null); }}
            className={viewTabClass(view === "seo-editor")}
          >
            SEO Editor ({pages.length} pages)
          </button>
        )}
        {files.length > 0 && (
          <button
            onClick={() => setView("file-editor")}
            className={viewTabClass(view === "file-editor")}
          >
            File Editor ({files.length} files)
          </button>
        )}
      </div>

      {/* SEO Editor pages list */}
      {view === "seo-editor" && pages.length > 0 && (
        <PagesList pages={pages} issues={issues} onSelectPage={(id) => { setSelectedPageId(id); }} />
      )}

      {/* Upload / Connect view */}
      {view === "overview" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <FileUpload
            clientId={clientId}
            onUploaded={() => { refreshFiles(); setView("file-editor"); }}
          />
          <GithubConnect
            clientId={clientId}
            onConnected={() => { refreshFiles(); setView("file-editor"); }}
          />
        </div>
      )}
    </div>
  );
}

function viewTabClass(isActive: boolean): string {
  return [
    "shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
      : "text-muted-foreground border border-white/[0.06] hover:text-foreground hover:bg-white/5",
  ].join(" ");
}
