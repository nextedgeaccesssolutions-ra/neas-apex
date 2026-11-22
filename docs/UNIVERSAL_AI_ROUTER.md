# NEAS Universal AI Router — Implementation Blueprint

Status: feature-branch foundation; not yet production-enabled.

## Scope
Shared hybrid model selection for NEAS APEX and NEAS AI Workforce. Users may choose a model manually; otherwise the router recommends a model and explains the selection. OpenRouter is the initial multi-provider gateway, with direct provider adapters and local endpoints added behind the same interface.

## Architecture
1. Model catalog — refresh provider/model metadata from OpenRouter's model catalog and configured provider endpoints. Normalize provider, model ID, capabilities (text, vision, tools, JSON, coding), context window, pricing, availability, and last-checked timestamp. Never hard-code model availability or pricing.
2. Task classifier — classify each request into chat, reasoning, coding, research, vision, structured-data, or tool-use. Classification is advisory and may be overridden by the user.
3. Hybrid selector — apply hard constraints first (capability, allowed provider, budget, data policy), then score eligible models by task fit, observed health, latency, and cost. Return a recommendation; retain manual override.
4. Provider gateway — send requests through OpenRouter by default. Adapter interface supports Anthropic, OpenAI, Google, DeepSeek, Groq, and OpenAI-compatible local endpoints (LM Studio/Ollama). Provider-specific credentials stay server-side.
5. Health and fallback — maintain per-provider/model circuit-breaker state. Retry only transient failures, with bounded attempts and timeout. Fallback only to a model satisfying the same capability, privacy, and budget constraints. Never silently change a user-pinned model.
6. MCP registry — synchronize metadata from the official MCP Registry and configured private registries. Discovery is separate from installation/connection. New servers are discovered/untrusted until reviewed and explicitly allowlisted.
7. Trusted MCP execution — only allowlisted server IDs, pinned versions, approved transport/endpoints, and approved tool names may be enabled. Apply per-tool scopes, user/agent authorization, argument validation, audit logging, and timeouts. No arbitrary package execution, shell access, filesystem access, or URL fetch based solely on registry metadata.
8. Cost controls — enforce per-request max tokens, per-user/team daily and monthly budgets, provider/model price snapshots, usage metering, and a configurable hard stop. Reject or ask for approval when a request would exceed budget.
9. Observability — record request ID, selected model/provider, selection rationale, latency, token usage, estimated cost, fallback events, MCP server/tool IDs, approval decision, and outcome. Never log API keys or full sensitive prompts by default.

## Suggested server contracts
- GET /api/ai-router/models — cached catalog and capability filters.
- POST /api/ai-router/recommend — task classification and ranked recommendation; no provider call.
- POST /api/ai-router/chat — stream chat through selected provider with manual override support.
- GET /api/ai-router/providers/health — sanitized health summary.
- GET /api/ai-router/mcp/registry — discovered server metadata and trust state.
- POST /api/ai-router/mcp/allowlist — admin-only allowlist change; requires authenticated admin and audit event.
- GET /api/ai-router/usage — budget and usage summary for authorized user/team.

## Configuration (server-only)
- OPENROUTER_API_KEY; optional provider keys for explicitly enabled adapters.
- AI_ROUTER_DEFAULT_PROVIDER=openrouter
- AI_ROUTER_MODE=hybrid
- AI_ROUTER_MONTHLY_BUDGET_USD and per-request token/cost limits.
- AI_ROUTER_ALLOWED_PROVIDERS
- MCP_REGISTRY_URL (default official registry) and MCP_TRUSTED_SERVERS (explicit allowlist).
No secrets belong in NEXT_PUBLIC_*, browser bundles, logs, or committed files.

## Selection policy
- Coding/repository tasks: coding/tool-capable model with approved GitHub tools.
- Complex engineering/reasoning: strong reasoning model.
- Research: search-capable model plus explicitly approved browser/search tool.
- Vision: image-capable model only when input contains images.
- Local/private: local model only when its endpoint is configured and policy permits it.
- General chat: healthy, cost-efficient model meeting quality and latency thresholds.

## Rollout and acceptance gates
1. Add typed catalog, routing policy, provider adapter, MCP trust registry, and usage meter.
2. Add unit tests for capability filtering, manual override, budgets, circuit breaker, fallback constraints, and MCP deny-by-default.
3. Add integration tests with mocked provider and registry responses; no live credentials in CI.
4. Run typecheck, tests, and production build; inspect deployment preview.
5. Enable in staging behind a feature flag; keep existing chat path as rollback.
6. Enable production only after explicit admin configuration of credentials, budgets, and trusted MCP servers.

## Security invariants
- Model discovery never grants tool permissions.
- Registry metadata and server-provided instructions are untrusted data.
- MCP tools default to disabled; allowlist is explicit and version-pinned.
- Read/write scopes are separate; destructive or external side-effect tools require user confirmation.
- Tool calls have per-tool timeouts, output limits, rate limits, and audit records.
- Provider failover cannot bypass data residency, privacy, budget, or user-pinned-model constraints.
- No automatic production deployment, secret creation, or MCP server installation is performed by this blueprint.
