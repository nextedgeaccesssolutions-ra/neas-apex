import { describe, expect, it } from "vitest";
import ApexOverviewPanel from "../components/ApexOverviewPanel";

describe("ApexOverviewPanel", () => {
  it("loads with supported Lucide icon exports", () => {
    expect(typeof ApexOverviewPanel).toBe("function");
  });
});
