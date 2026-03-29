// --- Constants ---

const META_TITLE_MAX_LENGTH = 60;
const META_DESC_MIN_LENGTH = 120;
const META_DESC_MAX_LENGTH = 160;
const MIN_TITLE_LENGTH = 50;
const DEFAULT_SECTION_COUNT = 5;
const PARAGRAPHS_PER_SECTION = 3;
const INTRO_PARAGRAPHS = 2;

const SCORE_KEYWORD_IN_TITLE = 15;
const SCORE_KEYWORD_IN_FIRST_PARAGRAPH = 15;
const SCORE_KEYWORD_IN_META_TITLE = 10;
const SCORE_KEYWORD_IN_META_DESC = 10;
const SCORE_META_DESC_LENGTH = 10;
const SCORE_TITLE_LENGTH = 5;
const SCORE_HAS_HEADINGS = 10;
const SCORE_WORD_COUNT_ABOVE_800 = 10;
const SCORE_WORD_COUNT_ABOVE_1500 = 5;
const SCORE_HAS_BULLET_LISTS = 5;
const SCORE_HAS_CONCLUSION = 5;
const WORD_COUNT_THRESHOLD_LOW = 800;
const WORD_COUNT_THRESHOLD_HIGH = 1500;

// --- Types ---

interface BriefInput {
  title: string;
  targetKeyword: string | null;
  secondaryKeywords: string[];
  briefText: string | null;
  outline: unknown | null;
  domain: string;
}

interface GeneratedArticle {
  title: string;
  metaTitle: string;
  metaDescription: string;
  slug: string;
  body: string;
  wordCount: number;
  seoScore: number;
}

// --- Exported function ---

export function generateArticleFromBrief(input: BriefInput): GeneratedArticle {
  const keyword = input.targetKeyword ?? input.title;
  const sections = parseSections(input);
  const title = input.title;
  const metaTitle = buildMetaTitle(keyword, title);
  const metaDescription = buildMetaDescription(keyword, title);
  const slug = toSlug(title);
  const body = buildBody(keyword, input.secondaryKeywords, sections, input.domain);
  const wordCount = countWords(body);
  const seoScore = calculateSeoScore({
    title,
    metaTitle,
    metaDescription,
    body,
    keyword,
    wordCount,
  });

  return { title, metaTitle, metaDescription, slug, body, wordCount, seoScore };
}

// --- Meta builders ---

function buildMetaTitle(keyword: string, title: string): string {
  const capitalized = capitalizeWords(keyword);
  const candidate = `${capitalized}: ${title}`;
  if (candidate.length <= META_TITLE_MAX_LENGTH) {
    return candidate;
  }
  const truncated = candidate.slice(0, META_TITLE_MAX_LENGTH - 3);
  return `${truncated.slice(0, truncated.lastIndexOf(" "))}...`;
}

function buildMetaDescription(keyword: string, title: string): string {
  const templates = [
    `Discover everything you need to know about ${keyword}. ${title} — practical tips, expert insights, and actionable advice to help you succeed.`,
    `Looking for the best ${keyword} guide? ${title} covers key strategies, proven methods, and real-world examples you can use today.`,
    `Your complete guide to ${keyword}. Learn the essentials of ${title.toLowerCase()} with step-by-step advice and expert recommendations.`,
  ];
  const raw = pickByHash(templates, keyword);
  if (raw.length >= META_DESC_MIN_LENGTH && raw.length <= META_DESC_MAX_LENGTH) {
    return raw;
  }
  if (raw.length > META_DESC_MAX_LENGTH) {
    const trimmed = raw.slice(0, META_DESC_MAX_LENGTH - 3);
    return `${trimmed.slice(0, trimmed.lastIndexOf(" "))}...`;
  }
  return raw.padEnd(META_DESC_MIN_LENGTH, ".");
}

// --- Slug ---

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// --- Section parsing ---

interface Section {
  heading: string;
  hint: string;
}

function parseSections(input: BriefInput): Section[] {
  const outlineText = extractOutlineText(input);
  if (outlineText) {
    return parseSectionsFromText(outlineText);
  }
  return generateDefaultSections(input.targetKeyword ?? input.title);
}

function extractOutlineText(input: BriefInput): string | null {
  if (typeof input.outline === "string" && input.outline.trim()) {
    return input.outline.trim();
  }
  if (input.briefText?.trim()) {
    return input.briefText.trim();
  }
  return null;
}

