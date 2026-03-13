/**
 * Verification result tracking.
 */

export interface VerifyLogger {
  log: (msg: string) => void;
}

export interface VerificationResult {
  passed: number;
  failed: number;
  warnings: number;
  fixed: number;
  errors: string[];
  warns: string[];
  fixes: string[];
  logger?: VerifyLogger;
}

export function createResult(logger?: VerifyLogger): VerificationResult {
  return {
    passed: 0,
    failed: 0,
    warnings: 0,
    fixed: 0,
    errors: [],
    warns: [],
    fixes: [],
    logger,
  };
}

function output(result: VerificationResult, msg: string): void {
  (result.logger?.log ?? console.log)(msg);
}

export function pass(result: VerificationResult, msg: string): void {
  result.passed++;
  output(result, `  [ok] ${msg}`);
}

export function fail(result: VerificationResult, msg: string): void {
  result.failed++;
  result.errors.push(msg);
  output(result, `  [error] ${msg}`);
}

export function warn(result: VerificationResult, msg: string): void {
  result.warnings++;
  result.warns.push(msg);
  output(result, `  [warn] ${msg}`);
}

export function fixed(result: VerificationResult, msg: string): void {
  result.fixed++;
  result.fixes.push(msg);
  output(result, `  [fix] Fixed: ${msg}`);
}

export function printSummary(
  result: VerificationResult,
  fixMode: boolean,
  retranslateMode: boolean
): void {
  const log = result.logger?.log ?? console.log;

  log("\n" + "─".repeat(60));

  const parts = [
    `${result.passed} passed`,
    `${result.failed} failed`,
    `${result.warnings} warnings`,
  ];
  if (result.fixed > 0) parts.push(`${result.fixed} fixed`);

  log(`\n[summary] Summary: ${parts.join(", ")}\n`);

  if (result.fixed > 0) {
    log("Fixes applied:");
    result.fixes.forEach((f) => log(`  [fix] ${f}`));
    log("");
  }

  if (result.failed > 0 && !fixMode) {
    log("Errors:");
    result.errors.forEach((e) => log(`  [error] ${e}`));
    log(
      "\n   [hint] Run 'scalang verify --fix' to auto-repair these issues.\n"
    );
  }

  if (result.warnings > 0) {
    log("Warnings:");
    result.warns.forEach((w) => log(`  [warn] ${w}`));
    if (!retranslateMode) {
      log(
        "\n   [hint] Run 'scalang verify --retranslate' to translate untranslated fields.\n"
      );
    } else {
      log("");
    }
  }

  if (result.failed === 0) {
    log("[ok] All checks passed!\n");
  }
}
