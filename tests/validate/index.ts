import { describe, expect, test } from "bun:test";
import { getNestedValue, countKeys } from "../../packages/validate/src/helpers";
import { detectEnglishScore } from "../../packages/validate/src/english-detector";
import {
  checkRefsPreserved,
  verifyTagNames,
  verifyOperationIds,
} from "../../packages/validate/src/identifiers";
import {
  createResult,
  pass,
  fail,
  warn,
  fixed,
} from "../../packages/validate/src/result";

describe("getNestedValue", () => {
  const obj = {
    info: { title: "Test API", description: "A test" },
    tags: [
      { name: "pets", description: "Pet ops" },
      { name: "store", description: "Store ops" },
    ],
    paths: {
      "/pets": {
        get: { summary: "List pets", operationId: "listPets" },
        post: { summary: "Create pet" },
      },
      "/pets/{petId}": {
        get: { summary: "Get pet by ID" },
      },
    },
    components: {
      schemas: {
        Pet: {
          description: "A pet",
          properties: {
            name: { description: "Pet name" },
          },
        },
      },
    },
  };

  test("traverses simple dot paths", () => {
    expect(getNestedValue(obj, "info.title")).toBe("Test API");
    expect(getNestedValue(obj, "info.description")).toBe("A test");
  });

  test("handles array indices", () => {
    expect(getNestedValue(obj, "tags[0].name")).toBe("pets");
    expect(getNestedValue(obj, "tags[1].description")).toBe("Store ops");
  });

  test("handles path-like keys with /", () => {
    expect(getNestedValue(obj, "paths./pets.get.summary")).toBe("List pets");
    expect(getNestedValue(obj, "paths./pets/{petId}.get.summary")).toBe(
      "Get pet by ID"
    );
  });

  test("handles deep nested paths", () => {
    expect(
      getNestedValue(obj, "components.schemas.Pet.properties.name.description")
    ).toBe("Pet name");
  });

  test("returns undefined for missing paths", () => {
    expect(getNestedValue(obj, "info.nonexistent")).toBeUndefined();
    expect(getNestedValue(obj, "missing.path")).toBeUndefined();
  });

  test("returns undefined for null/undefined input", () => {
    expect(getNestedValue(null, "any.path")).toBeUndefined();
    expect(getNestedValue(undefined, "any.path")).toBeUndefined();
  });
});

describe("countKeys", () => {
  test("counts keys in a flat object", () => {
    expect(countKeys({ a: 1, b: 2, c: 3 })).toBe(3);
  });

  test("counts keys in nested objects recursively", () => {
    const obj = { a: { b: 1, c: 2 }, d: 3 };
    // Top level: 2 keys (a, d) + nested: 2 keys (b, c) = 4
    expect(countKeys(obj)).toBe(4);
  });

  test("counts array elements and their contents", () => {
    const obj = { items: [{ a: 1 }, { b: 2 }] };
    // Top level: 1 (items) + array: 2 elements + {a:1}: 1 + {b:2}: 1 = 5
    expect(countKeys(obj)).toBe(5);
  });

  test("returns 0 for null, undefined, and primitives", () => {
    expect(countKeys(null)).toBe(0);
    expect(countKeys(undefined)).toBe(0);
    expect(countKeys(42)).toBe(0);
    expect(countKeys("string")).toBe(0);
  });
});

describe("detectEnglishScore", () => {
  test("detects English text", () => {
    const { score } = detectEnglishScore(
      "The quick brown fox jumps over the lazy dog, which was sleeping there"
    );
    expect(score).toBeGreaterThan(0.3);
  });

  test("returns low score for non-English text", () => {
    const { score } = detectEnglishScore(
      "Le renard brun rapide saute par-dessus le chien paresseux"
    );
    expect(score).toBeLessThan(0.3);
  });

  test("returns 0 for empty or very short text", () => {
    const { score, totalWords } = detectEnglishScore("");
    expect(score).toBe(0);
    expect(totalWords).toBe(0);
  });

  test("ignores code blocks", () => {
    const text = "```\nconst the = this.with\n```\nBonjour le monde";
    const { englishWords } = detectEnglishScore(text);
    // "the", "this", "with" should be stripped out since they're in a code block
    expect(englishWords.length).toBe(0);
  });

  test("ignores URLs", () => {
    const { score } = detectEnglishScore(
      "Ver https://the-with-this.example.com/from datos aquí"
    );
    // URL words shouldn't count
    expect(score).toBeLessThan(0.3);
  });
});

