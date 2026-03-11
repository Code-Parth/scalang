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

export interface LocaleChecksum {
  /** Checksum of the translated spec file for this locale */
  specChecksum: string;
  /** Checksum of the source spec at the time this locale was generated */
  sourceChecksum: string;
  /** Checksum of the config at the time this locale was generated */
  configChecksum: string;
  /** ISO timestamp of when this locale was last generated */
  generatedAt: string;
}

export interface GenerationState {
  sourceChecksum: string;
  configChecksum: string;
  locales: string[];
  fieldCount: number;
  generatedAt: string;
  /** Per-locale checksums for granular skip logic */
  localeChecksums?: Record<string, LocaleChecksum>;
  /** Per-field checksums of source translatable values at generation time */
  sourceFieldChecksums?: Record<string, string>;
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

/**
 * Determine which locales need regeneration based on per-locale checksums.
 * Returns an array of locale codes that need to be re-translated.
 *
 * A locale can be skipped when:
 * - Its spec file exists on disk
 * - It has a saved locale checksum entry
 * - The source spec and config checksums match what was used to generate it
 * - The spec file checksum matches what was saved
 */
export function getLocalesToRegenerate(
  currentSourceChecksum: string,
  currentConfigChecksum: string,
  targetLocales: string[],
  previousState: GenerationState | null,
  outputDir: string
): { toRegenerate: string[]; skipped: string[] } {
  if (!previousState?.localeChecksums) {
    return { toRegenerate: [...targetLocales], skipped: [] };
  }

  const toRegenerate: string[] = [];
  const skipped: string[] = [];

  for (const locale of targetLocales) {
    const saved = previousState.localeChecksums[locale];
    if (!saved) {
      toRegenerate.push(locale);
      continue;
    }

    const specPath = join(outputDir, `${locale}.json`);
    if (!existsSync(specPath)) {
      toRegenerate.push(locale);
      continue;
    }

    const currentSpecChecksum = fileChecksum(specPath);

    const sourceMatch = saved.sourceChecksum === currentSourceChecksum;
    const configMatch = saved.configChecksum === currentConfigChecksum;
    const specMatch = saved.specChecksum === currentSpecChecksum;

    if (sourceMatch && configMatch && specMatch) {
      skipped.push(locale);
    } else {
      toRegenerate.push(locale);
    }
  }

  return { toRegenerate, skipped };
}

/**
 * Build locale checksum entries for the locales that were just generated.
 * Merges with any existing entries for locales that were skipped.
 */
export function buildLocaleChecksums(
  outputDir: string,
  generatedLocales: string[],
  sourceChecksum: string,
  configChecksum: string,
  existingChecksums?: Record<string, LocaleChecksum>
): Record<string, LocaleChecksum> {
  const result: Record<string, LocaleChecksum> = { ...existingChecksums };
  const now = new Date().toISOString();

  for (const locale of generatedLocales) {
    const specPath = join(outputDir, `${locale}.json`);
    result[locale] = {
      specChecksum: fileChecksum(specPath),
      sourceChecksum,
      configChecksum,
      generatedAt: now,
    };
  }

  return result;
}

// ── Field-level checksums ─────────────────────────────────────────

/**
 * Compute per-field SHA-256 checksums for a translations map.
 */
export function buildFieldChecksums(
  translations: Record<string, string>
): Record<string, string> {
  const checksums: Record<string, string> = {};
  for (const [key, value] of Object.entries(translations)) {
    checksums[key] = createHash("sha256").update(value).digest("hex");
  }
  return checksums;
}

export interface FieldDiff {
  /** Fields present in current but not in previous */
  added: string[];
  /** Fields present in both but with different values */
  changed: string[];
  /** Fields present in previous but not in current */
  removed: string[];
  /** Fields present in both with identical values */
  unchanged: string[];
}

/**
 * Compute which source fields have changed between generations.
 * Compares current translations against previously saved field checksums.
 */
export function getChangedFields(
  currentTranslations: Record<string, string>,
  previousFieldChecksums: Record<string, string> | undefined
): FieldDiff {
  if (!previousFieldChecksums) {
    return {
      added: Object.keys(currentTranslations),
      changed: [],
      removed: [],
      unchanged: [],
    };
  }

  const added: string[] = [];
  const changed: string[] = [];
  const unchanged: string[] = [];

  for (const [key, value] of Object.entries(currentTranslations)) {
    const prevChecksum = previousFieldChecksums[key];
    if (!prevChecksum) {
      added.push(key);
    } else {
      const currentChecksum = createHash("sha256").update(value).digest("hex");
      if (currentChecksum !== prevChecksum) {
        changed.push(key);
      } else {
        unchanged.push(key);
      }
    }
  }

  const currentKeys = new Set(Object.keys(currentTranslations));
  const removed = Object.keys(previousFieldChecksums).filter(
    (key) => !currentKeys.has(key)
  );

  return { added, changed, removed, unchanged };
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
