"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowLeft, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArticleTable } from "@/components/content/article-table";
import { ArticleViewer } from "@/components/content/article-viewer";

interface ArticleRow {
  id: string;
  title: string;
  slug: string | null;
  body: string | null;
  meta_title: string | null;
  meta_description: string | null;
  client_name: string;
  word_count: number | null;
  seo_score: number | null;
  status: "draft" | "review" | "approved" | "published";
  created_at: string;
}

interface BriefOption {
  id: string;
  title: string;
  client_id: string;
  client_name: string;
}

interface ArticlesPageClientProps {
  initialArticles: ArticleRow[];
  approvedBriefs: BriefOption[];
}

export function ArticlesPageClient({
  initialArticles,
  approvedBriefs,
}: ArticlesPageClientProps) {
  const router = useRouter();
  const [articles, setArticles] = React.useState(initialArticles);
  const [selectedArticleId, setSelectedArticleId] = React.useState<string | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [selectedBriefId, setSelectedBriefId] = React.useState("");

  const selectedArticle = React.useMemo(
    () => articles.find((a) => a.id === selectedArticleId) ?? null,
    [articles, selectedArticleId]
  );

  async function handleGenerate() {
    if (!selectedBriefId) return;
    setIsGenerating(true);

    try {
      const response = await fetch("/api/content/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief_id: selectedBriefId }),
      });

      if (response.ok) {
        router.refresh();
      }
    } catch {
      // Handled by refresh
    } finally {
      setIsGenerating(false);
      setSelectedBriefId("");
    }
  }

  async function handleStatusUpdate(articleId: string, status: string) {
    setArticles((prev) =>
      prev.map((a) =>
        a.id === articleId ? { ...a, status: status as ArticleRow["status"] } : a
      )
    );

    try {
      await fetch("/api/content/articles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: articleId, status }),
      });
    } catch {
      router.refresh();
    }
  }

  async function handleSave(
    articleId: string,
    data: { title: string; body: string; meta_title: string; meta_description: string }
  ) {
    setArticles((prev) =>
      prev.map((a) =>
        a.id === articleId
          ? { ...a, ...data, word_count: data.body.split(/\s+/).filter(Boolean).length }
          : a
      )
    );

    try {
      await fetch("/api/content/articles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: articleId, ...data }),
      });
    } catch {
      router.refresh();
    }
  }

  async function handleRegenerate(articleId: string) {
    const article = articles.find((a) => a.id === articleId);
    if (!article) return;

    try {
      await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief_id: articleId }),
      });
    } catch {
      // Generation runs asynchronously
    }
  }

  if (selectedArticle) {
    return (
      <>
        <header className="animate-[fade-in_0.5s_ease-out_both]">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedArticleId(null)}
            className="mb-4"
          >
            <ArrowLeft className="size-4" data-icon="inline-start" />
            Back to Articles
          </Button>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {selectedArticle.title}
          </h1>
        </header>

        <div className="animate-[slide-up_0.4s_ease-out_0.1s_both]">
          <ArticleViewer
            article={selectedArticle}
            onApprove={(id) => handleStatusUpdate(id, "approved")}
            onPublish={(id) => handleStatusUpdate(id, "published")}
            onRegenerate={handleRegenerate}
            onSave={handleSave}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <header className="animate-[fade-in_0.5s_ease-out_both]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Articles
            </h1>
            <p className="mt-1 text-base text-muted-foreground">
              AI-generated articles from your content briefs
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedBriefId} onValueChange={(v) => setSelectedBriefId(v ?? "")}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Select brief..." />
              </SelectTrigger>
              <SelectContent>
                {approvedBriefs.map((brief) => (
                  <SelectItem key={brief.id} value={brief.id}>
                    {brief.title}
                  </SelectItem>
                ))}
                {approvedBriefs.length === 0 && (
                  <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                    No approved briefs available
                  </div>
                )}
              </SelectContent>
            </Select>
            <Button
              onClick={handleGenerate}
              disabled={!selectedBriefId || isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
              ) : (
                <Sparkles className="size-4" data-icon="inline-start" />
              )}
              Generate Article
            </Button>
          </div>
        </div>
      </header>

      <div className="animate-[slide-up_0.4s_ease-out_0.2s_both]">
        <ArticleTable
          articles={articles}
          onRowClick={setSelectedArticleId}
        />
      </div>
    </>
  );
}
