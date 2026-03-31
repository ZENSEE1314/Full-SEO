"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  File,
  FileCode,
  FileText,
  FolderOpen,
  Save,
  Loader2,
  Check,
  Wand2,
  Monitor,
  Smartphone,
  Download,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Code,
  Search,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface WebsiteFile {
  id: string;
  file_path: string;
  file_type: string;
  file_size: number;
  source: string;
  github_repo: string | null;
  github_branch: string | null;
}

interface SeoIssue {
  type: string;
  severity: "critical" | "warning" | "info";
  message: string;
  fix?: string;
}

interface FileBrowserProps {
  files: WebsiteFile[];
  clientId: string;
  clientDomain: string;
  onBack: () => void;
  onRefresh: () => void;
}

type RightPanel = "preview" | "seo";

const FILE_ICONS: Record<string, typeof FileCode> = {
  html: FileCode,
  htm: FileCode,
  css: FileText,
  js: FileCode,
  json: FileCode,
  xml: FileCode,
  svg: FileCode,
  md: FileText,
  txt: FileText,
};

function getIcon(type: string) {
  return FILE_ICONS[type] || File;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function buildTree(files: WebsiteFile[]): TreeNode[] {
  const root: TreeNode[] = [];
  const dirs = new Map<string, TreeNode>();

  for (const file of files) {
    const parts = file.file_path.split("/");
    if (parts.length === 1) {
      root.push({ type: "file", name: parts[0], file });
    } else {
      let currentLevel = root;
      let path = "";
      for (let i = 0; i < parts.length - 1; i++) {
        path += (path ? "/" : "") + parts[i];
        let dir = dirs.get(path);
        if (!dir) {
          dir = { type: "dir", name: parts[i], children: [] };
          dirs.set(path, dir);
          currentLevel.push(dir);
        }
        currentLevel = dir.children!;
      }
      currentLevel.push({ type: "file", name: parts[parts.length - 1], file });
    }
  }

  return sortTree(root);
}

function sortTree(nodes: TreeNode[]): TreeNode[] {
  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

interface TreeNode {
  type: "file" | "dir";
  name: string;
  file?: WebsiteFile;
  children?: TreeNode[];
}

export function FileBrowser({ files, clientId, clientDomain, onBack, onRefresh }: FileBrowserProps) {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<WebsiteFile | null>(null);
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [rightPanel, setRightPanel] = useState<RightPanel>("preview");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [seoIssues, setSeoIssues] = useState<SeoIssue[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set([""]));
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const tree = buildTree(files);
  const hasChanges = content !== originalContent;
  const isHtmlFile = selectedFile?.file_type.match(/^(html?|php|jsx|tsx|vue|svelte|astro)$/);

  // Load file content
  const loadFile = useCallback(async (file: WebsiteFile) => {
    setSelectedFile(file);
    setIsLoadingContent(true);
    setSeoIssues([]);
    try {
      const res = await fetch(`/api/website/files?clientId=${clientId}&fileId=${file.id}`);
      // The GET route returns all files; we need to fetch content separately
      // Actually, let's fetch from a dedicated endpoint or include content
      // For now, fetch content via a PATCH-like read
      const contentRes = await fetch(`/api/website/files?clientId=${clientId}`);
      const data = await contentRes.json();
      // We need to get content - let me use a different approach
      // Actually the content is stored in DB, let me add a content endpoint
      // For now, we'll use the file list and fetch content inline
    } catch { /* ignore */ }
    setIsLoadingContent(false);
  }, [clientId]);

  // Fetch file content directly
  const fetchFileContent = useCallback(async (fileId: string) => {
    try {
      const res = await fetch(`/api/website/files?clientId=${clientId}&fileId=${fileId}&withContent=true`);
      const data = await res.json();
      if (res.ok && data.content !== undefined) {
        return data.content as string;
      }
    } catch { /* ignore */ }
    return "";
  }, [clientId]);

  const handleSelectFile = useCallback(async (file: WebsiteFile) => {
    setSelectedFile(file);
    setIsLoadingContent(true);
    setSeoIssues([]);
    setSaveSuccess(false);
    try {
      const fileContent = await fetchFileContent(file.id);
      setContent(fileContent);
      setOriginalContent(fileContent);
    } catch {
      setContent("");
      setOriginalContent("");
    }
    setIsLoadingContent(false);
  }, [fetchFileContent]);

  const handleSave = useCallback(async () => {
    if (!selectedFile || !hasChanges) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/website/files", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: selectedFile.id, clientId, content }),
      });
      if (!res.ok) throw new Error("Save failed");
      setOriginalContent(content);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      onRefresh();
    } catch { /* ignore */ }
    setIsSaving(false);
  }, [selectedFile, hasChanges, clientId, content, onRefresh]);

  const handleAnalyze = useCallback(async () => {
    if (!selectedFile || !isHtmlFile) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/website/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: selectedFile.id,
          clientId,
          content,
          filePath: selectedFile.file_path,
        }),
      });
      const data = await res.json();
      if (res.ok) setSeoIssues(data.issues);
    } catch { /* ignore */ }
    setIsAnalyzing(false);
  }, [selectedFile, isHtmlFile, clientId, content]);

  const handleAutoFix = useCallback(async () => {
    if (!selectedFile || !isHtmlFile) return;
    setIsAutoFixing(true);
    try {
      const res = await fetch("/api/website/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: selectedFile.id,
          clientId,
          content,
          filePath: selectedFile.file_path,
        }),
      });
      const data = await res.json();
      if (res.ok && data.autoFixedContent) {
        setContent(data.autoFixedContent);
        setSeoIssues(data.issues.filter((i: SeoIssue) => !i.fix));
      }
    } catch { /* ignore */ }
    setIsAutoFixing(false);
  }, [selectedFile, isHtmlFile, clientId, content]);

  // Auto-analyze HTML files when selected
  useEffect(() => {
    if (selectedFile && isHtmlFile && content) {
      handleAnalyze();
    }
  }, [selectedFile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDownloadAll = useCallback(async () => {
    // Trigger download of all files as individual downloads
    // In a real app you'd zip them; for now download current file
    if (!selectedFile || !content) return;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = selectedFile.file_path.split("/").pop() || "file.html";
    a.click();
    URL.revokeObjectURL(url);
  }, [selectedFile, content]);

  const handleDeleteAll = useCallback(async () => {
    if (!confirm("Delete all uploaded files? This cannot be undone.")) return;
    try {
      await fetch("/api/website/files", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, deleteAll: true }),
      });
      onRefresh();
      onBack();
    } catch { /* ignore */ }
  }, [clientId, onRefresh, onBack]);

  const toggleDir = (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  };

  const filteredFiles = search
    ? files.filter((f) => f.file_path.toLowerCase().includes(search.toLowerCase()))
    : null;

  const criticalCount = seoIssues.filter((i) => i.severity === "critical").length;
  const warningCount = seoIssues.filter((i) => i.severity === "warning").length;
  const fixableCount = seoIssues.filter((i) => i.fix).length;

  return (
    <div className="space-y-4 animate-[fade-in_0.3s_ease-out_both]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBack} className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors">
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-foreground">Website Files</h2>
            <p className="text-xs text-muted-foreground">{files.length} files loaded</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedFile && (
            <Button variant="outline" size="sm" onClick={handleDownloadAll} className="gap-1.5 text-xs">
              <Download className="size-3" /> Download
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleDeleteAll} className="gap-1.5 text-xs text-red-400 hover:text-red-300">
            <Trash2 className="size-3" /> Clear All
          </Button>
        </div>
      </div>

      {/* Main layout: file tree | editor | preview/seo */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12" style={{ minHeight: "70vh" }}>
        {/* File tree sidebar */}
        <div className="lg:col-span-2 rounded-xl border border-white/[0.06] bg-slate-900/70 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-white/[0.04]">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Filter..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-7 w-full rounded-md bg-white/[0.04] pl-7 pr-2 text-xs text-foreground placeholder:text-muted-foreground/40 outline-none"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-1.5 text-xs">
            {filteredFiles ? (
              filteredFiles.map((f) => (
                <FileItem
                  key={f.id}
                  file={f}
                  isSelected={selectedFile?.id === f.id}
                  onClick={() => handleSelectFile(f)}
                />
              ))
            ) : (
              <TreeView
                nodes={tree}
                selectedId={selectedFile?.id ?? null}
                expandedDirs={expandedDirs}
                onToggleDir={toggleDir}
                onSelectFile={handleSelectFile}
                path=""
              />
            )}
          </div>
        </div>

        {/* Code editor */}
        <div className="lg:col-span-5 rounded-xl border border-white/[0.06] bg-slate-900/70 overflow-hidden flex flex-col">
          {selectedFile ? (
            <>
              {/* Editor header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.04] bg-black/20">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-mono text-foreground truncate">{selectedFile.file_path}</span>
                  {hasChanges && <span className="size-2 rounded-full bg-amber-400 shrink-0" title="Unsaved changes" />}
                </div>
                <div className="flex items-center gap-1.5">
                  {isHtmlFile && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                        className="gap-1 text-[11px] h-7 px-2"
                      >
                        {isAnalyzing ? <Loader2 className="size-3 animate-spin" /> : <Search className="size-3" />}
                        Scan
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAutoFix}
                        disabled={isAutoFixing}
                        className="gap-1 text-[11px] h-7 px-2"
                      >
                        {isAutoFixing ? <Loader2 className="size-3 animate-spin" /> : <Wand2 className="size-3" />}
                        Auto-Fix
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving || !hasChanges}
                    className="gap-1 text-[11px] h-7 px-2"
                  >
                    {isSaving ? <Loader2 className="size-3 animate-spin" /> : saveSuccess ? <Check className="size-3" /> : <Save className="size-3" />}
                    {saveSuccess ? "Saved" : "Save"}
                  </Button>
                </div>
              </div>
              {/* Editor body */}
              {isLoadingContent ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  spellCheck={false}
                  className="flex-1 w-full bg-transparent p-4 text-xs font-mono text-emerald-300 outline-none resize-none leading-relaxed"
                  style={{ tabSize: 2 }}
                />
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/40">
              <Code className="size-10 mb-3" />
              <p className="text-sm">Select a file to edit</p>
            </div>
          )}
        </div>

        {/* Right panel: preview or SEO */}
        <div className="lg:col-span-5 rounded-xl border border-white/[0.06] bg-slate-900/70 overflow-hidden flex flex-col">
          {/* Panel tabs */}
          <div className="flex items-center gap-1 px-2 py-1.5 border-b border-white/[0.04] bg-black/20">
            <button
              onClick={() => setRightPanel("preview")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                rightPanel === "preview" ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Eye className="size-3" /> Preview
            </button>
            <button
              onClick={() => setRightPanel("seo")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                rightPanel === "seo" ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Search className="size-3" /> SEO
              {seoIssues.length > 0 && (
                <span className={cn(
                  "rounded-full px-1.5 text-[10px]",
                  criticalCount > 0 ? "bg-red-400/20 text-red-400" : "bg-amber-400/20 text-amber-400"
                )}>
                  {seoIssues.length}
                </span>
              )}
            </button>
            {rightPanel === "preview" && (
              <div className="ml-auto flex rounded-md border border-white/[0.06] overflow-hidden">
                <button
                  onClick={() => setPreviewMode("desktop")}
                  className={cn("px-1.5 py-0.5", previewMode === "desktop" ? "bg-white/10 text-foreground" : "text-muted-foreground")}
                >
                  <Monitor className="size-3" />
                </button>
                <button
                  onClick={() => setPreviewMode("mobile")}
                  className={cn("px-1.5 py-0.5", previewMode === "mobile" ? "bg-white/10 text-foreground" : "text-muted-foreground")}
                >
                  <Smartphone className="size-3" />
                </button>
              </div>
            )}
            {rightPanel === "seo" && isHtmlFile && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="ml-auto gap-1 text-[11px] h-6 px-2"
              >
                <RefreshCw className={cn("size-3", isAnalyzing && "animate-spin")} />
                Re-scan
              </Button>
            )}
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-auto">
            {rightPanel === "preview" ? (
              selectedFile && isHtmlFile ? (
                <div className={cn("mx-auto", previewMode === "mobile" ? "max-w-[375px]" : "w-full")}>
                  <iframe
                    srcDoc={content}
                    title="Preview"
                    className="w-full border-0"
                    style={{ minHeight: "60vh" }}
                    sandbox="allow-same-origin"
                  />
                </div>
              ) : selectedFile ? (
                <pre className="p-4 text-xs font-mono text-foreground/70 whitespace-pre-wrap">{content.slice(0, 5000)}</pre>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground/40">
                  <p className="text-sm">Select a file to preview</p>
                </div>
              )
            ) : (
              <div className="p-4 space-y-4">
                {!selectedFile || !isHtmlFile ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Select an HTML file to analyze for SEO issues
                  </p>
                ) : seoIssues.length === 0 ? (
                  <div className="flex flex-col items-center py-8">
                    <CheckCircle className="size-8 text-emerald-400 mb-2" />
                    <p className="text-sm text-emerald-400 font-medium">All SEO checks passed!</p>
                    <p className="text-xs text-muted-foreground mt-1">No issues found in this file</p>
                  </div>
                ) : (
                  <>
                    {/* Summary */}
                    <div className="flex gap-3">
                      {criticalCount > 0 && (
                        <div className="rounded-lg bg-red-400/10 border border-red-400/20 px-3 py-1.5 text-xs text-red-400">
                          {criticalCount} critical
                        </div>
                      )}
                      {warningCount > 0 && (
                        <div className="rounded-lg bg-amber-400/10 border border-amber-400/20 px-3 py-1.5 text-xs text-amber-400">
                          {warningCount} warning
                        </div>
                      )}
                      {fixableCount > 0 && (
                        <div className="rounded-lg bg-emerald-400/10 border border-emerald-400/20 px-3 py-1.5 text-xs text-emerald-400">
                          {fixableCount} auto-fixable
                        </div>
                      )}
                    </div>

                    {fixableCount > 0 && (
                      <Button
                        size="sm"
                        onClick={handleAutoFix}
                        disabled={isAutoFixing}
                        className="gap-1.5 w-full"
                      >
                        {isAutoFixing ? <Loader2 className="size-3 animate-spin" /> : <Wand2 className="size-3" />}
                        Auto-Fix {fixableCount} Issue{fixableCount !== 1 ? "s" : ""}
                      </Button>
                    )}

                    {/* Issues list */}
                    <div className="space-y-2">
                      {seoIssues.map((issue, i) => (
                        <div
                          key={i}
                          className={cn(
                            "rounded-lg border px-3 py-2.5 text-xs",
                            issue.severity === "critical"
                              ? "border-red-500/20 bg-red-500/5"
                              : issue.severity === "warning"
                              ? "border-amber-500/20 bg-amber-500/5"
                              : "border-blue-500/20 bg-blue-500/5"
                          )}
                        >
                          <div className="flex items-start gap-2">
                            {issue.severity === "critical" ? (
                              <XCircle className="size-3.5 text-red-400 mt-0.5 shrink-0" />
                            ) : issue.severity === "warning" ? (
                              <AlertTriangle className="size-3.5 text-amber-400 mt-0.5 shrink-0" />
                            ) : (
                              <AlertTriangle className="size-3.5 text-blue-400 mt-0.5 shrink-0" />
                            )}
                            <div>
                              <p className="font-medium text-foreground">{formatIssueType(issue.type)}</p>
                              <p className="text-muted-foreground mt-0.5">{issue.message}</p>
                              {issue.fix && (
                                <span className="inline-block mt-1 rounded bg-emerald-400/10 px-1.5 py-0.5 text-[10px] text-emerald-400">
                                  Auto-fixable
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FileItem({ file, isSelected, onClick }: { file: WebsiteFile; isSelected: boolean; onClick: () => void }) {
  const Icon = getIcon(file.file_type);
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 w-full rounded-md px-2 py-1 text-left transition-colors",
        isSelected ? "bg-emerald-500/20 text-emerald-400" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
      )}
    >
      <Icon className="size-3 shrink-0" />
      <span className="truncate">{file.file_path}</span>
    </button>
  );
}

function TreeView({
  nodes,
  selectedId,
  expandedDirs,
  onToggleDir,
  onSelectFile,
  path,
}: {
  nodes: TreeNode[];
  selectedId: string | null;
  expandedDirs: Set<string>;
  onToggleDir: (path: string) => void;
  onSelectFile: (file: WebsiteFile) => void;
  path: string;
}) {
  return (
    <div className="space-y-0.5">
      {nodes.map((node) => {
        const nodePath = path ? `${path}/${node.name}` : node.name;
        if (node.type === "dir") {
          const isExpanded = expandedDirs.has(nodePath);
          return (
            <div key={nodePath}>
              <button
                onClick={() => onToggleDir(nodePath)}
                className="flex items-center gap-1.5 w-full rounded-md px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
              >
                <FolderOpen className="size-3 shrink-0 text-amber-400/70" />
                <span className="truncate">{node.name}</span>
              </button>
              {isExpanded && node.children && (
                <div className="ml-3 border-l border-white/[0.04] pl-1">
                  <TreeView
                    nodes={node.children}
                    selectedId={selectedId}
                    expandedDirs={expandedDirs}
                    onToggleDir={onToggleDir}
                    onSelectFile={onSelectFile}
                    path={nodePath}
                  />
                </div>
              )}
            </div>
          );
        }

        const Icon = getIcon(node.file?.file_type ?? "txt");
        const isSelected = node.file?.id === selectedId;
        return (
          <button
            key={nodePath}
            onClick={() => node.file && onSelectFile(node.file)}
            className={cn(
              "flex items-center gap-1.5 w-full rounded-md px-2 py-1 text-left transition-colors",
              isSelected ? "bg-emerald-500/20 text-emerald-400" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            )}
          >
            <Icon className="size-3 shrink-0" />
            <span className="truncate">{node.name}</span>
          </button>
        );
      })}
    </div>
  );
}

function formatIssueType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