function parseSectionsFromText(text: string): Section[] {
  const hasH2Markers = text.includes("##");
  const lines = hasH2Markers
    ? text.split(/^##\s*/m).filter(Boolean)
    : text.split(/\n+/).filter((line) => line.trim());

  return lines.map((line) => {
    const trimmed = line.trim();
    const firstLine = trimmed.split("\n")[0].trim();
    const rest = trimmed.split("\n").slice(1).join(" ").trim();
    return { heading: firstLine, hint: rest || firstLine };
  });
}

function generateDefaultSections(keyword: string): Section[] {
  return [
    {
      heading: `What Is ${capitalizeWords(keyword)}`,
      hint: `definition and overview of ${keyword}`,
    },
    {
      heading: `Why ${capitalizeWords(keyword)} Matters`,
      hint: `benefits and importance of ${keyword}`,
    },
    {
      heading: `How to Choose the Best ${capitalizeWords(keyword)}`,
      hint: `selection criteria and comparison of ${keyword}`,
    },
    {
      heading: `Tips and Best Practices for ${capitalizeWords(keyword)}`,
      hint: `actionable advice for ${keyword}`,
    },
    {
      heading: `Frequently Asked Questions About ${capitalizeWords(keyword)}`,
      hint: `common questions about ${keyword}`,
    },
  ];
}

// --- Body builder ---

function buildBody(
  keyword: string,
  secondaryKeywords: string[],
  sections: Section[],
  domain: string,
): string {
  const parts: string[] = [];

  parts.push(buildIntroduction(keyword, secondaryKeywords));

  sections.forEach((section, index) => {
    parts.push(buildSection(section, keyword, secondaryKeywords, index));
  });

  parts.push(buildConclusion(keyword, domain));

  return parts.join("\n\n");
}

function buildIntroduction(keyword: string, secondaryKeywords: string[]): string {
  const secondary = secondaryKeywords[0] ?? keyword;
  const paragraphs = [
    `When it comes to ${keyword}, making the right choices can have a lasting impact on your results. Whether you are just getting started or looking to refine your approach, understanding the fundamentals is essential. This guide walks you through everything you need to know, from foundational concepts to advanced strategies that deliver real outcomes.`,
    `In today's landscape, ${secondary} plays a critical role in achieving success. The demand for reliable information about ${keyword} continues to grow, and it can be difficult to separate practical advice from generic filler. That is exactly why we put together this comprehensive resource — to give you clear, actionable guidance you can apply right away.`,
  ];
  return paragraphs.slice(0, INTRO_PARAGRAPHS).join("\n\n");
}

function buildSection(
  section: Section,
  keyword: string,
  secondaryKeywords: string[],
  index: number,
): string {
  const heading = `## ${section.heading}`;
  const paragraphs = generateSectionParagraphs(section, keyword, secondaryKeywords, index);
  const hasBulletList = index % 2 === 0;

  if (hasBulletList) {
    const bulletList = generateBulletList(section, keyword, secondaryKeywords);
    paragraphs.splice(1, 0, bulletList);
  }

  return [heading, ...paragraphs].join("\n\n");
}

function generateSectionParagraphs(
  section: Section,
  keyword: string,
  secondaryKeywords: string[],
  sectionIndex: number,
): string[] {
  const secondary = pickSecondaryKeyword(secondaryKeywords, sectionIndex);

  const templateSets: string[][] = [
    [
      `Understanding ${section.hint} is the first step toward making informed decisions about ${keyword}. Many people overlook this aspect, but it forms the foundation for everything that follows. When you take the time to learn the basics, you set yourself up for long-term success. The effort you invest now will pay dividends as you progress.`,
      `One of the most common mistakes people make with ${keyword} is jumping in without a clear plan. By taking a structured approach to ${section.hint}, you can avoid costly errors and save significant time. Consider what your specific goals are and how ${secondary} fits into the bigger picture. A thoughtful strategy always outperforms a reactive one.`,
      `Experts in ${keyword} consistently recommend focusing on ${section.hint} as a priority. The reason is straightforward: it directly affects the quality of your outcomes. Whether you are working on a small project or a large-scale initiative, the principles remain the same. Start with a solid foundation and build from there.`,
    ],
    [
      `The role of ${section.hint} in ${keyword} cannot be overstated. It influences everything from initial planning to final execution, and skipping this step often leads to setbacks down the road. Taking a methodical approach ensures that each decision you make is grounded in solid reasoning. This is where experience and preparation intersect.`,
      `When evaluating ${section.hint}, consider how it relates to ${secondary} and your overall objectives. The best results come from aligning these elements so they work together rather than in isolation. Many professionals find that a checklist-based approach helps them stay on track. Consistency in this area is what separates good results from great ones.`,
      `As you deepen your knowledge of ${keyword}, you will discover that ${section.hint} opens up new possibilities. What starts as a basic understanding quickly evolves into a nuanced perspective that drives better decisions. Stay curious, keep testing new approaches, and do not be afraid to revisit your assumptions. Growth in this area is an ongoing process.`,
    ],
    [
      `A practical approach to ${section.hint} starts with understanding what works and what does not in the context of ${keyword}. There is no shortage of advice available, but not all of it applies to every situation. Focus on strategies that have a track record of success and adapt them to your specific needs. Context matters more than generic rules.`,
      `${capitalizeWords(secondary)} is closely tied to ${section.hint}, and understanding this connection can give you a significant advantage. People who recognize these relationships tend to make faster progress and avoid common pitfalls. The key is to look beyond surface-level information and dig into the details. That deeper understanding is what drives real expertise.`,
      `Implementing what you learn about ${section.hint} requires patience and persistence. Results with ${keyword} rarely happen overnight, but consistent effort in the right direction compounds over time. Track your progress, measure your outcomes, and adjust your approach as needed. This iterative process is how lasting success is built.`,
    ],
  ];

  const set = templateSets[sectionIndex % templateSets.length];
  return set.slice(0, PARAGRAPHS_PER_SECTION);
}

function generateBulletList(
  section: Section,
  keyword: string,
  secondaryKeywords: string[],
): string {
  const secondary = secondaryKeywords[0] ?? keyword;
  const items = [
    `**Research thoroughly** — Before committing to any approach for ${keyword}, gather data from multiple sources and validate your assumptions.`,
    `**Set clear goals** — Define what success looks like for ${section.hint} so you can measure progress objectively.`,
    `**Start small and iterate** — Test your strategy on a limited scale before rolling it out broadly. This reduces risk and accelerates learning.`,
    `**Leverage ${secondary}** — Integrate related concepts and tools to build a more comprehensive approach.`,
    `**Review and refine regularly** — Schedule periodic reviews of your ${keyword} strategy to identify what is working and what needs adjustment.`,
  ];
  return items.map((item) => `- ${item}`).join("\n");
}

function buildConclusion(keyword: string, domain: string): string {
  const heading = "## Conclusion";
  const body = [
    `Mastering ${keyword} is a journey that rewards persistence and thoughtful action. The strategies and insights covered in this guide give you a strong foundation, but the real value comes from putting them into practice. Start with the areas that will have the biggest impact on your goals and build from there.`,
    `Whether you are a beginner or an experienced practitioner, there is always room to improve your approach to ${keyword}. The key is to stay informed, remain adaptable, and keep learning from both successes and setbacks. Every step forward brings you closer to the results you are looking for.`,
    `Ready to take the next step? Visit [${domain}](https://${domain}) for more resources, guides, and expert insights that will help you make the most of ${keyword}. Your journey toward better results starts now.`,
  ];
  return [heading, ...body].join("\n\n");
}

// --- SEO scoring ---

interface SeoScoreInput {
  title: string;
  metaTitle: string;
  metaDescription: string;
  body: string;
  keyword: string;
  wordCount: number;
}

function calculateSeoScore(input: SeoScoreInput): number {
  const { title, metaTitle, metaDescription, body, keyword, wordCount } = input;
  const lowerKeyword = keyword.toLowerCase();
  const firstParagraph = body.split("\n\n")[0]?.toLowerCase() ?? "";
  let score = 0;

  if (title.toLowerCase().includes(lowerKeyword)) {
    score += SCORE_KEYWORD_IN_TITLE;
  }
  if (firstParagraph.includes(lowerKeyword)) {
    score += SCORE_KEYWORD_IN_FIRST_PARAGRAPH;
  }
  if (metaTitle.toLowerCase().includes(lowerKeyword)) {
    score += SCORE_KEYWORD_IN_META_TITLE;
  }
  if (metaDescription.toLowerCase().includes(lowerKeyword)) {
    score += SCORE_KEYWORD_IN_META_DESC;
  }
  if (
    metaDescription.length >= META_DESC_MIN_LENGTH &&
    metaDescription.length <= META_DESC_MAX_LENGTH
  ) {
    score += SCORE_META_DESC_LENGTH;
  }
  if (title.length >= MIN_TITLE_LENGTH && title.length <= META_TITLE_MAX_LENGTH) {
    score += SCORE_TITLE_LENGTH;
  }
  if (body.includes("## ")) {
    score += SCORE_HAS_HEADINGS;
  }
  if (wordCount > WORD_COUNT_THRESHOLD_LOW) {
    score += SCORE_WORD_COUNT_ABOVE_800;
  }
  if (wordCount > WORD_COUNT_THRESHOLD_HIGH) {
    score += SCORE_WORD_COUNT_ABOVE_1500;
  }
  if (body.includes("- ")) {
    score += SCORE_HAS_BULLET_LISTS;
  }
  if (body.toLowerCase().includes("## conclusion")) {
    score += SCORE_HAS_CONCLUSION;
  }

  return Math.min(score, 100);
}

// --- Utility helpers ---

function capitalizeWords(text: string): string {
  return text.replace(/\b\w/g, (char) => char.toUpperCase());
}

function countWords(text: string): number {
  return text
    .replace(/[#*\-\[\]()>]/g, "")
    .split(/\s+/)
    .filter(Boolean).length;
}

function toCharCodeSum(text: string): number {
  let sum = 0;
  for (let i = 0; i < text.length; i++) {
    sum += text.charCodeAt(i);
  }
  return sum;
}

function pickByHash<T>(items: T[], seed: string): T {
  return items[toCharCodeSum(seed) % items.length];
}

function pickSecondaryKeyword(secondaryKeywords: string[], index: number): string {
  if (secondaryKeywords.length === 0) {
    return "this topic";
  }
  return secondaryKeywords[index % secondaryKeywords.length];
}
