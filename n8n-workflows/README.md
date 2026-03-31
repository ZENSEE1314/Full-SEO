# NEXUS-SEO n8n Workflows

All 8 automation workflows for the NEXUS SEO platform. Import into your n8n instance to enable scheduled SEO tasks.

## Quick Setup

1. **Get n8n** - [n8n.cloud](https://n8n.cloud) (free tier) or self-host via Docker:
   ```bash
   docker run -it --rm -p 5678:5678 n8nio/n8n
   ```

2. **Add Postgres credential** in n8n:
   - Go to Credentials > New > Postgres
   - Name it "Neon DB"
   - Use your Neon connection string from `.env.local`

3. **Import workflows** - Workflows > Import from File > select each JSON

4. **Update credentials** - In each workflow, click every Postgres node and select your "Neon DB" credential

5. **Set environment variables** in n8n Settings > Variables:
   - `GOOGLE_CUSTOM_SEARCH_KEY` - [Get from Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - `GOOGLE_CUSTOM_SEARCH_CX` - [Create at Programmable Search](https://programmablesearchengine.google.com/)
   - `OPENAI_API_KEY` - For content generation (WF-04)
   - `SERPAPI_KEY` - For trend scraping (WF-02), [get from SerpApi](https://serpapi.com/)

6. **Configure SMTP** (for WF-07 Outreach Runner):
   - Add an SMTP credential in n8n named "NEXUS SMTP"
   - Use your Gmail/Outlook app password settings

7. **Set webhook URL** in NEXUS SEO Settings > Integrations > n8n:
   - Local: `http://localhost:5678/webhook`
   - Cloud: `https://your-instance.app.n8n.cloud/webhook`

## All 8 Workflows

| # | File | Trigger | What it does |
|---|------|---------|--------------|
| 01 | `01-daily-rank-tracker.json` | Daily 6AM | Checks SERP positions for tracked keywords |
| 02 | `02-trend-scraper.json` | Every 6 hours | Scrapes Google Trends, auto-creates content briefs |
| 03 | `03-competitor-monitor.json` | Daily 7AM | Tracks competitor rankings for shared keywords |
| 04 | `04-content-generator.json` | Webhook `/content-generator` | Generates SEO articles from briefs via OpenAI |
| 05 | `05-technical-audit.json` | Webhook `/technical-audit` | PageSpeed audit, crawl pages, detect issues |
| 06 | `06-backlink-prospector.json` | Webhook `/backlink-prospector` | Finds guest post opportunities via Google Search |
| 07 | `07-outreach-runner.json` | Daily 9AM | Auto-sends outreach emails to new prospects |
| 08 | `08-search-console-sync.json` | Daily 7AM | Syncs Google Search Console data to keywords |

## Webhook URLs

After importing, these endpoints trigger workflows from the NEXUS app:

```
POST /webhook/content-generator     { client_id, brief_id }
POST /webhook/technical-audit       { client_id }
POST /webhook/backlink-prospector   { client_id }
```

## Required API Keys

| API | Used by | Free tier? |
|-----|---------|------------|
| Google Custom Search | WF-01, WF-03, WF-06 | 100 queries/day free |
| SerpApi (Google Trends) | WF-02 | 100 searches/month free |
| OpenAI | WF-04 | Pay-per-use |
| Google Search Console | WF-08 | Free (needs OAuth) |
| SMTP (Gmail/Outlook) | WF-07 | Free with app password |

## Architecture

```
NEXUS App (Next.js)
  |
  |-- triggers via POST --> n8n Webhooks (WF-04, 05, 06)
  |-- receives logs from --> n8n POST /api/webhooks/n8n
  |
n8n (self-hosted or cloud)
  |
  |-- reads/writes --> Neon PostgreSQL (shared DB)
  |-- calls --> Google APIs, OpenAI, SMTP
  |-- scheduled cron --> WF-01, 02, 03, 07, 08
```

All workflows log actions to `agent_action_log` table, which streams to the NEXUS dashboard via SSE.
