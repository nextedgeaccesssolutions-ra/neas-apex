import { NextResponse } from "next/server";
import { resolveNeasElevenLabsBranchId } from "@/lib/elevenlabs-agent-config";

export const dynamic = "force-dynamic";

const DEFAULT_AGENT_ID = "agent_8601m7zrgsg4f98srgkekzq7ana9";

/**
 * The NEAS APEX agent is public but origin-allowlisted in ElevenLabs.
 * Agent and branch IDs are public identifiers, not credentials. Returning
 * them lets the browser use the SDK's direct public-agent session flow,
 * avoiding a server-side API key solely for signed-URL creation.
 */
export async function GET() {
  const agentId = process.env.ELEVENLABS_AGENT_ID?.trim() || DEFAULT_AGENT_ID;
  const branchId = resolveNeasElevenLabsBranchId();
  return NextResponse.json(
    { agentId, branchId },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
