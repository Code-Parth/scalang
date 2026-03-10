/**
 * Validate config against the JSON Schema using AJV.
 * Locale fields validated via @lingo.dev/_locales.
 */

import { Ajv, type ValidateFunction, type ErrorObject } from "ajv";
import { isValidLocale } from "@lingo.dev/_locales";
import schema from "./schema.json" with { type: "json" };
import type { ScalangConfig } from "./types";

export interface ValidationResult {
  valid: boolean;
  data?: ScalangConfig;
  errors?: ErrorObject[] | null;
}

export interface LocaleValidationError {
  instancePath: string;
  message: string;
}

let validateFn: ValidateFunction<ScalangConfig> | null = null;

function getValidator(): ValidateFunction<ScalangConfig> {
  if (validateFn) return validateFn;
  const ajv = new Ajv({ allErrors: true });
  validateFn = ajv.compile<ScalangConfig>(schema as object);
  return validateFn;
}

function validateLocaleFields(config: ScalangConfig): LocaleValidationError[] {
  const errs: LocaleValidationError[] = [];
  if (config.sourceLocale && !isValidLocale(config.sourceLocale)) {
    errs.push({
      instancePath: "/sourceLocale",
      message: `Invalid locale: "${config.sourceLocale}". Use BCP 47 format (e.g. en, en-US). See @lingo.dev/_locales.`,
    });
  }
  if (config.targetLocales) {
    for (let i = 0; i < config.targetLocales.length; i++) {
      const loc = config.targetLocales[i];
      if (loc && !isValidLocale(loc)) {
        errs.push({
          instancePath: `/targetLocales/${i}`,
          message: `Invalid locale: "${loc}". Use BCP 47 format. See @lingo.dev/_locales.`,
        });
      }
    }
  }
  if (config.defaultLocale && !isValidLocale(config.defaultLocale)) {
    errs.push({
      instancePath: "/defaultLocale",
      message: `Invalid locale: "${config.defaultLocale}". Use BCP 47 format. See @lingo.dev/_locales.`,
    });
  }
  return errs;
}

/**
 * Validate a config object against the schema.
 * Also validates locale fields via @lingo.dev/_locales.
 */
export function validateConfig(config: unknown): ValidationResult {
  const validate = getValidator();
  const valid = validate(config);

  if (!valid) {
    return {
      valid: false,
      errors: validate.errors ?? null,
    };
  }

  const cfg = config as ScalangConfig;
  const localeErrs = validateLocaleFields(cfg);
  if (localeErrs.length > 0) {
    return {
      valid: false,
      errors: localeErrs.map((e) => ({
        instancePath: e.instancePath,
        message: e.message,
      })) as unknown as ErrorObject[],
    };
  }

  return { valid: true, data: cfg };
}

/**
 * Validate and throw if invalid.
 */
export function assertValidConfig(
  config: unknown
): asserts config is ScalangConfig {
  const result = validateConfig(config);
  if (!result.valid) {
    const msg =
      result.errors?.map((e) => `${e.instancePath}: ${e.message}`).join("; ") ??
      "Invalid config";
    throw new Error(msg);
  }
}
