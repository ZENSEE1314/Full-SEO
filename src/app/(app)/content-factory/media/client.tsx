"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Image as ImageIcon,
  Video,
  Type,
  Sparkles,
  Copy,
  Download,
  Loader2,
  Check,
  Wand2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MediaGrid } from "@/components/content/media-grid";

interface MediaItem {
  id: string;
  url: string | null;
  type: "header_image" | "social_image" | "infographic";
  alt_text: string | null;
  article_title: string | null;
  created_at: string;
}

interface MediaPageClientProps {
  initialMedia: MediaItem[];
}

type StudioTab = "image" | "video" | "writer";

const TABS: Array<{ key: StudioTab; label: string; icon: React.ElementType }> = [
  { key: "image", label: "Image Generator", icon: ImageIcon },
  { key: "video", label: "Video Creator", icon: Video },
  { key: "writer", label: "AI Writer", icon: Type },
];

const IMAGE_STYLES = [
  "Photorealistic",
  "Illustration",
  "3D Render",
  "Minimalist",
  "Abstract",
] as const;

const ASPECT_RATIOS_IMAGE = ["16:9", "1:1", "9:16", "4:3"] as const;
const ASPECT_RATIOS_VIDEO = ["16:9", "9:16", "1:1"] as const;
const VIDEO_DURATIONS = ["5s", "10s", "15s", "30s"] as const;
const CONTENT_TYPES = ["Article", "Caption", "Meta Description", "Outline"] as const;

