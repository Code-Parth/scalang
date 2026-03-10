/**
 * Main spec verification pipeline.
 * Orchestrates all checks: manifest, structure, translations, identifiers, English detection.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import type { ScalangConfig, TranslatableFieldGroup } from "@scalang/schema";
import {
  extractTranslatableFields,
  injectTranslations,
} from "@scalang/spec-loader";
import { translateMap } from "@scalang/lingo";
import { loadRetranslateCache, saveRetranslateCache } from "@scalang/checksum";
import {
  type VerificationResult,
  createResult,
  pass,
  fail,
  warn,
  fixed,
  printSummary,
} from "./result";
import { readJSON, writeJSON, countKeys } from "./helpers";
import { verifyTagNames, verifyOperationIds, verifyRefs } from "./identifiers";
import { detectEnglishScore } from "./english-detector";

export interface VerifyOptions {
  outputDir: string;
  config: ScalangConfig;
  fixMode?: boolean;
  retranslateMode?: boolean;
}

/**
 * Run the full verification pipeline on generated specs.
 * Returns the verification result and exits with code 1 if there are failures (in check-only mode).
 */
export async function verifySpecs(
  options: VerifyOptions
): Promise<VerificationResult> {
  const {
    outputDir,
    config,
    fixMode = false,
    retranslateMode = false,
  } = options;

  const result = createResult();
  const { sourceLocale, targetLocales, defaultLocale, translatableFields } =
    config;
  const allLocales = [
    sourceLocale,
    ...targetLocales.filter((l) => l !== sourceLocale),
  ];

  const fieldsToRetranslate: Record<string, Record<string, string>> = {};

  const modeLabel = retranslateMode
    ? " (RETRANSLATE MODE)"
    : fixMode
      ? " (FIX MODE)"
      : "";
  console.log(`\n[check] Scalang — Spec Verification${modeLabel}\n`);

  // ── 1. Check manifest ──────────────────────────────────────────
  console.log("[batch] Manifest:");
  const manifestPath = join(outputDir, "manifest.json");

  if (!existsSync(manifestPath)) {
    fail(result, `manifest.json not found at ${manifestPath}`);
    console.log("\n   Run 'scalang generate' first to generate specs.\n");
    printSummary(result, fixMode, retranslateMode);
    return result;
  }

  const manifest = readJSON(manifestPath);
  if (!manifest) {
    fail(result, "manifest.json is not valid JSON");
    printSummary(result, fixMode, retranslateMode);
    return result;
  }

  pass(result, "manifest.json exists and is valid JSON");

  const manifestLocales = manifest.locales as string[] | undefined;
  if (
    manifestLocales &&
    JSON.stringify(manifestLocales.slice().sort()) ===
      JSON.stringify(allLocales.slice().sort())
  ) {
    pass(
      result,
      `Manifest locales match config: [${manifestLocales.join(", ")}]`
    );
  } else {
    fail(
      result,
      `Manifest locales [${manifestLocales?.join(", ")}] don't match config [${allLocales.join(", ")}]`
    );
  }

  if (manifest.defaultLocale === defaultLocale) {
    pass(result, `Default locale matches: ${defaultLocale}`);
  } else {
    fail(
      result,
      `Manifest defaultLocale "${manifest.defaultLocale}" doesn't match config "${defaultLocale}"`
    );
  }

  // ── 2. Check spec files ────────────────────────────────────────
  console.log("\n[parse] Spec files:");
  const specs: Record<string, Record<string, unknown>> = {};

  for (const locale of allLocales) {
    const specPath = join(outputDir, `${locale}.json`);
    if (!existsSync(specPath)) {
      fail(result, `${locale}.json not found`);
      continue;
    }

    const spec = readJSON(specPath);
    if (!spec) {
      fail(result, `${locale}.json is not valid JSON`);
      continue;
    }

    if (!spec.openapi && !spec.swagger) {
      fail(result, `${locale}.json missing "openapi" field`);
      continue;
    }
    if (!spec.info) {
      fail(result, `${locale}.json missing "info" field`);
      continue;
    }

    const info = spec.info as Record<string, unknown>;
    const sizeKB = (Buffer.byteLength(JSON.stringify(spec)) / 1024).toFixed(1);
    pass(
      result,
      `${locale}.json — valid OpenAPI ${spec.openapi} (${sizeKB} KB, title: "${info.title}")`
    );
    specs[locale] = spec;
  }

  // ── 3. OpenAPI schema validation ───────────────────────────────
  console.log("\n[schema] OpenAPI schema validation:");

  const { validate } = await import("@scalar/openapi-parser");

  for (const locale of allLocales) {
    const spec = specs[locale];
    if (!spec) continue;

    const specJson = JSON.stringify(spec);
    const validationResult = await validate(specJson);

    if (validationResult.valid) {
      pass(result, `${locale}.json — valid OpenAPI schema`);
    } else {
      const errors = validationResult.errors
        ?.map((e: { message?: string }) => e.message)
        .filter(Boolean);
      const errorCount = errors?.length ?? 0;
      if (errorCount > 0) {
        warn(result, `${locale}.json — ${errorCount} validation issue(s)`);
        errors!
          .slice(0, 5)
          .forEach((e) => console.log(`      → ${e ?? "Unknown error"}`));
        if (errorCount > 5) {
          console.log(`      → ... and ${errorCount - 5} more`);
        }
      }
    }
  }

  // ── 4. Structural comparison ───────────────────────────────────
  const sourceSpec = specs[sourceLocale];
  if (!sourceSpec) {
    fail(result, "Source spec not found — cannot continue verification");
    printSummary(result, fixMode, retranslateMode);
    return result;
  }

  console.log("\n[struct] Structural integrity:");
  const sourceKeys = countKeys(sourceSpec);

  for (const locale of targetLocales.filter((l) => l !== sourceLocale)) {
    const targetSpec = specs[locale];
    if (!targetSpec) continue;

    const targetKeys = countKeys(targetSpec);
    if (sourceKeys === targetKeys) {
      pass(
        result,
        `${locale}.json has same structure as source (${sourceKeys} total nodes)`
      );
    } else {
      const diff = targetKeys - sourceKeys;
      fail(
        result,
        `${locale}.json structure differs: source has ${sourceKeys} nodes, ${locale} has ${targetKeys} (diff: ${diff > 0 ? "+" : ""}${diff})`
      );
    }
  }

  // ── 5. Translation verification ────────────────────────────────
  console.log("\n[i18n] Translation verification:");

  const sourceTranslations = extractTranslatableFields(
    sourceSpec,
    translatableFields as TranslatableFieldGroup[]
  );
  const translatableKeys = Object.keys(sourceTranslations);
  console.log(`   ${translatableKeys.length} translatable fields configured\n`);

  for (const locale of targetLocales.filter((l) => l !== sourceLocale)) {
    const targetSpec = specs[locale];
    if (!targetSpec) continue;

    console.log(`   ${locale}:`);

    const retranslateCache = loadRetranslateCache(outputDir);
    const cachedFields = new Set(retranslateCache[locale] ?? []);

    let translatedCount = 0;
    let unchangedCount = 0;
    let cachedIdenticalCount = 0;
    const unchangedFields: string[] = [];

    for (const key of translatableKeys) {
      const sourceVal = sourceTranslations[key];
      const targetTranslations = extractTranslatableFields(
        targetSpec,
        translatableFields as TranslatableFieldGroup[]
      );
      const targetVal = targetTranslations[key];

      if (typeof sourceVal === "string" && typeof targetVal === "string") {
        if (sourceVal !== targetVal) {
          translatedCount++;
        } else if (cachedFields.has(key)) {
          cachedIdenticalCount++;
        } else {
          unchangedCount++;
          unchangedFields.push(key);
        }
      }
    }

    if (translatedCount > 0) {
      pass(
        result,
        `${translatedCount}/${translatableKeys.length} fields were translated`
      );
    }
    if (cachedIdenticalCount > 0) {
      pass(
        result,
        `${cachedIdenticalCount} field(s) confirmed identical (cached)`
      );
    }
    if (unchangedCount > 0) {
      warn(result, `${unchangedCount} translatable fields unchanged`);
      const display = unchangedFields.slice(0, 5);
      display.forEach((f) => console.log(`      → ${f}`));
      if (unchangedFields.length > 5) {
        console.log(`      → ... and ${unchangedFields.length - 5} more`);
      }

      if (retranslateMode && unchangedFields.length > 0) {
        const queue: Record<string, string> = {};
        for (const field of unchangedFields) {
          const sourceVal = sourceTranslations[field];
          if (typeof sourceVal === "string" && sourceVal.trim().length > 0) {
            queue[field] = sourceVal;
          }
        }
        if (Object.keys(queue).length > 0) {
          fieldsToRetranslate[locale] = queue;
        }
      }
    }

    // ── 6. Verify non-translatable identifiers ───────────────────
    let specModified = false;

    specModified =
      verifyTagNames(sourceSpec, targetSpec, locale, fixMode, result) ||
      specModified;
    specModified =
      verifyOperationIds(sourceSpec, targetSpec, locale, fixMode, result) ||
      specModified;
    specModified =
      verifyRefs(sourceSpec, targetSpec, locale, fixMode, result) ||
      specModified;

    // ── 7. Schema description checks ─────────────────────────────
    const sourceSchemas = (sourceSpec.components as Record<string, unknown>)
      ?.schemas as Record<string, Record<string, unknown>> | undefined;
    const targetSchemas = (targetSpec.components as Record<string, unknown>)
      ?.schemas as Record<string, Record<string, unknown>> | undefined;

    if (sourceSchemas && targetSchemas) {
      let schemaTranslated = 0;
      let schemaUntranslated = 0;

      for (const [name, schema] of Object.entries(sourceSchemas)) {
        const targetSchema = targetSchemas[name];
        if (!targetSchema) continue;

        if (
          typeof schema.description === "string" &&
          typeof targetSchema.description === "string"
        ) {
          if (schema.description !== targetSchema.description) {
            schemaTranslated++;
          } else {
            schemaUntranslated++;
          }
        }

        const srcProps = schema.properties as
          | Record<string, Record<string, unknown>>
          | undefined;
        const tgtProps = targetSchema.properties as
          | Record<string, Record<string, unknown>>
          | undefined;

        if (srcProps && tgtProps) {
          for (const [propName, prop] of Object.entries(srcProps)) {
            const targetProp = tgtProps[propName];
            if (!targetProp) continue;
            if (
              typeof prop.description === "string" &&
              typeof targetProp.description === "string"
            ) {
              if (prop.description !== targetProp.description) {
                schemaTranslated++;
              } else {
                schemaUntranslated++;
              }
            }
          }
        }
      }

      const total = schemaTranslated + schemaUntranslated;
      if (total > 0) {
        if (schemaTranslated > 0) {
          pass(
            result,
            `Schema descriptions: ${schemaTranslated}/${total} translated`
          );
        }
        if (schemaUntranslated > 0) {
          warn(result, `${schemaUntranslated} schema descriptions unchanged`);
        }
      }
    }

    // ── 8. Security scheme descriptions ──────────────────────────
    const sourceSecSchemes = (sourceSpec.components as Record<string, unknown>)
      ?.securitySchemes as Record<string, Record<string, unknown>> | undefined;
    const targetSecSchemes = (targetSpec.components as Record<string, unknown>)
      ?.securitySchemes as Record<string, Record<string, unknown>> | undefined;

    if (sourceSecSchemes && targetSecSchemes) {
      let secTranslated = 0;
      let secUntranslated = 0;

      for (const [name, scheme] of Object.entries(sourceSecSchemes)) {
        const targetScheme = targetSecSchemes[name];
        if (!targetScheme) continue;
        if (
          typeof scheme.description === "string" &&
          typeof targetScheme.description === "string"
        ) {
          if (scheme.description !== targetScheme.description) {
            secTranslated++;
          } else {
            secUntranslated++;
          }
        }
      }

      const total = secTranslated + secUntranslated;
      if (total > 0) {
        if (secTranslated === total) {
          pass(
            result,
            `Security scheme descriptions: ${secTranslated}/${total} translated`
          );
        } else {
          warn(
            result,
            `Security scheme descriptions: ${secTranslated}/${total} translated, ${secUntranslated} unchanged`
          );
        }
      }
    }

    // ── 9. English word detection ────────────────────────────────
    console.log(`\n   [note] Untranslated content analysis (${locale}):`);
    const targetTranslations = extractTranslatableFields(
      targetSpec,
      translatableFields as TranslatableFieldGroup[]
    );

    let suspiciousCount = 0;
    const suspiciousFields: Array<{
      key: string;
      score: number;
      words: string[];
    }> = [];

    for (const [key, value] of Object.entries(targetTranslations)) {
      const sourceVal = sourceTranslations[key];
      if (sourceVal === value) continue;

      const { score, englishWords, totalWords } = detectEnglishScore(value);
      if (score > 0.4 && totalWords >= 4) {
        suspiciousCount++;
        suspiciousFields.push({ key, score, words: englishWords });
      }
    }

    if (suspiciousCount === 0) {
      pass(result, `No suspicious untranslated content detected`);
    } else {
      warn(
        result,
        `${suspiciousCount} fields may contain untranslated English text`
      );
      for (const { key, score, words } of suspiciousFields.slice(0, 5)) {
        const pct = (score * 100).toFixed(0);
        console.log(
          `      → ${key} (${pct}% English markers: ${words.join(", ")})`
        );
      }
      if (suspiciousFields.length > 5) {
        console.log(
          `      → ... and ${suspiciousFields.length - 5} more fields`
        );
      }
    }

    // ── Write fixes if modified ──────────────────────────────────
    if (specModified && fixMode) {
      const specPath = join(outputDir, `${locale}.json`);
      writeJSON(specPath, targetSpec);
      console.log(`\n   [save] Updated ${locale}.json with fixes`);
    }
  }

  // ── 10. Retranslation ─────────────────────────────────────────
  if (retranslateMode) {
    const localesWithGaps = Object.keys(fieldsToRetranslate);

    if (localesWithGaps.length === 0) {
      console.log("\n[translate] Retranslation:");
      pass(
        result,
        "No untranslated fields found — all translations are up to date"
      );
    } else {
      const totalFields = localesWithGaps.reduce(
        (sum, l) => sum + Object.keys(fieldsToRetranslate[l] ?? {}).length,
        0
      );
      console.log(
        `\n[translate] Retranslation: ${totalFields} field(s) across ${localesWithGaps.length} locale(s)`
      );

      const cache = loadRetranslateCache(outputDir);

      for (const locale of localesWithGaps) {
        const queue = fieldsToRetranslate[locale] ?? {};
        const fieldCount = Object.keys(queue).length;
        console.log(`\n   ${locale}: translating ${fieldCount} field(s)...`);

        try {
          const translated = await translateMap(queue, sourceLocale, locale);

          const confirmedIdentical: string[] = [];
          const actuallyTranslated: Record<string, string> = {};

          for (const [key, value] of Object.entries(translated)) {
            if (value === queue[key]) {
              confirmedIdentical.push(key);
            } else {
              actuallyTranslated[key] = value;
            }
          }

          if (confirmedIdentical.length > 0) {
            const existing = new Set(cache[locale] ?? []);
            for (const field of confirmedIdentical) {
              existing.add(field);
            }
            cache[locale] = [...existing];
            console.log(
              `      [info] ${confirmedIdentical.length} field(s) confirmed identical (cached)`
            );
          }

          const targetSpec = specs[locale];
          if (targetSpec && Object.keys(actuallyTranslated).length > 0) {
            injectTranslations(targetSpec, actuallyTranslated);
            const specPath = join(outputDir, `${locale}.json`);
            writeJSON(specPath, targetSpec);
            fixed(
              result,
              `Retranslated ${Object.keys(actuallyTranslated).length} field(s) in ${locale}.json`
            );
          } else if (Object.keys(actuallyTranslated).length === 0) {
            pass(
              result,
              `${locale}: all ${confirmedIdentical.length} field(s) confirmed identical`
            );
          }
        } catch (err) {
          fail(
            result,
            `Failed to retranslate ${locale}: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }

      saveRetranslateCache(outputDir, cache);
      console.log(`\n   [save] Retranslate cache saved`);
    }
  }

  printSummary(result, fixMode, retranslateMode);
  return result;
}
