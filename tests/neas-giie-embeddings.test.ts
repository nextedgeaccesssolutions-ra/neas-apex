import { describe, expect, it, vi } from "vitest";
import {
  buildGiieEmbeddingText,
  generateGiieEmbeddings,
  validateEmbeddingVector,
  type GiieEmbeddingProvider,
} from "../lib/giie-embeddings";

const item = {
  id: "discovery-1",
  knowledgeSpace: "public-global-intelligence" as const,
  title: "Floating offshore wind innovation",
  lawfulSummary: "A public, attributed summary of a published technology announcement.",
  coreConcept: "Floating foundation",
  subjects: ["wind", "offshore"],
  industries: ["renewable energy"],
};

describe("GIIE embedding safeguards", () => {
  it("builds bounded text from public discovery fields only", () => {
    expect(buildGiieEmbeddingText(item)).toContain("Floating offshore wind innovation");
    expect(buildGiieEmbeddingText(item, 256).length).toBeLessThanOrEqual(256);
  });

  it("rejects confidential knowledge-space records", () => {
    expect(() => buildGiieEmbeddingText({ ...item, knowledgeSpace: "confidential-neas-internal" as never })).toThrow(/Only public/);
  });

  it("validates vector dimension and finite, non-zero values", () => {
    expect(validateEmbeddingVector([1, 2, 3], 3)).toEqual([1, 2, 3]);
    expect(() => validateEmbeddingVector([1, 2], 3)).toThrow(/dimension/);
    expect(() => validateEmbeddingVector([1, Number.NaN], 2)).toThrow(/finite/);
    expect(() => validateEmbeddingVector([0, 0], 2)).toThrow(/zero/);
  });

  it("does not call a provider when no approved provider is configured", async () => {
    await expect(generateGiieEmbeddings([item], null)).rejects.toThrow(/No approved/);
  });

  it("batches input and annotates model and dimensions", async () => {
    const embed = vi.fn(async (texts: readonly string[]) => texts.map(() => [0.25, 0.75]));
    const provider: GiieEmbeddingProvider = { provider: "test", model: "fixture-v1", dimensions: 2, embed };
    const result = await generateGiieEmbeddings(
      [item, { ...item, id: "discovery-2" }],
      provider,
      { batchSize: 1 },
    );
    expect(embed).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
    expect(result[0].embeddingModel).toBe("test:fixture-v1");
    expect(result[0].embeddingDimension).toBe(2);
  });

  it("retries transient provider errors with bounded attempts", async () => {
    const embed = vi.fn()
      .mockRejectedValueOnce(new Error("temporary"))
      .mockResolvedValueOnce([[0.5, 0.5]]);
    const provider: GiieEmbeddingProvider = { provider: "test", model: "fixture-v1", dimensions: 2, embed };
    const result = await generateGiieEmbeddings([item], provider, { maxRetries: 1, sleep: async () => undefined });
    expect(result).toHaveLength(1);
    expect(embed).toHaveBeenCalledTimes(2);
  });

  it("rejects duplicate item IDs and provider dimension mismatches", async () => {
    const provider: GiieEmbeddingProvider = {
      provider: "test", model: "fixture-v1", dimensions: 2,
      embed: async () => [[0.5, 0.5]],
    };
    await expect(generateGiieEmbeddings([item, item], provider)).rejects.toThrow(/unique/);
    const wrong: GiieEmbeddingProvider = { ...provider, embed: async () => [[1, 2, 3]] };
    await expect(generateGiieEmbeddings([item], wrong)).rejects.toThrow(/dimension/);
  });
});
