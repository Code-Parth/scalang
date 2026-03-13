/**
 * Config loader for the CLI — reads .scalang-config from the project root.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertValidConfig,
  resolveTranslatableFields,
  type ScalangConfig,
} from "@scalang/schema";

const CONFIG_FILE_NAME = ".scalang-config";

/**
 * Load .env file from the current working directory into process.env.
 * Does not override existing env vars.
 */
export function loadEnv(): void {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

export function loadConfig(): ScalangConfig {
  const configPath = resolve(process.cwd(), CONFIG_FILE_NAME);

  if (!existsSync(configPath)) {
    throw new Error(
      `Configuration file not found: ${configPath}\n` +
        `Create a "${CONFIG_FILE_NAME}" file in your project root.\n` +
        `Run "scalang create" to scaffold a new project with config.`
    );
  }

  let raw: string;
  try {
    raw = readFileSync(configPath, "utf-8");
  } catch (err) {
    throw new Error(`Failed to read config file: ${configPath}\n${err}`);
  }

  let config: ScalangConfig;
  try {
    config = JSON.parse(raw) as ScalangConfig;
  } catch (err) {
    throw new Error(`Invalid JSON in config file: ${configPath}\n${err}`);
  }

  assertValidConfig(config);

  // Resolve translatableFields preset (string) to array
  const rawFields = (
    config as {
      translatableFields: string | ScalangConfig["translatableFields"];
    }
  ).translatableFields;
  config.translatableFields = resolveTranslatableFields(rawFields);

  // Apply defaults
  config.outputDir = config.outputDir ?? "public/specs";

  return config;
}
