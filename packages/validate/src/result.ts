/**
 * Verification result tracking.
 */

export interface VerificationResult {
  passed: number;
  failed: number;
  warnings: number;
  fixed: number;
  errors: string[];
  warns: string[];
  fixes: string[];
}

export function createResult(): VerificationResult {
  return {
    passed: 0,
    failed: 0,
    warnings: 0,
    fixed: 0,
    errors: [],
    warns: [],
    fixes: [],
  };
}

export function pass(result: VerificationResult, msg: string): void {
  result.passed++;
  console.log(`  [ok] ${msg}`);
}

export function fail(result: VerificationResult, msg: string): void {
  result.failed++;
  result.errors.push(msg);
  console.log(`  [error] ${msg}`);
}

export function warn(result: VerificationResult, msg: string): void {
  result.warnings++;
  result.warns.push(msg);
  console.log(`  [warn] ${msg}`);
}

export function fixed(result: VerificationResult, msg: string): void {
  result.fixed++;
  result.fixes.push(msg);
  console.log(`  [fix] Fixed: ${msg}`);
}

export function printSummary(
  result: VerificationResult,
  fixMode: boolean,
  retranslateMode: boolean
): void {
  console.log("\n" + "─".repeat(60));

  const parts = [
    `${result.passed} passed`,
    `${result.failed} failed`,
    `${result.warnings} warnings`,
  ];
  if (result.fixed > 0) parts.push(`${result.fixed} fixed`);

  console.log(`\n[summary] Summary: ${parts.join(", ")}\n`);

  if (result.fixed > 0) {
    console.log("Fixes applied:");
    result.fixes.forEach((f) => console.log(`  [fix] ${f}`));
    console.log();
  }

  if (result.failed > 0 && !fixMode) {
    console.log("Errors:");
    result.errors.forEach((e) => console.log(`  [error] ${e}`));
    console.log(
      "\n   [hint] Run 'scalang verify --fix' to auto-repair these issues.\n"
    );
  }

  if (result.warnings > 0) {
    console.log("Warnings:");
    result.warns.forEach((w) => console.log(`  [warn] ${w}`));
    if (!retranslateMode) {
      console.log(
        "\n   [hint] Run 'scalang verify --retranslate' to translate untranslated fields.\n"
      );
    } else {
      console.log();
    }
  }

  if (result.failed === 0) {
    console.log("[ok] All checks passed!\n");
  }
}
