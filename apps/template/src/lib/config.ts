import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import type { ScalangConfig } from "@scalang/schema";
import type { ApiReferenceConfigurationWithMultipleSources } from "@scalang/react";

const CONFIG_FILE_NAME = ".scalang-config";

export function loadConfig(): ScalangConfig {
  const root = process.cwd();
  const configPath = resolve(root, CONFIG_FILE_NAME);

  if (!existsSync(configPath)) {
    throw new Error(
      `Configuration file not found: ${configPath}\n` +
        `Create a "${CONFIG_FILE_NAME}" file in your project root.`,
    );
  }

  const raw = readFileSync(configPath, "utf-8");
  const config = JSON.parse(raw) as ScalangConfig;

  config.outputDir = config.outputDir ?? "public/specs";

  return config;
}

export function getScalarConfig(): Partial<ApiReferenceConfigurationWithMultipleSources> {
  const config = loadConfig();
  const scalar = config.scalar;

  const IS_PRODUCTION = process.env.NODE_ENV === "production";

  if (!scalar) return {};

  const result: Partial<ApiReferenceConfigurationWithMultipleSources> = {};

  if (scalar.theme) result.theme = scalar.theme;
  if (scalar.layout) result.layout = scalar.layout;
  if (scalar.darkMode !== undefined) result.darkMode = scalar.darkMode;
  if (scalar.hideDarkModeToggle !== undefined)
    result.hideDarkModeToggle = scalar.hideDarkModeToggle;
  if (scalar.showSidebar !== undefined) result.showSidebar = scalar.showSidebar;
  if (scalar.hideModels !== undefined) result.hideModels = scalar.hideModels;
  if (scalar.hideTestRequestButton !== undefined)
    result.hideTestRequestButton = scalar.hideTestRequestButton;
  if (scalar.customCss) result.customCss = scalar.customCss;

  if (IS_PRODUCTION) {
    result.showDeveloperTools = "never";
  } else if (scalar.showDeveloperTools !== undefined) {
    result.showDeveloperTools = scalar.showDeveloperTools;
  } else {
    result.showDeveloperTools = "localhost";
  }

  return result;
}
