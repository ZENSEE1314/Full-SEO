export interface Organization {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  org_id: string;
  role: "owner" | "admin" | "member" | "viewer";
}

export interface Client {
  id: string;
  org_id: string;
  name: string;
  domain: string;
  logo_url: string | null;
  status: "active" | "paused" | "archived";
  settings: Record<string, unknown>;
  health_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface Keyword {
  id: string;
  client_id: string;
  keyword: string;
  search_volume: number | null;
  difficulty: number | null;
  current_rank: number | null;
  previous_rank: number | null;
  best_rank: number | null;
  ranking_url: string | null;
  is_tracked: boolean;
  source: "manual" | "discovered" | "search_console" | "competitor";
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface KeywordRankHistory {
  id: string;
  keyword_id: string;
  rank: number | null;
  url: string | null;
  serp_features: string[];
  recorded_at: string;
}

export interface Competitor {
  id: string;
  client_id: string;
  domain: string;
  name: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Trend {
  id: string;
  client_id: string | null;
  topic: string;
  trend_score: number | null;
  related_queries: string[];
  source: string;
  detected_at: string;
}

export interface ContentBrief {
  id: string;
  client_id: string;
  title: string;
  target_keyword_id: string | null;
  secondary_keywords: string[];
  outline: Record<string, unknown> | null;
  brief_text: string | null;
  source: "manual" | "trend" | "gap_analysis";
  status: "draft" | "approved" | "in_progress" | "published";
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentArticle {
  id: string;
  brief_id: string | null;
  client_id: string;
  title: string;
  slug: string | null;
  body: string | null;
  meta_title: string | null;
  meta_description: string | null;
  word_count: number | null;
  seo_score: number | null;
  status: "draft" | "review" | "approved" | "published";
  published_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Page {
  id: string;
  client_id: string;
  url: string;
  title: string | null;
  meta_description: string | null;
  h1: string | null;
  canonical_url: string | null;
  status_code: number | null;
  is_indexed: boolean | null;
  page_type: "landing" | "blog" | "product" | "category" | "other" | null;
  created_at: string;
  updated_at: string;
}

export interface PageSpeedScore {
  id: string;
  page_id: string;
  performance_score: number | null;
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  ttfb: number | null;
  device: "mobile" | "desktop";
  recorded_at: string;
}

export interface TechnicalIssue {
  id: string;
  client_id: string;
  page_id: string | null;
  issue_type: string;
  severity: "critical" | "warning" | "info";
  description: string | null;
  auto_fixable: boolean;
  fixed_at: string | null;
  detected_at: string;
}

export interface BacklinkProspect {
  id: string;
  client_id: string;
  domain: string;
  url: string | null;
  domain_authority: number | null;
  contact_email: string | null;
  contact_name: string | null;
  status: "new" | "contacted" | "replied" | "won" | "lost" | "rejected";
  source: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutreachSequence {
  id: string;
  client_id: string;
  name: string;
  channel: "email" | "whatsapp" | "both";
  steps: Array<{
    day_offset: number;
    template: string;
    channel: "email" | "whatsapp";
  }>;
  is_active: boolean;
  created_at: string;
}

export interface AgentAction {
  id: string;
  client_id: string | null;
  module: string;
  action_type: string;
  summary: string;
  details: Record<string, unknown> | null;
  status: "success" | "failure" | "warning" | "info";
  triggered_by: string;
  created_at: string;
}

export interface DashboardStats {
  totalClients: number;
  activeKeywords: number;
  avgHealthScore: number;
  totalActions24h: number;
  trafficTrend: Array<{ date: string; sessions: number }>;
  recentActions: AgentAction[];
  topMovers: Array<Keyword & { change: number }>;
}
