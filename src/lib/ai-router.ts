/**
 * NEAS Universal AI Router — server-only foundation.
 * No provider secrets are read by browser code. MCP discovery never grants trust.
 */
export type RouterTask = "chat" | "reasoning" | "coding" | "research" | "vision" | "structured";
export type ModelInfo = { id: string; name?: string; description?: string; context_length?: number; pricing?: { prompt?: string; completion?: string }; architecture?: { input_modalities?: string[]; output_modalities?: string[]; modality?: string; instruct_type?: string }; supported_parameters?: string[]; top_provider?: { context_length?: number; max_completion_tokens?: number } };
export type Recommendation = { model: string; provider: "openrouter"; rationale: string; candidates: string[] };
const base = "https://openrouter.ai/api/v1";
function key() { const value = process.env.OPENROUTER_API_KEY; if (!value) throw new Error("OPENROUTER_API_KEY is not configured"); return value; }
export async function discoverModels(): Promise<ModelInfo[]> {
  const response = await fetch(base + "/models", { headers: { Authorization: "Bearer " + key() }, signal: AbortSignal.timeout(10000), cache: "no-store" });
  if (!response.ok) throw new Error("OpenRouter model discovery failed: " + response.status);
  const payload = await response.json() as { data?: ModelInfo[] };
  return Array.isArray(payload.data) ? payload.data : [];
}
function supports(model: ModelInfo, task: RouterTask) {
  const text = JSON.stringify(model).toLowerCase();
  if (task === "vision") return (model.architecture?.input_modalities ?? []).some(x => ["image", "video"].includes(x));
  if (task === "coding") return /code|coder|coding|devstral/.test((model.id + " " + model.name + " " + model.description).toLowerCase());
  if (task === "reasoning") return /reason|thinking|r1|o[134]/.test(text);
  if (task === "structured") return (model.supported_parameters ?? []).includes("structured_outputs") || (model.supported_parameters ?? []).includes("response_format");
  return true;
}
export async function recommendModel(task: RouterTask, budgetUsd = 0.02): Promise<Recommendation> {
  if (!Number.isFinite(budgetUsd) || budgetUsd <= 0) throw new Error("A positive per-request budget is required");
  const models = await discoverModels();
  const allowed = (process.env.AI_ROUTER_ALLOWED_MODELS ?? "").split(",").map(x => x.trim()).filter(Boolean);
  const candidates = models.filter(m => (!allowed.length || allowed.includes(m.id)) && supports(m, task))
    .filter(m => Number(m.pricing?.prompt ?? 0) + Number(m.pricing?.completion ?? 0) <= budgetUsd)
    .sort((a,b) => Number(a.pricing?.prompt ?? 0) + Number(a.pricing?.completion ?? 0) - Number(b.pricing?.prompt ?? 0) - Number(b.pricing?.completion ?? 0));
  if (!candidates.length) throw new Error("No model matches the task, allowlist and budget constraints");
  const preferred = process.env.AI_ROUTER_PREFERRED_MODEL;
  const chosen = candidates.find(m => m.id === preferred) ?? candidates[0];
  return { model: chosen.id, provider: "openrouter", rationale: preferred === chosen.id ? "Configured preferred model meets constraints" : "Lowest listed price among eligible models; verify quality before pinning", candidates: candidates.slice(0,5).map(m => m.id) };
}
export async function chatViaOpenRouter(input: { model: string; messages: Array<{ role: "system"|"user"|"assistant"; content: string }>; maxTokens?: number; timeoutMs?: number }) {
  const maxTokens = Math.min(Math.max(input.maxTokens ?? 1024, 1), Number(process.env.AI_ROUTER_MAX_TOKENS ?? 2048));
  const allowed = (process.env.AI_ROUTER_ALLOWED_MODELS ?? "").split(",").map(x => x.trim()).filter(Boolean);
  if (allowed.length && !allowed.includes(input.model)) throw new Error("Requested model is not allowlisted");
  const response = await fetch(base + "/chat/completions", { method: "POST", headers: { Authorization: "Bearer " + key(), "Content-Type": "application/json" }, body: JSON.stringify({ model: input.model, messages: input.messages, max_tokens: maxTokens }), signal: AbortSignal.timeout(Math.min(input.timeoutMs ?? 30000, 45000)), cache: "no-store" });
  if (!response.ok) throw new Error("Provider request failed: " + response.status);
  return response.json();
}
export function trustedMcpServers() {
  return (process.env.MCP_TRUSTED_SERVERS ?? "").split(",").map(x => x.trim()).filter(Boolean);
}
export function assertTrustedMcpServer(serverId: string) {
  if (!trustedMcpServers().includes(serverId)) throw new Error("MCP server is discovered but not trusted; administrator allowlisting is required");
}
