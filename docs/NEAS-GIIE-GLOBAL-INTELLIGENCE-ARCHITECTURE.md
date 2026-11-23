# NEAS GIIE — Global Knowledge Discovery & Innovation System

## Purpose

GIIE is the public-source research and opportunity-discovery subsystem reporting to the NEAS AI CORE Master Brain. It broadens the prior internal-only knowledge policy without weakening confidentiality: public research and confidential NEAS records are separate knowledge spaces with separate access policies, provenance, retention, and retrieval filters.

## Knowledge boundaries

1. **Public Global Intelligence** contains lawful metadata, source references, short attributed summaries, evidence labels, and derived opportunity assessments from public/authorized sources.
2. **Confidential NEAS Internal** contains owner-approved company documents and authorized connected company records.
3. Retrieval must always declare a knowledge space. A public research query cannot retrieve confidential company records unless the user is authorized and the task explicitly requests a governed comparison.
4. External findings never become NEAS procedures, verified project facts, or engineering approvals merely because they are relevant.
5. Public information is not a substitute for licensed standards, professional engineering judgment, site verification, or approved HSEQ procedures.

## Discovery adapters

Implement source adapters behind a common interface. Each adapter must declare source type, authentication method, quotas, terms/robots requirements, update cadence, and permitted fields. Initial adapter order:

- Official government and public tender APIs / RSS.
- Official standards organization announcements and public metadata.
- Academic metadata and open-access repositories.
- Official patent search interfaces.
- Open-source repository APIs.
- Renewable energy, power, construction and industrial publisher feeds.
- Public competitor announcements and public project notices.
- Public forums and video metadata only as low-confidence discovery signals.

Do not implement indiscriminate crawling. No bypass of paywalls, login, CAPTCHA, robots directives, access controls, or rate limits. Prefer APIs and feeds. Use conditional requests, caching, exponential backoff, source-specific quotas, and a kill switch.

## Normalized discovery record

The GIIE discovery type captures title, original URL, source organization/type, dates, subjects, concept, problem, solution, technology, industry, geography, evidence class, status, lawful summary, corroborating sources, contradictions, confidence, freshness, and license notes.

Store metadata and short lawful summaries rather than bulk copies of copyrighted material. Preserve source URL and retrieval timestamp. Deduplicate using normalized URL and content fingerprint. Keep versions when a source materially changes.

## Evidence and verification

Evidence classes:
- verified-official
- peer-reviewed-research
- credible-secondary
- industry-opinion
- unverified-claim
- ai-generated-hypothesis

Do not mark an item verified merely because an AI model says it is true. For high-impact claims, require a primary source or multiple independent credible sources. Distinguish source publication date from discovery date. Flag stale, conflicting, or unsupported claims. AI-generated hypotheses remain explicitly labeled.

## NEAS opportunity translation

Score relevance using industry fit, credibility, commercial value, feasibility, geography, and urgency. Do not fabricate potential clients, investment costs, revenue, pricing, market size, or demand. Missing figures must be marked unknown or estimated with a stated basis and confidence. Every opportunity includes competencies, equipment, investment basis, revenue model, feasibility, roadmap, risks, evidence gaps, and a recommended next action. Commercialization remains approval-gated.

## Research workforce

Register the 12 research roles in `lib/neas-giie.ts`. These are role definitions, not proof of 12 running model agents. They must be mapped to authenticated runtime agents only after provider/model routing, permissions, costs, health checks, and evaluation are configured.

## Storage and dashboard target

A future migration should create isolated public-intelligence tables for sources, discoveries, discovery versions, evidence links, opportunity assessments, research jobs, and review decisions. Use PostgreSQL full-text search first; add pgvector only after selecting an embedding model, dimensions, retention rules, and cost budget. Apply RLS by knowledge space, tenant, role, and record sensitivity. Do not apply schema changes until migration review and explicit approval.

Dashboard target: discovery feed, trend clusters, opportunity pipeline, competitor watch, tender watch, verification queue, source freshness/coverage, agent/job activity, and research-cost reporting. Display source date and verification class on every result.

## Continuous intelligence

Support configurable hourly/daily source checks where provider quotas permit, weekly industry briefs, monthly innovation reports, and quarterly strategic opportunity assessments. Avoid duplicate alerts by comparing normalized URLs, fingerprints, and material content changes. A scheduler must be idempotent and observable, with retries, dead-letter handling, source-level pause controls, and budget ceilings.

No recurring schedule is active merely because this architecture describes one. Schedules must be configured by an authorized administrator.

## Current implementation boundary

Implemented in this tranche:
- Typed GIIE discovery, source-policy, evidence, opportunity and pipeline definitions.
- Twelve research-role definitions.
- Provenance and confidence validation.
- Evidence classification helper.
- Independent-source-domain corroboration helper.
- NEAS relevance scoring helper.
- Governance flags for legal collection, source attribution, separation of public/internal data, and approval-gated commercialization.
- Unit tests authored.

Not yet implemented or verified:
- Search-provider credentials or API adapters.
- RSS ingestion, compliant page fetchers, or scheduled discovery.
- Supabase schema, RLS policies, vector extension, or ingestion workers.
- Live research-agent model runtimes.
- Dashboard, alerts, source coverage, and cost accounting.
- Passing CI for the new GIIE tests.

The module does not fetch the internet or persist data. It is a tested-by-design foundation until CI and live integrations are verified.