describe("checkRefsPreserved", () => {
  test("returns allPreserved when $refs match", () => {
    const source = {
      schema: { $ref: "#/components/schemas/Pet" },
      nested: { items: { $ref: "#/components/schemas/Item" } },
    };
    const target = {
      schema: { $ref: "#/components/schemas/Pet" },
      nested: { items: { $ref: "#/components/schemas/Item" } },
    };
    const result = checkRefsPreserved(source, target);
    expect(result.allPreserved).toBe(true);
    expect(result.count).toBe(2);
    expect(result.broken).toHaveLength(0);
  });

  test("detects broken $refs", () => {
    const source = {
      schema: { $ref: "#/components/schemas/Pet" },
    };
    const target = {
      schema: { $ref: "#/composants/schémas/Animal" },
    };
    const result = checkRefsPreserved(source, target);
    expect(result.allPreserved).toBe(false);
    expect(result.broken).toHaveLength(1);
    expect(result.broken[0].source).toBe("#/components/schemas/Pet");
    expect(result.broken[0].target).toBe("#/composants/schémas/Animal");
  });

  test("handles arrays with $refs", () => {
    const source = {
      items: [
        { $ref: "#/components/schemas/A" },
        { $ref: "#/components/schemas/B" },
      ],
    };
    const target = {
      items: [
        { $ref: "#/components/schemas/A" },
        { $ref: "#/composants/schémas/B" },
      ],
    };
    const result = checkRefsPreserved(source, target);
    expect(result.allPreserved).toBe(false);
    expect(result.broken).toHaveLength(1);
  });
});

describe("verifyTagNames", () => {
  test("detects preserved tag names", () => {
    const result = createResult();
    const sourceSpec = {
      tags: [
        { name: "pets", description: "Pet operations" },
        { name: "store", description: "Store operations" },
      ],
    };
    const targetSpec = {
      tags: [
        { name: "pets", description: "Opérations animaux" },
        { name: "store", description: "Opérations magasin" },
      ],
    };
    const modified = verifyTagNames(
      sourceSpec as Record<string, unknown>,
      targetSpec as Record<string, unknown>,
      "fr",
      false,
      result
    );
    expect(modified).toBe(false);
    expect(result.passed).toBeGreaterThan(0);
    expect(result.failed).toBe(0);
  });

  test("detects translated tag names", () => {
    const result = createResult();
    const sourceSpec = {
      tags: [{ name: "pets", description: "Pet operations" }],
    };
    const targetSpec = {
      tags: [{ name: "animaux", description: "Opérations animaux" }],
    };
    const modified = verifyTagNames(
      sourceSpec as Record<string, unknown>,
      targetSpec as Record<string, unknown>,
      "fr",
      false,
      result
    );
    expect(modified).toBe(false);
    expect(result.failed).toBeGreaterThan(0);
  });

  test("fixes translated tag names in fix mode", () => {
    const result = createResult();
    const sourceSpec = {
      tags: [{ name: "pets", description: "Pet operations" }],
    };
    const targetSpec = {
      tags: [{ name: "animaux", description: "Opérations animaux" }],
    };
    const modified = verifyTagNames(
      sourceSpec as Record<string, unknown>,
      targetSpec as Record<string, unknown>,
      "fr",
      true,
      result
    );
    expect(modified).toBe(true);
    expect(targetSpec.tags[0].name).toBe("pets");
    expect(result.fixed).toBeGreaterThan(0);
  });
});

describe("verifyOperationIds", () => {
  test("detects preserved operationIds", () => {
    const result = createResult();
    const sourceSpec = {
      paths: {
        "/pets": { get: { operationId: "listPets", summary: "List" } },
      },
    };
    const targetSpec = {
      paths: {
        "/pets": {
          get: { operationId: "listPets", summary: "Lister" },
        },
      },
    };
    const modified = verifyOperationIds(
      sourceSpec as Record<string, unknown>,
      targetSpec as Record<string, unknown>,
      "fr",
      false,
      result
    );
    expect(modified).toBe(false);
    expect(result.passed).toBeGreaterThan(0);
  });

  test("detects translated operationIds", () => {
    const result = createResult();
    const sourceSpec = {
      paths: {
        "/pets": { get: { operationId: "listPets" } },
      },
    };
    const targetSpec = {
      paths: {
        "/pets": { get: { operationId: "listerAnimaux" } },
      },
    };
    const modified = verifyOperationIds(
      sourceSpec as Record<string, unknown>,
      targetSpec as Record<string, unknown>,
      "fr",
      false,
      result
    );
    expect(modified).toBe(false);
    expect(result.failed).toBeGreaterThan(0);
  });
});

describe("VerificationResult helpers", () => {
  test("createResult initializes all counters to 0", () => {
    const result = createResult();
    expect(result.passed).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.warnings).toBe(0);
    expect(result.fixed).toBe(0);
    expect(result.errors).toEqual([]);
    expect(result.warns).toEqual([]);
    expect(result.fixes).toEqual([]);
  });

  test("pass increments passed counter", () => {
    const result = createResult();
    pass(result, "test");
    expect(result.passed).toBe(1);
  });

  test("fail increments failed counter and adds error", () => {
    const result = createResult();
    fail(result, "something broke");
    expect(result.failed).toBe(1);
    expect(result.errors).toEqual(["something broke"]);
  });

  test("warn increments warnings counter", () => {
    const result = createResult();
    warn(result, "watch out");
    expect(result.warnings).toBe(1);
    expect(result.warns).toEqual(["watch out"]);
  });

  test("fixed increments fixed counter", () => {
    const result = createResult();
    fixed(result, "restored ref");
    expect(result.fixed).toBe(1);
    expect(result.fixes).toEqual(["restored ref"]);
  });
});
