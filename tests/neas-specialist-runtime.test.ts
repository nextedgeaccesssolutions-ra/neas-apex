import { describe, expect, it } from "vitest";
import { NEAS_RUNTIME_SPECIALISTS, routeNeasRuntimeSpecialist } from "../lib/neas-specialist-runtime";

describe("NEAS specialist runtime registry", () => {
  it("registers all 12 primary specialist domains", () => {
    expect(Object.keys(NEAS_RUNTIME_SPECIALISTS)).toHaveLength(12);
  });

  it.each([
    ["Prepare an IRATA rope access rigging review", "engineering"],
    ["Prepare a project schedule and manpower plan", "project-management"],
    ["Prepare a JSA and rescue plan", "safety"],
    ["Build a BOQ and cash flow forecast", "commercial"],
    ["Review wind turbine blade inspection scope", "renewable-energy"],
    ["Qualify a client lead and tender opportunity", "business-development"],
    ["Improve SEO and website conversion", "marketing"],
    ["Compare suppliers and prepare procurement specs", "procurement"],
    ["Prepare a GWO training course plan", "training"],
    ["Review contract liability and compliance clauses", "legal-compliance"],
    ["Analyze KPI dashboard performance metrics", "data-intelligence"],
    ["Prepare the CEO corporate growth strategy", "executive"],
  ])("routes '%s' to %s", (objective, expected) => {
    expect(routeNeasRuntimeSpecialist(objective)).toBe(expected);
  });
});
