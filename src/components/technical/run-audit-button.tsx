"use client";

import { useState, useTransition } from "react";
import { Radar, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface RunAuditButtonProps {
  clientId: string;
}

export function RunAuditButton({ clientId }: RunAuditButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function handleRunAudit() {
    setStatus("running");
    setErrorMsg(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/technical/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId }),
        });

        if (response.ok) {
          setStatus("done");
          window.location.reload();
        } else {
          const data = await response.json().catch(() => ({}));
          setErrorMsg(data.error ?? `Failed (${response.status})`);
          setStatus("error");
          setTimeout(() => setStatus("idle"), 5000);
        }
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Network error");
        setStatus("error");
        setTimeout(() => setStatus("idle"), 5000);
      }
    });
  }

  const isDisabled = isPending || status === "running";

  return (
    <div>
      <Button
        onClick={handleRunAudit}
        disabled={isDisabled}
        size="lg"
        className="gap-2"
      >
        {status === "running" ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Radar className="size-4" aria-hidden="true" />
        )}
        {status === "running"
          ? "Running Audit..."
          : status === "done"
            ? "Audit Complete"
            : status === "error"
              ? "Audit Failed"
              : "Run Audit"}
      </Button>
      {errorMsg && status === "error" && (
        <p className="text-xs text-red-400 mt-2">{errorMsg}</p>
      )}
    </div>
  );
}
