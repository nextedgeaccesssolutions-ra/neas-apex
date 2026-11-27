import { createHmac, randomUUID } from "node:crypto";
import { isIP } from "node:net";
import type { CommercialSignal } from "./giie-commercial";

export type ActivepiecesDeliveryResult =
  | { status: "skipped"; reason: "not_configured" }
  | { status: "delivered"; eventId: string; signalCount: number };

type PublicSignal = Pick<
  CommercialSignal,
  | "signal_key"
  | "title"
  | "source_url"
  | "source_name"
  | "industry"
  | "signal_type"
  | "discovery_score"
  | "verification_status"
  | "publication_status"
  | "publication_reason"
>;

export function resolveActivepiecesWebhook(raw: string): URL {
  let endpoint: URL;
  try {
    endpoint = new URL(raw);
  } catch {
    throw new Error("Activepieces webhook URL is invalid.");
  }

  if (
    endpoint.protocol !== "https:" ||
    endpoint.username ||
    endpoint.password ||
    endpoint.hash ||
    !endpoint.hostname.includes(".") ||
    isIP(endpoint.hostname) !== 0 ||
    endpoint.hostname === "localhost" ||
    endpoint.hostname.endsWith(".localhost") ||
    endpoint.hostname.endsWith(".local")
  ) {
    throw new Error(
      "Activepieces webhook must be a public HTTPS URL without credentials.",
    );
  }

  return endpoint;
}

export function signActivepiecesEvent(
  secret: string,
  timestamp: string,
  requestId: string,
  serializedBody: string,
): string {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${requestId}.${serializedBody}`)
    .digest("hex");
}

export function buildCommercialAlertEvent(
  signals: CommercialSignal[],
  occurredAt = new Date(),
  eventId = randomUUID(),
) {
  const publicSignals: PublicSignal[] = signals
    .filter(
      (signal) =>
        signal.verification_status === "unverified" &&
        signal.publication_status === "blocked_unverified",
    )
    .slice(0, 50)
    .map((signal) => ({
      signal_key: signal.signal_key,
      title: signal.title,
      source_url: signal.source_url,
      source_name: signal.source_name,
      industry: signal.industry,
      signal_type: signal.signal_type,
      discovery_score: signal.discovery_score,
      verification_status: "unverified",
      publication_status: "blocked_unverified",
      publication_reason: signal.publication_reason,
    }));

  return {
    schemaVersion: 1 as const,
    eventType: "neas.giie.commercial.signals.discovered" as const,
    eventId,
    occurredAt: occurredAt.toISOString(),
    source: "neas-apex" as const,
    policy: "unverified-alert-only" as const,
    signals: publicSignals,
  };
}

export async function notifyActivepiecesOfCommercialSignals(
  signals: CommercialSignal[],
): Promise<ActivepiecesDeliveryResult> {
  const rawEndpoint =
    process.env.ACTIVEPIECES_GIIE_WEBHOOK_URL?.trim() ?? "";
  if (!rawEndpoint) {
    return { status: "skipped", reason: "not_configured" };
  }

  const secret = process.env.ACTIVEPIECES_GIIE_WEBHOOK_SECRET ?? "";
  if (secret.length < 32) {
    throw new Error(
      "Activepieces webhook signing secret must contain at least 32 characters.",
    );
  }

  const endpoint = resolveActivepiecesWebhook(rawEndpoint);
  const event = buildCommercialAlertEvent(signals);
  if (!event.signals.length) {
    return { status: "skipped", reason: "not_configured" };
  }

  const serializedBody = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = signActivepiecesEvent(
    secret,
    timestamp,
    event.eventId,
    serializedBody,
  );

  const response = await fetch(endpoint, {
    method: "POST",
    redirect: "error",
    headers: {
      "Content-Type": "application/json",
      "X-NEAS-Timestamp": timestamp,
      "X-NEAS-Request-Id": event.eventId,
      "X-NEAS-Signature": signature,
      "X-NEAS-Event-Type": event.eventType,
    },
    body: serializedBody,
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    throw new Error(
      `Activepieces webhook rejected the GIIE event (HTTP ${response.status}).`,
    );
  }

  return {
    status: "delivered",
    eventId: event.eventId,
    signalCount: event.signals.length,
  };
}
