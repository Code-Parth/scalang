import { describe, expect, test } from "bun:test";
import {
  LINGO_LOCALE_CODES_SHORT,
  LINGO_LOCALE_CODES_FULL,
  SUPPORTED_LOCALES,
  ALL_LOCALE_CODES,
  SCALAR_THEMES,
  SCALAR_LAYOUTS,
  SCALAR_DOCUMENT_DOWNLOAD_TYPES,
  SCALAR_OPERATION_TITLE_SOURCES,
  SCALAR_SHOW_DEVELOPER_TOOLS,
  DEFAULT_TRANSLATABLE_FIELDS,
  DEFAULT_LINGO_CONFIG,
} from "../../packages/schema/src/constants.js";
import schema from "../../packages/schema/src/schema.json" with { type: "json" };

describe("LINGO_LOCALE_CODES", () => {
  test("LINGO_LOCALE_CODES_SHORT is non-empty array", () => {
    expect(LINGO_LOCALE_CODES_SHORT).toBeInstanceOf(Array);
    expect(LINGO_LOCALE_CODES_SHORT.length).toBeGreaterThan(0);
  });

  test("LINGO_LOCALE_CODES_FULL is non-empty array", () => {
    expect(LINGO_LOCALE_CODES_FULL).toBeInstanceOf(Array);
    expect(LINGO_LOCALE_CODES_FULL.length).toBeGreaterThan(0);
  });

  test("LINGO_LOCALE_CODES_SHORT contains common language codes", () => {
    expect(LINGO_LOCALE_CODES_SHORT).toContain("en");
    expect(LINGO_LOCALE_CODES_SHORT).toContain("fr");
    expect(LINGO_LOCALE_CODES_SHORT).toContain("de");
    expect(LINGO_LOCALE_CODES_SHORT).toContain("ja");
    expect(LINGO_LOCALE_CODES_SHORT).toContain("zh");
  });

  test("LINGO_LOCALE_CODES_FULL contains full locale codes", () => {
    expect(LINGO_LOCALE_CODES_FULL).toContain("en-US");
    expect(LINGO_LOCALE_CODES_FULL).toContain("fr-FR");
    expect(LINGO_LOCALE_CODES_FULL).toContain("zh-Hans-CN");
  });
});

describe("SUPPORTED_LOCALES", () => {
  test("has value and label for each entry", () => {
    for (const loc of SUPPORTED_LOCALES) {
      expect(loc).toHaveProperty("value");
      expect(loc).toHaveProperty("label");
      expect(typeof loc.value).toBe("string");
      expect(typeof loc.label).toBe("string");
      expect(loc.value.length).toBeGreaterThan(0);
      expect(loc.label.length).toBeGreaterThan(0);
    }
  });

  test("all values are valid locale codes", () => {
    for (const loc of SUPPORTED_LOCALES) {
      expect(ALL_LOCALE_CODES).toContain(loc.value);
    }
  });

  test("contains common locales", () => {
    const values = SUPPORTED_LOCALES.map((l) => l.value);
    expect(values).toContain("en");
    expect(values).toContain("fr");
    expect(values).toContain("es");
    expect(values).toContain("de");
    expect(values).toContain("ja");
    expect(values).toContain("zh");
  });
});

describe("SCALAR_THEMES", () => {
  test("has value and label for each theme", () => {
    for (const theme of SCALAR_THEMES) {
      expect(theme).toHaveProperty("value");
      expect(theme).toHaveProperty("label");
      expect(typeof theme.value).toBe("string");
      expect(typeof theme.label).toBe("string");
    }
  });

  test("matches schema theme enum", () => {
    const schemaThemes =
      (
        schema as {
          properties?: {
            scalar?: { properties?: { theme?: { enum?: string[] } } };
          };
        }
      )?.properties?.scalar?.properties?.theme?.enum ?? [];
    const constantThemes = SCALAR_THEMES.map((t) => t.value);
    for (const t of constantThemes) {
      expect(schemaThemes).toContain(t);
    }
    for (const t of schemaThemes) {
      expect((constantThemes as readonly string[]).includes(t)).toBe(true);
    }
  });

  test("contains default theme", () => {
    expect(SCALAR_THEMES.map((t) => t.value)).toContain("default");
  });
});

