import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";

type ContentType = "article" | "caption" | "meta_description" | "outline";

function generateSeoArticle(topic: string): string {
  const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `# ${topic}: The Complete Guide for 2026

## Introduction

In today's competitive digital landscape, understanding **${topic}** is essential for businesses looking to stay ahead. This comprehensive guide covers everything you need to know — from fundamentals to advanced strategies.

## What Is ${topic}?

${topic} refers to the practice and methodology that helps businesses achieve better visibility and results. Whether you're a beginner or an experienced professional, mastering ${topic} can significantly impact your bottom line.

## Why ${topic} Matters in 2026

The landscape has shifted dramatically. Here's why ${topic} deserves your attention:

- **Increased competition**: More businesses are investing in this area than ever before
- **Algorithm updates**: Search engines now prioritize quality and relevance
- **User expectations**: Audiences demand better experiences and more value
- **ROI potential**: Companies that invest early see 3-5x returns

## Key Strategies for ${topic}

### 1. Research and Planning

Start with thorough keyword research and competitive analysis. Identify gaps in the market where you can provide unique value.

### 2. Content Creation

Develop high-quality, authoritative content that addresses user intent. Focus on depth, accuracy, and actionable insights.

### 3. Technical Optimization

Ensure your technical foundation is solid — fast load times, mobile-first design, structured data, and clean architecture.

### 4. Measurement and Iteration

Track key metrics, analyze performance data, and continuously refine your approach based on what the data tells you.

## Common Mistakes to Avoid

1. Ignoring search intent in favor of keyword volume
2. Neglecting mobile optimization
3. Producing thin content without real value
4. Failing to update and refresh existing content

## Conclusion

${topic} is not a one-time effort but an ongoing commitment to excellence. By following the strategies outlined in this guide, you'll be well-positioned to outperform competitors and capture more organic traffic.

**Next steps**: Start by auditing your current approach, identify quick wins, and build a 90-day action plan.

---
*Published on NEXUS SEO | [${slug}]*
`;
}

function generateCaption(topic: string): string {
  const hashtags = topic
    .split(/\s+/)
    .slice(0, 4)
    .map((w) => `#${w.replace(/[^a-zA-Z0-9]/g, "")}`)
    .join(" ");

  return `${topic} is transforming how businesses compete online in 2026.

Here's what you need to know:
- Quality over quantity wins every time
- Data-driven decisions beat guesswork
- Consistency compounds results

Are you adapting your strategy? Drop a comment below.

${hashtags} #SEO #DigitalMarketing #Growth`;
}

function generateMetaDescription(topic: string): string {
  const base = `Discover proven ${topic} strategies for 2026. Learn expert tips, avoid common mistakes, and boost your results with actionable insights.`;
  return base.length > 155 ? base.slice(0, 152) + "..." : base;
}

function generateOutline(topic: string): string {
  return `# Content Outline: ${topic}

## Target Keyword
- Primary: "${topic}"
- Secondary: "${topic} guide", "${topic} tips", "${topic} strategies"

## Article Structure

### H1: ${topic}: The Complete Guide for 2026

### H2: Introduction
- Hook with a compelling statistic or question
- Brief overview of what the reader will learn
- Why this matters right now

### H2: What Is ${topic}?
- Clear definition
- Brief history / evolution
- Current state of the industry

### H2: Why ${topic} Matters
- Key benefits (3-5 bullet points)
- Supporting data / statistics
- Real-world impact examples

### H2: Step-by-Step Strategy
- Step 1: Research & Analysis
- Step 2: Planning & Goal Setting
- Step 3: Implementation
- Step 4: Monitoring & Optimization

### H2: Best Practices
- 5-7 actionable tips
- Include expert quotes if available
- Practical examples

### H2: Common Mistakes to Avoid
- 3-5 pitfalls
- How to prevent each one

### H2: Tools & Resources
- Recommended tools
- Further reading

### H2: Conclusion
- Summary of key takeaways
- Clear CTA

## SEO Notes
- Word count target: 2,000-2,500 words
- Include internal links to related content
- Add FAQ schema markup
- Use original images with descriptive alt text
`;
}

const GENERATORS: Record<ContentType, (topic: string) => string> = {
  article: generateSeoArticle,
  caption: generateCaption,
  meta_description: generateMetaDescription,
  outline: generateOutline,
};

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { prompt, type } = body as {
      prompt: string;
      type?: ContentType;
    };

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const contentType = type && type in GENERATORS ? type : "article";
    const text = GENERATORS[contentType](prompt.trim());

    return NextResponse.json({
      success: true,
      text,
      type: contentType,
    });
  } catch (error) {
    console.error("[generate-text] error:", error);
    return NextResponse.json({ error: "Failed to generate text" }, { status: 500 });
  }
}
