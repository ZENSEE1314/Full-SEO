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

  function handleRunAudit() {
    setStatus("running");

    startTransition(async () => {
      try {
        const response = await fetch("/api/technical/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId }),
        });

        if (response.ok) {
          setStatus("done");
          setTimeout(() => setStatus("idle"), 3000);
        } else {
          setStatus("error");
          setTimeout(() => setStatus("idle"), 3000);
        }
      } catch {
        setStatus("error");
        setTimeout(() => setStatus("idle"), 3000);
      }
    });
  }

  const isDisabled = isPending || status === "running";

  return (
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
          ? "Audit Triggered"
          : status === "error"
            ? "Audit Failed"
            : "Run Audit"}
    </Button>
  );
}
