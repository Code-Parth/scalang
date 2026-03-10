/**
 * `scalang verify [--fix] [--retranslate]` command.
 * Verifies generated specs and optionally repairs them.
 */

import { resolve } from "node:path";
import { verifySpecs } from "@scalang/validate";
import { loadConfig, loadEnv } from "../config";

export async function verifyCommand(
  fix: boolean,
  retranslate: boolean
): Promise<void> {
  loadEnv();
  const config = loadConfig();
  const outputDir = resolve(process.cwd(), config.outputDir ?? "public/specs");

  const result = await verifySpecs({
    outputDir,
    config,
    fixMode: fix || retranslate,
    retranslateMode: retranslate,
  });

  if (result.failed > 0 && !fix) {
    process.exit(1);
  }
}
