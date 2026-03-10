import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validateConfig } from "../../packages/schema/src/validator.js";
import schema from "../../packages/schema/src/schema.json" with { type: "json" };

describe("Schema structure", () => {
  test("required fields match expected", () => {
    const required = (schema as { required?: string[] }).required ?? [];
    const expected = [
      "source",
      "sourceLocale",
      "targetLocales",
      "defaultLocale",
      "translatableFields",
    ];
    expect(required).toEqual(expected);
  });

  test("has properties for all config keys", () => {
    const props =
      (schema as { properties?: Record<string, unknown> }).properties ?? {};
    expect(props).toHaveProperty("source");
    expect(props).toHaveProperty("sourceLocale");
    expect(props).toHaveProperty("targetLocales");
    expect(props).toHaveProperty("defaultLocale");
    expect(props).toHaveProperty("translatableFields");
    expect(props).toHaveProperty("outputDir");
    expect(props).toHaveProperty("scalar");
    expect(props).toHaveProperty("lingo");
  });

  test("lingo has batchSize and idealBatchItemSize with min/max", () => {
    const lingoProps = (
      schema as {
        properties?: {
          lingo?: {
            properties?: Record<string, { minimum?: number; maximum?: number }>;
          };
        };
      }
    )?.properties?.lingo?.properties;
    expect(lingoProps?.batchSize?.minimum).toBe(1);
    expect(lingoProps?.batchSize?.maximum).toBe(250);
    expect(lingoProps?.idealBatchItemSize?.minimum).toBe(1);
    expect(lingoProps?.idealBatchItemSize?.maximum).toBe(2500);
  });
});

describe("Config validation scenarios", () => {
  test("valid config with all scalar options", () => {
    const config = {
      source: "./openapi.yaml",
      sourceLocale: "en",
      targetLocales: ["fr", "es", "de"],
      defaultLocale: "en",
      translatableFields: [
        {
          name: "info",
          enabled: true,
          fields: ["info.title", "info.description"],
        },
        { name: "operations", enabled: true, fields: ["paths.*.*.summary"] },
      ],
      scalar: {
        title: "My API",
        theme: "moon",
        layout: "classic",
        showDeveloperTools: "localhost",
        documentDownloadType: "both",
      },
    };
    const result = validateConfig(config);
    expect(result.valid).toBe(true);
    expect(result.data?.scalar?.title).toBe("My API");
    expect(result.data?.scalar?.theme).toBe("moon");
  });

  test("valid config with lingo options", () => {
    const config = {
      source: "./spec.json",
      sourceLocale: "en-US",
      targetLocales: ["fr-FR"],
      defaultLocale: "en-US",
      translatableFields: [
        { name: "info", enabled: true, fields: ["info.title"] },
      ],
      lingo: { batchSize: 100, idealBatchItemSize: 1000, fast: true },
    };
    const result = validateConfig(config);
    expect(result.valid).toBe(true);
    expect(result.data?.lingo?.fast).toBe(true);
  });

  test("rejects non-object input", () => {
    const result = validateConfig("not an object");
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
  });

  test("rejects null input", () => {
    const result = validateConfig(null);
    expect(result.valid).toBe(false);
  });

  test("rejects array input", () => {
    const result = validateConfig([]);
    expect(result.valid).toBe(false);
  });
});

describe("Schema file sync", () => {
  test("src/schema.json and schema/scalang-config.schema.json are identical", () => {
    const schemaDir = join(import.meta.dir, "../../packages/schema");
    const srcSchema = readFileSync(join(schemaDir, "src/schema.json"), "utf-8");
    const pubSchema = readFileSync(
      join(schemaDir, "schema/scalang-config.schema.json"),
      "utf-8"
    );
    expect(srcSchema).toBe(pubSchema);
  });
});
