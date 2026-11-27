# NEAS SEO Intelligence (read-only)

## Purpose
This feature adds a read-only technical SEO audit to NEAS APEX. It audits the approved public NEAS website origin, checks homepage HTTP/metadata/canonical/H1/viewport/noindex, reads robots.txt and sitemap.xml, and requests mobile Lighthouse category scores from Google's PageSpeed Insights API.

## API
- `GET /api/admin/seo/audit`
- Requires the existing NEAS admin session and `giie:public:search` scope.
- Rate-limited to five requests per hour.
- Returns a JSON report; it does not write to Supabase or any database.

## Free data sources
- Google Search Console API: free, OAuth 2.0 required for private property data; subject to quotas. Use for query/page clicks, impressions, CTR, average position, and sitemap reporting after an administrator configures consented OAuth credentials.
- Google PageSpeed Insights API: can be called without an API key for low-volume use; key recommended for frequent automated use. The audit uses mobile Lighthouse scores and does not depend on CrUX field data.
- Lighthouse CLI: Apache-2.0, local repeatable audits for CI/preview builds.
- Bing Webmaster Tools API: available for verified site owners; API key or OAuth required. Use current JSON/REST endpoints only; legacy SOAP/POX endpoints must not be used.
- Native HTTP checks: sitemap, robots, canonical and metadata are fetched directly from the approved NEAS origin.

## Safety
- Target host is hard allowlisted to `www.nextedge-access-solutions.com` and `nextedge-access-solutions.com`.
- HTTPS only, no URL credentials or custom ports.
- Redirects are manually followed only when they remain on the approved origin.
- No arbitrary URL parameter, open proxy, third-party crawling, database migration, search-engine URL submission, CMS write, or public publishing is implemented.
- PageSpeed errors are warnings and do not fail the complete audit.
- No new runtime dependencies are introduced.

## Future Search Console/Bing connector
Private search performance requires explicit administrator OAuth/API credentials and verified property ownership. This PR deliberately does not request tokens, change Google/Bing accounts, or store credentials. A follow-up can add server-side encrypted token storage after the owner approves the auth flow and secret location.
