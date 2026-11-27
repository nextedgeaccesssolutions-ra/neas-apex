import { searchPublicWeb } from "./giie-connectors";
import {
  buildCommercialSignals,
  getHourlyCommercialTopicGroup,
  type CommercialSignal,
} from "./giie-commercial";

function databaseConfig() {
  const baseUrl = (process.env.SUPABASE_URL ?? "").trim().replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!baseUrl || !serviceKey)
    throw new Error(
      "Commercial GIIE storage requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  const parsed = new URL(baseUrl);
  if (
    parsed.protocol !== "https:" ||
    !parsed.hostname.endsWith(".supabase.co")
  ) {
    throw new Error(
      "Commercial GIIE storage requires the approved HTTPS Supabase project URL.",
    );
  }
  return { baseUrl, serviceKey };
}

async function databaseRequest<T>(
  path: string,
  method: "GET" | "POST" | "PATCH",
  body?: unknown,
): Promise<T> {
  const { baseUrl, serviceKey } = databaseConfig();
  const response = await fetch(new URL("rest/v1/" + path, baseUrl + "/"), {
    method,
    headers: {
      apikey: serviceKey,
      Authorization: "Bearer " + serviceKey,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(method !== "GET" ? { Prefer: "return=representation" } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok)
    throw new Error(
      "Commercial GIIE database request failed with HTTP " +
        response.status +
        ".",
    );
  if (response.status === 204) return [] as T;
  return (await response.json()) as T;
}

async function updateRun(
  runId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const params = new URLSearchParams({ id: "eq." + runId, select: "id" });
  await databaseRequest(
    "giie_commercial_runs?" + params.toString(),
    "PATCH",
    patch,
  );
}

export async function runCommercialIntelligenceCollection(
  now = new Date(),
): Promise<{
  status: "completed" | "partial";
  topicGroup: string;
  queryCount: number;
  resultCount: number;
  signalCount: number;
  warnings: string[];
}> {
  if (process.env.GIIE_COMMERCIAL_COLLECTION_ENABLED !== "true") {
    throw new Error(
      "Commercial GIIE collection is disabled. Set GIIE_COMMERCIAL_COLLECTION_ENABLED=true.",
    );
  }

  const topicGroup = getHourlyCommercialTopicGroup(now);
  const runRows = await databaseRequest<Array<{ id: string }>>(
    "giie_commercial_runs?select=id",
    "POST",
    [
      {
        status: "running",
        topic_group: topicGroup.id,
        queries: [...topicGroup.queries],
        started_at: now.toISOString(),
      },
    ],
  );
  const runId = runRows[0]?.id;
  if (!runId)
    throw new Error("Commercial GIIE run audit record could not be created.");

  const warnings: string[] = [];
  try {
    const searchResponses = await Promise.all(
      topicGroup.queries.map(async (query) => {
        try {
          const response = await searchPublicWeb(query, 8);
          return response.results;
        } catch (error) {
          warnings.push(
            error instanceof Error
              ? error.message
              : "Commercial public search failed.",
          );
          return [];
        }
      }),
    );

    const allResults = searchResponses.flat();
    const signals: CommercialSignal[] = buildCommercialSignals(
      allResults,
      topicGroup,
      now,
    );
    if (!signals.length) {
      throw new Error(
        "Commercial collection returned no valid HTTPS source leads. " +
          warnings.join(" "),
      );
    }

    const signalCount = await databaseRequest<number>(
      "rpc/upsert_giie_commercial_signals",
      "POST",
      { p_signals: signals },
    );
    const status = warnings.some(
      (warning) => !warning.startsWith("Search results are discovery leads"),
    )
      ? ("partial" as const)
      : ("completed" as const);

    await updateRun(runId, {
      status,
      completed_at: new Date().toISOString(),
      result_count: allResults.length,
      inserted_or_updated_count: Number.isFinite(signalCount) ? signalCount : 0,
      warning_summary: warnings.join("\n").slice(0, 2_000) || null,
    });

    return {
      status,
      topicGroup: topicGroup.id,
      queryCount: topicGroup.queries.length,
      resultCount: allResults.length,
      signalCount: Number.isFinite(signalCount) ? signalCount : 0,
      warnings,
    };
  } catch (error) {
    await updateRun(runId, {
      status: "failed",
      completed_at: new Date().toISOString(),
      warning_summary: (error instanceof Error
        ? error.message
        : "Commercial collection failed."
      ).slice(0, 2_000),
    }).catch(() => undefined);
    throw error;
  }
}
