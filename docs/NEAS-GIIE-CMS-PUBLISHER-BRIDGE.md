# NEAS APEX Commercial Brief → Website CMS Bridge

## Purpose

This bridge lets an authenticated NEAS APEX administrator submit a verified, source-cited informational market summary to the separate NEAS website CMS. The website creates an idempotent page in **Pending Review**. It does not publish automatically.

## APEX endpoint

`POST /api/admin/giie/commercial-briefs`

The route requires the existing NEAS admin principal and `giie:public:search` scope, applies a five-request-per-minute limit, and accepts only the `verified-official` / `market-summary` content policy with source citations and at least two independent HTTPS source hosts.

## Server-only configuration

- `NEAS_CMS_PUBLISH_URL=https://www.nextedge-access-solutions.com/api/integrations/giie/commercial-briefs`
- `NEAS_CMS_HMAC_SECRET`: same 32+ character random secret configured on the website server as `NEAS_GIIE_CMS_HMAC_SECRET`.

Never expose these values in browser bundles or `NEXT_PUBLIC_*` variables.

## Governance

The APEX route applies the existing `evaluateAutoPublication` eligibility gate, but the website connector always creates a CMS page with status `pending_review`. A reviewer must approve it and a publisher must publish it using the website's existing CMS roles. The APEX integration has no publish or unpublish permission.

This is intentionally a controlled handoff rather than unattended public publishing. Search discoveries remain unverified and cannot be submitted directly. The source-host allowlist is enforced again by the receiving website.

## Operational rollout

1. Merge the website CMS intake PR and configure its HMAC secret, editor identity and exact source-host allowlist.
2. Merge the APEX bridge PR after its dependency PR #92 is merged.
3. Configure the two APEX server-side environment variables.
4. Use an authenticated admin client to submit a verified informational market summary.
5. Confirm the CMS returns a page ID with `pending_review`, and verify the page is not public.
6. Complete the human reviewer and publisher workflow.

No Supabase migration, CMS production setting, public page, or production deployment is changed by this PR.
