"use client";

import { useState, useCallback } from "react";
import { Loader2, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface GithubConnectProps {
  clientId: string;
  onConnected: () => void;
}

export function GithubConnect({ clientId, onConnected }: GithubConnectProps) {
  const [repoUrl, setRepoUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ fetched: number; total: number } | null>(null);

  const handleConnect = useCallback(async () => {
    if (!repoUrl.trim()) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/website/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          repoUrl: repoUrl.trim(),
          branch: branch.trim() || "main",
          token: token.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to connect");
      setResult({ fetched: data.fetched, total: data.total });
      onConnected();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setIsLoading(false);
    }
  }, [clientId, repoUrl, branch, token, onConnected]);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-slate-900/70 p-5 space-y-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
        </svg>
        Import from GitHub
      </h3>
      <p className="text-xs text-muted-foreground">
        Connect a GitHub repository to import website files. Public repos work without a token.
      </p>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <label htmlFor="repo-url" className="text-xs font-medium text-muted-foreground">
            Repository URL
          </label>
          <Input
            id="repo-url"
            placeholder="https://github.com/owner/repo or owner/repo"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            className="text-sm font-mono"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="branch" className="text-xs font-medium text-muted-foreground">
              Branch
            </label>
            <Input
              id="branch"
              placeholder="main"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="gh-token" className="text-xs font-medium text-muted-foreground">
              Token <span className="text-muted-foreground/50">(optional)</span>
            </label>
            <Input
              id="gh-token"
              type="password"
              placeholder="ghp_xxxxx"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="text-sm font-mono"
            />
          </div>
        </div>

        <Button
          size="sm"
          onClick={handleConnect}
          disabled={isLoading || !repoUrl.trim()}
          className="gap-1.5 w-full"
        >
          {isLoading ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
          {isLoading ? "Importing files..." : "Import from GitHub"}
        </Button>
      </div>

      {result && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
          Imported {result.fetched} of {result.total} files successfully
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400 flex items-start gap-1.5">
          <AlertTriangle className="size-3 mt-0.5 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
