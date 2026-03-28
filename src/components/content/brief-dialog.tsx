"use client";

import * as React from "react";
import { X, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ClientOption {
  id: string;
  name: string;
}

interface KeywordOption {
  id: string;
  keyword: string;
  client_id: string;
}

interface BriefDialogProps {
  clients: ClientOption[];
  keywords: KeywordOption[];
  trigger: React.ReactNode;
  onSubmit: (data: {
    title: string;
    client_id: string;
    target_keyword_id: string | null;
    secondary_keywords: string[];
    brief_text: string;
    source: "manual" | "trend" | "gap_analysis";
  }) => void;
}

export function BriefDialog({ clients, keywords, trigger, onSubmit }: BriefDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [clientId, setClientId] = React.useState<string>("");
  const [targetKeywordId, setTargetKeywordId] = React.useState<string>("");
  const [secondaryInput, setSecondaryInput] = React.useState("");
  const [secondaryKeywords, setSecondaryKeywords] = React.useState<string[]>([]);
  const [briefText, setBriefText] = React.useState("");
  const [source, setSource] = React.useState<"manual" | "trend" | "gap_analysis">("manual");

  const filteredKeywords = React.useMemo(
    () => keywords.filter((k) => k.client_id === clientId),
    [keywords, clientId]
  );

  function handleAddSecondary(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const value = secondaryInput.trim().replace(/,$/, "");
      if (value && !secondaryKeywords.includes(value)) {
        setSecondaryKeywords((prev) => [...prev, value]);
      }
      setSecondaryInput("");
    }
  }

  function handleRemoveSecondary(keyword: string) {
    setSecondaryKeywords((prev) => prev.filter((k) => k !== keyword));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      title,
      client_id: clientId,
      target_keyword_id: targetKeywordId || null,
      secondary_keywords: secondaryKeywords,
      brief_text: briefText,
      source,
    });
    resetForm();
    setIsOpen(false);
  }

  function resetForm() {
    setTitle("");
    setClientId("");
    setTargetKeywordId("");
    setSecondaryInput("");
    setSecondaryKeywords([]);
    setBriefText("");
    setSource("manual");
  }

  const isValid = title.trim().length > 0 && clientId.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={<>{trigger}</>} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Content Brief</DialogTitle>
          <DialogDescription>
            Create a brief to guide article generation. Assign a target keyword and outline.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="brief-title">Title</Label>
            <Input
              id="brief-title"
              placeholder="e.g., Ultimate Guide to Technical SEO"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Client */}
          <div className="space-y-1.5">
            <Label>Client</Label>
            <Select value={clientId} onValueChange={(v) => setClientId(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select client" />
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

          {/* Target keyword */}
          <div className="space-y-1.5">
            <Label>Target Keyword</Label>
            <Select
              value={targetKeywordId}
              onValueChange={(v) => setTargetKeywordId(v ?? "")}
              disabled={!clientId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={clientId ? "Select keyword" : "Select a client first"} />
              </SelectTrigger>
              <SelectContent>
                {filteredKeywords.map((kw) => (
                  <SelectItem key={kw.id} value={kw.id}>
                    {kw.keyword}
                  </SelectItem>
                ))}
                {filteredKeywords.length === 0 && clientId && (
                  <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                    No keywords found for this client
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Secondary keywords */}
          <div className="space-y-1.5">
            <Label htmlFor="secondary-kw">Secondary Keywords</Label>
            <div className="flex flex-wrap gap-1.5 rounded-lg border border-input p-2 dark:bg-input/30">
              {secondaryKeywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                >
                  {kw}
                  <button
                    type="button"
                    onClick={() => handleRemoveSecondary(kw)}
                    className="rounded-sm p-0.5 hover:bg-muted"
                    aria-label={`Remove ${kw}`}
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              <input
                id="secondary-kw"
                type="text"
                value={secondaryInput}
                onChange={(e) => setSecondaryInput(e.target.value)}
                onKeyDown={handleAddSecondary}
                placeholder={secondaryKeywords.length === 0 ? "Type and press Enter" : ""}
                className="min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Outline / brief text */}
          <div className="space-y-1.5">
            <Label htmlFor="brief-outline">Outline</Label>
            <Textarea
              id="brief-outline"
              placeholder={"## Introduction\n- Hook and context\n\n## Main Topic\n- Key points\n\n## Conclusion\n- Summary and CTA"}
              value={briefText}
              onChange={(e) => setBriefText(e.target.value)}
              className="min-h-32 font-mono text-xs"
            />
          </div>

          {/* Source */}
          <div className="space-y-1.5">
            <Label>Source</Label>
            <Select value={source} onValueChange={(v) => { if (v) setSource(v as typeof source); }}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="trend">Trend Detection</SelectItem>
                <SelectItem value="gap_analysis">Gap Analysis</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={!isValid}>
              <Plus className="size-4" data-icon="inline-start" />
              Create Brief
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
