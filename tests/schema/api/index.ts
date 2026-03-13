import { describe, expect, test } from "bun:test";

const BASE_URL = process.env.SCALANG_API_URL || "https://scalang.codeparth.dev";

const validConfig = {
  source: "./specs/openapi.json",
  sourceLocale: "en",
  targetLocales: ["fr", "de"],
  defaultLocale: "en",
  translatableFields: [{ name: "info", enabled: true, fields: ["info.title"] }],
};

describe("GET /api/schema", () => {
  test("returns 200 with JSON schema", async () => {
    const res = await fetch(`${BASE_URL}/api/schema`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain(
      "application/schema+json"
    );
    const schema = (await res.json()) as Record<string, unknown>;
    expect(schema.$schema).toBe("http://json-schema.org/draft-07/schema#");
    expect(schema.$id).toBe("https://scalang.codeparth.dev/api/schema");
    expect(schema.title).toBe("Scalang Configuration");
    expect(schema.type).toBe("object");
    expect(schema.required).toEqual(
      expect.arrayContaining([
        "source",
        "sourceLocale",
        "targetLocales",
        "defaultLocale",
        "translatableFields",
      ])
    );
    expect(schema.properties).toBeDefined();
    expect((schema.properties as Record<string, unknown>).source).toBeDefined();
    expect((schema.properties as Record<string, unknown>).lingo).toBeDefined();
  });

  test("includes Cache-Control header", async () => {
    const res = await fetch(`${BASE_URL}/api/schema`);
    expect(res.headers.get("cache-control")).toContain("max-age");
  });
});

describe("POST /api/validate", () => {
  test("returns 200 for valid config", async () => {
    const res = await fetch(`${BASE_URL}/api/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validConfig),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { valid: boolean; data?: unknown };
    expect(data.valid).toBe(true);
    expect(data.data).toBeDefined();
    expect((data.data as { source: string }).source).toBe(
      "./specs/openapi.json"
    );
  });

  test("returns 200 for valid config with full options", async () => {
    const fullConfig = {
      ...validConfig,
      sourceLocale: "en-US",
      targetLocales: ["fr-FR", "de-DE"],
      scalar: { theme: "default", layout: "modern" },
      lingo: { batchSize: 50 },
    };
    const res = await fetch(`${BASE_URL}/api/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fullConfig),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { valid: boolean; data?: unknown };
    expect(data.valid).toBe(true);
    expect((data.data as { sourceLocale: string }).sourceLocale).toBe("en-US");
  });

  test("returns 400 for invalid config (missing required)", async () => {
    const invalidConfig = { ...validConfig, source: undefined };
    const res = await fetch(`${BASE_URL}/api/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invalidConfig),
    });
    expect(res.status).toBe(400);
    const data = (await res.json()) as { valid: boolean; errors?: unknown[] };
    expect(data.valid).toBe(false);
    expect(data.errors).toBeDefined();
    expect(Array.isArray(data.errors)).toBe(true);
  });

  test("returns 400 for invalid locale", async () => {
    const invalidConfig = {
      ...validConfig,
      sourceLocale: "invalid-locale-xyz",
    };
    const res = await fetch(`${BASE_URL}/api/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invalidConfig),
    });
    expect(res.status).toBe(400);
    const data = (await res.json()) as {
      valid: boolean;
      errors?: unknown[];
    };
    expect(data.valid).toBe(false);
    expect(data.errors).toBeDefined();
    const hasLocaleError = (data.errors as { path?: string }[]).some(
      (e) => e.path === "/sourceLocale"
    );
    expect(hasLocaleError).toBe(true);
  });

  test("returns 400 for invalid JSON body", async () => {
    const res = await fetch(`${BASE_URL}/api/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not valid json",
    });
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error?: string };
    expect(data.error).toBeDefined();
  });
});
