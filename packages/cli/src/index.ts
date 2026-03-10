#!/usr/bin/env node

/**
 * scalang CLI
 *
 * Commands:
 *   scalang create [project-name]   — Scaffold a new multilingual docs project
 *   scalang generate [--force]      — Generate translated OpenAPI specs
 *   scalang verify [--fix] [--retranslate] — Verify generated specs
 */

import { Command } from "commander";
import { createCommand } from "./commands/create";
import { generateCommand } from "./commands/generate";
import { verifyCommand } from "./commands/verify";

const program = new Command();

program
  .name("scalang")
  .description(
    "CLI to scaffold multilingual OpenAPI docs with Scalar and Lingo.dev"
  )
  .version("0.0.2");

program
  .command("create")
  .description("Create a new multilingual API documentation project")
  .argument("[project-name]", "Name of the project directory")
  .action(async (projectName?: string) => {
    try {
      await createCommand(projectName);
    } catch (err) {
      console.error("Error:", err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program
  .command("generate")
  .description("Generate translated OpenAPI specs")
  .option("--force", "Skip checksum cache and regenerate all specs")
  .action(async (options: { force?: boolean }) => {
    try {
      await generateCommand(options.force ?? false);
    } catch (err) {
      console.error("Error:", err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program
  .command("verify")
  .description("Verify generated specs for correctness")
  .option("--fix", "Auto-fix issues (restore identifiers)")
  .option(
    "--retranslate",
    "Fix + retranslate untranslated fields via Lingo.dev API"
  )
  .action(async (options: { fix?: boolean; retranslate?: boolean }) => {
    try {
      await verifyCommand(options.fix ?? false, options.retranslate ?? false);
    } catch (err) {
      console.error("Error:", err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program.parse();
