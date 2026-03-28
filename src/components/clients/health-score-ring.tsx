"use client";

import { cn } from "@/lib/utils";

const RING_SIZE = 48;
const STROKE_WIDTH = 4;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function getScoreColor(score: number): string {
  if (score >= 70) return "text-emerald-400";
  if (score >= 40) return "text-amber-400";
  return "text-red-400";
}

function getScoreStroke(score: number): string {
  if (score >= 70) return "stroke-emerald-400";
  if (score >= 40) return "stroke-amber-400";
  return "stroke-red-400";
}

interface HealthScoreRingProps {
  score: number | null;
  size?: number;
  className?: string;
}

export function HealthScoreRing({
  score,
  size = RING_SIZE,
  className,
}: HealthScoreRingProps) {
  const displayScore = score ?? 0;
  const offset = CIRCUMFERENCE - (displayScore / 100) * CIRCUMFERENCE;
  const scaledRadius = (size - STROKE_WIDTH) / 2;
  const scaledCircumference = 2 * Math.PI * scaledRadius;
  const scaledOffset =
    scaledCircumference - (displayScore / 100) * scaledCircumference;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="meter"
      aria-valuenow={displayScore}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Health score: ${displayScore}%`}
    >
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={scaledRadius}
          fill="none"
          stroke="currentColor"
          strokeWidth={STROKE_WIDTH}
          className="text-white/5"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={scaledRadius}
          fill="none"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={scaledCircumference}
          strokeDashoffset={scaledOffset}
          className={cn(
            "transition-[stroke-dashoffset] duration-700 ease-out",
            getScoreStroke(displayScore),
          )}
        />
      </svg>
      <span
        className={cn(
          "absolute text-xs font-bold tabular-nums",
          score === null ? "text-muted-foreground" : getScoreColor(displayScore),
        )}
      >
        {score === null ? "--" : displayScore}
      </span>
    </div>
  );
}
