"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Client } from "@/types";

interface ClientSettingsFormProps {
  client: Client;
}

export function ClientSettingsForm({ client }: ClientSettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = (formData.get("name") as string).trim();
    const domain = (formData.get("domain") as string).trim();

    if (!name || !domain) {
      setMessage({ type: "error", text: "Name and domain are required." });
      return;
    }

    setMessage(null);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/clients/${client.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, domain }),
        });

        if (!res.ok) {
          const data = await res.json();
          setMessage({
            type: "error",
            text: data.error ?? "Failed to save",
          });
          return;
        }

        setMessage({ type: "success", text: "Settings saved." });
        router.refresh();
      } catch {
        setMessage({ type: "error", text: "Network error. Please try again." });
      }
    });
  }

  return (
    <section className="rounded-xl border border-white/[0.06] bg-slate-900/70 backdrop-blur-sm p-5">
      <h2 className="font-heading text-sm font-bold text-foreground mb-5">
        Client Information
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="settings-name">Client name</Label>
            <Input
              id="settings-name"
              name="name"
              defaultValue={client.name}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="settings-domain">Domain</Label>
            <Input
              id="settings-domain"
              name="domain"
              defaultValue={client.domain}
            />
          </div>
        </div>

        {message && (
          <p
            className={
              message.type === "success"
                ? "rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400"
                : "rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
            }
            role={message.type === "error" ? "alert" : "status"}
          >
            {message.text}
          </p>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </section>
  );
}
