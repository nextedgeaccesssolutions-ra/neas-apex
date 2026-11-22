import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit, isSameOriginBrowserRequest } from "@/lib/neas-api-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite";
const SYSTEM_INSTRUCTION = [
  "You are NEAS Engineering AI for NextEdge Access Solutions.",
  "Support rope access, renewable energy, offshore and onshore operations, wind and solar, power plants, industrial inspection, project planning, commercial proposals, BOQ and costing.",
  "Be professional, precise, practical, and concise. Ask for missing information instead of inventing facts.",
  "For engineering, lifting, rope access, work at height, electrical, confined-space, and HSE matters, distinguish general guidance from site-specific approval. Never certify a design, method, equipment, inspection, or safety control. Require review by a qualified competent person.",
  "For calculations, state units, assumptions, formulas, and limitations. Never fabricate standards or project data.",
  "When reviewing an image, describe only visible evidence and clearly state uncertainty.",
].join(" ");

type Message = { role: "user" | "assistant"; text: string };
type ImageInput = { mimeType: string; data: string };
type AudioInput = { mimeType: string; data: string };
const SPECIALIST_GUIDANCE = {
  auto: "Act as the NEAS AI Coordinator and automatic specialist-skill router. For typed requests, identify the task intent and activate the best matching NEAS specialist skill: engineering, project controls, HSE and safety, commercial and procurement, renewable energy, rope access, or business development. For audio input, first understand the spoken request, then classify its meaning and activate the appropriate specialist skill before answering; do not treat the generic transcription instruction as the task. For multi-discipline work, combine only the relevant specialist skills and identify the lead discipline. Do not ask the user to choose an agent. Ask one focused question only when essential information is missing. Preserve competent-person approval boundaries and never claim an external action occurred unless verified.",
  engineering: "Act as the engineering specialist. Focus on technical calculations, inspection evidence, engineering assumptions, design interfaces, standards verification, and competent-person review. Never certify or approve engineering work.",
  projects: "Act as the project controls specialist. Focus on scope, work breakdown, schedule, resources, dependencies, progress, risks, deliverables, and change control. Distinguish estimates from committed dates.",
  safety: "Act as the HSE specialist. Focus on hazard identification, risk assessment, controls, permits, emergency readiness, work-at-height safeguards, and verification. Do not authorize site work or replace the appointed competent HSE person.",
  commercial: "Act as the commercial and procurement specialist. Focus on BOQ, cost breakdowns, pricing assumptions, cash flow, payment terms, procurement specifications, supplier comparison, and contract risks. State currency and tax assumptions.",
  renewables: "Act as the renewable energy specialist. Focus on wind, solar, met mast, turbine blades, balance of plant, grid interfaces, resource data, access, inspection, and project feasibility. Identify data gaps and applicable engineering review.",
  "rope-access": "Act as the rope access specialist. Focus on access strategy, work positioning, anchor information, rigging documentation, team competence, equipment inspection, rescue planning, exclusion zones, and operational interfaces. Never invent anchor capacities or certify a rigging plan.",
  "business-development": "Act as the NEAS business development specialist. Focus on opportunity qualification, client needs, project pipeline, proposal strategy, differentiators, follow-up planning, and commercial next steps. Never claim that outreach or commitments occurred unless confirmed.",
} as const;
type SpecialistId = keyof typeof SPECIALIST_GUIDANCE;

const SPECIALIST_LABELS: Record<SpecialistId, string> = {
  auto: "NEAS AI Coordinator",
  engineering: "NEAS Engineering Agent",
  projects: "NEAS Project Controls Agent",
  safety: "NEAS HSE & Safety Agent",
  commercial: "NEAS Commercial Agent",
  renewables: "NEAS Renewable Energy Agent",
  "rope-access": "NEAS Rope Access Agent",
  "business-development": "NEAS Business Development Agent",
};

function routeSpecialist(text: string): Exclude<SpecialistId, "auto"> {
  const value = text.toLowerCase();
  const has = (...terms: string[]) => terms.some((term) => value.includes(term));
  if (has("rope access", "irata", "rigging", "anchor point", "anchor bolt", "suspended access", "rope rescue", "abseil", "rope technician")) return "rope-access";
  if (has("risk assessment", "jsa", "jha", "method statement", "permit to work", "work at height", "confined space", "hse", "safety", "rescue plan", "toolbox talk", "incident", "near miss", "emergency plan")) return "safety";
  if (has("wind turbine", "wind farm", "solar", "renewable", "met mast", "blade inspection", "blade repair", "lidar", "photovoltaic", "wind energy", "solar farm")) return "renewables";
  if (has("boq", "quotation", "quote", "pricing", "costing", "budget", "invoice", "procurement", "payment terms", "cash flow", "margin", "bill of quantities", "purchase order", "variation order")) return "commercial";
  if (has("proposal", "lead", "client", "sales", "business development", "opportunity", "follow up", "tender", "marketing", "outreach", "pipeline")) return "business-development";
  if (has("schedule", "project plan", "milestone", "progress", "resource plan", "work breakdown", "wbs", "project status", "mobilization", "project controls", "project report")) return "projects";
  return "engineering";
}

