/**
 * `scalang generate [--force]` command.
 * Generates translated OpenAPI specs with smart checksum-based caching.
 */

import * as p from "@clack/prompts";
import pc from "picocolors";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import {
  loadSpec,
  cloneSpec,
  extractTranslatableFields,
  injectTranslations,
} from "@scalang/spec-loader";
import { translateMap } from "@scalang/lingo";
import {
  fileChecksum,
  loadState,
  saveState,
  canSkipGeneration,
  getLocalesToRegenerate,
  buildLocaleChecksums,
  buildFieldChecksums,
  getChangedFields,
} from "@scalang/checksum";
import { verifySpecs } from "@scalang/validate";
import { loadConfig, loadEnv } from "../config";
import type { SpecManifest } from "@scalang/schema";

const verifyLogger = { log: (msg: string) => p.log.message(msg) };

export async function generateCommand(force: boolean): Promise<void> {
  loadEnv();
  p.intro(pc.bgCyan(pc.black(" scalang — Generate ")));

  // 1. Load config
  p.log.step("Loading configuration...");
  const config = loadConfig();
  const {
    source,
    sourceLocale,
    targetLocales,
    defaultLocale,
    translatableFields,
  } = config;
  const batchSize = config.lingo?.batchSize ?? 100;
  const outputDir = resolve(process.cwd(), config.outputDir ?? "public/specs");
  const allLocales = [
    sourceLocale,
    ...targetLocales.filter((l: string) => l !== sourceLocale),
  ];

  p.log.message(
    [
      `  ${pc.dim("Source")}         ${source}`,
      `  ${pc.dim("Source locale")}  ${sourceLocale}`,
      `  ${pc.dim("Target locales")} ${targetLocales.join(", ")}`,
      `  ${pc.dim("Default locale")} ${defaultLocale}`,
    ].join("\n")
  );

  // Smart skip: compare checksums
  const sourceSpecPath = resolve(process.cwd(), source);
  const configPath = resolve(process.cwd(), ".scalang-config");
  const currentSourceChecksum = fileChecksum(sourceSpecPath);
  const currentConfigChecksum = fileChecksum(configPath);
  const previousState = loadState(outputDir);

  const allSpecsExist = allLocales.every((l) =>
    existsSync(join(outputDir, `${l}.json`))
  );

  const canSkip =
    !force &&
    canSkipGeneration(
      currentSourceChecksum,
      currentConfigChecksum,
      allLocales,
      previousState,
      allSpecsExist
    );

  if (canSkip) {
    p.log.message(
      [
        "No changes detected — skipping full regeneration.",
        `  Source checksum: ${currentSourceChecksum.slice(0, 12)}… (unchanged)`,
        `  Config checksum: ${currentConfigChecksum.slice(0, 12)}… (unchanged)`,
        `  Last generated:  ${previousState!.generatedAt}`,
      ].join("\n")
    );
    p.log.step("Running verify:retranslate to check for gaps...");

    await verifySpecs({
      outputDir,
      config,
      fixMode: true,
      retranslateMode: true,
      logger: verifyLogger,
    });

    p.outro(pc.green("Specs are up-to-date. No full regeneration needed."));
    return;
  }

  // Log why we're regenerating
  if (force) {
    p.log.message("Force regeneration requested.");
  } else if (!previousState) {
    p.log.message("No previous generation state — running full generation.");
  } else {
    const sourceUnchanged =
      previousState.sourceChecksum === currentSourceChecksum;
    const configUnchanged =
      previousState.configChecksum === currentConfigChecksum;
    const reasons: string[] = [];
    if (!sourceUnchanged) reasons.push("Source spec changed");
    if (!configUnchanged) reasons.push("Config changed");
    if (!allSpecsExist) reasons.push("Some spec files missing");
    if (reasons.length > 0) {
      p.log.message(`Regenerating: ${reasons.join(", ")}`);
    }
  }

  // 2. Parse the source spec
  const parseSpinner = p.spinner();
  parseSpinner.start("Parsing OpenAPI spec...");
  const { spec } = await loadSpec(source);
  parseSpinner.stop(pc.green("✓") + " Parsed");

  // 3. Extract translatable fields
  p.log.step("Extracting translatable fields...");
  const enabledGroups = translatableFields.filter(
    (g: { enabled: boolean; name: string }) => g.enabled
  );
  const translations = extractTranslatableFields(spec, translatableFields);
  const fieldCount = Object.keys(translations).length;
  p.log.message(
    `  Enabled groups: ${enabledGroups.map((g: { name: string }) => g.name).join(", ")} — ${fieldCount} translatable strings`
  );

  if (fieldCount === 0) {
    p.log.warn("No translatable fields found. Check your config and spec.");
  }

  // 4. Ensure output directory exists
  mkdirSync(outputDir, { recursive: true });

  // 5. Write source locale spec
  const sourceOutputPath = join(outputDir, `${sourceLocale}.json`);
  writeFileSync(sourceOutputPath, JSON.stringify(spec, null, 2), "utf-8");
  p.log.message(`  Wrote source locale: ${sourceOutputPath}`);

  // 6. Translate and write each target locale
  const targetLocalesToTranslate = targetLocales.filter(
    (l: string) => l !== sourceLocale
  );

  // Per-locale checksum: skip locales that haven't changed
  let localesToTranslate: string[];
  let skippedLocales: string[] = [];

  if (force) {
    localesToTranslate = targetLocalesToTranslate;
  } else {
    const { toRegenerate, skipped } = getLocalesToRegenerate(
      currentSourceChecksum,
      currentConfigChecksum,
      targetLocalesToTranslate,
      previousState,
      outputDir
    );
    localesToTranslate = toRegenerate;
    skippedLocales = skipped;

    if (skippedLocales.length > 0) {
      p.log.message(`Skipping unchanged locales: ${skippedLocales.join(", ")}`);
    }
  }

  for (const locale of localesToTranslate) {
    const localeSpinner = p.spinner();
    localeSpinner.start(`Translating to ${locale}...`);

    try {
      // Field-level diff: only translate changed/added fields when possible
      const existingSpecPath = join(outputDir, `${locale}.json`);
      const fieldDiff = getChangedFields(
        translations,
        previousState?.sourceFieldChecksums
      );

      const hasExistingSpec = existsSync(existingSpecPath);
      const hasFieldChangesOnly =
        !force &&
        hasExistingSpec &&
        fieldDiff.added.length + fieldDiff.changed.length <
          Object.keys(translations).length;

      let translatedSpec;

      if (hasFieldChangesOnly && fieldDiff.unchanged.length > 0) {
        // Incremental: only translate changed + added fields
        const changedKeys = [...fieldDiff.added, ...fieldDiff.changed];

        // Load existing translated spec
        const existingSpec = JSON.parse(
          readFileSync(existingSpecPath, "utf-8")
        );
        translatedSpec = existingSpec;

        if (changedKeys.length > 0) {
          const fieldsToTranslate: Record<string, string> = {};
          for (const key of changedKeys) {
            fieldsToTranslate[key] = translations[key]!;
          }

          const translatedMap = await translateMap(
            fieldsToTranslate,
            sourceLocale,
            locale,
            batchSize
          );
          injectTranslations(translatedSpec, translatedMap);
        }
      } else {
        // Full translation: new locale or force mode
        const translatedMap = await translateMap(
          translations,
          sourceLocale,
          locale,
          batchSize
        );

        translatedSpec = cloneSpec(spec);
        injectTranslations(translatedSpec, translatedMap);
      }

      const outputPath = join(outputDir, `${locale}.json`);
      writeFileSync(
        outputPath,
        JSON.stringify(translatedSpec, null, 2),
        "utf-8"
      );
      localeSpinner.stop(pc.green("✓") + ` ${locale} → ${outputPath}`);
    } catch (err) {
      localeSpinner.stop(pc.yellow("▲") + " Translation failed");
      p.log.error(
        `Failed to translate ${locale}: ${err instanceof Error ? err.message : String(err)}`
      );
      const fallbackPath = join(outputDir, `${locale}.json`);
      writeFileSync(fallbackPath, JSON.stringify(spec, null, 2), "utf-8");
      p.log.warn(`Using source spec as fallback for ${locale}`);
    }
  }

  // 7. Write manifest
  p.log.step("Writing manifest...");
  const manifest: SpecManifest = {
    locales: allLocales,
    defaultLocale,
    generatedAt: new Date().toISOString(),
    source,
  };
  const manifestPath = join(outputDir, "manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
  p.log.message(`  → ${manifestPath}`);

  if (localesToTranslate.length > 0) {
    p.log.success(`Translated locales: ${localesToTranslate.join(", ")}`);
  }
  if (skippedLocales.length > 0) {
    p.log.message(`  Skipped (unchanged): ${skippedLocales.join(", ")}`);
  }
  p.log.message(`  Output directory: ${outputDir}`);

  // 8. Save generation state with per-locale checksums
  const allGeneratedLocales = [sourceLocale, ...localesToTranslate];
  const localeChecksums = buildLocaleChecksums(
    outputDir,
    allGeneratedLocales,
    currentSourceChecksum,
    currentConfigChecksum,
    previousState?.localeChecksums
  );

  saveState(outputDir, {
    sourceChecksum: currentSourceChecksum,
    configChecksum: currentConfigChecksum,
    locales: allLocales,
    fieldCount,
    generatedAt: new Date().toISOString(),
    localeChecksums,
    sourceFieldChecksums: buildFieldChecksums(translations),
  });
  p.log.message("  Generation state saved.");

  // 9. Post-generation verification
  p.log.step("Running post-generation verification...");

  await verifySpecs({
    outputDir,
    config,
    fixMode: true,
    retranslateMode: true,
    logger: verifyLogger,
  });

  p.log.step("Final verification pass...");

  const finalResult = await verifySpecs({
    outputDir,
    config,
    fixMode: false,
    retranslateMode: false,
    logger: verifyLogger,
  });

  if (finalResult.failed === 0) {
    p.outro(pc.green("Done! Translated specs generated."));
  } else {
    p.log.warn(
      "Final verification found remaining issues. Review warnings above."
    );
    p.outro(pc.yellow("Generation complete with verification warnings."));
  }
}
