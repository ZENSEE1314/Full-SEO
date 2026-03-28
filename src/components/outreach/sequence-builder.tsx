"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Plus,
  Mail,
  MessageCircle,
  GripVertical,
  Trash2,
  Eye,
  Pencil,
  Clock,
  Variable,
} from "lucide-react";

interface SequenceStep {
  id: string;
  day_offset: number;
  channel: "email" | "whatsapp";
  template: string;
}

const TEMPLATE_VARIABLES = [
  { key: "{{name}}", label: "Contact Name" },
  { key: "{{domain}}", label: "Domain" },
  { key: "{{client}}", label: "Client Name" },
] as const;

function generateStepId(): string {
  return `step_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

interface SequenceBuilderProps {
  initialSteps?: SequenceStep[];
  sequenceId: string;
  onSave?: (steps: SequenceStep[]) => void;
}

export function SequenceBuilder({
  initialSteps = [],
  sequenceId,
  onSave,
}: SequenceBuilderProps) {
  const [steps, setSteps] = useState<SequenceStep[]>(initialSteps);
  const [isPreview, setIsPreview] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);

  const handleAddStep = useCallback(
    (afterIndex?: number) => {
      const newStep: SequenceStep = {
        id: generateStepId(),
        day_offset:
          afterIndex !== undefined && steps[afterIndex]
            ? steps[afterIndex].day_offset + 3
            : steps.length > 0
              ? steps[steps.length - 1].day_offset + 3
              : 0,
        channel: "email",
        template: "",
      };

      if (afterIndex !== undefined) {
        const next = [...steps];
        next.splice(afterIndex + 1, 0, newStep);
        setSteps(next);
      } else {
        setSteps((prev) => [...prev, newStep]);
      }
      setEditingStepId(newStep.id);
    },
    [steps]
  );

  const handleRemoveStep = useCallback((stepId: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== stepId));
    setEditingStepId(null);
  }, []);

  const handleUpdateStep = useCallback(
    (stepId: string, updates: Partial<SequenceStep>) => {
      setSteps((prev) =>
        prev.map((s) => (s.id === stepId ? { ...s, ...updates } : s))
      );
    },
    []
  );

  const handleInsertVariable = useCallback(
    (stepId: string, variable: string) => {
      setSteps((prev) =>
        prev.map((s) =>
          s.id === stepId ? { ...s, template: s.template + variable } : s
        )
      );
    },
    []
  );

  const handleSave = useCallback(async () => {
    try {
      await fetch("/api/outreach/sequences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sequenceId, steps }),
      });
      onSave?.(steps);
    } catch {
      // Save failed silently
    }
  }, [sequenceId, steps, onSave]);

  const renderPreviewTemplate = useCallback((template: string) => {
    return template
      .replace(/\{\{name\}\}/g, "John Smith")
      .replace(/\{\{domain\}\}/g, "example.com")
      .replace(/\{\{client\}\}/g, "Acme Corp");
  }, []);

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="tabular-nums">
            {steps.length} {steps.length === 1 ? "step" : "steps"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={isPreview ? "default" : "outline"}
            size="sm"
            onClick={() => setIsPreview(!isPreview)}
            className="gap-1.5"
          >
            {isPreview ? (
              <>
                <Pencil className="size-3.5" data-icon="inline-start" />
                Edit
              </>
            ) : (
              <>
                <Eye className="size-3.5" data-icon="inline-start" />
                Preview
              </>
            )}
          </Button>
          <Button size="sm" onClick={handleSave} className="gap-1.5">
            Save Steps
          </Button>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline line */}
        {steps.length > 0 && (
          <div
            className="absolute left-[23px] top-8 w-px bg-gradient-to-b from-emerald-500/40 via-emerald-500/20 to-transparent"
            style={{ height: `calc(100% - 2rem)` }}
            aria-hidden="true"
          />
        )}

        <div className="space-y-0">
          {steps.map((step, index) => {
            const isEditing = editingStepId === step.id;
            const isEmail = step.channel === "email";

            return (
              <div key={step.id} className="relative">
                {/* Step card */}
                <div
                  className="group relative flex gap-4 py-3"
                  style={{
                    animationDelay: `${index * 60}ms`,
                    animation: "slide-up 0.3s ease-out both",
                  }}
                >
                  {/* Timeline node */}
                  <div className="relative z-10 flex flex-col items-center pt-1">
                    <div
                      className={cn(
                        "flex size-[46px] shrink-0 items-center justify-center rounded-xl border-2 transition-colors",
                        isEmail
                          ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                          : "border-green-500/30 bg-green-500/10 text-green-400"
                      )}
                    >
                      {isEmail ? (
                        <Mail className="size-5" />
                      ) : (
                        <MessageCircle className="size-5" />
                      )}
                    </div>
                  </div>

                  {/* Card content */}
                  <div
                    className={cn(
                      "flex-1 rounded-xl border bg-slate-900/70 backdrop-blur-sm p-4 transition-all",
                      isEditing
                        ? "border-emerald-500/30 shadow-lg shadow-emerald-500/5"
                        : "border-white/[0.06]"
                    )}
                  >
                    {/* Card header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="size-3" />
                          Day {step.day_offset}
                        </div>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] uppercase tracking-wider",
                            isEmail
                              ? "bg-blue-500/10 text-blue-400"
                              : "bg-green-500/10 text-green-400"
                          )}
                        >
                          {step.channel}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        {!isEditing && (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setEditingStepId(step.id)}
                            aria-label="Edit step"
                          >
                            <Pencil className="size-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleRemoveStep(step.id)}
                          aria-label="Remove step"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Editing state */}
                    {isEditing && !isPreview ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor={`day-${step.id}`} className="text-xs">
                              Day offset
                            </Label>
                            <Input
                              id={`day-${step.id}`}
                              type="number"
                              min={0}
                              value={step.day_offset}
                              onChange={(e) =>
                                handleUpdateStep(step.id, {
                                  day_offset: parseInt(e.target.value) || 0,
                                })
                              }
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Channel</Label>
                            <Select
                              value={step.channel}
                              onValueChange={(val) =>
                                handleUpdateStep(step.id, {
                                  channel: val as "email" | "whatsapp",
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="email">
                                  <Mail className="size-3.5" /> Email
                                </SelectItem>
                                <SelectItem value="whatsapp">
                                  <MessageCircle className="size-3.5" /> WhatsApp
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label
                              htmlFor={`template-${step.id}`}
                              className="text-xs"
                            >
                              Template
                            </Label>
                            <div className="flex items-center gap-1">
                              <Variable className="size-3 text-muted-foreground" />
                              {TEMPLATE_VARIABLES.map((v) => (
                                <button
                                  key={v.key}
                                  onClick={() =>
                                    handleInsertVariable(step.id, v.key)
                                  }
                                  className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-emerald-400 hover:bg-slate-700 transition-colors"
                                  title={`Insert ${v.label}`}
                                >
                                  {v.key}
                                </button>
                              ))}
                            </div>
                          </div>
                          <Textarea
                            id={`template-${step.id}`}
                            value={step.template}
                            onChange={(e) =>
                              handleUpdateStep(step.id, {
                                template: e.target.value,
                              })
                            }
                            placeholder="Write your outreach template..."
                            className="min-h-[120px] font-mono text-xs"
                          />
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingStepId(null)}
                        >
                          Done
                        </Button>
                      </div>
                    ) : (
                      /* Display state */
                      <div>
                        {step.template ? (
                          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                            {isPreview
                              ? renderPreviewTemplate(step.template)
                              : step.template}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground/50 italic">
                            No template content yet. Click edit to add one.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Add step between cards */}
                <div className="relative flex items-center justify-center py-1 pl-[23px]">
                  <button
                    onClick={() => handleAddStep(index)}
                    className="group/add relative z-10 flex size-6 items-center justify-center rounded-full border border-dashed border-white/10 bg-slate-950 text-muted-foreground opacity-0 transition-all hover:border-emerald-500/40 hover:text-emerald-400 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
                    aria-label="Add step after this one"
                  >
                    <Plus className="size-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add first/last step */}
        <button
          onClick={() => handleAddStep()}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/[0.08] bg-slate-900/30 py-6 text-sm text-muted-foreground transition-all hover:border-emerald-500/30 hover:text-emerald-400 hover:bg-emerald-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
        >
          <Plus className="size-4" />
          {steps.length === 0 ? "Add first step" : "Add another step"}
        </button>
      </div>
    </div>
  );
}
