export const NEAS_ELEVENLABS_MAIN_BRANCH_ID =
  "agtbrch_9401m7zrgtzrf0xr9dw1gam3p3qs";
export const NEAS_ELEVENLABS_ENGINEERING_AI_BRANCH_ID =
  "agtbrch_7901m7zzfke5f0jryg92t2zcwnae";

type ElevenLabsBranchEnvironment = {
  VERCEL_ENV?: string;
  ELEVENLABS_AGENT_BRANCH_ID?: string;
  [key: string]: string | undefined;
};

/**
 * Keep production sessions on the live Main agent branch by default.
 * Preview and local sessions use the isolated Engineering AI candidate.
 * An explicit server-side branch ID remains available for deliberate overrides.
 */
export function resolveNeasElevenLabsBranchId(
  environment: ElevenLabsBranchEnvironment = process.env,
): string {
  const configuredBranchId = environment.ELEVENLABS_AGENT_BRANCH_ID?.trim();
  if (configuredBranchId) return configuredBranchId;

  return environment.VERCEL_ENV === "production"
    ? NEAS_ELEVENLABS_MAIN_BRANCH_ID
    : NEAS_ELEVENLABS_ENGINEERING_AI_BRANCH_ID;
}
