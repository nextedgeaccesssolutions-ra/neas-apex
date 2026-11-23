import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { authorizeNeasScope, resolveNeasAdminPrincipalFromRequest } from "@/lib/neas-workforce-authz";
import { consumeRateLimit, isSameOriginBrowserRequest } from "@/lib/neas-api-security";
import { getNeasWorkerConfigStatus } from "@/lib/neas-workforce-worker-config";
import { decideNeasTaskExecution, type NeasTaskOperation } from "@/lib/neas-ai-orchestrator";
import {
  getNeasApprovalCategory,
  getNeasTaskInitialStatus,
  hasNeasTaskControlGrant,
  isNeasTaskOperation,
} from "@/lib/neas-workforce-task-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AgentRow = {
  agent_id: string;
  name: string;
  department_code: string;
  enabled: boolean;
  execution_mode: "draft_only" | "execute_approved" | "disabled";
  runtime_status: string;
  tools: unknown;
  permissions: unknown;
};

type TaskRow = {
  id: string;
  title: string;
  objective: string;
  agent_id: string;
  department_code: string;
  status: string;
  priority: string;
  requires_approval: boolean;
  approval_category: string | null;
  created_at: string;
  updated_at: string;
  error_message: string | null;
};

class SupabaseRestError extends Error {
  constructor(readonly status: number) {
    super("NEAS workforce database request failed.");
  }
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" },
  });
}

function supabaseConfig() {
  const baseUrl = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!baseUrl || !serviceKey) throw new Error("NEAS workforce storage is not configured.");
  const parsed = new URL(baseUrl);
  if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".supabase.co")) {
    throw new Error("NEAS workforce storage URL is invalid.");
  }
  return { baseUrl: parsed.toString().replace(/\/$/, ""), serviceKey };
}

