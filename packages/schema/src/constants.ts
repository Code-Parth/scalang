/**
 * Constants for Scalang CLI — locales, themes, default field groups.
 * Locale codes aligned with @lingo.dev/_spec and @lingo.dev/_locales.
 */

import {
  localeCodesShort,
  localeCodesFull,
  type LocaleCodeShort,
} from "@lingo.dev/_spec";

/** Supported locale codes (short) from @lingo.dev/_spec */
export const LINGO_LOCALE_CODES_SHORT = localeCodesShort;

/** Supported locale codes (full) from @lingo.dev/_spec */
export const LINGO_LOCALE_CODES_FULL = localeCodesFull;

/** All supported locale codes (short + full, deduplicated, sorted) */
export const ALL_LOCALE_CODES: string[] = [
  ...new Set([...localeCodesShort, ...localeCodesFull]),
].sort();

const displayNames = new Intl.DisplayNames(["en"], { type: "language" });

/** Get human-readable label for a locale code */
export function getLocaleLabel(code: string): string {
  try {
    return displayNames.of(code) ?? code;
  } catch {
    return code;
  }
}

/**
 * All supported locales with labels for CLI prompts.
 * Includes both short (e.g. "en") and full BCP 47 (e.g. "en-US") codes.
 */
export const SUPPORTED_LOCALES: ReadonlyArray<{
  value: string;
  label: string;
}> = ALL_LOCALE_CODES.map((code) => ({
  value: code,
  label: `${getLocaleLabel(code)} (${code})`,
}));

export const SCALAR_THEMES = [
  { value: "default", label: "Default" },
  { value: "alternate", label: "Alternate" },
  { value: "moon", label: "Moon" },
  { value: "purple", label: "Purple" },
  { value: "solarized", label: "Solarized" },
  { value: "bluePlanet", label: "Blue Planet" },
  { value: "saturn", label: "Saturn" },
  { value: "kepler", label: "Kepler" },
  { value: "mars", label: "Mars" },
  { value: "deepSpace", label: "Deep Space" },
  { value: "laserwave", label: "Laserwave" },
  { value: "elysiajs", label: "Elysia.js" },
  { value: "fastify", label: "Fastify" },
  { value: "none", label: "None" },
] as const;

export const SCALAR_LAYOUTS = [
  { value: "modern", label: "Modern" },
  { value: "classic", label: "Classic" },
] as const;

export const SCALAR_DOCUMENT_DOWNLOAD_TYPES = [
  { value: "none", label: "None" },
  { value: "yaml", label: "YAML" },
  { value: "json", label: "JSON" },
  { value: "both", label: "Both" },
  { value: "direct", label: "Direct" },
] as const;

export const SCALAR_OPERATION_TITLE_SOURCES = [
  { value: "summary", label: "Summary" },
  { value: "path", label: "Path" },
] as const;

export const SCALAR_SHOW_DEVELOPER_TOOLS = [
  { value: "never", label: "Never" },
  { value: "always", label: "Always" },
  { value: "localhost", label: "Localhost only" },
] as const;

export const DEFAULT_TRANSLATABLE_FIELDS = [
  {
    name: "info",
    enabled: true,
    fields: ["info.title", "info.summary", "info.description"],
  },
  { name: "tags", enabled: true, fields: ["tags[*].description"] },
  {
    name: "operations",
    enabled: true,
    fields: ["paths.*.*.summary", "paths.*.*.description"],
  },
  {
    name: "parameters",
    enabled: true,
    fields: ["paths.*.*.parameters[*].description"],
  },
  {
    name: "schemas",
    enabled: true,
    fields: [
      "components.schemas.*.description",
      "components.schemas.*.properties.*.description",
    ],
  },
] as const;

export const DEFAULT_LINGO_CONFIG = {
  batchSize: 100,
  idealBatchItemSize: 1000,
  fast: false,
} as const;
