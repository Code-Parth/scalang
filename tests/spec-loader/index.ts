import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  isSpecUrl,
  getSpecFormat,
  parseSpecContent,
  cloneSpec,
  loadSpec,
} from "../../packages/spec-loader/src/index";
import {
  extractTranslatableFields,
  injectTranslations,
} from "../../packages/spec-loader/src/field-extractor";
import type { TranslationMap } from "../../packages/spec-loader/src/field-extractor";

const FIXTURES_DIR = resolve(import.meta.dir, "../fixtures");
const JSON_FIXTURE = resolve(FIXTURES_DIR, "openapi.json");
const YAML_FIXTURE = resolve(FIXTURES_DIR, "openapi.yaml");

const jsonSpec = JSON.parse(readFileSync(JSON_FIXTURE, "utf-8"));

describe("isSpecUrl", () => {
  test("returns true for http URLs", () => {
    expect(isSpecUrl("http://example.com/spec.json")).toBe(true);
  });

  test("returns true for https URLs", () => {
    expect(isSpecUrl("https://api.example.com/v1/openapi.yaml")).toBe(true);
  });

  test("returns false for file paths", () => {
    expect(isSpecUrl("./specs/openapi.json")).toBe(false);
    expect(isSpecUrl("/absolute/path/spec.yaml")).toBe(false);
    expect(isSpecUrl("relative/path.json")).toBe(false);
  });
});

describe("getSpecFormat", () => {
  test("detects json from extension", () => {
    expect(getSpecFormat("spec.json")).toBe("json");
  });

  test("detects yaml from extension", () => {
    expect(getSpecFormat("spec.yaml")).toBe("yaml");
    expect(getSpecFormat("spec.yml")).toBe("yaml");
  });

  test("uses content-type header when available", () => {
    expect(getSpecFormat("spec", "application/json")).toBe("json");
    expect(getSpecFormat("spec", "text/yaml")).toBe("yaml");
  });

  test("defaults to json for unknown extension", () => {
    expect(getSpecFormat("spec.txt")).toBe("json");
    expect(getSpecFormat("spec")).toBe("json");
  });
});

describe("parseSpecContent", () => {
  test("parses JSON content", () => {
    const raw = readFileSync(JSON_FIXTURE, "utf-8");
    const result = parseSpecContent(raw, "json");
    expect(result.openapi).toBe("3.1.0");
    expect((result.info as Record<string, string>).title).toBe("Pet Store API");
  });

  test("parses YAML content", () => {
    const raw = readFileSync(YAML_FIXTURE, "utf-8");
    const result = parseSpecContent(raw, "yaml");
    expect(result.openapi).toBe("3.1.0");
    expect((result.info as Record<string, string>).title).toBe("Pet Store API");
  });

  test("auto-detects JSON content", () => {
    const raw = readFileSync(JSON_FIXTURE, "utf-8");
    const result = parseSpecContent(raw);
    expect(result.openapi).toBe("3.1.0");
  });

  test("auto-detects YAML content", () => {
    const raw = readFileSync(YAML_FIXTURE, "utf-8");
    const result = parseSpecContent(raw);
    expect(result.openapi).toBe("3.1.0");
  });
});

describe("cloneSpec", () => {
  test("creates a deep copy", () => {
    const clone = cloneSpec(jsonSpec);
    expect(clone).toEqual(jsonSpec);
    expect(clone).not.toBe(jsonSpec);
  });

  test("mutations don't affect the original", () => {
    const clone = cloneSpec(jsonSpec);
    (clone.info as Record<string, string>).title = "Modified";
    expect((jsonSpec.info as Record<string, string>).title).toBe(
      "Pet Store API"
    );
  });
});

describe("loadSpec", () => {
  test("loads a JSON spec from file path", async () => {
    const result = await loadSpec(JSON_FIXTURE);
    expect(result.spec.openapi).toBe("3.1.0");
    expect(result.format).toBe("json");
    expect(result.raw).toContain("Pet Store API");
  });

  test("loads a YAML spec from file path", async () => {
    const result = await loadSpec(YAML_FIXTURE);
    expect(result.spec.openapi).toBe("3.1.0");
    expect(result.format).toBe("yaml");
  });

  test("throws for non-existent file", async () => {
    await expect(loadSpec("/non/existent/path.json")).rejects.toThrow(
      "not found"
    );
  });
});

