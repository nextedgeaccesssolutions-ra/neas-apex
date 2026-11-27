import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("NEAS APEX repository agent guidance", () => {
  it("identifies NEAS APEX and isolates legacy notes", () => {
    const agents = read("AGENTS.md");
    const claude = read("CLAUDE.md");
    const legacy = read("docs/archive/CLAUDE-FOUNDEROS-LEGACY.txt");

    expect(agents).toContain("# NEAS APEX — repository agent rules");
    expect(agents).toContain(
      "active product identity is **NEAS APEX / NEAS AI**",
    );
    expect(agents).toContain(
      "Historical FounderOS/GladOS notes are preserved only in",
    );
    expect(claude).toContain("# NEAS APEX — Claude Code instructions");
    expect(claude).toContain("Read and follow AGENTS.md");
    expect(claude).toContain("docs/archive/CLAUDE-FOUNDEROS-LEGACY.txt");
    expect(legacy).toContain(
      "# FounderOS (on GladOS): project notes for coding agents",
    );
    expect(legacy).toContain("LEGACY ARCHIVE — NOT CURRENT NEAS APEX GUIDANCE");
  });
});
