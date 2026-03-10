import { readFileSync, existsSync } from "node:fs";
import { resolve, extname } from "node:path";
import { parse as parseYaml } from "yaml";
import type { LoadSpecResult } from "./types";

/**
 * Check if a source string is a URL (http:// or https://).
 */
export function isSpecUrl(source: string): boolean {
  return /^https?:\/\//i.test(source);
}

/**
 * Infer format from file extension or Content-Type header.
 */
export function getSpecFormat(
  source: string,
  contentType?: string
): "json" | "yaml" {
  if (contentType) {
    if (contentType.includes("yaml") || contentType.includes("yml")) {
      return "yaml";
    }
    if (contentType.includes("json")) {
      return "json";
    }
  }
  const ext = extname(source).toLowerCase();
  if (ext === ".yml" || ext === ".yaml") return "yaml";
  return "json";
}

/**
 * Parse raw string content as JSON or YAML.
 * Auto-detects format if not specified.
 */
export function parseSpecContent(
  raw: string,
  format?: "json" | "yaml"
): Record<string, unknown> {
  if (format === "yaml") {
    return parseYaml(raw) as Record<string, unknown>;
  }
  if (format === "json") {
    return JSON.parse(raw) as Record<string, unknown>;
  }

  // Auto-detect: try JSON first, fall back to YAML
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return parseYaml(raw) as Record<string, unknown>;
  }
}

/**
 * Deep clone a spec object.
 */
export function cloneSpec(
  spec: Record<string, unknown>
): Record<string, unknown> {
  return JSON.parse(JSON.stringify(spec)) as Record<string, unknown>;
}

/**
 * Load and parse an OpenAPI spec from a file path or URL.
 * Validates using @scalar/openapi-parser (non-blocking warnings).
 */
export async function loadSpec(source: string): Promise<LoadSpecResult> {
  let raw: string;
  let format: "json" | "yaml";

  if (isSpecUrl(source)) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch spec from ${source}: ${response.status} ${response.statusText}`
      );
    }
    raw = await response.text();
    const contentType = response.headers.get("content-type") ?? undefined;
    format = getSpecFormat(source, contentType);
  } else {
    const absolutePath = resolve(process.cwd(), source);
    if (!existsSync(absolutePath)) {
      throw new Error(`OpenAPI spec file not found: ${absolutePath}`);
    }
    raw = readFileSync(absolutePath, "utf-8");
    format = getSpecFormat(source);
  }

  const spec = parseSpecContent(raw, format);

  // Basic validation
  if (!spec.openapi && !spec.swagger) {
    throw new Error(
      `Not a valid OpenAPI spec: missing "openapi" or "swagger" field`
    );
  }
  if (!spec.info) {
    throw new Error(`Not a valid OpenAPI spec: missing "info" field`);
  }

  // Optional @scalar/openapi-parser validation (non-blocking)
  try {
    const { validate } = await import("@scalar/openapi-parser");
    const jsonStr = format === "yaml" ? JSON.stringify(spec) : raw;
    const result = await validate(jsonStr);
    if (!result.valid) {
      const errors = result.errors
        ?.map((e: { message?: string }) => e.message)
        .filter(Boolean)
        .join("\n  - ");
      console.warn(
        `[warn] OpenAPI spec has validation warnings:\n  - ${errors}`
      );
    }
  } catch {
    // Parser validation is optional
  }

  return { spec, raw, format };
}

export type { LoadSpecResult } from "./types";
export { writeSpec } from "./write";
export {
  extractTranslatableFields,
  injectTranslations,
  type TranslationMap,
} from "./field-extractor";
