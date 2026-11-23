import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit, isSameOriginBrowserRequest } from "@/lib/neas-api-security";
import { buildNeasSystemPolicy } from "@/lib/neas-ai-governance";
import { NEAS_RUNTIME_SPECIALISTS, routeNeasRuntimeSpecialist, type NeasRuntimeSpecialistId } from "@/lib/neas-specialist-runtime";
import { buildNeasRegistrySkillInstruction, loadNeasRegisteredSkills } from "@/lib/neas-skill-registry";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Prefer the low-latency Flash-Lite model; retain configured and stronger fallbacks.
const MODEL_CANDIDATES = [...new Set([
  process.env.GEMINI_FAST_MODEL?.trim(),
  "gemini-3.5-flash-lite",
  process.env.GEMINI_MODEL?.trim(),
  "gemini-3.8-flash",
  "gemini-3.5-flash",
].filter((value): value is string => Boolean(value)))];
const SYSTEM_INSTRUCTION = [
  buildNeasSystemPolicy(),
  "You are NEAS Engineering AI for NextEdge Access Solutions.",
  "Support rope access, renewable energy, offshore and onshore operations, wind and solar, power plants, industrial inspection, project planning, commercial proposals, BOQ and costing.",
  "Be professional, precise, practical, and concise. Lead with the answer, use short paragraphs or bullets, and avoid repeating the question. Ask only for essential missing information; never invent facts.",
  "For engineering, lifting, rope access, work at height, electrical, confined-space, and HSE matters, distinguish general guidance from site-specific approval. Never certify a design, method, equipment, inspection, or safety control. Require review by a qualified competent person.",
  "For calculations, state units, assumptions, formulas, and limitations. Never fabricate standards or project data.",
  "When reviewing an image, describe only visible evidence and clearly state uncertainty.",
].join(" ");

type Message = { role: "user" | "assistant"; text: string };
type ImageInput = { mimeType: string; data: string };
type AudioInput = { mimeType: string; data: string };
type SpecialistId = "auto" | NeasRuntimeSpecialistId;
const SPECIALIST_LABELS: Record<SpecialistId, string> = {
  auto: "NEAS AI Coordinator",
  ...Object.fromEntries(Object.entries(NEAS_RUNTIME_SPECIALISTS).map(([id, specialist]) => [id, specialist.label])),
} as Record<SpecialistId, string>;

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
    if (typeof payload.specialist !== "string" || !(payload.specialist === "auto" || Object.hasOwn(NEAS_RUNTIME_SPECIALISTS, payload.specialist))) {
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

  const resolvedSpecialist: NeasRuntimeSpecialistId = specialist === "auto" ? (payload.audio ? "engineering" : routeNeasRuntimeSpecialist(last.text)) : specialist;
  const registeredSkillContext = await loadNeasRegisteredSkills(resolvedSpecialist);
  const registeredSkillInstruction = buildNeasRegistrySkillInstruction(resolvedSpecialist, registeredSkillContext.skills);
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
    type GeminiError = { error?: { message?: string; status?: string } };
    let response: Response | null = null;

    for (let index = 0; index < MODEL_CANDIDATES.length; index += 1) {
      const model = MODEL_CANDIDATES[index];
      const candidateResponse = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":streamGenerateContent?alt=sse",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION + "\n\nActive specialist agent: " + SPECIALIST_LABELS[resolvedSpecialist] + ".\n\nSpecialist operating instructions: " + NEAS_RUNTIME_SPECIALISTS[resolvedSpecialist].guidance }] },
            contents,
            generationConfig: { maxOutputTokens: 700 },
          }),
          cache: "no-store",
          signal: AbortSignal.timeout(45_000),
        },
      );

      if (!candidateResponse.ok) {
        const failure = await candidateResponse.json().catch(() => ({})) as GeminiError;
        const message = failure.error?.message || "";
        const unavailable = candidateResponse.status === 404
          || failure.error?.status === "NOT_FOUND"
          || /model.{0,80}(not found|does not exist|unsupported)/i.test(message);
        if (unavailable && index < MODEL_CANDIDATES.length - 1) continue;
        if (candidateResponse.status === 429) return deny("AI capacity is temporarily busy. Please try again shortly.", 429);
        if (unavailable) return deny("No supported fast Gemini model is available to this API key. Configure GEMINI_FAST_MODEL in Vercel.", 502);
        if (candidateResponse.status === 400) return deny("The AI service rejected this request. Check the message or attachment and retry.", 400);
        return deny("The NEAS AI service is temporarily unavailable.", 502);
      }
      response = candidateResponse;
      break;
    }

    if (!response?.body) return deny("The AI service did not open a response stream. Please retry.", 502);
    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
        "X-NEAS-Agent": SPECIALIST_LABELS[resolvedSpecialist],
        "X-NEAS-Specialist": resolvedSpecialist,
        "X-NEAS-Skills-Source": registeredSkillContext.source,
        "X-NEAS-Skills-Loaded": String(registeredSkillContext.skills.length),
      },
    });
  } catch {
    return deny("Unable to reach the NEAS AI service. Please retry.", 502);
  }
}