export function MediaPageClient({ initialMedia }: MediaPageClientProps) {
  const router = useRouter();
  const [media, setMedia] = React.useState(initialMedia);
  const [activeFilter, setActiveFilter] = React.useState<MediaItem["type"] | "all">("all");
  const [activeTab, setActiveTab] = React.useState<StudioTab>("image");

  // Image generator state
  const [imagePrompt, setImagePrompt] = React.useState("");
  const [imageStyle, setImageStyle] = React.useState<(typeof IMAGE_STYLES)[number]>("Photorealistic");
  const [imageRatio, setImageRatio] = React.useState<(typeof ASPECT_RATIOS_IMAGE)[number]>("16:9");
  const [isGeneratingImage, setIsGeneratingImage] = React.useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = React.useState<string | null>(null);
  const [imageError, setImageError] = React.useState<string | null>(null);

  // Video creator state
  const [videoPrompt, setVideoPrompt] = React.useState("");
  const [videoDuration, setVideoDuration] = React.useState<(typeof VIDEO_DURATIONS)[number]>("10s");
  const [videoRatio, setVideoRatio] = React.useState<(typeof ASPECT_RATIOS_VIDEO)[number]>("16:9");
  const [isGeneratingVideo, setIsGeneratingVideo] = React.useState(false);
  const [videoStatus, setVideoStatus] = React.useState<string | null>(null);
  const [videoError, setVideoError] = React.useState<string | null>(null);

  // AI writer state
  const [writerPrompt, setWriterPrompt] = React.useState("");
  const [contentType, setContentType] = React.useState<(typeof CONTENT_TYPES)[number]>("Article");
  const [isGeneratingText, setIsGeneratingText] = React.useState(false);
  const [generatedText, setGeneratedText] = React.useState<string | null>(null);
  const [writerError, setWriterError] = React.useState<string | null>(null);
  const [hasCopied, setHasCopied] = React.useState(false);

  async function handleGenerateImage() {
    if (!imagePrompt.trim()) return;
    setIsGeneratingImage(true);
    setImageError(null);
    setGeneratedImageUrl(null);

    try {
      const response = await fetch("/api/content/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: imagePrompt,
          style: imageStyle,
          aspect_ratio: imageRatio,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${response.status})`);
      }

      const data = await response.json();
      setGeneratedImageUrl(data.url);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Failed to generate image");
    } finally {
      setIsGeneratingImage(false);
    }
  }

  async function handleCreateVideo() {
    if (!videoPrompt.trim()) return;
    setIsGeneratingVideo(true);
    setVideoError(null);
    setVideoStatus(null);

    try {
      const response = await fetch("/api/content/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: videoPrompt,
          duration: videoDuration,
          aspect_ratio: videoRatio,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${response.status})`);
      }

      const data = await response.json();
      setVideoStatus(data.status || "Queued for rendering");
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : "Failed to create video");
    } finally {
      setIsGeneratingVideo(false);
    }
  }

  async function handleGenerateText() {
    if (!writerPrompt.trim()) return;
    setIsGeneratingText(true);
    setWriterError(null);
    setGeneratedText(null);

    try {
      const response = await fetch("/api/content/generate-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: writerPrompt,
          type: contentType.toLowerCase().replace(/ /g, "_"),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${response.status})`);
      }

      const data = await response.json();
      setGeneratedText(data.text);
    } catch (err) {
      setWriterError(err instanceof Error ? err.message : "Failed to generate text");
    } finally {
      setIsGeneratingText(false);
    }
  }

  function handleCopyText() {
    if (!generatedText) return;
    navigator.clipboard.writeText(generatedText);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  }

  function handleDownloadImage() {
    if (!generatedImageUrl) return;
    const link = document.createElement("a");
    link.href = generatedImageUrl;
    link.download = `nexus-ai-${Date.now()}.png`;
    link.click();
  }

  function handlePreview(id: string) {
    const item = media.find((m) => m.id === id);
    if (item?.url) window.open(item.url, "_blank");
  }

  async function handleDelete(id: string) {
    setMedia((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <>
      {/* Header */}
      <header className="animate-[fade-in_0.5s_ease-out_both]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <Wand2 className="size-5" />
            </div>
            <div>
              <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                AI Studio
              </h1>
              <p className="mt-0.5 text-base text-muted-foreground">
                Generate images, videos, and text with AI
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="animate-[slide-up_0.4s_ease-out_0.1s_both]">
        <nav
          role="tablist"
          aria-label="AI Studio tools"
          className="flex gap-1 rounded-xl border border-white/[0.06] bg-slate-900/70 p-1 backdrop-blur-sm"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${tab.key}`}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-emerald-500/15 text-emerald-400 shadow-sm shadow-emerald-500/10"
                    : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Panels */}
      <div className="animate-[slide-up_0.4s_ease-out_0.2s_both]">
        {/* Image Generator */}
        {activeTab === "image" && (
          <div
            id="panel-image"
            role="tabpanel"
            className="space-y-6 rounded-xl border border-white/[0.06] bg-slate-900/70 p-6 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-emerald-400" />
              <h2 className="text-lg font-semibold text-foreground">Image Generator</h2>
              <span className="ml-auto rounded-md bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                Powered by Replicate
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="image-prompt" className="mb-1.5 block text-sm font-medium text-foreground">
                  Prompt
                </label>
                <Textarea
                  id="image-prompt"
                  placeholder="Describe the image you want to create..."
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  className="min-h-24 resize-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="image-style" className="mb-1.5 block text-sm font-medium text-foreground">
                    Style
                  </label>
                  <select
                    id="image-style"
                    value={imageStyle}
                    onChange={(e) => setImageStyle(e.target.value as typeof imageStyle)}
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  >
                    {IMAGE_STYLES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="mb-1.5 block text-sm font-medium text-foreground">
                    Aspect Ratio
                  </span>
                  <div className="flex gap-1.5">
                    {ASPECT_RATIOS_IMAGE.map((ratio) => (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => setImageRatio(ratio)}
                        className={cn(
                          "flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                          imageRatio === ratio
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "border border-white/[0.06] text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
                        )}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Button
                onClick={handleGenerateImage}
                disabled={isGeneratingImage || !imagePrompt.trim()}
                className="w-full bg-emerald-600 text-white hover:bg-emerald-500 sm:w-auto"
                size="lg"
              >
                {isGeneratingImage ? (
                  <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
                ) : (
                  <Sparkles className="size-4" data-icon="inline-start" />
                )}
                {isGeneratingImage ? "Generating..." : "Generate Image"}
              </Button>
            </div>

            {imageError && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {imageError}
              </div>
            )}

            {generatedImageUrl && (
              <div className="space-y-3">
                <div className="overflow-hidden rounded-lg border border-white/[0.06]">
                  <img
                    src={generatedImageUrl}
                    alt="AI generated image"
                    className="w-full object-contain"
                  />
                </div>
                <Button variant="outline" size="default" onClick={handleDownloadImage}>
                  <Download className="size-4" data-icon="inline-start" />
                  Download
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Video Creator */}
        {activeTab === "video" && (
          <div
            id="panel-video"
            role="tabpanel"
            className="space-y-6 rounded-xl border border-white/[0.06] bg-slate-900/70 p-6 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2">
              <Video className="size-4 text-emerald-400" />
              <h2 className="text-lg font-semibold text-foreground">Video Creator</h2>
              <span className="ml-auto rounded-md bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                Powered by Remotion
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="video-prompt" className="mb-1.5 block text-sm font-medium text-foreground">
                  Prompt
                </label>
                <Textarea
                  id="video-prompt"
                  placeholder="Describe the video you want to create..."
                  value={videoPrompt}
                  onChange={(e) => setVideoPrompt(e.target.value)}
                  className="min-h-24 resize-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="video-duration" className="mb-1.5 block text-sm font-medium text-foreground">
                    Duration
                  </label>
                  <select
                    id="video-duration"
                    value={videoDuration}
                    onChange={(e) => setVideoDuration(e.target.value as typeof videoDuration)}
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  >
                    {VIDEO_DURATIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="mb-1.5 block text-sm font-medium text-foreground">
                    Aspect Ratio
                  </span>
                  <div className="flex gap-1.5">
                    {ASPECT_RATIOS_VIDEO.map((ratio) => (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => setVideoRatio(ratio)}
                        className={cn(
                          "flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                          videoRatio === ratio
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "border border-white/[0.06] text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
                        )}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Button
                onClick={handleCreateVideo}
                disabled={isGeneratingVideo || !videoPrompt.trim()}
                className="w-full bg-emerald-600 text-white hover:bg-emerald-500 sm:w-auto"
                size="lg"
              >
                {isGeneratingVideo ? (
                  <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
                ) : (
                  <Video className="size-4" data-icon="inline-start" />
                )}
                {isGeneratingVideo ? "Creating..." : "Create Video"}
              </Button>
            </div>

            {videoError && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {videoError}
              </div>
            )}

            {videoStatus && (
              <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
                <Loader2 className="size-4 animate-spin" />
                <span>{videoStatus}</span>
              </div>
            )}
          </div>
        )}

        {/* AI Writer */}
        {activeTab === "writer" && (
          <div
            id="panel-writer"
            role="tabpanel"
            className="space-y-6 rounded-xl border border-white/[0.06] bg-slate-900/70 p-6 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2">
              <Type className="size-4 text-emerald-400" />
              <h2 className="text-lg font-semibold text-foreground">AI Writer</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="writer-prompt" className="mb-1.5 block text-sm font-medium text-foreground">
                  Prompt
                </label>
                <Textarea
                  id="writer-prompt"
                  placeholder="Describe what you want to write about..."
                  value={writerPrompt}
                  onChange={(e) => setWriterPrompt(e.target.value)}
                  className="min-h-24 resize-none"
                />
              </div>

              <div>
                <span className="mb-1.5 block text-sm font-medium text-foreground">
                  Content Type
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {CONTENT_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setContentType(type)}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                        contentType === type
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "border border-white/[0.06] text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleGenerateText}
                disabled={isGeneratingText || !writerPrompt.trim()}
                className="w-full bg-emerald-600 text-white hover:bg-emerald-500 sm:w-auto"
                size="lg"
              >
                {isGeneratingText ? (
                  <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
                ) : (
                  <Sparkles className="size-4" data-icon="inline-start" />
                )}
                {isGeneratingText ? "Writing..." : "Generate Text"}
              </Button>
            </div>

            {writerError && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {writerError}
              </div>
            )}

            {generatedText && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Generated Output</span>
                  <Button variant="ghost" size="sm" onClick={handleCopyText}>
                    {hasCopied ? (
                      <Check className="size-3.5 text-emerald-400" data-icon="inline-start" />
                    ) : (
                      <Copy className="size-3.5" data-icon="inline-start" />
                    )}
                    {hasCopied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <div className="max-h-96 overflow-y-auto rounded-lg border border-white/[0.06] bg-slate-950/60 p-4 font-mono text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                  {generatedText}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="animate-[slide-up_0.4s_ease-out_0.3s_both]">
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-white/[0.06]" />
          <span className="text-xs font-medium text-muted-foreground">Media Library</span>
          <div className="h-px flex-1 bg-white/[0.06]" />
        </div>
      </div>

      {/* Existing Media Grid */}
      <div className="animate-[slide-up_0.4s_ease-out_0.4s_both]">
        <MediaGrid
          items={media}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          onPreview={handlePreview}
          onDelete={handleDelete}
        />
      </div>
    </>
  );
}
