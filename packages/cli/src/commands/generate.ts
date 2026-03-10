/**
 * `scalang generate [--force]` command.
 * Generates translated OpenAPI specs with smart checksum-based caching.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
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
} from "@scalang/checksum";
import { verifySpecs } from "@scalang/validate";
import { loadConfig, loadEnv } from "../config";
import type { SpecManifest } from "@scalang/schema";

export async function generateCommand(force: boolean): Promise<void> {
  loadEnv();
  console.log("\n>> Scalang — Generating translated specs\n");

  // 1. Load config
  console.log("[config] Loading configuration...");
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

  console.log(`   Source: ${source}`);
  console.log(`   Source locale: ${sourceLocale}`);
  console.log(`   Target locales: ${targetLocales.join(", ")}`);
  console.log(`   Default locale: ${defaultLocale}`);

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
    console.log("\n[skip] No changes detected — skipping full regeneration.");
    console.log(
      `   Source checksum: ${currentSourceChecksum.slice(0, 12)}… (unchanged)`
    );
    console.log(
      `   Config checksum: ${currentConfigChecksum.slice(0, 12)}… (unchanged)`
    );
    console.log(`   Last generated:  ${previousState!.generatedAt}`);
    console.log("\n[check] Running verify:retranslate to check for gaps...\n");

    await verifySpecs({
      outputDir,
      config,
      fixMode: true,
      retranslateMode: true,
    });

    console.log(
      "\n[done] Specs are up-to-date. No full regeneration needed.\n"
    );
    return;
  }

  // Log why we're regenerating
  if (force) {
    console.log("\n[force] Force regeneration requested.\n");
  } else if (!previousState) {
    console.log(
      "\n[note] No previous generation state — running full generation.\n"
    );
  } else {
    const sourceUnchanged =
      previousState.sourceChecksum === currentSourceChecksum;
    const configUnchanged =
      previousState.configChecksum === currentConfigChecksum;
    if (!sourceUnchanged)
      console.log("   [note] Source spec changed — regenerating.");
    if (!configUnchanged)
      console.log("   [config] Config changed — regenerating.");
    if (!allSpecsExist)
      console.log("   [files] Some spec files missing — regenerating.");
    console.log();
  }

  // 2. Parse the source spec
  console.log("[parse] Parsing OpenAPI spec...");
  const { spec } = await loadSpec(source);

  // 3. Extract translatable fields
  console.log("\n[check] Extracting translatable fields...");
  const enabledGroups = translatableFields.filter(
    (g: { enabled: boolean; name: string }) => g.enabled
  );
  console.log(
    `   Enabled field groups: ${enabledGroups.map((g: { name: string }) => g.name).join(", ")}`
  );
  const translations = extractTranslatableFields(spec, translatableFields);
  const fieldCount = Object.keys(translations).length;
  console.log(`   Found ${fieldCount} translatable strings`);

  if (fieldCount === 0) {
    console.warn(
      "\n[warn] No translatable fields found. Check your config and spec."
    );
  }

  // 4. Ensure output directory exists
  mkdirSync(outputDir, { recursive: true });

  // 5. Write source locale spec
  console.log(`\n[note] Writing source locale spec (${sourceLocale})...`);
  const sourceOutputPath = join(outputDir, `${sourceLocale}.json`);
  writeFileSync(sourceOutputPath, JSON.stringify(spec, null, 2), "utf-8");
  console.log(`   → ${sourceOutputPath}`);

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
      console.log(
        `\n[skip] Skipping unchanged locales: ${skippedLocales.join(", ")}`
      );
    }
  }

  for (const locale of localesToTranslate) {
    console.log(`\n[i18n] Translating to ${locale}...`);

    try {
      const translatedMap = await translateMap(
        translations,
        sourceLocale,
        locale,
        batchSize
      );

      const translatedSpec = cloneSpec(spec);
      injectTranslations(translatedSpec, translatedMap);

      const outputPath = join(outputDir, `${locale}.json`);
      writeFileSync(
        outputPath,
        JSON.stringify(translatedSpec, null, 2),
        "utf-8"
      );
      console.log(`   [ok] ${locale} → ${outputPath}`);
    } catch (err) {
      console.error(`   [error] Failed to translate ${locale}:`, err);
      const fallbackPath = join(outputDir, `${locale}.json`);
      writeFileSync(fallbackPath, JSON.stringify(spec, null, 2), "utf-8");
      console.log(`   [warn] Using source spec as fallback for ${locale}`);
    }
  }

  // 7. Write manifest
  console.log("\n[batch] Writing manifest...");
  const manifest: SpecManifest = {
    locales: allLocales,
    defaultLocale,
    generatedAt: new Date().toISOString(),
    source,
  };
  const manifestPath = join(outputDir, "manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
  console.log(`   → ${manifestPath}`);

  if (localesToTranslate.length > 0) {
    console.log(
      "\n[done] Done! Translated locales:",
      localesToTranslate.join(", ")
    );
  }
  if (skippedLocales.length > 0) {
    console.log("   Skipped (unchanged):", skippedLocales.join(", "));
  }
  console.log(`   Output directory: ${outputDir}\n`);

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
  });
  console.log("   [save] Generation state saved.\n");

  // 9. Post-generation verification
  console.log("[check] Running post-generation verification...\n");

  await verifySpecs({
    outputDir,
    config,
    fixMode: true,
    retranslateMode: true,
  });

  console.log("\n[check] Final verification pass...\n");

  const finalResult = await verifySpecs({
    outputDir,
    config,
    fixMode: false,
    retranslateMode: false,
  });

  if (finalResult.failed === 0) {
    console.log("\n[ok] Build-time verification passed — specs are clean.\n");
  } else {
    console.warn(
      "\n[warn] Final verification found remaining issues. Review warnings above.\n"
    );
  }
}
