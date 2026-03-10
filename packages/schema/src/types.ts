import type { ApiReferenceConfiguration } from "@scalar/types/api-reference";

/**
 * Configuration types for Scalang.
 * Maps to the .scalang-config JSON config file.
 */

export interface ScalangConfig {
  $schema?: string;
  source: string;
  outputDir?: string;
  sourceLocale: string;
  targetLocales: string[];
  defaultLocale: string;
  translatableFields: TranslatableFieldGroup[];
  scalar?: ScalarConfig;
  lingo?: LingoConfig;
}

export interface TranslatableFieldGroup {
  name: string;
  enabled: boolean;
  fields: string[];
}

/**
 * JSON-serializable subset of Scalar API Reference config.
 * Aligned with @scalar/types/api-reference apiReferenceConfigurationSchema.
 * Only includes properties that can be serialized to JSON (no functions).
 */
export type ScalarConfig = Partial<
  Pick<
    ApiReferenceConfiguration,
    | "title"
    | "slug"
    | "baseServerURL"
    | "hideClientButton"
    | "proxyUrl"
    | "searchHotKey"
    | "showSidebar"
    | "showDeveloperTools"
    | "operationTitleSource"
    | "theme"
    | "layout"
    | "persistAuth"
    | "telemetry"
    | "hideModels"
    | "documentDownloadType"
    | "hideDownloadButton"
    | "hideTestRequestButton"
    | "hideSearch"
    | "showOperationId"
    | "darkMode"
    | "forceDarkModeState"
    | "hideDarkModeToggle"
    | "favicon"
    | "customCss"
    | "withDefaultFonts"
    | "defaultOpenFirstTag"
    | "defaultOpenAllTags"
    | "expandAllModelSections"
    | "expandAllResponses"
    | "tagsSorter"
    | "operationsSorter"
    | "orderSchemaPropertiesBy"
    | "orderRequiredPropertiesFirst"
  >
>;

/** Re-export Scalar types for consumers */
export type {
  ApiReferenceConfiguration,
  ApiReferenceConfigurationWithSource,
  ApiReferenceConfigurationWithMultipleSources,
  AnyApiReferenceConfiguration,
} from "@scalar/types/api-reference";

/**
 * Lingo.dev SDK options for OpenAPI translation.
 * Compatible with lingo.dev SDK batch translation.
 * Locale fields (sourceLocale, targetLocales) use @lingo.dev/_locales format.
 */
export interface LingoConfig {
  /** Max items per API request (1-250, default: 100) */
  batchSize?: number;
  /** Target word count per batch (1-2500, default: 1000) */
  idealBatchItemSize?: number;
  /** Prioritize speed over quality */
  fast?: boolean;
}

/** Locale config shape from @lingo.dev/_spec localeSchema */
export interface LingoLocaleConfig {
  source: string;
  targets: string[];
}

/** Re-export Lingo types for consumers */
export type {
  LocaleCode,
  LocaleCodeFull,
  LocaleCodeShort,
} from "@lingo.dev/_spec";

/** Manifest written by the prebuild script */
export interface SpecManifest {
  locales: string[];
  defaultLocale: string;
  generatedAt: string;
  source: string;
}
