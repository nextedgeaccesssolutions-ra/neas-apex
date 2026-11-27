import { afterEach, describe, expect, it, vi } from "vitest";
import type { CommercialSignal } from "../lib/giie-commercial";
import {
  buildCommercialAlertEvent,
  resolveActivepiecesWebhook,
  signActivepiecesEvent,
} from "../lib/giie-automation-webhook";

const signal = (
  overrides: Partial<CommercialSignal> = {},
): CommercialSignal => ({
  signal_key: "a".repeat(64),
  title: "Philippines offshore wind maintenance project",
  source_url: "https://doe.gov.ph/projects/offshore-wind",
  source_name: "Department of Energy",
  source_provider: "brave-search",
  industry: "energy",
  signal_type: "asset-maintenance",
  geography: ["Philippines"],
  published_at: "2026-11-26T00:00:00.000Z",
  discovered_at: "2026-11-27T00:00:00.000Z",
  last_seen_at: "2026-11-27T00:00:00.000Z",
  seen_count: 1,
  discovery_score: 88,
  score_method: "commercial_opportunity_priority_v1",
  score_basis: {},
  evidence_excerpt: "Public search excerpt.",
  verification_status: "unverified",
  lead_status: "new",
  publication_status: "blocked_unverified",
  publication_reason: "Source verification and independent corroboration are pending.",
  ...overrides,
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Activepieces GIIE webhook safety", () => {
  it("accepts a public HTTPS webhook URL", () => {
    const endpoint = resolveActivepiecesWebhook(
      "https://automation.example.com/api/v1/webhooks/abc",
    );
    expect(endpoint.protocol).toBe("https:");
  });

  it.each([
    "http://automation.example.com/webhook",
    "https://user:pass@automation.example.com/webhook",
    "https://localhost/webhook",
    "https://worker.local/webhook",
    "https://127.0.0.1/webhook",
    "https://automation.example.com/webhook#fragment",
  ])("rejects unsafe webhook URL %s", (url) => {
    expect(() => resolveActivepiecesWebhook(url)).toThrow();
  });

  it("signs the exact timestamp, request id and serialized body", () => {
    const secret = "s".repeat(32);
    const body = '{"ok":true}';
    const signature = signActivepiecesEvent(
      secret,
      "1795737600",
      "event-123",
      body,
    );

    expect(signature).toMatch(/^[a-f0-9]{64}$/);
    expect(signature).not.toBe(
      signActivepiecesEvent(secret, "1795737601", "event-123", body),
    );
  });

  it("emits only unverified, blocked public research signals for alerting", () => {
    const event = buildCommercialAlertEvent(
      [
        signal(),
        signal({
          signal_key: "b".repeat(64),
          verification_status: "verified",
          publication_status: "eligible_for_auto",
        }),
      ],
      new Date("2026-11-27T00:00:00.000Z"),
      "event-123",
    );

    expect(event.eventType).toBe(
      "neas.giie.commercial.signals.discovered",
    );
    expect(event.policy).toBe("unverified-alert-only");
    expect(event.signals).toHaveLength(1);
    expect(event.signals[0].verification_status).toBe("unverified");
    expect(event.signals[0].publication_status).toBe("blocked_unverified");
    expect(event.signals[0]).not.toHaveProperty("evidence_excerpt");
  });
});
