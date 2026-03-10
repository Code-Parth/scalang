import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import type { SpecManifest } from "@scalang/schema";

const MANIFEST_PATH = "public/specs/manifest.json";

export function getManifest(): SpecManifest {
  const root = process.cwd();
  const manifestPath = resolve(root, MANIFEST_PATH);

  if (!existsSync(manifestPath)) {
    throw new Error(
      `Manifest file not found: ${manifestPath}\n` +
        `Run "npm run generate" first to generate the translated specs.`,
    );
  }

  const raw = readFileSync(manifestPath, "utf-8");
  return JSON.parse(raw) as SpecManifest;
}

export function getAvailableLocales(): string[] {
  return getManifest().locales;
}
