"use client";

import { useEffect } from "react";

export default function TechnicalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[technical] Page error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-8 max-w-lg text-center">
        <h2 className="text-lg font-bold text-red-400 mb-2">Technical SEO Error</h2>
        <p className="text-sm text-muted-foreground mb-2">{error.message}</p>
        <pre className="text-xs text-red-300/60 mb-4 overflow-auto max-h-40 text-left bg-black/20 p-3 rounded-lg">
          {error.stack}
        </pre>
        <button
          onClick={reset}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
