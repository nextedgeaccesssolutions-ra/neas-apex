export type NeasWorkerEnvironment = Record<string, string | undefined>;

export type NeasWorkerConfigStatus = {
  configured: boolean;
  missing: string[];
};

/** Configuration readiness only; this does not claim a live provider test. */
export function getNeasWorkerConfigStatus(env: NeasWorkerEnvironment): NeasWorkerConfigStatus {
  const missing: string[] = [];
  const supabaseUrl = (env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  const cronSecret = env.CRON_SECRET?.trim() ?? "";
  const geminiKey = env.GEMINI_API_KEY?.trim() ?? "";

  if (env.WORKFORCE_WORKER_ENABLED !== "true") missing.push("WORKFORCE_WORKER_ENABLED");
  if (cronSecret.length < 32) missing.push("CRON_SECRET");
  if (!geminiKey) missing.push("GEMINI_API_KEY");
  if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  try {
    const parsed = new URL(supabaseUrl);
    if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".supabase.co")) missing.push("SUPABASE_URL");
  } catch {
    missing.push("SUPABASE_URL");
  }

  return { configured: missing.length === 0, missing };
}
