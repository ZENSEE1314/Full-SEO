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

const KeywordSchema = z.object({
  keyword: z.string().min(1, "Keyword is required").max(500),
});

type FieldErrors = Partial<Record<"keyword" | "root", string>>;

interface AddKeywordDialogProps {
  clientId: string;
}

export function AddKeywordDialog({ clientId }: AddKeywordDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<FieldErrors>({});

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const rawKeywords = (formData.get("keyword") as string).trim();

    if (!rawKeywords) {
      setErrors({ keyword: "Enter at least one keyword" });
      return;
    }

    // Support comma-separated or newline-separated keywords
    const keywords = rawKeywords
      .split(/[,\n]/)
      .map((k) => k.trim())
      .filter(Boolean);

    if (keywords.length === 0) {
      setErrors({ keyword: "Enter at least one keyword" });
      return;
    }

    setErrors({});

    startTransition(async () => {
      try {
        const res = await fetch(`/api/clients/${clientId}/keywords`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keywords }),
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
    if (!open) setErrors({});
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button size="default">
            <Plus className="size-4" data-icon="inline-start" aria-hidden="true" />
            Add Keywords
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add keywords to track</DialogTitle>
          <DialogDescription>
            Enter keywords separated by commas or new lines.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="keyword-input">Keywords</Label>
            <textarea
              id="keyword-input"
              name="keyword"
              rows={4}
              placeholder={"best running shoes\nrunning shoes review\ntrail running gear"}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 resize-none"
              aria-invalid={!!errors.keyword}
              aria-describedby={errors.keyword ? "kw-error" : undefined}
            />
            {errors.keyword && (
              <p id="kw-error" className="text-xs text-destructive">
                {errors.keyword}
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
              {isPending ? "Adding..." : "Add Keywords"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
