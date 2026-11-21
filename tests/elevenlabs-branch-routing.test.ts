import { describe, expect, it } from "vitest";
import {
  NEAS_ELEVENLABS_ENGINEERING_AI_BRANCH_ID,
  NEAS_ELEVENLABS_MAIN_BRANCH_ID,
  resolveNeasElevenLabsBranchId,
} from "../lib/elevenlabs-agent-config";

describe("NEAS ElevenLabs branch routing", () => {
  it("uses the live Main agent branch for production by default", () => {
    expect(resolveNeasElevenLabsBranchId({ VERCEL_ENV: "production" })).toBe(
      NEAS_ELEVENLABS_MAIN_BRANCH_ID,
    );
  });

  it("uses the isolated Engineering AI branch for previews and local development", () => {
    expect(resolveNeasElevenLabsBranchId({ VERCEL_ENV: "preview" })).toBe(
      NEAS_ELEVENLABS_ENGINEERING_AI_BRANCH_ID,
    );
    expect(resolveNeasElevenLabsBranchId({})).toBe(
      NEAS_ELEVENLABS_ENGINEERING_AI_BRANCH_ID,
    );
  });

  it("honors an explicit server-side branch override", () => {
    expect(
      resolveNeasElevenLabsBranchId({
        VERCEL_ENV: "production",
        ELEVENLABS_AGENT_BRANCH_ID: "agtbrch_explicit-approved-override",
      }),
    ).toBe("agtbrch_explicit-approved-override");
  });
});
