import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit, isSameOriginBrowserRequest } from "@/lib/neas-api-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash-lite";
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

  let payload: { messages?: unknown; image?: unknown };
  try {
    payload = await request.json() as typeof payload;
  } catch {
    return deny("Invalid request body.", 400);
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

  const parts: Array<Record<string, unknown>> = [{ text: last.text }];
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

  const contents = messages.slice(0, -1).map((message) => ({
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
          system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
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
      return deny("The free AI service is temporarily unavailable.", 502);
    }

    const reply = result.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim();
    if (!reply) return deny("The AI service returned an empty response. Please retry.", 502);

    return NextResponse.json({ reply, model: MODEL }, {
      headers: { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return deny("Unable to reach the free AI service. Please retry.", 502);
  }
}
