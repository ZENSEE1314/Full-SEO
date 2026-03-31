"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, File, Loader2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FileUploadProps {
  clientId: string;
  onUploaded: () => void;
}

const ALLOWED_TYPES = new Set([
  "text/html", "text/css", "text/javascript", "application/javascript",
  "application/json", "text/xml", "application/xml", "image/svg+xml",
  "text/plain", "text/markdown",
]);

const ALLOWED_EXTENSIONS = new Set([
  "html", "htm", "css", "js", "jsx", "ts", "tsx", "json", "xml",
  "svg", "txt", "md", "php", "vue", "svelte", "astro",
]);

function getFileType(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "txt";
  return ext;
}

export function FileUpload({ clientId, onUploaded }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Array<{ name: string; content: string; type: string }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (fileList: FileList) => {
    setError(null);
    const processed: Array<{ name: string; content: string; type: string }> = [];

    for (const file of Array.from(fileList)) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!ALLOWED_EXTENSIONS.has(ext)) continue;
      if (file.size > 500_000) continue; // 500KB max

      try {
        const content = await file.text();
        processed.push({
          name: file.webkitRelativePath || file.name,
          content,
          type: getFileType(file.name),
        });
      } catch { /* skip unreadable files */ }
    }

    if (processed.length === 0) {
      setError("No supported files found. Supported: HTML, CSS, JS, JSON, XML, SVG, TXT, MD");
      return;
    }

    setSelectedFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name));
      return [...prev, ...processed.filter((f) => !existing.has(f.name))];
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  const handleUpload = useCallback(async () => {
    if (selectedFiles.length === 0) return;
    setIsUploading(true);
    setError(null);
    try {
      const res = await fetch("/api/website/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          files: selectedFiles.map((f) => ({
            path: f.name,
            content: f.content,
            type: f.type,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setSelectedFiles([]);
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }, [selectedFiles, clientId, onUploaded]);

  const removeFile = (name: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.name !== name));
  };

  return (
    <div className="rounded-xl border border-white/[0.06] bg-slate-900/70 p-5 space-y-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Upload className="size-4 text-emerald-400" />
        Upload Website Files
      </h3>
      <p className="text-xs text-muted-foreground">
        Drag & drop your HTML, CSS, JS files or select a folder. Max 500KB per file.
      </p>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 cursor-pointer transition-colors",
          isDragging
            ? "border-emerald-400/50 bg-emerald-400/5"
            : "border-white/[0.1] bg-white/[0.02] hover:border-white/[0.2] hover:bg-white/[0.04]"
        )}
      >
        <Upload className={cn("size-8 mb-3", isDragging ? "text-emerald-400" : "text-muted-foreground/40")} />
        <p className="text-sm text-muted-foreground">
          {isDragging ? "Drop files here" : "Click to browse or drag files here"}
        </p>
        <p className="text-xs text-muted-foreground/50 mt-1">
          HTML, CSS, JS, JSON, XML, SVG, MD
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".html,.htm,.css,.js,.jsx,.ts,.tsx,.json,.xml,.svg,.txt,.md,.php,.vue,.svelte,.astro"
          className="hidden"
          onChange={(e) => e.target.files && processFiles(e.target.files)}
        />
      </div>

      {/* Selected files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{selectedFiles.length} file(s) selected</p>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {selectedFiles.map((f) => (
              <div key={f.name} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-1.5 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <File className="size-3 text-muted-foreground shrink-0" />
                  <span className="text-foreground truncate">{f.name}</span>
                  <span className="text-muted-foreground/50 shrink-0">.{f.type}</span>
                </div>
                <button onClick={() => removeFile(f.name)} className="text-muted-foreground hover:text-red-400 shrink-0 ml-2">
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
          <Button size="sm" onClick={handleUpload} disabled={isUploading} className="gap-1.5 w-full">
            {isUploading ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
            {isUploading ? "Uploading..." : `Upload ${selectedFiles.length} File(s)`}
          </Button>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
