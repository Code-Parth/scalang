/**
 * `scalang verify [--fix] [--retranslate]` command.
 * Verifies generated specs and optionally repairs them.
 */

import * as p from "@clack/prompts";
import pc from "picocolors";
import { resolve } from "node:path";
import { verifySpecs } from "@scalang/validate";
import { loadConfig, loadEnv } from "../config";

export async function verifyCommand(
  fix: boolean,
  retranslate: boolean
): Promise<void> {
  loadEnv();
  p.intro(pc.bgCyan(pc.black(" scalang — Verify ")));

  const config = loadConfig();
  const outputDir = resolve(process.cwd(), config.outputDir ?? "public/specs");

  const logger = { log: (msg: string) => p.log.message(msg) };
  const result = await verifySpecs({
    outputDir,
    config,
    fixMode: fix || retranslate,
    retranslateMode: retranslate,
    logger,
  });

  if (result.failed === 0) {
    p.outro(pc.green("All checks passed!"));
  } else {
    p.outro(pc.yellow("Some checks failed."));
  }

  if (result.failed > 0 && !fix) {
    process.exit(1);
  }
}
