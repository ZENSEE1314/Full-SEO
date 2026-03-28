"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const ClientFormSchema = z.object({
  name: z.string().min(1, "Client name is required").max(255),
  domain: z
    .string()
    .min(1, "Domain is required")
    .max(255)
    .refine(
      (val) => /^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(
        val.replace(/^https?:\/\//, "").replace(/\/+$/, ""),
      ),
      "Enter a valid domain (e.g. example.com)",
    ),
});

type FieldErrors = Partial<Record<"name" | "domain" | "root", string>>;

export function AddClientDialog() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<FieldErrors>({});

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = (formData.get("name") as string).trim();
    const domain = (formData.get("domain") as string).trim();

    const result = ClientFormSchema.safeParse({ name, domain });
    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FieldErrors;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});

    startTransition(async () => {
      try {
        const res = await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, domain }),
        });

        if (!res.ok) {
          const data = await res.json();
          setErrors({ root: data.error ?? "Something went wrong" });
          return;
        }

        setIsOpen(false);
        router.refresh();
      } catch {
        setErrors({ root: "Network error. Please try again." });
      }
    });
  }

  function handleOpenChange(open: boolean) {
    setIsOpen(open);
    if (!open) {
      setErrors({});
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button size="default">
            <Plus className="size-4" data-icon="inline-start" aria-hidden="true" />
            Add Client
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add new client</DialogTitle>
          <DialogDescription>
            Enter the client name and their website domain to start tracking.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="client-name">Client name</Label>
            <Input
              id="client-name"
              name="name"
              placeholder="Acme Corp"
              autoComplete="organization"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "name-error" : undefined}
            />
            {errors.name && (
              <p id="name-error" className="text-xs text-destructive">
                {errors.name}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="client-domain">Domain</Label>
            <Input
              id="client-domain"
              name="domain"
              placeholder="acme.com"
              autoComplete="url"
              aria-invalid={!!errors.domain}
              aria-describedby={errors.domain ? "domain-error" : undefined}
            />
            {errors.domain && (
              <p id="domain-error" className="text-xs text-destructive">
                {errors.domain}
              </p>
            )}
          </div>

          {errors.root && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {errors.root}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create Client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
