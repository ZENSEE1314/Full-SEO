"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface DangerZoneProps {
  clientId: string;
  clientName: string;
}

export function DangerZone({ clientId, clientName }: DangerZoneProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isConfirmed = confirmation === clientName;

  function handleArchive() {
    if (!isConfirmed) return;

    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/clients/${clientId}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Failed to archive");
          return;
        }

        setIsOpen(false);
        router.push("/clients");
        router.refresh();
      } catch {
        setError("Network error. Please try again.");
      }
    });
  }

  return (
    <section className="rounded-xl border border-red-500/20 bg-red-500/[0.03] p-5">
      <h2 className="flex items-center gap-2 font-heading text-sm font-bold text-red-400 mb-3">
        <AlertTriangle className="size-4" aria-hidden="true" />
        Danger Zone
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Archiving a client will hide it from your dashboard. This action can be
        reversed by an admin.
      </p>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger
          render={
            <Button variant="destructive" size="default">
              Archive Client
            </Button>
          }
        />
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archive {clientName}?</DialogTitle>
            <DialogDescription>
              This will soft-delete the client and hide all associated data.
              Type <strong className="text-foreground">{clientName}</strong> to
              confirm.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <Input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={clientName}
              aria-label="Type client name to confirm"
            />

            {error && (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="destructive"
              disabled={!isConfirmed || isPending}
              onClick={handleArchive}
            >
              {isPending ? "Archiving..." : "Archive Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