describe("SCALAR_LAYOUTS", () => {
  test("contains modern and classic", () => {
    const values = SCALAR_LAYOUTS.map((l) => l.value);
    expect(values).toContain("modern");
    expect(values).toContain("classic");
  });

  test("has exactly 2 layouts", () => {
    expect(SCALAR_LAYOUTS).toHaveLength(2);
  });
});

describe("SCALAR_DOCUMENT_DOWNLOAD_TYPES", () => {
  test("contains expected download types", () => {
    const values = SCALAR_DOCUMENT_DOWNLOAD_TYPES.map((d) => d.value);
    expect(values).toContain("none");
    expect(values).toContain("yaml");
    expect(values).toContain("json");
    expect(values).toContain("both");
    expect(values).toContain("direct");
  });
});

describe("SCALAR_OPERATION_TITLE_SOURCES", () => {
  test("contains summary and path", () => {
    const values = SCALAR_OPERATION_TITLE_SOURCES.map((s) => s.value);
    expect(values).toContain("summary");
    expect(values).toContain("path");
  });
});

describe("SCALAR_SHOW_DEVELOPER_TOOLS", () => {
  test("contains never, always, localhost", () => {
    const values = SCALAR_SHOW_DEVELOPER_TOOLS.map((s) => s.value);
    expect(values).toContain("never");
    expect(values).toContain("always");
    expect(values).toContain("localhost");
  });
});

describe("DEFAULT_TRANSLATABLE_FIELDS", () => {
  test("has name, enabled, fields for each group", () => {
    for (const group of DEFAULT_TRANSLATABLE_FIELDS) {
      expect(group).toHaveProperty("name");
      expect(group).toHaveProperty("enabled");
      expect(group).toHaveProperty("fields");
      expect(group.fields).toBeInstanceOf(Array);
    }
  });

  test("contains info, tags, operations, parameters, schemas", () => {
    const names = DEFAULT_TRANSLATABLE_FIELDS.map((g) => g.name);
    expect(names).toContain("info");
    expect(names).toContain("tags");
    expect(names).toContain("operations");
    expect(names).toContain("parameters");
    expect(names).toContain("schemas");
  });

  test("all groups have at least one field", () => {
    for (const group of DEFAULT_TRANSLATABLE_FIELDS) {
      expect(group.fields.length).toBeGreaterThan(0);
    }
  });
});

describe("DEFAULT_LINGO_CONFIG", () => {
  test("has batchSize, idealBatchItemSize, fast", () => {
    expect(DEFAULT_LINGO_CONFIG).toHaveProperty("batchSize");
    expect(DEFAULT_LINGO_CONFIG).toHaveProperty("idealBatchItemSize");
    expect(DEFAULT_LINGO_CONFIG).toHaveProperty("fast");
  });

  test("batchSize is within schema bounds (1-250)", () => {
    expect(DEFAULT_LINGO_CONFIG.batchSize).toBeGreaterThanOrEqual(1);
    expect(DEFAULT_LINGO_CONFIG.batchSize).toBeLessThanOrEqual(250);
  });

  test("idealBatchItemSize is within schema bounds (1-2500)", () => {
    expect(DEFAULT_LINGO_CONFIG.idealBatchItemSize).toBeGreaterThanOrEqual(1);
    expect(DEFAULT_LINGO_CONFIG.idealBatchItemSize).toBeLessThanOrEqual(2500);
  });

  test("fast is boolean", () => {
    expect(typeof DEFAULT_LINGO_CONFIG.fast).toBe("boolean");
  });
});
