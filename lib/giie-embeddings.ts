/**
 * Provider-neutral GIIE embedding pipeline primitives.
 *
 * This module deliberately contains no vendor SDK and performs no network calls
 * unless an adapter is supplied by a server-only caller. It never embeds
 * confidential NEAS material: callers must pass public GIIE discovery text.
 */
export interface GiieEmbeddingProvider {
  readonly provider: string;
  readonly model: string;
  readonly dimensions: number;
  embed(texts: readonly string[], signal?: AbortSignal): Promise<readonly (readonly number[])[]>;
}

export interface GiieEmbeddingInput {
  id: string;
  knowledgeSpace: "public-global-intelligence";
  title: string;
  lawfulSummary: string;
  coreConcept?: string;
  subjects?: readonly string[];
  industries?: readonly string[];
}

export interface GiieEmbeddingOutput {
  id: string;
  embedding: readonly number[];
  embeddingModel: string;
  embeddingDimension: number;
}

export interface GiieEmbeddingOptions {
  batchSize?: number;
  maxCharactersPerItem?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  signal?: AbortSignal;
  sleep?: (milliseconds: number) => Promise<void>;
}

export function buildGiieEmbeddingText(input: GiieEmbeddingInput, maxCharacters = 8_000): string {
  if (input.knowledgeSpace !== "public-global-intelligence") {
    throw new Error("Only public-global-intelligence records may be embedded by GIIE.");
  }
  const title = requiredText(input.title, "title", 500);
  const summary = requiredText(input.lawfulSummary, "lawfulSummary", maxCharacters);
  const parts = [
    "Title: " + title,
    "Summary: " + summary,
    input.coreConcept ? "Concept: " + input.coreConcept.trim().slice(0, 1_000) : "",
    input.subjects?.length ? "Subjects: " + input.subjects.slice(0, 30).join(", ") : "",
    input.industries?.length ? "Industries: " + input.industries.slice(0, 20).join(", ") : "",
  ].filter(Boolean);
  return parts.join("\n").slice(0, maxCharacters);
}

function requiredText(value: string, field: string, max: number): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(field + " is required.");
  return value.trim().slice(0, max);
}

export function validateEmbeddingVector(vector: readonly number[], dimensions: number): number[] {
  if (!Number.isInteger(dimensions) || dimensions < 1 || dimensions > 16_384) {
    throw new Error("Embedding dimensions must be an integer between 1 and 16384.");
  }
  if (!Array.isArray(vector) || vector.length !== dimensions) {
    throw new Error("Embedding vector dimension does not match the configured model.");
  }
  const normalized = vector.map((value) => {
    if (!Number.isFinite(value)) throw new Error("Embedding vectors must contain only finite numbers.");
    return value;
  });
  const norm = Math.sqrt(normalized.reduce((sum, value) => sum + value * value, 0));
  if (norm === 0) throw new Error("Embedding vector must not be a zero vector.");
  return normalized;
}

export async function generateGiieEmbeddings(
  items: readonly GiieEmbeddingInput[],
  provider: GiieEmbeddingProvider | null,
  options: GiieEmbeddingOptions = {},
): Promise<GiieEmbeddingOutput[]> {
  if (items.length === 0) return [];
  if (!provider) throw new Error("No approved GIIE embedding provider is configured; no external model was called.");
  if (!provider.provider.trim() || !provider.model.trim()) throw new Error("Embedding provider and model identifiers are required.");
  if (!Number.isInteger(provider.dimensions) || provider.dimensions < 1 || provider.dimensions > 16_384) {
    throw new Error("Configured embedding dimensions are invalid.");
  }

  const batchSize = clampInteger(options.batchSize ?? 16, 1, 64);
  const maxRetries = clampInteger(options.maxRetries ?? 2, 0, 5);
  const retryDelayMs = clampInteger(options.retryDelayMs ?? 250, 0, 10_000);
  const maxCharacters = clampInteger(options.maxCharactersPerItem ?? 8_000, 256, 20_000);
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const output: GiieEmbeddingOutput[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    if (!item.id.trim() || seen.has(item.id)) throw new Error("Embedding input IDs must be non-empty and unique.");
    seen.add(item.id);
  }

  for (let offset = 0; offset < items.length; offset += batchSize) {
    if (options.signal?.aborted) throw new Error("GIIE embedding job was cancelled.");
    const batch = items.slice(offset, offset + batchSize);
    const texts = batch.map((item) => buildGiieEmbeddingText(item, maxCharacters));
    let vectors: readonly (readonly number[])[] | undefined;
    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      if (options.signal?.aborted) throw new Error("GIIE embedding job was cancelled.");
      try {
        vectors = await provider.embed(texts, options.signal);
        break;
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) await sleep(retryDelayMs * (attempt + 1));
      }
    }
    if (!vectors) throw new Error("GIIE embedding provider failed after retries: " + safeError(lastError));
    if (vectors.length !== batch.length) throw new Error("Embedding provider returned an unexpected number of vectors.");

    for (let index = 0; index < batch.length; index += 1) {
      output.push({
        id: batch[index].id,
        embedding: validateEmbeddingVector(vectors[index], provider.dimensions),
        embeddingModel: provider.provider + ":" + provider.model,
        embeddingDimension: provider.dimensions,
      });
    }
  }
  return output;
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function safeError(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 300);
  return "unknown provider error";
}

/** Explicit opt-in factory. No provider is selected by default. */
export function createConfiguredEmbeddingProvider(): null {
  return null;
}
