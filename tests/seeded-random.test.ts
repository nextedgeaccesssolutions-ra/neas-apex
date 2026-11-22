import { describe, expect, it } from "vitest";
import { seededUnit } from "../lib/seeded-random";

describe("seededUnit", () => {
  it("returns a stable value for the same index", () => {
    expect(seededUnit(42)).toBe(seededUnit(42));
  });

  it("returns values in the half-open unit interval", () => {
    for (let index = 0; index < 1000; index += 1) {
      expect(seededUnit(index)).toBeGreaterThanOrEqual(0);
      expect(seededUnit(index)).toBeLessThan(1);
    }
  });

  it("varies values across particle indices", () => {
    expect(seededUnit(1)).not.toBe(seededUnit(2));
  });
});
