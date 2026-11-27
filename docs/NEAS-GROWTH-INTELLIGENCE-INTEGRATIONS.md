# NEAS Growth Intelligence — Integration and deployment plan

## Architecture

NEAS APEX remains the orchestration and governance layer. The public website remains the publishing destination. Third-party tools run as separate services or CI jobs; their source code is not copied into either production application.

| Capability | Component | Integration boundary | Current rollout state |
|---|---|---|---|
| Commercial intelligence | APEX GIIE | Existing hourly collector and Supabase-backed research queue | Existing engine merged; source leads remain unverified |
| Workflow automation | Activepieces | Signed server-to-server webhook from APEX | Optional adapter added; service and webhook not provisioned |
| CRM | Twenty | Activepieces API action after human qualification | Separate deployment and API credentials required |
| Viral research | Viral Scout | Scheduled export / reviewed JSON into GIIE ingestion | Separate Python app; free-source-only configuration required |
| Cross-platform trends | AI Trends Tracker | Reviewed JSON into GIIE ingestion | License and upstream dependency review required |
| Technical SEO | Lighthouse | Website pull-request CI audit | Added in the website integration PR |
| CMS intake | Website CMS | Existing signed APEX bridge | Separate draft PRs #93 and #273; Pending Review only |

## Activepieces webhook

The APEX collector can optionally send a signed alert batch after public commercial leads have been persisted. The event is deliberately limited to public research metadata and explicitly labels every item as `unverified` and `blocked_unverified`. It is suitable for internal alerts, triage queues and review reminders only.

Server-only APEX environment variables:

- `ACTIVEPIECES_GIIE_WEBHOOK_URL`: the Activepieces incoming webhook URL.
- `ACTIVEPIECES_GIIE_WEBHOOK_SECRET`: random secret with at least 32 characters, shared only with the receiving flow.

The sender uses HTTPS only, rejects credential-bearing/local/IP-literal endpoints, refuses redirects, applies an eight-second timeout, and signs the exact serialized JSON body with HMAC-SHA256. Headers are `X-NEAS-Timestamp`, `X-NEAS-Request-Id`, `X-NEAS-Signature`, and `X-NEAS-Event-Type`. The receiver must validate the timestamp window, request UUID and HMAC before processing.

Recommended first Activepieces flow:

1. Receive the signed GIIE event.
2. Verify HMAC and reject stale timestamps / replayed request IDs.
3. Deduplicate by `signal_key`.
4. Notify the NEAS internal review queue (email/Slack/Teams as configured).
5. Do not create a CRM opportunity or send an external message from this unverified event.

A later, separately approved flow may create a Twenty CRM record only after a NEAS user verifies the source evidence, confirms a real buyer or agency, records a relevant contact through a lawful source, and changes the lead to qualified. External email, WhatsApp, SMS, bid submission, or proposal sending must remain human-approved.

## Source and content governance

- A public search result is a lead, not proof of an award, budget, buyer, contract value or procurement status.
- Official source claims require direct source inspection, date checks, source-host allowlisting and independent corroboration.
- A PhilGEPS notice is not an award. An award record must be separately identified and its awardee, agency, amount and date captured from the source record.
- Viral Scout and AI Trends Tracker outputs are trend indicators, not evidence of project demand or procurement awards.
- Only low-risk informational summaries may enter the existing CMS intake, and the website connector creates `pending_review` pages only. Human review and publisher release remain mandatory.

## Licensing and dependency review

- Activepieces core repository license: MIT outside the documented enterprise directories; do not copy `packages/ee/` or enterprise API directories without reviewing their separate license.
- Twenty: primarily AGPLv3 with an application exception; enterprise-marked files are commercial. Keep Twenty as a separately deployed service and integrate through its published API. Review AGPL obligations before modifying or distributing the Twenty server.
- Viral Scout: MIT. Its README describes optional Apify-based Instagram/TikTok/Google Trends and ad research features that may incur usage charges. Keep paid Apify features disabled unless separately approved.
- AI Trends Tracker fork: no LICENSE file is present in this fork. Do not redistribute or deploy it commercially until the upstream repository license and dependency terms are confirmed. Its README also lists paid API-key options; use only approved free sources until costs are authorized.
- Lighthouse: Apache-2.0. Use the Lighthouse CLI in CI rather than vendoring the full repository into the website.

## Existing infrastructure finding

The connected Render workspace visible during this audit is named `NEAS TRADING INTELLIGENCE` and contains only trading-intelligence services. No NEAS APEX / website growth-services workspace or existing Activepieces / Twenty service was visible there. No new paid service, database, disk, or workspace has been created. Do not deploy Activepieces or Twenty into the trading workspace.

Activepieces and Twenty need persistent application infrastructure and database services. Before provisioning them, identify the correct NEAS workspace and approve the selected plan/cost. Existing Vercel projects are suitable for the Next.js applications and preview builds, not as a substitute for persistent Docker services.

## Rollout sequence

1. Review and merge neither connector until PR #93 and PR #273 have been independently approved.
2. Configure the Activepieces webhook URL and HMAC secret in preview only; run a signed alert test using unverified test data.
3. Deploy Activepieces and Twenty to a confirmed NEAS application workspace with persistent storage and backups.
4. Configure Activepieces to create internal alerts only; add a manual approval gate before CRM writes.
5. Configure Twenty API credentials in Activepieces, not in browser code or public website environment variables.
6. Review Viral Scout's free-source configuration; leave Apify-backed features disabled.
7. Resolve AI Trends Tracker licensing before deployment or redistribution.
8. Review Lighthouse reports from website pull requests and establish baselines before enforcing score thresholds.

## Explicitly out of scope for this rollout

No production database migration is applied, no production secrets are set, no external outreach is sent, no proposal or bid is submitted, no CMS page is publicly published, and no production service is deployed by these changes.
