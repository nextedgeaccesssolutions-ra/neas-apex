import { NextResponse } from "next/server";

const AGENT_ID = process.env.ELEVENLABS_AGENT_ID || "agent_4401m7e4gjxfejwbvx9t4vgr8bth";
const ELEVENLABS_API = "https://api.elevenlabs.io/v1/convai/conversation/token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "ElevenLabs is not configured. Set ELEVENLABS_API_KEY in the server environment." },
      { status: 503 },
    );
  }

  const response = await fetch(
    `${ELEVENLABS_API}?agent_id=${encodeURIComponent(AGENT_ID)}`,
    {
      method: "GET",
      headers: { "xi-api-key": apiKey, accept: "application/json" },
      cache: "no-store",
    },
  );

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    return NextResponse.json(
      { error: "Unable to create an ElevenLabs conversation token.", upstreamStatus: response.status },
      { status: response.status === 401 || response.status === 403 ? 502 : response.status },
    );
  }

  if (typeof payload.token !== "string" || payload.token.length === 0) {
    return NextResponse.json(
      { error: "ElevenLabs did not return a conversation token." },
      { status: 502 },
    );
  }

  return NextResponse.json(
    { token: payload.token },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
