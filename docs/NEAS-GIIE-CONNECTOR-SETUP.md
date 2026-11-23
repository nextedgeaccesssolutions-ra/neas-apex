# GIIE connector configuration

## Public search provider

The initial search adapter uses Brave Search API. Configure these server-only Vercel environment variables for the preview environment first:

- `GIIE_PUBLIC_SEARCH_ENABLED=true`
- `BRAVE_SEARCH_API_KEY=<provider-issued key>`

The keys must never use a `NEXT_PUBLIC_` prefix. The endpoint is `POST /api/giie/search` and requires `Authorization: Bearer <GIIE_CONNECTOR_API_TOKEN>`; it is intended for trusted server-to-server callers, not direct browser exposure. It uses constant-time token comparison, per-IP rate limiting, bounded query length, bounded result count, no-store responses, and provider error normalization. It returns discovery leads with source URLs; it does not claim those results are verified or persist them. Do not enable this endpoint until the token is generated, stored as a server-only Vercel environment variable, and the internal caller is authorized.

Do not include confidential NEAS documents, client information, pricing, employee details, project records, or credentials in public search queries.

## RSS feeds

Configure server-only environment variables:

- `GIIE_RSS_FEEDS`: JSON array such as `[{"name":"Publisher feed","url":"https://feeds.example.org/rss.xml"}]`
- `GIIE_RSS_ALLOWED_HOSTS`: comma-separated exact hostnames such as `feeds.example.org`

Only HTTPS feed URLs on explicitly allowlisted exact hostnames are fetched. Redirects are rejected, responses are limited to 1 MB, timeouts are enforced, and malformed items are skipped. This is not a general-purpose URL fetch endpoint. Feed terms and robots policies must be reviewed by an administrator before configuration.

## Current limitations

- No provider credentials were added to the repository or Vercel.
- Public search remains disabled unless the server feature flag is enabled.
- RSS feed configuration is empty until an administrator supplies reviewed sources.
- Search results and RSS items are returned as discovery leads; persistence, deduplication, source verification, and scheduled ingestion are separate next milestones.
- No database migration has been applied. The SQL migration is committed for review only.

## Controlled persistence endpoint

The server-side persistence adapter writes validated public discovery metadata to `public.giie_discoveries` using Supabase REST. It requires server-only `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, and never exposes the service key to a client.

The endpoint `POST /api/giie/ingest` is disabled unless `GIIE_INGESTION_ENABLED=true` and requires the same server-to-server `GIIE_CONNECTOR_API_TOKEN`. It validates the public knowledge-space label, source URL, source metadata, lawful summary, dates, and confidence; normalizes source URLs; and ignores duplicate normalized URLs. New rows remain `review_required=true`. The route does not mark sources verified or approve opportunity implementation.

Do not enable ingestion until the database migration has been reviewed and applied, the service-role key is stored server-side, and the internal caller is authorized.
