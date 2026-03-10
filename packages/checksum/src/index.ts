import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Deep-sort all object keys for stable serialization,
 * so formatting changes (prettier, lint:fix) don't affect the checksum.
 */
export function deepSortKeys(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(deepSortKeys);
  if (typeof obj === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
      sorted[key] = deepSortKeys((obj as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return obj;
}

/**
 * Compute SHA-256 checksum of raw string content.
 */
export function contentChecksum(content: string): string {
  try {
    // Try to normalize JSON so whitespace/key-order changes don't affect the hash
    const normalized = JSON.stringify(deepSortKeys(JSON.parse(content)));
    return createHash("sha256").update(normalized).digest("hex");
  } catch {
    // Not valid JSON — hash raw content
    return createHash("sha256").update(content).digest("hex");
  }
}

/**
 * Compute SHA-256 checksum of a file's content.
 * Returns empty string if file doesn't exist.
 */
export function fileChecksum(filePath: string): string {
  if (!existsSync(filePath)) return "";
  const content = readFileSync(filePath, "utf-8");
  return contentChecksum(content);
}

/**
 * Compute checksums for all locale spec files in an output directory.
 */
export function computeLocaleChecksums(
  outputDir: string,
  locales: string[]
): Record<string, string> {
  const checksums: Record<string, string> = {};
  for (const locale of locales) {
    const filePath = join(outputDir, `${locale}.json`);
    checksums[locale] = fileChecksum(filePath);
  }
  return checksums;
}

// ── Generation state ─────────────────────────────────────────────

export interface GenerationState {
  sourceChecksum: string;
  configChecksum: string;
  locales: string[];
  fieldCount: number;
  generatedAt: string;
}

/**
 * Load previously saved generation state from a directory.
 * Returns null if no state file exists or it's corrupted.
 */
export function loadState(outputDir: string): GenerationState | null {
  const statePath = join(outputDir, ".generation-state.json");
  try {
    if (existsSync(statePath)) {
      return JSON.parse(readFileSync(statePath, "utf-8")) as GenerationState;
    }
  } catch {
    // Corrupted state — regenerate
  }
  return null;
}

/**
 * Save generation state to a directory.
 */
export function saveState(outputDir: string, state: GenerationState): void {
  const statePath = join(outputDir, ".generation-state.json");
  writeFileSync(statePath, JSON.stringify(state, null, 2), "utf-8");
}

/**
 * Check whether generation can be skipped based on checksums.
 */
export function canSkipGeneration(
  currentSourceChecksum: string,
  currentConfigChecksum: string,
  allLocales: string[],
  previousState: GenerationState | null,
  allSpecsExist: boolean
): boolean {
  if (!previousState) return false;

  const sourceUnchanged =
    previousState.sourceChecksum === currentSourceChecksum;
  const configUnchanged =
    previousState.configChecksum === currentConfigChecksum;
  const localesUnchanged =
    JSON.stringify(previousState.locales.slice().sort()) ===
    JSON.stringify(allLocales.slice().sort());

  return (
    sourceUnchanged && configUnchanged && localesUnchanged && allSpecsExist
  );
}

// ── Retranslate cache ────────────────────────────────────────────

/**
 * Cache of fields confirmed identical to source after translation.
 * These are brand names, proper nouns, etc. that don't need retranslation.
 * Shape: { "fr": ["info.title", ...], "de": [...] }
 */
export type RetranslateCache = Record<string, string[]>;

/**
 * Load the retranslate cache from a directory.
 */
export function loadRetranslateCache(outputDir: string): RetranslateCache {
  const cachePath = join(outputDir, ".retranslate-cache.json");
  try {
    if (existsSync(cachePath)) {
      return JSON.parse(readFileSync(cachePath, "utf-8")) as RetranslateCache;
    }
  } catch {
    // Corrupted cache — start fresh
  }
  return {};
}

/**
 * Save the retranslate cache to a directory.
 */
export function saveRetranslateCache(
  outputDir: string,
  cache: RetranslateCache
): void {
  const cachePath = join(outputDir, ".retranslate-cache.json");
  writeFileSync(cachePath, JSON.stringify(cache, null, 2), "utf-8");
}
