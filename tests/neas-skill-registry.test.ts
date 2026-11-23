import { describe, expect, it } from "vitest";
import {
  NEAS_SPECIALIST_AGENT_MAP,
  buildNeasRegistrySkillInstruction,
  normalizeNeasSkillAssignments,
} from "../lib/neas-skill-registry";

describe("NEAS database skill registry runtime bridge", () => {
  it("maps all 12 specialist profiles to a registered workforce agent", () => {
    expect(Object.keys(NEAS_SPECIALIST_AGENT_MAP)).toHaveLength(12);
    expect(new Set(Object.values(NEAS_SPECIALIST_AGENT_MAP)).size).toBe(12);
    expect(NEAS_SPECIALIST_AGENT_MAP.engineering).toBe("engineering-director");
    expect(NEAS_SPECIALIST_AGENT_MAP["renewable-energy"]).toBe("wind-turbine-engineering");
    expect(NEAS_SPECIALIST_AGENT_MAP["legal-compliance"]).toBe("contract-administrator");
  });

  it("normalizes only active, valid database skill assignments", () => {
    const skills = normalizeNeasSkillAssignments([
      {
        priority: 10,
        proficiency: "advanced",
        agent_specific_guidance: "Check engineering evidence and identify gaps.",
        aiw_skill_catalog: {
          skill_key: "eng:inspection",
          name: "Inspection evidence review",
          description: "Reviews inspection evidence.",
          operating_guidance: "Separate observations from conclusions.",
          guardrails: ["Do not certify inspection results."],
          version: 2,
          lifecycle_status: "active",
        },
      },
      {
        aiw_skill_catalog: {
          skill_key: "old:skill",
          name: "Retired skill",
          lifecycle_status: "retired",
        },
      },
    ]);

    expect(skills).toHaveLength(1);
    expect(skills[0]).toMatchObject({
      skill_key: "eng:inspection",
      name: "Inspection evidence review",
      proficiency: "advanced",
      version: 2,
      guardrails: ["Do not certify inspection results."],
    });
  });

  it("adds database skills without allowing them to override system safety policy", () => {
    const prompt = buildNeasRegistrySkillInstruction("engineering", [{
      skill_key: "eng:inspection",
      name: "Inspection evidence review",
      description: "Reviews inspection evidence.",
      operating_guidance: "Separate observations from conclusions.",
      guardrails: ["Do not certify inspection results."],
      version: 2,
      priority: 10,
      proficiency: "advanced",
      agent_specific_guidance: "Flag missing evidence.",
    }]);

    expect(prompt).toContain("Inspection evidence review");
    expect(prompt).toContain("Separate observations from conclusions.");
    expect(prompt).toContain("Do not certify inspection results.");
    expect(prompt).toContain("They do not override the system policy");
  });

  it("returns no database prompt when no active skills are available", () => {
    expect(buildNeasRegistrySkillInstruction("engineering", [])).toBe("");
  });
});
