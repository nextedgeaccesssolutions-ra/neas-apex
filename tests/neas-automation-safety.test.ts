import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const autofix = read(".github/workflows/autofix.yml");
const dependency = read(".github/workflows/dependency-automerge.yml");
const widget = read("components/FreeVoiceAIWidget.tsx");

describe("NEAS APEX workflow safety", () => {
  it("probes the active production alias and a server-rendered voice landmark", () => {
    expect(autofix).toContain('PROD_URL: "https://neas-apex-nextedgeaccesssolutions-neas.vercel.app"');
    expect(autofix).toContain("aria-label=\"NEAS AI Core voice conversation\"");
    expect(widget).toContain('aria-label="NEAS AI Core voice conversation"');
    expect(autofix).toContain("FAIL health expected=200");
    expect(autofix).not.toContain('grep -q "elevenlabs-convai"');
  });

  it("keeps untrusted pull-request formatting checks read-only and shell-safe", () => {
    expect(autofix).toContain("persist-credentials: false");
    expect(autofix).toContain("CHANGED_FILES_JSON");
    expect(autofix).toContain("spawnSync");
    expect(autofix).toContain("files_json");
    expect(autofix).not.toContain("contents: write");
    expect(autofix).not.toContain("git push origin");
    expect(autofix).not.toContain("${{ steps.changed.outputs.list }}");
  });

  it("scopes issue-write access to the production probe and supplies repository context", () => {
    expect(autofix).toContain("permissions:\n  contents: read\n\nconcurrency:");
    expect(autofix).toContain("      issues: write");
    expect(autofix).toContain('gh issue list --repo "$GITHUB_REPOSITORY"');
    expect(autofix).toContain('gh issue comment "${EXISTING}" --repo "$GITHUB_REPOSITORY"');
    expect(autofix).toContain('gh issue create --repo "$GITHUB_REPOSITORY"');
  });

  it("requires human review and never enables dependency auto-merge", () => {
    expect(dependency).toContain("pull_request_target");
    expect(dependency).toContain("independent human reviewer");
    expect(dependency).not.toContain("gh pr merge --auto");
  });
});
