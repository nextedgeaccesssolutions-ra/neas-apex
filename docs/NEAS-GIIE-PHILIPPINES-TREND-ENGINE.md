# NEAS GIIE — Philippines Trend Intelligence Engine

## Architecture

The Philippines trend collector extends the existing NEAS APEX GIIE public-intelligence system. It does not replace GIIE, the AI Workforce, the website CMS, or the existing five-minute workforce worker.

- Collection schedule: GitHub Actions, hourly (0 * * * *).
- Philippines search trends: Google Trends public RSS feed for geo=PH.
- Industry discovery: existing Brave Search adapter, two queries per hourly run.
- Coverage: twelve rotating topic groups spanning energy, construction, manufacturing, agriculture, tourism, transport/logistics, technology/telecom, finance/commerce, healthcare, education/workforce, government/procurement, and environment/climate.
- Storage: Supabase giie_trend_observations and giie_trend_runs.
- Execution: scripts/giie-ph-trend-collector.ts calls lib/giie-ph-trends.ts.
- Tests: tests/neas-giie-ph-trends.test.ts.

The collector does not crawl arbitrary websites. It consumes the Google Trends feed and Brave Search API results, preserving source URLs and short excerpts. It does not scrape social platforms, bypass access controls, or collect personal information.

## Scoring semantics

Two distinct metrics are stored:

1. google_trends_rank_priority_v1: priority derived from the item's position in the Google Trends feed. The feed's approximate traffic label is retained as supplied. It is not a precise monthly search volume.
2. web_discovery_priority_v1: a transparent heuristic based on Philippines relevance, commercial-signal terms, and the age of a source date. It is not a search-growth percentage, keyword volume, or verified demand metric.

Do not combine the two metrics as if they were the same measurement. A later analytics layer may calculate hourly recurrence, rank movement, and trend velocity from stored observations. Such calculations require enough historical observations and must be labeled as derived estimates.

## Required GitHub Actions secrets

Add these repository secrets under Settings → Secrets and variables → Actions:

- BRAVE_SEARCH_API_KEY — provider-issued Brave Search API key.
- SUPABASE_URL — HTTPS URL of the NEAS Supabase project.
- SUPABASE_SERVICE_ROLE_KEY — server-only Supabase service-role key. Never add it to a public variable or client-side code.

The workflow runs npm ci and npx tsx scripts/giie-ph-trend-collector.ts. It has no dependency on the Vercel deployment URL or Vercel Deployment Protection.

## Database rollout

Review and apply supabase/migrations/202611270001_giie_ph_trend_intelligence.sql to the existing NEAS Supabase project before enabling the scheduled workflow.

The migration:
- creates public trend-observation and run-history tables;
- enables and forces RLS;
- denies anonymous and ordinary authenticated writes;
- permits authenticated NEAS users with an active role to read trend observations;
- restricts run-history reads to active NEAS administrators;
- grants service-role access for the server-side collector only.

The migration is not applied automatically by this repository workflow.

## Operational guardrails

- One industry group is queried each hour; all twelve groups rotate across a twelve-hour cycle.
- The Google Trends Philippines feed is checked every hour.
- Search provider failures are reported as partial runs when another source still provides observations.
- Each observation is deduplicated by source identity and UTC hour.
- No confidential NEAS data or customer data is sent to external search providers.
- No AI-generated factual claims are published from a trend signal alone.
- Search observations are research leads, not verified facts or business opportunities.
- Commercial assessments, engineering/safety advice, tender submissions, price changes, customer communications, and production website code remain governed by their existing approval workflows.

## Website and publishing integration — next phase

This PR establishes hourly collection and governed storage. It does not yet publish public website content. The next integration should expose an authenticated APEX trend dashboard, then connect approved low-risk educational content drafts to the NEAS website CMS. Automatic publishing should be limited to source-cited, quality-checked informational content; company claims, project references, certifications, safety procedures, prices, and tender content require owner review.
