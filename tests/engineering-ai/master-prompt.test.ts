import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const prompt = readFileSync("docs/NEAS_ENGINEERING_AI_MASTER_SYSTEM_PROMPT.md", "utf8");

describe("NEAS Engineering AI master system prompt", () => {
  it("defines all seven specialist brains", () => {
    for (const heading of [
      "BRAIN 01 — Engineering Reasoning",
      "BRAIN 02 — Project Intelligence",
      "BRAIN 03 — Safety Intelligence",
      "BRAIN 04 — Commercial Intelligence",
      "BRAIN 05 — Renewable Energy Intelligence",
      "BRAIN 06 — Industrial Intelligence",
      "BRAIN 07 — Business Strategy",
    ]) expect(prompt).toContain(heading);
  });

  it("preserves engineering calculation and commercial controls", () => {
    expect(prompt).toContain("Gross Margin (%) = Gross Profit ÷ Selling Price × 100");
    expect(prompt).toContain("Never confuse markup with margin");
    expect(prompt).toContain("Check dimensional consistency");
  });

  it("requires safety escalation and professional review", () => {
    expect(prompt).toContain("Never approve unsafe work");
    expect(prompt).toContain("competent-person");
    expect(prompt).toContain("advise stopping work");
  });

  it("preserves voice security and privacy requirements", () => {
    expect(prompt).toContain("Keep API keys server-side only");
    expect(prompt).toContain("Zero Retention Mode");
    expect(prompt).toContain("disabled voice recording");
  });

  it("requires continuous voice turns after the initial browser permission action", () => {
    expect(prompt).toContain("continuous hands-free turns");
    expect(prompt).toContain("Do not repeat the welcome greeting");
  });
});
