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

/** Curated locales for CLI prompts with labels. Subset of LINGO_LOCALE_CODES_SHORT. */
export const SUPPORTED_LOCALES = [
  { value: "en" as LocaleCodeShort, label: "English" },
  { value: "fr" as LocaleCodeShort, label: "French" },
  { value: "es" as LocaleCodeShort, label: "Spanish" },
  { value: "de" as LocaleCodeShort, label: "German" },
  { value: "ja" as LocaleCodeShort, label: "Japanese" },
  { value: "zh" as LocaleCodeShort, label: "Chinese" },
  { value: "ko" as LocaleCodeShort, label: "Korean" },
  { value: "pt" as LocaleCodeShort, label: "Portuguese" },
  { value: "it" as LocaleCodeShort, label: "Italian" },
  { value: "ru" as LocaleCodeShort, label: "Russian" },
  { value: "ar" as LocaleCodeShort, label: "Arabic" },
  { value: "hi" as LocaleCodeShort, label: "Hindi" },
  { value: "nl" as LocaleCodeShort, label: "Dutch" },
  { value: "pl" as LocaleCodeShort, label: "Polish" },
  { value: "tr" as LocaleCodeShort, label: "Turkish" },
  { value: "vi" as LocaleCodeShort, label: "Vietnamese" },
  { value: "th" as LocaleCodeShort, label: "Thai" },
] as const;

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
