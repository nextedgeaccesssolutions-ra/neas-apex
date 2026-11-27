import { createHmac, randomUUID } from "node:crypto";

export type NeasCmsBrief = {
  signalId: string;
  title: string;
  industry: string;
  summary: string;
  body: string;
  seoDescription: string;
  sources: Array<{
    title: string;
    publisher: string;
    url: string;
    official: true;
  }>;
  verification: {
    status: "verified";
    independentSourceCount: number;
    policyVersion: "neas-giie-commercial-v1";
  };
};

export function resolveNeasCmsEndpoint(raw: string): URL {
  const endpoint = new URL(raw);
  if (
    endpoint.protocol !== "https:" ||
    endpoint.hostname !== "www.nextedge-access-solutions.com" ||
    endpoint.pathname !== "/api/integrations/giie/commercial-briefs" ||
    endpoint.username ||
    endpoint.password
  ) {
    throw new Error("NEAS CMS endpoint must be the approved HTTPS website integration route.");
  }
  return endpoint;
}

export function createNeasCmsSignature(
  secret: string,
  timestamp: string,
  requestId: string,
  serializedBody: string,
): string {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${requestId}.${serializedBody}`)
    .digest("hex");
}

export async function submitCommercialBriefToCms(
  brief: NeasCmsBrief,
): Promise<{ success: true; duplicate: boolean; pageId: number; status: string; slug: string }> {
  const rawEndpoint = process.env.NEAS_CMS_PUBLISH_URL ?? "";
  const secret = process.env.NEAS_CMS_HMAC_SECRET ?? "";
  if (secret.length < 32) throw new Error("NEAS CMS signing secret is not configured.");
  if (!rawEndpoint) throw new Error("NEAS CMS endpoint is not configured.");

  const endpoint = resolveNeasCmsEndpoint(rawEndpoint);
  const serializedBody = JSON.stringify(brief);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const requestId = randomUUID();
  const signature = createNeasCmsSignature(secret, timestamp, requestId, serializedBody);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-NEAS-Timestamp": timestamp,
      "X-NEAS-Request-Id": requestId,
      "X-NEAS-Signature": signature,
    },
    body: serializedBody,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`NEAS CMS intake rejected the brief (HTTP ${response.status}).`);
  }
  const result = (await response.json()) as {
    success?: boolean;
    duplicate?: boolean;
    pageId?: number;
    status?: string;
    slug?: string;
  };
  if (
    result.success !== true ||
    typeof result.pageId !== "number" ||
    typeof result.status !== "string" ||
    typeof result.slug !== "string"
  ) {
    throw new Error("NEAS CMS returned an invalid intake response.");
  }
  return {
    success: true,
    duplicate: result.duplicate === true,
    pageId: result.pageId,
    status: result.status,
    slug: result.slug,
  };
}
