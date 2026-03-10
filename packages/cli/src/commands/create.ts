/**
 * `scalang create [project-name]` command.
 * Interactive scaffolding flow for a new multilingual docs project.
 */

import * as p from "@clack/prompts";
import pc from "picocolors";
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  statSync,
  copyFileSync,
  renameSync,
  unlinkSync,
} from "node:fs";
import { resolve, join, dirname } from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadSpec } from "@scalang/spec-loader";
import { validateApiKey } from "@scalang/lingo";
import {
  DEFAULT_TRANSLATABLE_FIELDS,
  DEFAULT_LINGO_CONFIG,
} from "@scalang/schema";
import { collectAnswers, type UserAnswers } from "../prompts";
import { generateCommand } from "./generate";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function copyDirSync(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  const entries = readdirSync(src);
  for (const entry of entries) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    const stat = statSync(srcPath);
    if (stat.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

function getInstallCommand(pm: string): string {
  switch (pm) {
    case "bun":
      return "bun install";
    case "pnpm":
      return "pnpm install";
    case "yarn":
      return "yarn";
    default:
      return "npm install";
  }
}

function getRunCommand(pm: string): string {
  switch (pm) {
    case "bun":
      return "bun run";
    case "pnpm":
      return "pnpm";
    case "yarn":
      return "yarn";
    default:
      return "npm run";
  }
}

export async function createCommand(projectNameArg?: string): Promise<void> {
  p.intro(
    pc.bgCyan(pc.black(" scalang — Multilingual API Documentation Generator "))
  );

  const answers = await collectAnswers(projectNameArg);

  // Validate the OpenAPI spec
  const specSpinner = p.spinner();
  specSpinner.start("Validating OpenAPI spec...");

  let specResult: Awaited<ReturnType<typeof loadSpec>>;
  try {
    specResult = await loadSpec(answers.specSource);
    const info = specResult.spec.info as Record<string, string>;
    specSpinner.stop(
      `Valid OpenAPI ${specResult.spec.openapi ?? specResult.spec.swagger} — "${info?.title ?? "Untitled"}"`
    );
  } catch (err) {
    specSpinner.stop("Spec validation failed");
    p.log.error(err instanceof Error ? err.message : "Failed to validate spec");
    p.cancel("Please provide a valid OpenAPI spec.");
    process.exit(1);
  }

  // Validate the API key
  const keySpinner = p.spinner();
  keySpinner.start("Validating API key...");

  try {
    const valid = await validateApiKey(answers.apiKey);
    if (!valid) throw new Error("Invalid API key");
    keySpinner.stop("API key is valid");
  } catch (err) {
    keySpinner.stop("API key validation failed");
    p.log.error(
      err instanceof Error ? err.message : "Failed to validate API key"
    );
    p.cancel("Please provide a valid Lingo.dev API key.");
    process.exit(1);
  }

  // Summary
  p.log.step(pc.bold("Configuration summary"));
  p.log.message(
    [
      `  ${pc.dim("Project")}      ${pc.cyan(answers.projectName)}`,
      `  ${pc.dim("Spec")}         ${pc.dim(answers.specSource)}`,
      `  ${pc.dim("Source")}       ${answers.sourceLocale}`,
      `  ${pc.dim("Translate")}    ${answers.targetLocales.join(", ")}`,
      `  ${pc.dim("Default")}      ${answers.defaultLocale}`,
      `  ${pc.dim("Theme")}        ${answers.scalarTheme}`,
      `  ${pc.dim("Layout")}       ${answers.scalarLayout}`,
      `  ${pc.dim("Dark mode")}    ${answers.darkMode ? "yes" : "no"}`,
      `  ${pc.dim("Pkg manager")}  ${answers.packageManager}`,
    ].join("\n")
  );

  // Scaffold
  await scaffoldProject(answers, specResult);

  p.outro(pc.green("Done! Your multilingual API docs are ready."));
}

async function scaffoldProject(
  answers: UserAnswers,
  specResult: { spec: Record<string, unknown>; raw: string }
): Promise<void> {
  const projectDir = resolve(process.cwd(), answers.projectName);
  const pm = answers.packageManager;

  if (existsSync(projectDir)) {
    throw new Error(
      `Directory "${answers.projectName}" already exists. Choose a different name or remove it.`
    );
  }

  const s = p.spinner();

  // Create project directory
  s.start("Creating project directory...");
  mkdirSync(projectDir, { recursive: true });
  s.stop(pc.green("✓") + " Created project directory");

  // Copy template files
  s.start("Copying template files...");
  let templateDir = resolve(__dirname, "../../template");
  if (!existsSync(templateDir)) {
    templateDir = resolve(__dirname, "../template");
  }
  if (!existsSync(templateDir)) {
    // Fall back — user may need to install template separately
    s.stop(pc.yellow("▲") + " Template not found — creating minimal project");
    mkdirSync(join(projectDir, "public", "specs"), { recursive: true });
  } else {
    copyDirSync(templateDir, projectDir);
    const gitignoreSrc = join(projectDir, "_gitignore");
    if (existsSync(gitignoreSrc)) {
      renameSync(gitignoreSrc, join(projectDir, ".gitignore"));
    }
    s.stop(pc.green("✓") + " Copied template files");
  }

  // Generate config
  s.start("Generating configuration...");
  const config = {
    $schema: "./node_modules/@scalang/schema/schema/scalang-config.schema.json",
    source: "./specs/openapi.json",
    outputDir: "public/specs",
    sourceLocale: answers.sourceLocale,
    targetLocales: answers.targetLocales,
    defaultLocale: answers.defaultLocale,
    translatableFields: DEFAULT_TRANSLATABLE_FIELDS,
    scalar: {
      theme: answers.scalarTheme,
      layout: answers.scalarLayout,
      darkMode: answers.darkMode,
      showSidebar: true,
      showDeveloperTools: "localhost",
    },
    lingo: DEFAULT_LINGO_CONFIG,
  };
  writeFileSync(
    join(projectDir, ".scalang-config"),
    JSON.stringify(config, null, 2),
    "utf-8"
  );
  s.stop(pc.green("✓") + " Generated configuration");

  // Set up package.json
  s.start("Setting up package.json...");
  const templatePkgPath = join(projectDir, "package.template.json");
  if (existsSync(templatePkgPath)) {
    let pkgContent = readFileSync(templatePkgPath, "utf-8");
    pkgContent = pkgContent.replace(
      /\{\{PROJECT_NAME\}\}/g,
      answers.projectName
    );
    writeFileSync(join(projectDir, "package.json"), pkgContent, "utf-8");
    unlinkSync(templatePkgPath);
  }
  s.stop(pc.green("✓") + " Set up package.json");

  // Write .env
  s.start("Writing environment file...");
  writeFileSync(
    join(projectDir, ".env"),
    `LINGODOTDEV_API_KEY=${answers.apiKey}\n`,
    "utf-8"
  );
  s.stop(pc.green("✓") + " Environment file created");

  // Save spec
  s.start("Saving OpenAPI spec...");
  const specsDir = join(projectDir, "specs");
  mkdirSync(specsDir, { recursive: true });
  writeFileSync(
    join(specsDir, "openapi.json"),
    JSON.stringify(specResult.spec, null, 2),
    "utf-8"
  );
  mkdirSync(join(projectDir, "public", "specs"), { recursive: true });
  s.stop(pc.green("✓") + " OpenAPI spec saved");

  // Install dependencies
  s.start(`Installing dependencies with ${pc.cyan(pm)}...`);
  try {
    execSync(getInstallCommand(pm), {
      cwd: projectDir,
      stdio: "pipe",
      timeout: 120_000,
    });
    s.stop(pc.green("✓") + " Dependencies installed");
  } catch {
    s.stop(pc.yellow("▲") + " Dependency installation failed");
    p.log.warn(
      `Run ${pc.cyan(`"${getInstallCommand(pm)}"`)} manually in the project directory.`
    );
  }

  // Generate specs
  p.log.step(
    `Generating translated specs for ${pc.cyan(String(answers.targetLocales.length))} locale(s)...`
  );
  try {
    const originalCwd = process.cwd();
    process.env.LINGODOTDEV_API_KEY = answers.apiKey;
    process.chdir(projectDir);
    try {
      await generateCommand(true);
    } finally {
      process.chdir(originalCwd);
    }
    p.log.success(
      `Translated specs generated (${answers.targetLocales.length} locales)`
    );
  } catch {
    p.log.warn(
      `Spec generation failed. Run ${pc.cyan(`"${getRunCommand(pm)} generate:force"`)} manually after setup.`
    );
  }

  // Next steps
  const runCmd = getRunCommand(pm);
  p.note(
    [`cd ${answers.projectName}`, `${runCmd} dev`].join("\n"),
    "Next steps"
  );
}
