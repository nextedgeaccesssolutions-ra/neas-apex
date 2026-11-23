import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { generateText, gateway } from "ai";
import { authorizeNeasScope, resolveNeasAdminPrincipalFromRequest } from "@/lib/neas-workforce-authz";
import { consumeRateLimit, isSameOriginBrowserRequest } from "@/lib/neas-api-security";
import { getNeasGatewayAuthMode, isSafeGatewayModelId, normalizeModelProbeTimeout } from "@/lib/neas-model-router";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ModelRoute = {
  route_name: string;
  provider: string;
  model: string;
  enabled: boolean;
  priority: number;
  timeout_ms: number;
  data_classification: string;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" },
  });
}

function supabaseConfig() {
  const baseUrl = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!baseUrl || !serviceKey) throw new Error("Model route storage is not configured.");
  const parsed = new URL(baseUrl);
  if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".supabase.co")) throw new Error("Model route storage URL is invalid.");
  return { baseUrl, serviceKey };
}

async function supabaseRequest<T>(path: string, method: "GET" | "POST" | "PATCH", body?: unknown): Promise<T> {
  const { baseUrl, serviceKey } = supabaseConfig();
  const response = await fetch(new URL("rest/v1/" + path, baseUrl + "/"), {
    method,
    headers: {
      apikey: serviceKey,
      Authorization: "Bearer " + serviceKey,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(method === "GET" ? {} : { Prefer: "return=representation" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("Model validation storage request failed.");
  if (response.status === 204) return [] as T;
  return await response.json() as T;
}

async function loadEnabledRoutes(): Promise<ModelRoute[]> {
  const params = new URLSearchParams({
    select: "route_name,provider,model,enabled,priority,timeout_ms,data_classification",
    enabled: "eq.true",
    order: "priority.asc",
    limit: "10",
  });
  return supabaseRequest<ModelRoute[]>("aiw_model_routes?" + params.toString(), "GET");
}

async function beginAudit(actorId: string, requestId: string, details: Record<string, unknown>) {
  const rows = await supabaseRequest<Array<{ id: string }>>("aiw_audit_events", "POST", {
    actor_type: "human",
    actor_id: actorId,
    action: "ai.model.live_probe",
    resource_type: "aiw_model_route",
    resource_id: null,
    outcome: "pending",
    details,
    request_id: requestId,
  });
  if (!rows[0]?.id) throw new Error("Model probe audit record could not be created.");
  return rows[0].id;
}

async function completeAudit(id: string, outcome: "success" | "failure", details: Record<string, unknown>) {
  const params = new URLSearchParams({ id: "eq." + id });
  await supabaseRequest("aiw_audit_events?" + params.toString(), "PATCH", {
    outcome,
    details,
  });
}

export async function GET(request: NextRequest) {
  const principal = resolveNeasAdminPrincipalFromRequest(request);
  if (!principal) return jsonError("Authentication required.", 401);
  if (!authorizeNeasScope(principal, "models:read").allowed) return jsonError("Insufficient model read permissions.", 403);

  try {
    const routes = await loadEnabledRoutes();
    return NextResponse.json({
      validationEnabled: process.env.NEAS_LIVE_MODEL_VALIDATION_ENABLED === "true",
      gatewayAuthMode: getNeasGatewayAuthMode({
        AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY,
        VERCEL: process.env.VERCEL,
      }),
      configuredRoutes: routes.map((route) => ({
        routeName: route.route_name,
        provider: route.provider,
        model: route.model,
        priority: route.priority,
        timeoutMs: route.timeout_ms,
        dataClassification: route.data_classification,
      })),
      liveValidated: false,
      note: "This endpoint reports configuration only. A live inference probe requires the feature flag and explicit spend confirmation.",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return jsonError("Model route configuration is unavailable.", 503);
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginBrowserRequest(request)) return jsonError("Request not permitted.", 403);
  const principal = resolveNeasAdminPrincipalFromRequest(request);
  if (!principal) return jsonError("Authentication required.", 401);
  if (!authorizeNeasScope(principal, "models:validate").allowed) return jsonError("Insufficient model validation permissions.", 403);

  const rate = consumeRateLimit(request, "neas-live-model-probe", 1, 10 * 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ error: "A live model probe was recently attempted. Wait before retrying." }, {
    status: 429,
    headers: { "Retry-After": String(rate.retryAfterSeconds), "Cache-Control": "no-store" },
  });

  let payload: unknown;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 2_048) return jsonError("Probe request is too large.", 413);
    payload = JSON.parse(raw);
  } catch {
    return jsonError("Invalid model probe request.", 400);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload) || (payload as Record<string, unknown>).confirmSpend !== true) {
    return jsonError("Explicit confirmSpend=true is required for a billable live model probe.", 428);
  }
  if (process.env.NEAS_LIVE_MODEL_VALIDATION_ENABLED !== "true") {
    return jsonError("Live model validation is disabled by the server feature flag.", 503);
  }

  const authMode = getNeasGatewayAuthMode({
    AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY,
    VERCEL: process.env.VERCEL,
  });
  if (authMode === "unavailable") return jsonError("AI Gateway authentication is not configured for this deployment.", 503);

  const requestId = randomUUID();
  let auditId: string | undefined;
  let modelRoute: ModelRoute | undefined;
  try {
    const routes = await loadEnabledRoutes();
    modelRoute = routes.find((route) => route.provider === "vercel-ai-gateway" && isSafeGatewayModelId(route.model));
    if (!modelRoute) return jsonError("No valid enabled Vercel AI Gateway model route is configured.", 503);

    auditId = await beginAudit(principal.subject, requestId, {
      route_name: modelRoute.route_name,
      provider: modelRoute.provider,
      model: modelRoute.model,
      auth_mode: authMode,
      purpose: "synthetic-connectivity-probe",
    });

    const startedAt = Date.now();
    const result = await generateText({
      model: gateway(modelRoute.model),
      prompt: "Reply with exactly NEAS_MODEL_PROBE_OK and no other text.",
      maxOutputTokens: 24,
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(normalizeModelProbeTimeout(modelRoute.timeout_ms)),
      temperature: 0,
    });
    const latencyMs = Date.now() - startedAt;
    const passed = result.text.trim() === "NEAS_MODEL_PROBE_OK";
    const usage = result.usage;
    const details = {
      route_name: modelRoute.route_name,
      provider: modelRoute.provider,
      model: modelRoute.model,
      auth_mode: authMode,
      latency_ms: latencyMs,
      input_tokens: usage.inputTokens ?? null,
      output_tokens: usage.outputTokens ?? null,
      output_valid: passed,
      purpose: "synthetic-connectivity-probe",
    };
    await completeAudit(auditId, passed ? "success" : "failure", details);
    if (!passed) return jsonError("The configured model responded, but failed the exact probe assertion.", 502);
    return NextResponse.json({
      ok: true,
      validated: true,
      routeName: modelRoute.route_name,
      provider: modelRoute.provider,
      model: modelRoute.model,
      latencyMs,
      inputTokens: usage.inputTokens ?? null,
      outputTokens: usage.outputTokens ?? null,
      message: "Live model inference succeeded. This confirms connectivity only, not full production quality or tool execution.",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (auditId) {
      await completeAudit(auditId, "failure", {
        route_name: modelRoute?.route_name ?? null,
        provider: modelRoute?.provider ?? null,
        model: modelRoute?.model ?? null,
        auth_mode: authMode,
        purpose: "synthetic-connectivity-probe",
        failure: error instanceof Error ? error.message.slice(0, 240) : "Unknown model probe failure.",
      }).catch(() => undefined);
    }
    return jsonError("Live model probe failed. Check AI Gateway authentication, model availability, and project spend controls.", 502);
  }
}
