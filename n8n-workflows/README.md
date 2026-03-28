# NEXUS-SEO n8n Workflows

Import these JSON files into your n8n instance to enable automation.

## Setup

1. Install [n8n](https://n8n.io) locally or use n8n Cloud
2. Configure a PostgreSQL credential pointing to your Neon database
3. Import each workflow JSON via n8n UI (Workflows > Import from File)
4. Update the Postgres credential ID in each workflow
5. Set your API keys in n8n credentials (Google, OpenAI, etc.)

## Workflows

| File | Trigger | Description |
|------|---------|-------------|
| `01-daily-rank-tracker.json` | Schedule (daily 6AM) | Checks SERP positions for tracked keywords via Google Custom Search |
| `02-trend-scraper.json` | Schedule (every 6h) | Scrapes Google Trends, auto-creates content briefs for relevant trends |
| `03-competitor-monitor.json` | Schedule (daily) | Tracks competitor rank movements for shared keywords |
| `04-content-generator.json` | Webhook | Generates SEO articles from briefs using OpenAI |
| `05-technical-audit.json` | Schedule (weekly) + Webhook | Crawls sitemaps, checks PageSpeed, detects technical issues |
| `06-backlink-prospector.json` | Webhook | Discovers guest post opportunities via Google Custom Search |
| `07-outreach-sequence.json` | Schedule (daily) | Sends pending email/WhatsApp outreach messages |
| `08-search-console-sync.json` | Schedule (daily) | Imports Google Search Console data into keywords table |

## Environment Variables

Set these in n8n:
- `NEON_CONNECTION_STRING` - Your Neon PostgreSQL connection string
- `GOOGLE_CUSTOM_SEARCH_KEY` - Google Custom Search API key
- `GOOGLE_CUSTOM_SEARCH_CX` - Custom Search engine ID
- `OPENAI_API_KEY` - For content generation
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` - For email outreach

## Webhook URLs

After importing webhook-triggered workflows, note the webhook URLs and configure them in your NEXUS-SEO `.env.local`:

```
N8N_WEBHOOK_URL=http://your-n8n-instance:5678/webhook
```

The app calls these webhook paths:
- `/content-generator` - Content generation pipeline
- `/technical-audit` - Technical audit trigger
- `/backlink-prospector` - Backlink discovery
- `/trend-scraper` - Manual trend discovery
