# SUPER AI — Security, Privacy and Agent Governance

**Status:** Required design baseline; independent security review remains mandatory.

## Trust boundaries

- Browser and mobile clients are untrusted.
- User prompts, uploaded files, web pages, retrieved documents, agent outputs, and connector responses are untrusted data.
- Model output is not authorization.
- Only server-side policy and verified identity may authorize access or actions.
- NEAS internal systems and SUPER AI customer systems are separate trust domains.

## Identity and tenant security

- Use a supported identity provider with verified sessions and secure cookie settings.
- Require organization membership checks on every tenant-scoped server operation.
- Enforce RLS in PostgreSQL as defense in depth.
- Never rely on a client-supplied organization ID, prompt instruction, or hidden UI control for access control.
- Support role separation: owner, admin, billing admin, member, developer, read-only auditor.
- Require MFA for privileged accounts and enterprise administration where supported.
- API keys are scoped, hashed, revocable, expiry-aware, and rate-limited.

## Agent execution policy

Risk classes:

- Read-only: retrieve permitted tenant data and produce analysis.
- Draft: prepare proposed content without sending or committing.
- Low-risk execution: execute pre-approved, reversible actions within explicit limits.
- High-impact: external communication, financial activity, purchases, contracts, data deletion, production changes, or safety-critical actions; require explicit human approval and, where appropriate, dual control.
- Prohibited: arbitrary shell access, unrestricted filesystem/network access, credential exfiltration, bypassing tenant boundaries, and actions outside granted tool scopes.

Each tool has a typed schema, least-privilege scopes, timeout, output limit, rate limit, idempotency behavior, audit event, and explicit owner. Tool discovery does not grant execution permission.

## Prompt injection and data handling

- Treat all retrieved and user-provided content as data, never higher-priority instructions.
- Separate system policy, user intent, retrieved evidence, and tool results.
- Use allowlisted tools and validate arguments server-side.
- Do not allow a model to construct arbitrary URLs, SQL, shell commands, or unrestricted connector calls.
- Apply source licensing, terms, robots directives, privacy, and rate limits to research ingestion.
- Keep confidential customer data out of public search/indexing providers unless an explicit approved processing agreement and configuration allow it.
- Minimize sensitive prompt and trace retention; redact secrets and personal data.

## Secrets and integrations

- Server-side secret manager only; no credentials in source, client bundles, logs, prompts, or public environment variables.
- OAuth connections use minimum scopes, encrypted token storage, revocation and rotation.
- Separate read and write scopes.
- Never expose service-role database keys to clients.
- Payment data is handled by the payment provider; SUPER AI stores provider references and non-sensitive billing state only.

## Reliability and abuse controls

- Durable queue with leases, bounded retries, dead-letter handling, cancellation, and execution timeouts.
- Distributed rate limits and organization-level quotas.
- Per-run, per-user, and per-organization spending caps.
- Circuit breakers and constrained model fallback.
- Audit logs for authentication, permissions, billing changes, approvals, tool calls, and administrative actions.
- Backups, restore drills, incident response, vulnerability management, and dependency scanning.

## Privacy and compliance workstream

Before public launch, determine applicable jurisdictions and obligations, including privacy notices, lawful basis/consent where relevant, data processing agreements, subprocessors, cross-border transfers, data subject requests, retention/deletion, breach response, and children's data restrictions. Obtain qualified legal advice; this document is not legal advice or a compliance certification.

## Security acceptance gates

- Automated cross-tenant RLS and API authorization tests pass.
- No secrets in repository, build output, browser bundle, or logs.
- Webhook signatures and API key scopes verified.
- Prompt-injection and tool-argument adversarial tests pass.
- High-impact actions cannot bypass approval.
- Distributed rate limiting and budget enforcement are verified under concurrency.
- Backup restore and incident-response exercises are documented.
- Independent security review has no unresolved critical/high findings before production.
