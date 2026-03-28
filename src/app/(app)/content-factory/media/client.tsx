"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Upload, Image as ImageIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
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

export function MediaPageClient({ initialMedia }: MediaPageClientProps) {
  const router = useRouter();
  const [media, setMedia] = React.useState(initialMedia);
  const [activeFilter, setActiveFilter] = React.useState<
    MediaItem["type"] | "all"
  >("all");

  function handlePreview(id: string) {
    const item = media.find((m) => m.id === id);
    if (item?.url) {
      window.open(item.url, "_blank");
    }
  }

  async function handleDelete(id: string) {
    setMedia((prev) => prev.filter((m) => m.id !== id));
    // Placeholder: actual delete API would go here
  }

  function handleUpload() {
    // Placeholder for upload functionality
  }

  return (
    <>
      <header className="animate-[fade-in_0.5s_ease-out_both]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Media Library
            </h1>
            <p className="mt-1 text-base text-muted-foreground">
              Generated images and media assets for your content
            </p>
          </div>
          <Button variant="outline" onClick={handleUpload}>
            <Upload className="size-4" data-icon="inline-start" />
            Upload Media
          </Button>
        </div>
      </header>

      <div className="animate-[slide-up_0.4s_ease-out_0.2s_both]">
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
