"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Mail, MessageCircle, Layers } from "lucide-react";
import type { Client } from "@/types";

interface CreateSequenceDialogProps {
  clients: Client[];
}

export function CreateSequenceDialog({ clients }: CreateSequenceDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<"email" | "whatsapp" | "both">("email");
  const [clientId, setClientId] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleCreate = useCallback(() => {
    if (!name.trim() || !clientId) return;

    startTransition(async () => {
      try {
        const response = await fetch("/api/outreach/sequences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            channel,
            client_id: clientId,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setIsOpen(false);
          setName("");
          setChannel("email");
          setClientId("");
          router.push(`/outreach/sequences/${data.id}`);
          router.refresh();
        }
      } catch {
        // Creation failed
      }
    });
  }, [name, channel, clientId, router]);

  const CHANNEL_OPTIONS = [
    { value: "email", label: "Email", icon: Mail },
    { value: "whatsapp", label: "WhatsApp", icon: MessageCircle },
    { value: "both", label: "Both", icon: Layers },
  ] as const;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={<Button className="gap-1.5" />}
      >
        <Plus className="size-4" data-icon="inline-start" />
        New Sequence
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Outreach Sequence</DialogTitle>
          <DialogDescription>
            Set up a new outreach sequence for your client. You can add steps
            after creation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="sequence-name">Sequence name</Label>
            <Input
              id="sequence-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Guest post outreach - Q1"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Channel</Label>
            <div className="grid grid-cols-3 gap-2">
              {CHANNEL_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isActive = channel === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setChannel(opt.value as typeof channel)}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-all ${
                      isActive
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                        : "border-white/[0.06] bg-slate-900/50 text-muted-foreground hover:border-white/[0.12] hover:text-foreground"
                    }`}
                    type="button"
                  >
                    <Icon className="size-4" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Client</Label>
            <Select value={clientId} onValueChange={(val) => val && setClientId(val)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || !clientId || isPending}
          >
            {isPending ? "Creating..." : "Create Sequence"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