describe("extractTranslatableFields", () => {
  const fieldGroups = [
    {
      name: "info",
      enabled: true,
      fields: ["info.title", "info.description"],
    },
    {
      name: "tags",
      enabled: true,
      fields: ["tags[*].description"],
    },
    {
      name: "operations",
      enabled: true,
      fields: ["paths.*.*.summary", "paths.*.*.description"],
    },
    {
      name: "parameters",
      enabled: true,
      fields: ["paths.*.*.parameters[*].description"],
    },
    {
      name: "schemas",
      enabled: true,
      fields: [
        "components.schemas.*.description",
        "components.schemas.*.properties.*.description",
      ],
    },
  ];

  test("extracts info fields", () => {
    const result = extractTranslatableFields(jsonSpec, fieldGroups);
    expect(result["info.title"]).toBe("Pet Store API");
    expect(result["info.description"]).toBe(
      "A sample API for managing pets in a store"
    );
  });

  test("extracts tag descriptions via [*]", () => {
    const result = extractTranslatableFields(jsonSpec, fieldGroups);
    expect(result["tags[0].description"]).toBe("Operations related to pets");
    expect(result["tags[1].description"]).toBe("Store inventory operations");
  });

  test("extracts operation summaries and descriptions via *.*", () => {
    const result = extractTranslatableFields(jsonSpec, fieldGroups);
    expect(result["paths./pets.get.summary"]).toBe("List all pets");
    expect(result["paths./pets.get.description"]).toBe(
      "Returns a list of all pets in the store"
    );
    expect(result["paths./pets.post.summary"]).toBe("Create a new pet");
    expect(result["paths./pets/{petId}.get.summary"]).toBe("Get a pet by ID");
  });

  test("extracts parameter descriptions", () => {
    const result = extractTranslatableFields(jsonSpec, fieldGroups);
    expect(result["paths./pets.get.parameters[0].description"]).toBe(
      "Maximum number of pets to return"
    );
    expect(result["paths./pets.get.parameters[1].description"]).toBe(
      "Filter by pet status"
    );
  });

  test("extracts schema descriptions", () => {
    const result = extractTranslatableFields(jsonSpec, fieldGroups);
    expect(result["components.schemas.Pet.description"]).toBe(
      "A pet in the store"
    );
    expect(result["components.schemas.Pet.properties.name.description"]).toBe(
      "The name of the pet"
    );
  });

  test("skips disabled groups", () => {
    const disabledGroups = fieldGroups.map((g) => ({
      ...g,
      enabled: g.name === "info",
    }));
    const result = extractTranslatableFields(jsonSpec, disabledGroups);
    expect(result["info.title"]).toBe("Pet Store API");
    expect(result["tags[0].description"]).toBeUndefined();
    expect(result["paths./pets.get.summary"]).toBeUndefined();
  });

  test("returns correct total count", () => {
    const result = extractTranslatableFields(jsonSpec, fieldGroups);
    // info: 2, tags: 2, operations: 8 (4 summaries + 4 descriptions),
    // parameters: 3, schemas: 3 descriptions + 7 property descriptions
    const count = Object.keys(result).length;
    expect(count).toBeGreaterThan(15);
  });
});

describe("injectTranslations", () => {
  test("injects translations into a cloned spec", () => {
    const clone = cloneSpec(jsonSpec);
    const translations: TranslationMap = {
      "info.title": "API de la Animalerie",
      "info.description": "Un exemple d'API pour gérer les animaux",
      "tags[0].description": "Opérations relatives aux animaux",
    };
    injectTranslations(clone, translations);

    expect((clone.info as Record<string, string>).title).toBe(
      "API de la Animalerie"
    );
    expect((clone.info as Record<string, string>).description).toBe(
      "Un exemple d'API pour gérer les animaux"
    );
    const tags = clone.tags as Array<Record<string, string>>;
    expect(tags[0].description).toBe("Opérations relatives aux animaux");
    // Untouched fields remain
    expect(tags[1].description).toBe("Store inventory operations");
  });

  test("injects path-like keys correctly", () => {
    const clone = cloneSpec(jsonSpec);
    const translations: TranslationMap = {
      "paths./pets.get.summary": "Lister tous les animaux",
      "paths./pets/{petId}.get.summary": "Obtenir un animal par ID",
    };
    injectTranslations(clone, translations);

    const paths = clone.paths as Record<
      string,
      Record<string, Record<string, string>>
    >;
    expect(paths["/pets"].get.summary).toBe("Lister tous les animaux");
    expect(paths["/pets/{petId}"].get.summary).toBe("Obtenir un animal par ID");
  });
});

// ---------------------------------------------------------------------------
// Local Scalar Galaxy specs
// ---------------------------------------------------------------------------
const GALAXY_JSON_FIXTURE = resolve(FIXTURES_DIR, "galaxy.json");
const GALAXY_YAML_FIXTURE = resolve(FIXTURES_DIR, "galaxy.yaml");

const galaxyJsonSpec = JSON.parse(readFileSync(GALAXY_JSON_FIXTURE, "utf-8"));

describe("loadSpec (Scalar Galaxy)", () => {
  test("loads Galaxy spec from JSON file", async () => {
    const result = await loadSpec(GALAXY_JSON_FIXTURE);
    expect(result.spec.openapi).toBeDefined();
    expect(result.format).toBe("json");
    expect((result.spec.info as Record<string, string>).title).toBeDefined();
  });

  test("loads Galaxy spec from YAML file", async () => {
    const result = await loadSpec(GALAXY_YAML_FIXTURE);
    expect(result.spec.openapi).toBeDefined();
    expect(result.format).toBe("yaml");
    expect((result.spec.info as Record<string, string>).title).toBeDefined();
  });

  test("Galaxy spec has paths and components", () => {
    const paths = galaxyJsonSpec.paths as Record<string, unknown>;
    expect(Object.keys(paths).length).toBeGreaterThan(0);
    const components = galaxyJsonSpec.components as Record<string, unknown>;
    expect(components).toBeDefined();
  });

  test("extractTranslatableFields works on Galaxy spec", () => {
    const fieldGroups = [
      {
        name: "info",
        enabled: true,
        fields: ["info.title", "info.description"],
      },
      { name: "operations", enabled: true, fields: ["paths.*.*.summary"] },
    ];
    const fields = extractTranslatableFields(galaxyJsonSpec, fieldGroups);
    expect(Object.keys(fields).length).toBeGreaterThan(0);
    expect(fields["info.title"]).toBeDefined();
  });
});
