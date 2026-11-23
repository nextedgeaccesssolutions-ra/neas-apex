import { describe, expect, it } from "vitest";
import { normalizeSourceUrl } from "../lib/giie-store";

describe("NEAS GIIE public source URL normalization", () => {
  it("normalizes host case and removes fragments and trailing path slashes", () => {
    expect(normalizeSourceUrl("https://WWW.Example.org/research///#section")).toBe("https://www.example.org/research");
  });

  it("rejects non-http protocols", () => {
    expect(() => normalizeSourceUrl("javascript:alert(1)")).toThrow();
  });
});