async function supabaseRequest<T>(
  path: string,
  method: "GET" | "POST" | "PATCH",
  body?: unknown,
): Promise<T> {
  const config = supabaseConfig();
  const response = await fetch(new URL("rest/v1/" + path, config.baseUrl + "/"), {
    method,
    headers: {
      apikey: config.serviceKey,
      Authorization: "Bearer " + config.serviceKey,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(method !== "GET" ? { Prefer: "return=representation" } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new SupabaseRestError(response.status);
  if (response.status === 204) return [] as T;
  return await response.json() as T;
}

function queryPath(table: string, values: Record<string, string>) {
  const params = new URLSearchParams(values);
  return table + "?" + params.toString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validIdempotencyKey(value: unknown): value is string {
  return typeof value === "string" && value.length >= 8 && value.length <= 128
    && /^[A-Za-z0-9._:-]+$/.test(value);
}

export async function GET(request: NextRequest) {
  const principal = resolveNeasAdminPrincipalFromRequest(request);
  if (!principal) return jsonError("Authentication required.", 401);
  const authorization = authorizeNeasScope(principal, "workforce:tasks:read");
  if (!authorization.allowed) return jsonError("Authentication required.", 401);

  try {
    const rows = await supabaseRequest<TaskRow[]>(
      queryPath("aiw_tasks", {
        select: "id,title,objective,agent_id,department_code,status,priority,requires_approval,approval_category,created_at,updated_at,error_message",
        created_by: "eq." + principal.subject,
        order: "created_at.desc",
        limit: "50",
      }),
      "GET",
    );
    return NextResponse.json({ tasks: rows }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch {
    return jsonError("Workforce task storage is unavailable.", 503);
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginBrowserRequest(request)) return jsonError("Request not permitted.", 403);

  const principal = resolveNeasAdminPrincipalFromRequest(request);
  if (!principal) return jsonError("Authentication required.", 401);
  const authorization = authorizeNeasScope(principal, "workforce:tasks:submit");
  if (!authorization.allowed) return jsonError("Authentication required.", 401);

  const rate = consumeRateLimit(request, "neas-workforce-task-submit", 20, 10 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Task submission rate limit reached." }, {
      status: 429,
      headers: { "Retry-After": String(rate.retryAfterSeconds), "Cache-Control": "no-store" },
    });
  }

  let body: Record<string, unknown>;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 16_384) return jsonError("Task request is too large.", 413);
    const parsed: unknown = JSON.parse(rawBody);
    if (!isRecord(parsed)) return jsonError("Invalid task request.", 400);
    body = parsed;
  } catch {
    return jsonError("Invalid task JSON.", 400);
  }

  const { title, objective, agentId, operation, idempotencyKey } = body;
  const priority = body.priority ?? "normal";
  if (typeof title !== "string" || title.trim().length < 3 || title.trim().length > 160) {
    return jsonError("Task title must contain 3–160 characters.", 400);
  }
  if (typeof objective !== "string" || objective.trim().length < 10 || objective.trim().length > 4_000) {
    return jsonError("Task objective must contain 10–4,000 characters.", 400);
  }
  if (typeof agentId !== "string" || !/^[a-z0-9][a-z0-9._:-]{1,63}$/i.test(agentId)) {
    return jsonError("A valid registered agent ID is required.", 400);
  }
  if (!isNeasTaskOperation(operation)) return jsonError("Unknown task operation.", 400);
  if (!validIdempotencyKey(idempotencyKey)) return jsonError("Provide an idempotency key of 8–128 safe characters.", 400);
  if (!["low", "normal", "high", "critical"].includes(String(priority))) return jsonError("Invalid task priority.", 400);

  // GIIE is intentionally kept off this task API until source registry, provider,
  // ingestion, and retrieval acceptance checks are complete.
  if (operation === "giie_public_research") {
    return jsonError("GIIE public research is not yet activated for workforce tasks.", 503);
  }

  try {
    const existing = await supabaseRequest<TaskRow[]>(
      queryPath("aiw_tasks", {
        select: "id,title,objective,agent_id,department_code,status,priority,requires_approval,approval_category,created_at,updated_at,error_message,created_by",
        idempotency_key: "eq." + idempotencyKey,
        limit: "1",
      }),
      "GET",
    );
    if (existing.length) {
      if ((existing[0] as TaskRow & { created_by?: string }).created_by !== principal.subject) {
        return jsonError("Idempotency key is already in use.", 409);
      }
      return NextResponse.json({ task: existing[0], idempotentReplay: true, executionStarted: false }, {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const agents = await supabaseRequest<AgentRow[]>(
      queryPath("aiw_agents", {
        select: "agent_id,name,department_code,enabled,execution_mode,runtime_status,tools,permissions",
        agent_id: "eq." + agentId,
        limit: "1",
      }),
      "GET",
    );
    const agent = agents[0];
    if (!agent || !agent.enabled || agent.execution_mode === "disabled") {
      return jsonError("The selected specialist is unavailable or disabled.", 409);
    }

    const toolGrant = hasNeasTaskControlGrant(agent);
    const decision = decideNeasTaskExecution(operation, {
      authenticatedPrincipalId: principal.subject,
      durableAuditAvailable: true,
      idempotencyKey,
      scopedToolGrantAvailable: toolGrant,
      humanApprovalGranted: false,
    });
    if (decision.disposition === "deny") return jsonError(decision.reason, 403);

    const needsApproval = decision.disposition === "await_human_approval";
    const category = getNeasApprovalCategory(operation);
    if (needsApproval && !category) return jsonError("No approval category is configured for this operation.", 403);
    const initialStatus = getNeasTaskInitialStatus(decision);
    // Configuration readiness is not live provider validation. The scheduled
    // worker independently authenticates and validates every execution.
    const workerConfigured = getNeasWorkerConfigStatus(process.env).configured;
    const requestId = randomUUID();
    const safeBlockReason = "Task stored safely but not queued: worker configuration is incomplete.";

    const inserted = await supabaseRequest<TaskRow[]>("aiw_tasks", "POST", {
      title: title.trim(),
      objective: objective.trim(),
      agent_id: agent.agent_id,
      department_code: agent.department_code,
      // Keep every task non-claimable until its task event and durable audit row exist.
      status: "blocked",
      priority,
      input: { operation, objective: objective.trim(), requested_agent: agent.agent_id },
      idempotency_key: idempotencyKey,
      created_by: principal.subject,
      assigned_by: principal.subject,
      attempt_count: 0,
      max_attempts: 3,
      max_delegation_depth: 0,
      requires_approval: needsApproval,
      approval_category: category,
      error_message: needsApproval || workerConfigured ? null : safeBlockReason,
    });
    const task = inserted[0];
    if (!task?.id) throw new Error("Task insert returned no row.");

    if (needsApproval && category) {
      await supabaseRequest("aiw_approvals", "POST", {
        task_id: task.id,
        category,
        title: title.trim(),
        details: {
          operation,
          objective: objective.trim(),
          agent_id: agent.agent_id,
          policy_reason: decision.reason,
          note: "Approval authorizes review only; it does not bypass worker readiness or create an external action.",
        },
        status: "pending",
        requested_by: principal.subject,
        approvals_required: 1,
        approval_count: 0,
        approved_by_ids: [],
      });
    }

    await supabaseRequest("aiw_task_events", "POST", {
      task_id: task.id,
      event_type: needsApproval ? "approval_requested" : "task_submission_recorded",
      actor_type: "human",
      actor_id: principal.subject,
      message: needsApproval
        ? "Task recorded and held for explicit human approval."
        : "Task submission recorded. Worker admission occurs only after the durable audit write completes.",
      payload: {
        operation,
        decision: decision.disposition,
        policy_reason: decision.reason,
        worker_runtime_configured: workerConfigured,
        worker_admission_pending: !needsApproval && workerConfigured,
        execution_started: false,
      },
    });

    await supabaseRequest("aiw_audit_events", "POST", {
      actor_type: "human",
      actor_id: principal.subject,
      action: "workforce.task.submit",
      resource_type: "aiw_task",
      resource_id: task.id,
      outcome: "pending",
      details: {
        operation,
        agent_id: agent.agent_id,
        disposition: decision.disposition,
        requires_approval: needsApproval,
        worker_runtime_configured: workerConfigured,
      },
      request_id: requestId,
    });

    if (needsApproval) {
      const updated = await supabaseRequest<TaskRow[]>(
        queryPath("aiw_tasks", { id: "eq." + task.id, select: "id,title,objective,agent_id,department_code,status,priority,requires_approval,approval_category,created_at,updated_at,error_message" }),
        "PATCH",
        { status: "needs_approval", error_message: null },
      );
      return NextResponse.json({
        task: updated[0] ?? { ...task, status: "needs_approval" },
        executionStarted: false,
        requiresApproval: true,
        message: "Task recorded and held for human approval. No agent action has been executed.",
      }, { status: 202, headers: { "Cache-Control": "no-store" } });
    }

    const finalStatus = workerConfigured ? "queued" : initialStatus;
    const finalErrorMessage = workerConfigured ? null : safeBlockReason;
    const admitted = await supabaseRequest<TaskRow[]>(
      queryPath("aiw_tasks", { id: "eq." + task.id, select: "id,title,objective,agent_id,department_code,status,priority,requires_approval,approval_category,created_at,updated_at,error_message" }),
      "PATCH",
      { status: finalStatus, error_message: finalErrorMessage },
    );
    return NextResponse.json({
      task: admitted[0] ?? { ...task, status: finalStatus, error_message: finalErrorMessage },
      executionStarted: false,
      queuedForExecution: workerConfigured,
      requiresApproval: false,
      message: workerConfigured ? "Task queued after durable event and audit records were committed. The authenticated worker will claim it on its next scheduled run." : safeBlockReason,
    }, { status: 202, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SupabaseRestError && error.status === 409) {
      try {
        const existing = await supabaseRequest<TaskRow[]>(
          queryPath("aiw_tasks", {
            select: "id,title,objective,agent_id,department_code,status,priority,requires_approval,approval_category,created_at,updated_at,error_message,created_by",
            idempotency_key: "eq." + idempotencyKey,
            limit: "1",
          }),
          "GET",
        );
        if (existing[0] && (existing[0] as TaskRow & { created_by?: string }).created_by === principal.subject) {
          return NextResponse.json({ task: existing[0], idempotentReplay: true, executionStarted: false }, {
            status: 200,
            headers: { "Cache-Control": "no-store" },
          });
        }
      } catch {
        // Return the generic conflict below; never expose database internals.
      }
      return jsonError("Task idempotency conflict. Use a new idempotency key.", 409);
    }
    return jsonError("Unable to safely record the workforce task. No task execution was started.", 503);
  }
}