function deny(error: string, status: number) {
  return NextResponse.json({ error }, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" },
  });
}

export async function POST(request: NextRequest) {
  if (!isSameOriginBrowserRequest(request)) return deny("This request is not permitted.", 403);

  const rate = consumeRateLimit(request, "neas-gemini-chat", 20, 10 * 60 * 1000);
  if (!rate.allowed) return deny("Free AI usage limit reached for now. Please wait and try again.", 429);

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return deny("Free AI is not configured yet. Add GEMINI_API_KEY in Vercel Environment Variables.", 503);

  let payload: { messages?: unknown; image?: unknown; audio?: unknown; specialist?: unknown };
  try {
    payload = await request.json() as typeof payload;
  } catch {
    return deny("Invalid request body.", 400);
  }

  let specialist: SpecialistId = "auto";
  if (payload.specialist !== undefined) {
    if (typeof payload.specialist !== "string" || !Object.hasOwn(SPECIALIST_GUIDANCE, payload.specialist)) {
      return deny("Unknown NEAS specialist mode.", 400);
    }
    specialist = payload.specialist as SpecialistId;
  }

  if (!Array.isArray(payload.messages) || payload.messages.length < 1 || payload.messages.length > 12) {
    return deny("Send between 1 and 12 conversation messages.", 400);
  }

  const messages: Message[] = [];
  for (const item of payload.messages) {
    if (!item || typeof item !== "object") return deny("Invalid conversation message.", 400);
    const candidate = item as Record<string, unknown>;
    if ((candidate.role !== "user" && candidate.role !== "assistant") || typeof candidate.text !== "string") {
      return deny("Invalid conversation message format.", 400);
    }
    const text = candidate.text.trim();
    if (!text || text.length > 4000) return deny("Each message must contain 1–4,000 characters.", 400);
    messages.push({ role: candidate.role, text });
  }

  const last = messages[messages.length - 1];
  if (last.role !== "user") return deny("The latest message must be from the user.", 400);

  const resolvedSpecialist: SpecialistId = specialist === "auto" ? (payload.audio ? "auto" : routeSpecialist(last.text)) : specialist;
  const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [{ text: last.text }];
  if (payload.image !== undefined) {
    if (!payload.image || typeof payload.image !== "object") return deny("Invalid image attachment.", 400);
    const image = payload.image as Partial<ImageInput>;
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!image.mimeType || !allowedTypes.has(image.mimeType) || typeof image.data !== "string") {
      return deny("Only JPEG, PNG, and WebP images are supported.", 400);
    }
    if (image.data.length > 4_200_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(image.data)) {
      return deny("Image must be 3 MB or smaller.", 413);
    }
    parts.push({ inline_data: { mime_type: image.mimeType, data: image.data } });
  }
  if (payload.audio !== undefined) {
    if (!payload.audio || typeof payload.audio !== "object") return deny("Invalid audio attachment.", 400);
    const audio = payload.audio as Partial<AudioInput>;
    const allowedAudioTypes = new Set(["audio/webm", "audio/ogg", "audio/mp4", "audio/wav", "audio/mpeg", "audio/aac"]);
    const normalizedAudioType = audio.mimeType?.split(";")[0]?.toLowerCase();
    if (!normalizedAudioType || !allowedAudioTypes.has(normalizedAudioType) || typeof audio.data !== "string") {
      return deny("This audio format is not supported. Try recording in Chrome or Edge.", 400);
    }
    if (audio.data.length > 6_000_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(audio.data)) {
      return deny("Audio recording is too large. Record a shorter voice message.", 413);
    }
    parts.push({ inline_data: { mime_type: normalizedAudioType, data: audio.data } });
  }

  const contents: Array<{ role: "user" | "model"; parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> }> = messages.slice(0, -1).map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.text }],
  }));
  contents.push({ role: "user", parts });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: `${SYSTEM_INSTRUCTION}\n\nActive specialist agent: ${SPECIALIST_LABELS[resolvedSpecialist]}.

Specialist operating instructions: ${SPECIALIST_GUIDANCE[resolvedSpecialist]}` }] },
          contents,
          generationConfig: { temperature: 0.35, maxOutputTokens: 1200 },
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(25_000),
      },
    );

    const result = await response.json().catch(() => ({})) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      error?: { message?: string; status?: string };
    };
    if (!response.ok) {
      if (response.status === 429) return deny("Gemini free-tier quota is temporarily exhausted. Try again later.", 429);
      if (response.status === 400) return deny("The AI service rejected this request. Check the message or image and retry.", 400);
      if (response.status === 404) return deny(`The configured Gemini model (${MODEL}) was not found. Set GEMINI_MODEL to a currently supported Gemini model.`, 502);
      return deny("The free AI service is temporarily unavailable.", 502);
    }

    const reply = result.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim();
    if (!reply) return deny("The AI service returned an empty response. Please retry.", 502);

    return NextResponse.json({ reply, model: MODEL, specialist: resolvedSpecialist, agent: SPECIALIST_LABELS[resolvedSpecialist] }, {
      headers: { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return deny("Unable to reach the free AI service. Please retry.", 502);
  }
}
