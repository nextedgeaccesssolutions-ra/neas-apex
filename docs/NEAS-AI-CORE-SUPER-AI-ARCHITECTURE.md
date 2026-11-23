# NEAS AI CORE — Super AI Architecture and Implementation Plan

**Status:** Implementation branch; not merged or deployed  
**Target:** NEAS APEX  
**Operating mode:** Internal knowledge only; limited autonomy

## Product objective
NEAS AI CORE is the central intelligence and orchestration layer for NEAS OPC. It coordinates specialist agents, approved company knowledge, connected systems, and controlled workflows. It is not a claim of AGI or autonomous engineering authority.

## Non-negotiable policy
- Knowledge sources: owner-approved NEAS documents and authenticated, explicitly authorized NEAS company systems only.
- Public web search, public websites, external URL knowledge bases, and internet-derived factual retrieval are disabled as knowledge sources.
- Provider connectivity required to generate model responses is infrastructure, not permission to browse.
- Unknown, stale, contradictory, or inaccessible internal data must be disclosed rather than guessed.
- No connector is considered live until authentication, least-privilege scope, read/write behavior, and audit logging are tested.

## Intelligence architecture
1. **Core orchestrator:** intent detection, task decomposition, specialist routing, context assembly, response synthesis, and quality checks.
2. **Specialist agents:** Executive/CAIO, Engineering, Rope Access, HSEQ, Commercial/Finance, Projects, Renewable Energy, Offshore/Onshore/Power, Sales/CRM, Marketing, Training/Compliance, Procurement/Inventory, and Workforce.
3. **Internal knowledge plane:** document ingestion, OCR/parsing, metadata, versioning, permissions, retrieval, citations, freshness, and conflict resolution.
4. **Company data plane:** authenticated connectors for approved Drive/document stores, CRM, Gmail, Calendar, project/BOQ records, finance, HR/training, procurement, and inventory.
5. **Workflow plane:** task queue, approvals, idempotency, retries, execution logs, rollback/compensation, and notifications.
6. **Governance plane:** role-based access, source allowlists, action policy, human approvals, audit events, retention, and security monitoring.
7. **Evaluation plane:** regression tests, source-isolation tests, prompt-injection tests, authorization tests, factual-grounding tests, and cost/latency monitoring.

## Limited-autonomy matrix
### Automatically permitted (when authenticated and within assigned scope)
- Read and summarize authorized internal records.
- Classify and tag internal documents.
- Draft internal reports, BOQs, proposal sections, and follow-up messages without sending.
- Prepare project plans, task lists, and recommendations.
- Run read-only checks and report inconsistencies.

### Human approval required
- Sending any external email/message or publishing content.
- Issuing prices, quotations, discounts, contracts, purchase orders, or binding commitments.
- Payments, transfers, purchases, budget changes, or other spending.
- Safety-critical decisions, method statement approval, engineering sign-off, rescue authorization, and site-work release.
- Production deployments, DNS, secrets, security, permissions, or connector-scope changes.
- Mutations to customer, employee, supplier, financial, or official project records.

### Blocked
- Public-web research and internet-based knowledge retrieval.
- Credential disclosure or credential collection in chat.
- Fabricated records, certifications, prices, references, or tool execution claims.
- Autonomous approval of safety-critical or legally binding decisions.

## Specialist routing
The orchestrator must route by task and preserve a role-specific scope. A specialist response is advisory unless its connected permissions explicitly allow the requested read-only or pre-approved action. Specialist existence and count must be verified from the live registry; capability labels do not prove deployed agents.

## Internal knowledge lifecycle
1. Ingest only approved internal files or authorized connector records.
2. Capture source owner, classification, document ID, version, date, and access scope.
3. Parse and chunk with stable references; retain original source linkage.
4. Apply per-user/per-agent access filtering before retrieval.
5. Retrieve only from the internal allowlist; return source citations and freshness.
6. Detect conflicting versions and prefer the currently approved controlled copy.
7. Log ingestion, retrieval, edits, access failures, and deletion/retention events.

## Connector rollout
Each connector requires an owner, OAuth/service identity, minimum scopes, allowed data objects, read/write classification, approval policy, test account, revocation path, and audit events. Initial target integrations are NEAS-controlled Supabase/database, approved Drive/document store, Gmail, Calendar, CRM, project/BOQ, finance, HR/training, and procurement/inventory. This plan does not claim these are currently connected.

## Security and reliability
- Server-side secrets only; never expose credentials to browser code or model prompts.
- Enforce authentication, same-origin/CSRF protection, rate limits, tenant/user scoping, and schema validation.
- Treat retrieved files and connector content as untrusted data, not instructions.
- Apply prompt-injection defenses and never let retrieved text override system policy.
- Use idempotency keys, bounded retries, timeouts, and explicit action receipts.
- Keep production writes disabled until staged tests and operator approval.
- Separate test/demo data from real NEAS company records.

## Acceptance gates
1. No external/public web knowledge source can be invoked by the assistant.
2. Unauthorized connector and cross-user data access tests fail closed.
3. Answers with no internal evidence disclose the gap and do not invent details.
4. Every factual answer can identify its internal source or clearly state no source was available.
5. External communications, money, contracts, safety decisions, record mutations, and production changes require explicit human approval.
6. Low-risk read-only tasks work without approval and produce audit events.
7. All tests, type checks, security checks, and cost controls pass before production rollout.
8. Production release remains a separate, explicitly approved operation.

## Delivery phases
- A: Governance and internal-only policy foundation.
- B: Internal knowledge repository and permission-aware retrieval.
- C: Core orchestrator and specialist registry/routing.
- D: Company connector integrations and data quality.
- E: Approval workflow, task queue, audit trail, and low-risk automation.
- F: Multimodal document analysis, forecasting, and advanced specialist tools.
- G: Security/evaluation gates and controlled production release.

## Current known constraints
The existing chat route uses a Gemini API endpoint for inference and has role-based specialist prompt guidance, but the reviewed implementation does not show an internal NEAS retrieval layer or connected company data tools. The presence of an AI model API key is not equivalent to internal knowledge connectivity. The repository and deployment must be reconciled against the live Vercel application before release.
