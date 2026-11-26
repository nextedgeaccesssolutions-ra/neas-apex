import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("NEAS APEX repository agent guidance", () => {
  it("identifies NEAS APEX and labels legacy notes", () => {
    const agents = read("AGENTS.md");
    const claude = read("CLAUDE.md");

    expect(agents).toContain("# NEAS APEX — repository agent rules");
    expect(agents).toContain(
      "active product identity is **NEAS APEX / NEAS AI**",
    );
    expect(agents).toContain(
      "`CLAUDE.md` is a legacy FounderOS/GladOS reference archive only.",
    );
    expect(claude).toMatch(
      /^> \*\*LEGACY REFERENCE — NOT AUTHORITATIVE FOR NEAS APEX\*\*/,
    );
    expect(claude).toContain(
      "Do not use these instructions to identify the product",
    );
  });
});
