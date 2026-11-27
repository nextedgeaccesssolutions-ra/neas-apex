# NEAS Organic Traffic Growth Plan — 1,000 Views per Hour

## Objective and measurement

The requested stretch target is **1,000 genuine page views per hour sustained (24,000 page views per 24-hour day)**. This is a business growth target, not a forecast or guaranteed outcome. The system must not use bots, click farms, paid-to-surf networks, fabricated sessions, or other methods that inflate analytics or violate search-engine policies.

Count **GA4 page_view events** as the primary volume metric. Report users, sessions, engaged sessions, qualified leads, quote requests, phone/WhatsApp clicks, and conversion rate separately. Exclude known internal traffic, staging/preview domains, monitoring probes, and bot traffic where reliably identifiable. Never combine page views with users.

## Baseline captured from the NEAS Website Analytics screenshot

The admin dashboard showed the selected **last 28 days** view with:
- 5 users and 5 new users
- 10 sessions
- 22 page views
- 80% engagement rate
- 58 seconds average engagement per user
- 0 configured GA4 key events
- 0 active users in the last 30 minutes at capture time

These are a small sample and should be revalidated directly in GA4 before making investment decisions. The screenshot's daily chart also showed a peak of 6; it does not establish a sustained traffic rate.

## Growth model

Use staged gates rather than promising an immediate jump from the captured baseline to 24,000 views/day:

1. **Measurement integrity:** verify GA4 property, production hostname, timezone, consent behavior, page_view deduplication, internal-traffic filters, Search Console property, and sitemap/indexing status.
2. **Lead conversion foundation:** configure and QA key events for quote form submission, contact form submission, click-to-call, WhatsApp click, email click, and qualified enquiry. Do not mark generic page views as conversions.
3. **Technical SEO:** crawl canonical URLs, robots.txt, XML sitemap, redirects, 404s, metadata, structured data, mobile usability, Core Web Vitals, image dimensions/alt text, and indexability. Prioritize fixes by affected URLs and business value.
4. **Search demand capture:** map high-intent keywords to dedicated service and industry landing pages. Initial clusters: industrial rope access Philippines, wind turbine rope access, met mast installation/inspection, offshore/onshore access services, facade inspection/cleaning, NDT inspection, and rope access training. Publish only pages backed by actual NEAS capabilities, evidence, locations served, and project experience.
5. **Authority and distribution:** earn relevant supplier/client/industry links; publish project case studies with permission; distribute technical explainers through LinkedIn, Facebook, YouTube and relevant industry communities. Avoid bulk low-quality directory links and spun pages.
6. **Scale only proven channels:** compare organic landing-page sessions, qualified leads, and cost per qualified lead by channel. Expand topics and distribution that generate real enquiries, not merely impressions.

## KPI ladder

Track these as review thresholds, not guaranteed deadlines:

| Stage | Page views / day | Approx. hourly average | Exit condition |
|---|---:|---:|---|
| Verified baseline | Establish from GA4 | Establish from GA4 | Measurement QA complete |
| Stage 1 | 100 | 4.2 | Events and landing-page reporting reliable |
| Stage 2 | 500 | 20.8 | At least 3 relevant pages generate qualified enquiries |
| Stage 3 | 2,000 | 83.3 | Repeatable organic/referral growth with stable engagement |
| Stage 4 | 5,000 | 208.3 | Content clusters rank and convert across multiple services |
| Stage 5 | 10,000 | 416.7 | Acquisition sources diversified; lead handling capacity confirmed |
| Stretch target | 24,000 | 1,000 | 1,000 genuine page views/hour sustained across the day |

Averages can hide quiet periods. Report hourly distribution and peak-hour traffic separately. Do not claim the stretch target is achieved based on a single spike.

## Dashboard requirements

The NEAS analytics dashboard should expose:
- Date range and comparison period, with Asia/Manila timezone shown.
- Page views, users, sessions, engaged sessions, engagement rate, and average engagement time.
- Hourly page views and users for the selected period.
- Landing pages, source/medium, country, device, and channel group.
- Key events and qualified enquiries by landing page and source/medium.
- Search Console clicks, impressions, CTR, average position, top queries, and top landing pages.
- PageSpeed/Lighthouse mobile and desktop scores, Core Web Vitals field data when available, crawl/indexing errors, and sitemap status.
- Data freshness, connector status, and clear "no data" versus "zero" states.

## Integration and security requirements

- Google Search Console: read-only service-account access, exact approved property allowlist, server-side credentials only.
- GA4: use the existing authorized integration; do not request broader scopes than required for read-only reporting.
- PageSpeed Insights: use low-volume public API access initially; store no secrets in browser code.
- Bing Webmaster Tools: optional verified-site connector; keep credentials server-side.
- Scheduled audits: run as a Docker-compatible job with bounded concurrency, timeouts, retries, and request-rate limits. Respect robots.txt and do not crawl authenticated, private, or form-submission routes.
- Persist reports only through an explicitly approved data store. This plan does not authorize production database changes.
- Never deploy, publish, merge, or modify production from the audit workflow.

## Operating cadence

- Daily: monitor uptime, indexability regressions, broken high-value landing pages, key events, and qualified enquiries.
- Weekly: review Search Console query/page movement, landing-page conversion, content opportunities, and technical audit deltas.
- Monthly: prune or consolidate weak/duplicative pages, refresh successful content, review link quality, and compare qualified-lead yield by channel.

## Approval gates

This document is a planning artifact only. Implementation of new analytics events, scheduled jobs, database persistence, content publication, or production configuration requires separate review in a draft PR. Production deployment, merging, migrations, and public publishing remain approval-gated.
