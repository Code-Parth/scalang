/**
 * @scalang/schema — Configuration schema and types for Scalang CLI.
 */

import schema from "./schema.json" with { type: "json" };
export { schema };
export type {
  ScalangConfig,
  TranslatableFieldGroup,
  ScalarConfig,
  ApiReferenceConfiguration,
  ApiReferenceConfigurationWithSource,
  ApiReferenceConfigurationWithMultipleSources,
  AnyApiReferenceConfiguration,
  LingoConfig,
  LingoLocaleConfig,
  SpecManifest,
} from "./types";
export type { LocaleCode, LocaleCodeFull, LocaleCodeShort } from "./types";
export {
  validateConfig,
  assertValidConfig,
  type ValidationResult,
  type LocaleValidationError,
} from "./validator";
export {
  SUPPORTED_LOCALES,
  ALL_LOCALE_CODES,
  getLocaleLabel,
  LINGO_LOCALE_CODES_SHORT,
  LINGO_LOCALE_CODES_FULL,
  SCALAR_THEMES,
  SCALAR_LAYOUTS,
  SCALAR_DOCUMENT_DOWNLOAD_TYPES,
  SCALAR_OPERATION_TITLE_SOURCES,
  SCALAR_SHOW_DEVELOPER_TOOLS,
  DEFAULT_TRANSLATABLE_FIELDS,
  DEFAULT_LINGO_CONFIG,
} from "./constants";
