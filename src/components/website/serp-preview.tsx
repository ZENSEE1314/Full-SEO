"use client";

import { cn } from "@/lib/utils";

interface SerpPreviewProps {
  title: string;
  description: string;
  url: string;
  mode: "desktop" | "mobile";
}

function getDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname;
  } catch {
    return url;
  }
}

function getBreadcrumb(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return u.hostname;
    return `${u.hostname} › ${parts.join(" › ")}`;
  } catch {
    return url;
  }
}

export function SerpPreview({ title, description, url, mode }: SerpPreviewProps) {
  const displayTitle = title || "Page Title";
  const displayDesc = description || "No meta description set. Google may auto-generate one from page content.";
  const truncatedTitle = mode === "mobile" && displayTitle.length > 50
    ? displayTitle.slice(0, 50) + "..."
    : displayTitle.length > 60
    ? displayTitle.slice(0, 60) + "..."
    : displayTitle;
  const truncatedDesc = mode === "mobile" && displayDesc.length > 120
    ? displayDesc.slice(0, 120) + "..."
    : displayDesc.length > 160
    ? displayDesc.slice(0, 160) + "..."
    : displayDesc;

  return (
    <div
      className={cn(
        "rounded-lg bg-white p-4",
        mode === "mobile" ? "max-w-[360px]" : "max-w-[600px]"
      )}
    >
      {/* Google-style result */}
      <div className="space-y-1">
        {/* Breadcrumb / URL */}
        <div className="flex items-center gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gray-100">
            <span className="text-xs font-bold text-gray-600">
              {getDomain(url).charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-800 truncate">{getDomain(url)}</p>
            <p className="text-xs text-gray-500 truncate">{getBreadcrumb(url)}</p>
          </div>
        </div>

        {/* Title */}
        <h3
          className={cn(
            "font-medium leading-snug cursor-pointer hover:underline",
            title ? "text-[#1a0dab]" : "text-gray-400 italic",
            mode === "mobile" ? "text-base" : "text-xl"
          )}
        >
          {truncatedTitle}
        </h3>

        {/* Description */}
        <p
          className={cn(
            "leading-relaxed",
            description ? "text-gray-600" : "text-gray-400 italic",
            mode === "mobile" ? "text-xs" : "text-sm"
          )}
        >
          {truncatedDesc}
        </p>
      </div>
    </div>
  );
}
