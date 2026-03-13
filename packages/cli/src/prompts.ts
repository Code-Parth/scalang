/**
 * Interactive CLI prompts using @clack/prompts + @inquirer/prompts.
 * Uses @clack/prompts for most inputs, @inquirer/prompts for searchable single-select (default locale).
 */

import * as p from "@clack/prompts";
import { search } from "@inquirer/prompts";
import {
  SUPPORTED_LOCALES,
  getLocaleLabel,
  SCALAR_THEMES,
  SCALAR_LAYOUTS,
} from "@scalang/schema";

export interface UserAnswers {
  projectName: string;
  specSource: string;
  sourceLocale: string;
  targetLocales: string[];
  defaultLocale: string;
  scalarTheme: string;
  scalarLayout: string;
  darkMode: boolean;
  packageManager: "npm" | "yarn" | "pnpm" | "bun";
  apiKey: string;
}

export async function collectAnswers(
  projectNameArg?: string
): Promise<UserAnswers> {
  const projectName =
    projectNameArg ??
    ((await p.text({
      message: "What is your project name?",
      placeholder: "my-api-docs",
      validate(value) {
        if (!value || value.trim().length === 0)
          return "Project name is required";
        if (/\s/.test(value)) return "Project name cannot contain spaces";
        if (!/^[a-z0-9@][a-z0-9._\-/@]*$/.test(value))
          return "Invalid package name. Use lowercase letters, numbers, hyphens, dots.";
      },
    })) as string);

  if (p.isCancel(projectName)) {
    p.cancel("Operation cancelled.");
    process.exit(0);
  }

  const specSource = (await p.text({
    message: "OpenAPI spec (URL or file path):",
    placeholder: "https://example.com/openapi.json or ./specs/openapi.json",
    validate(value) {
      if (!value || value.trim().length === 0) return "Spec source is required";
    },
  })) as string;

  if (p.isCancel(specSource)) {
    p.cancel("Operation cancelled.");
    process.exit(0);
  }

  // Source locale defaults to English
  const sourceLocale = "en";
  console.log(`   Source locale: ${sourceLocale} (English)`);

  // Searchable multi-select for target locales (type to filter, space to toggle)
  const localeOptions = SUPPORTED_LOCALES.filter(
    (l) => l.value !== sourceLocale
  ).map((l) => ({ value: l.value, label: l.label }));

  const targetLocales = await p.autocompleteMultiselect({
    message:
      "Which languages to translate into? (type to filter, space to toggle)",
    options: localeOptions,
    required: true,
  });

  if (p.isCancel(targetLocales)) {
    p.cancel("Operation cancelled.");
    process.exit(0);
  }

  if (!targetLocales || targetLocales.length === 0) {
    p.cancel("At least one target locale is required.");
    process.exit(0);
  }

  // Default locale — searchable single select from selected locales
  const allLocales = [sourceLocale, ...targetLocales];
  const defaultLocale = await search({
    message: "Default locale for the docs site?",
    source: (input) => {
      const term = (input ?? "").toLowerCase();
      return allLocales
        .filter((l) => {
          const label = getLocaleLabel(l).toLowerCase();
          return l.toLowerCase().includes(term) || label.includes(term);
        })
        .map((l) => ({
          name: `${getLocaleLabel(l)} (${l})`,
          value: l,
        }));
    },
    default: sourceLocale,
  });

  const scalarTheme = (await p.select({
    message: "Scalar theme?",
    options: SCALAR_THEMES.map((t) => ({
      value: t.value,
      label: t.label,
    })),
    initialValue: "default",
  })) as string;

  if (p.isCancel(scalarTheme)) {
    p.cancel("Operation cancelled.");
    process.exit(0);
  }

  const scalarLayout = (await p.select({
    message: "Layout style?",
    options: SCALAR_LAYOUTS.map((l) => ({
      value: l.value,
      label: l.label,
    })),
    initialValue: "modern",
  })) as string;

  if (p.isCancel(scalarLayout)) {
    p.cancel("Operation cancelled.");
    process.exit(0);
  }

  const darkMode = (await p.confirm({
    message: "Enable dark mode?",
    initialValue: true,
  })) as boolean;

  if (p.isCancel(darkMode)) {
    p.cancel("Operation cancelled.");
    process.exit(0);
  }

  const packageManager = (await p.select({
    message: "Which package manager do you want to use?",
    options: [
      { value: "npm" as const, label: "npm" },
      { value: "yarn" as const, label: "yarn" },
      { value: "pnpm" as const, label: "pnpm" },
      { value: "bun" as const, label: "bun" },
    ],
    initialValue: "bun" as const,
  })) as "npm" | "yarn" | "pnpm" | "bun";

  if (p.isCancel(packageManager)) {
    p.cancel("Operation cancelled.");
    process.exit(0);
  }

  const apiKey = (await p.password({
    message: "Lingo.dev API Key:",
    validate(value) {
      if (!value || value.trim().length === 0)
        return "API key is required. Get one at https://lingo.dev";
    },
  })) as string;

  if (p.isCancel(apiKey)) {
    p.cancel("Operation cancelled.");
    process.exit(0);
  }

  return {
    projectName: projectName.trim(),
    specSource: specSource.trim(),
    sourceLocale,
    targetLocales,
    defaultLocale,
    scalarTheme,
    scalarLayout,
    darkMode,
    packageManager,
    apiKey: apiKey.trim(),
  };
}
