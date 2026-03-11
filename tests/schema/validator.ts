import { describe, expect, test } from "bun:test";
import {
  validateConfig,
  assertValidConfig,
} from "../../packages/schema/src/validator.js";

const validMinimalConfig = {
  source: "./specs/openapi.json",
  sourceLocale: "en",
  targetLocales: ["fr", "de"],
  defaultLocale: "en",
  translatableFields: [{ name: "info", enabled: true, fields: ["info.title"] }],
};

describe("validateConfig", () => {
  test("accepts minimal valid config", () => {
    const result = validateConfig(validMinimalConfig);
    expect(result.valid).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.source).toBe("./specs/openapi.json");
    expect(result.data?.sourceLocale).toBe("en");
    expect(result.data?.targetLocales).toEqual(["fr", "de"]);
  });

  test("accepts full config with scalar and lingo options", () => {
    const fullConfig = {
      ...validMinimalConfig,
      outputDir: "public/specs",
      sourceLocale: "en-US",
      targetLocales: ["fr-FR", "de-DE"],
      scalar: { theme: "default", layout: "modern" },
      lingo: { batchSize: 50, idealBatchItemSize: 500 },
    };
    const result = validateConfig(fullConfig);
    expect(result.valid).toBe(true);
    expect(result.data?.scalar?.theme).toBe("default");
    expect(result.data?.lingo?.batchSize).toBe(50);
  });

  test("rejects config missing required source", () => {
    const config = { ...validMinimalConfig, source: undefined };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
    const hasSourceError = result.errors!.some(
      (e) =>
        e.instancePath === "/source" || e.params?.missingProperty === "source"
    );
    expect(hasSourceError).toBe(true);
  });

  test("rejects config missing required sourceLocale", () => {
    const config = { ...validMinimalConfig, sourceLocale: undefined };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
  });

  test("rejects config missing required targetLocales", () => {
    const config = { ...validMinimalConfig, targetLocales: undefined };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
  });

  test("rejects config missing required defaultLocale", () => {
    const config = { ...validMinimalConfig, defaultLocale: undefined };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
  });

  test("rejects config missing required translatableFields", () => {
    const config = { ...validMinimalConfig, translatableFields: undefined };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
  });

  test("rejects invalid locale in sourceLocale", () => {
    const config = {
      ...validMinimalConfig,
      sourceLocale: "invalid-locale-xyz",
    };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors?.some((e) => e.instancePath === "/sourceLocale")).toBe(
      true
    );
    expect(
      result.errors?.some((e) =>
        e.message?.includes("must be equal to one of the allowed values")
      )
    ).toBe(true);
  });

  test("rejects invalid locale in targetLocales", () => {
    const config = {
      ...validMinimalConfig,
      targetLocales: ["fr", "fake-region"],
    };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(
      result.errors?.some((e) => e.instancePath?.startsWith("/targetLocales"))
    ).toBe(true);
  });

  test("rejects invalid defaultLocale", () => {
    const config = { ...validMinimalConfig, defaultLocale: "xx-XX" };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(
      result.errors?.some((e) => e.instancePath === "/defaultLocale")
    ).toBe(true);
  });

  test("rejects translatableFields missing required fields property", () => {
    const config = {
      ...validMinimalConfig,
      translatableFields: [{ name: "info", enabled: true }],
    };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
  });

  test("rejects lingo.batchSize above maximum", () => {
    const config = {
      ...validMinimalConfig,
      lingo: { batchSize: 500, idealBatchItemSize: 1000 },
    };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(
      result.errors?.some((e) => e.instancePath?.includes("batchSize"))
    ).toBe(true);
  });

  test("accepts empty targetLocales array", () => {
    const config = { ...validMinimalConfig, targetLocales: [] };
    const result = validateConfig(config);
    expect(result.valid).toBe(true);
    expect(result.data?.targetLocales).toEqual([]);
  });

  test("accepts valid BCP 47 locales (en-US, zh-Hans-CN)", () => {
    const config = {
      ...validMinimalConfig,
      sourceLocale: "en-US",
      targetLocales: ["zh-Hans-CN", "fr-FR"],
      defaultLocale: "en-US",
    };
    const result = validateConfig(config);
    expect(result.valid).toBe(true);
  });
});

describe("assertValidConfig", () => {
  test("does not throw for valid config", () => {
    expect(() => assertValidConfig(validMinimalConfig)).not.toThrow();
  });

  test("throws for invalid config with error message", () => {
    const invalidConfig = { ...validMinimalConfig, sourceLocale: "invalid" };
    expect(() => assertValidConfig(invalidConfig)).toThrow();
    try {
      assertValidConfig(invalidConfig);
    } catch (e) {
      expect((e as Error).message).toContain("sourceLocale");
      expect((e as Error).message).toContain(
        "must be equal to one of the allowed values"
      );
    }
  });

  test("narrows type when config is valid", () => {
    const config: unknown = validMinimalConfig;
    assertValidConfig(config);
    expect(config.source).toBe("./specs/openapi.json");
    expect(config.sourceLocale).toBe("en");
  });
});
