import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import {
  deepSortKeys,
  contentChecksum,
  fileChecksum,
  computeLocaleChecksums,
  loadState,
  saveState,
  canSkipGeneration,
  getLocalesToRegenerate,
  buildLocaleChecksums,
  type GenerationState,
  type LocaleChecksum,
} from "../../packages/checksum/src/index";

describe("deepSortKeys", () => {
  test("sorts object keys alphabetically", () => {
    const input = { z: 1, a: 2, m: 3 };
    const result = deepSortKeys(input) as Record<string, number>;
    expect(Object.keys(result)).toEqual(["a", "m", "z"]);
  });

  test("sorts nested objects recursively", () => {
    const input = { z: { b: 1, a: 2 }, a: { d: 3, c: 4 } };
    const result = deepSortKeys(input) as Record<
      string,
      Record<string, number>
    >;
    expect(Object.keys(result)).toEqual(["a", "z"]);
    expect(Object.keys(result.a)).toEqual(["c", "d"]);
    expect(Object.keys(result.z)).toEqual(["a", "b"]);
  });

  test("handles arrays without sorting them", () => {
    const input = { items: [3, 1, 2] };
    const result = deepSortKeys(input) as { items: number[] };
    expect(result.items).toEqual([3, 1, 2]);
  });

  test("sorts objects inside arrays", () => {
    const input = [{ z: 1, a: 2 }];
    const result = deepSortKeys(input) as Array<Record<string, number>>;
    expect(Object.keys(result[0])).toEqual(["a", "z"]);
  });

  test("handles null and undefined", () => {
    expect(deepSortKeys(null)).toBe(null);
    expect(deepSortKeys(undefined)).toBe(undefined);
  });

  test("handles primitives", () => {
    expect(deepSortKeys(42)).toBe(42);
    expect(deepSortKeys("hello")).toBe("hello");
    expect(deepSortKeys(true)).toBe(true);
  });
});

describe("contentChecksum", () => {
  test("returns a 64-char hex string", () => {
    const result = contentChecksum("hello world");
    expect(result).toMatch(/^[a-f0-9]{64}$/);
  });

  test("same input produces same checksum", () => {
    const a = contentChecksum("test content");
    const b = contentChecksum("test content");
    expect(a).toBe(b);
  });

  test("different input produces different checksum", () => {
    const a = contentChecksum("content a");
    const b = contentChecksum("content b");
    expect(a).not.toBe(b);
  });

  test("normalizes JSON content (whitespace-insensitive)", () => {
    const compact = contentChecksum('{"a":1,"b":2}');
    const pretty = contentChecksum('{\n  "a": 1,\n  "b": 2\n}');
    expect(compact).toBe(pretty);
  });

  test("normalizes JSON content (key-order-insensitive)", () => {
    const a = contentChecksum('{"a":1,"b":2}');
    const b = contentChecksum('{"b":2,"a":1}');
    expect(a).toBe(b);
  });

  test("hashes non-JSON content as raw strings", () => {
    const result = contentChecksum("not json {[");
    expect(result).toMatch(/^[a-f0-9]{64}$/);
  });
});

// ── Per-locale checksum tests ────────────────────────────────────

import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";

const TEST_DIR = join(import.meta.dir, ".tmp-checksum-test");

function setupTestDir() {
  mkdirSync(TEST_DIR, { recursive: true });
}

function cleanTestDir() {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

function writeSpec(locale: string, content: Record<string, unknown>) {
  writeFileSync(
    join(TEST_DIR, `${locale}.json`),
    JSON.stringify(content, null, 2),
    "utf-8"
  );
}

describe("fileChecksum", () => {
  beforeEach(setupTestDir);
  afterEach(cleanTestDir);

  test("returns checksum for existing file", () => {
    const path = join(TEST_DIR, "test.json");
    writeFileSync(path, '{"a":1}', "utf-8");
    const result = fileChecksum(path);
    expect(result).toMatch(/^[a-f0-9]{64}$/);
  });

  test("returns empty string for non-existent file", () => {
    expect(fileChecksum(join(TEST_DIR, "missing.json"))).toBe("");
  });
});

describe("computeLocaleChecksums", () => {
  beforeEach(setupTestDir);
  afterEach(cleanTestDir);

  test("computes checksums for all locale files", () => {
    writeSpec("en", { info: { title: "English" } });
    writeSpec("fr", { info: { title: "French" } });
    const checksums = computeLocaleChecksums(TEST_DIR, ["en", "fr"]);
    expect(checksums.en).toMatch(/^[a-f0-9]{64}$/);
    expect(checksums.fr).toMatch(/^[a-f0-9]{64}$/);
    expect(checksums.en).not.toBe(checksums.fr);
  });

  test("returns empty string for missing locale files", () => {
    writeSpec("en", { info: { title: "English" } });
    const checksums = computeLocaleChecksums(TEST_DIR, ["en", "missing"]);
    expect(checksums.en).toMatch(/^[a-f0-9]{64}$/);
    expect(checksums.missing).toBe("");
  });
});

describe("loadState / saveState", () => {
  beforeEach(setupTestDir);
  afterEach(cleanTestDir);

  test("round-trips generation state", () => {
    const state: GenerationState = {
      sourceChecksum: "abc123",
      configChecksum: "def456",
      locales: ["en", "fr"],
      fieldCount: 10,
      generatedAt: "2026-01-01T00:00:00.000Z",
    };
    saveState(TEST_DIR, state);
    const loaded = loadState(TEST_DIR);
    expect(loaded).toEqual(state);
  });

  test("round-trips state with localeChecksums", () => {
    const state: GenerationState = {
      sourceChecksum: "abc123",
      configChecksum: "def456",
      locales: ["en", "fr"],
      fieldCount: 10,
      generatedAt: "2026-01-01T00:00:00.000Z",
      localeChecksums: {
        en: {
          specChecksum: "spec-en",
          sourceChecksum: "abc123",
          configChecksum: "def456",
          generatedAt: "2026-01-01T00:00:00.000Z",
        },
        fr: {
          specChecksum: "spec-fr",
          sourceChecksum: "abc123",
          configChecksum: "def456",
          generatedAt: "2026-01-01T00:00:00.000Z",
        },
      },
    };
    saveState(TEST_DIR, state);
    const loaded = loadState(TEST_DIR);
    expect(loaded).toEqual(state);
    expect(loaded?.localeChecksums?.fr?.specChecksum).toBe("spec-fr");
  });

  test("returns null for missing state", () => {
    expect(loadState(TEST_DIR)).toBeNull();
  });
});

describe("canSkipGeneration", () => {
  test("returns false when no previous state", () => {
    expect(canSkipGeneration("a", "b", ["en", "fr"], null, true)).toBe(false);
  });

  test("returns true when all checksums match", () => {
    const state: GenerationState = {
      sourceChecksum: "src",
      configChecksum: "cfg",
      locales: ["en", "fr"],
      fieldCount: 5,
      generatedAt: "2026-01-01T00:00:00.000Z",
    };
    expect(canSkipGeneration("src", "cfg", ["en", "fr"], state, true)).toBe(
      true
    );
  });

  test("returns false when source changed", () => {
    const state: GenerationState = {
      sourceChecksum: "old-src",
      configChecksum: "cfg",
      locales: ["en", "fr"],
      fieldCount: 5,
      generatedAt: "2026-01-01T00:00:00.000Z",
    };
    expect(canSkipGeneration("new-src", "cfg", ["en", "fr"], state, true)).toBe(
      false
    );
  });

  test("returns false when config changed", () => {
    const state: GenerationState = {
      sourceChecksum: "src",
      configChecksum: "old-cfg",
      locales: ["en", "fr"],
      fieldCount: 5,
      generatedAt: "2026-01-01T00:00:00.000Z",
    };
    expect(canSkipGeneration("src", "new-cfg", ["en", "fr"], state, true)).toBe(
      false
    );
  });

  test("returns false when locales changed", () => {
    const state: GenerationState = {
      sourceChecksum: "src",
      configChecksum: "cfg",
      locales: ["en", "fr"],
      fieldCount: 5,
      generatedAt: "2026-01-01T00:00:00.000Z",
    };
    expect(
      canSkipGeneration("src", "cfg", ["en", "fr", "de"], state, true)
    ).toBe(false);
  });

  test("returns false when spec files missing", () => {
    const state: GenerationState = {
      sourceChecksum: "src",
      configChecksum: "cfg",
      locales: ["en", "fr"],
      fieldCount: 5,
      generatedAt: "2026-01-01T00:00:00.000Z",
    };
    expect(canSkipGeneration("src", "cfg", ["en", "fr"], state, false)).toBe(
      false
    );
  });
});

describe("getLocalesToRegenerate", () => {
  beforeEach(setupTestDir);
  afterEach(cleanTestDir);

  test("regenerates all when no previous state", () => {
    const { toRegenerate, skipped } = getLocalesToRegenerate(
      "src",
      "cfg",
      ["fr", "de"],
      null,
      TEST_DIR
    );
    expect(toRegenerate).toEqual(["fr", "de"]);
    expect(skipped).toEqual([]);
  });

  test("regenerates all when no localeChecksums in state", () => {
    const state: GenerationState = {
      sourceChecksum: "src",
      configChecksum: "cfg",
      locales: ["en", "fr", "de"],
      fieldCount: 5,
      generatedAt: "2026-01-01T00:00:00.000Z",
    };
    const { toRegenerate, skipped } = getLocalesToRegenerate(
      "src",
      "cfg",
      ["fr", "de"],
      state,
      TEST_DIR
    );
    expect(toRegenerate).toEqual(["fr", "de"]);
    expect(skipped).toEqual([]);
  });

  test("skips locale when checksums match and file exists", () => {
    const frSpec = { info: { title: "API Française" } };
    writeSpec("fr", frSpec);
    const frChecksum = fileChecksum(join(TEST_DIR, "fr.json"));

    const state: GenerationState = {
      sourceChecksum: "src",
      configChecksum: "cfg",
      locales: ["en", "fr", "de"],
      fieldCount: 5,
      generatedAt: "2026-01-01T00:00:00.000Z",
      localeChecksums: {
        fr: {
          specChecksum: frChecksum,
          sourceChecksum: "src",
          configChecksum: "cfg",
          generatedAt: "2026-01-01T00:00:00.000Z",
        },
      },
    };

    const { toRegenerate, skipped } = getLocalesToRegenerate(
      "src",
      "cfg",
      ["fr", "de"],
      state,
      TEST_DIR
    );
    expect(skipped).toEqual(["fr"]);
    expect(toRegenerate).toEqual(["de"]);
  });

  test("regenerates locale when source checksum changed", () => {
    const frSpec = { info: { title: "API Française" } };
    writeSpec("fr", frSpec);
    const frChecksum = fileChecksum(join(TEST_DIR, "fr.json"));

    const state: GenerationState = {
      sourceChecksum: "old-src",
      configChecksum: "cfg",
      locales: ["en", "fr"],
      fieldCount: 5,
      generatedAt: "2026-01-01T00:00:00.000Z",
      localeChecksums: {
        fr: {
          specChecksum: frChecksum,
          sourceChecksum: "old-src",
          configChecksum: "cfg",
          generatedAt: "2026-01-01T00:00:00.000Z",
        },
      },
    };

    const { toRegenerate, skipped } = getLocalesToRegenerate(
      "new-src",
      "cfg",
      ["fr"],
      state,
      TEST_DIR
    );
    expect(toRegenerate).toEqual(["fr"]);
    expect(skipped).toEqual([]);
  });

  test("regenerates locale when config checksum changed", () => {
    writeSpec("fr", { info: { title: "French" } });
    const frChecksum = fileChecksum(join(TEST_DIR, "fr.json"));

    const state: GenerationState = {
      sourceChecksum: "src",
      configChecksum: "old-cfg",
      locales: ["en", "fr"],
      fieldCount: 5,
      generatedAt: "2026-01-01T00:00:00.000Z",
      localeChecksums: {
        fr: {
          specChecksum: frChecksum,
          sourceChecksum: "src",
          configChecksum: "old-cfg",
          generatedAt: "2026-01-01T00:00:00.000Z",
        },
      },
    };

    const { toRegenerate, skipped } = getLocalesToRegenerate(
      "src",
      "new-cfg",
      ["fr"],
      state,
      TEST_DIR
    );
    expect(toRegenerate).toEqual(["fr"]);
    expect(skipped).toEqual([]);
  });

  test("regenerates locale when spec file was modified externally", () => {
    writeSpec("fr", { info: { title: "French" } });

    const state: GenerationState = {
      sourceChecksum: "src",
      configChecksum: "cfg",
      locales: ["en", "fr"],
      fieldCount: 5,
      generatedAt: "2026-01-01T00:00:00.000Z",
      localeChecksums: {
        fr: {
          specChecksum: "stale-checksum-that-no-longer-matches",
          sourceChecksum: "src",
          configChecksum: "cfg",
          generatedAt: "2026-01-01T00:00:00.000Z",
        },
      },
    };

    const { toRegenerate, skipped } = getLocalesToRegenerate(
      "src",
      "cfg",
      ["fr"],
      state,
      TEST_DIR
    );
    expect(toRegenerate).toEqual(["fr"]);
    expect(skipped).toEqual([]);
  });

  test("regenerates locale when spec file is missing", () => {
    // Don't create fr.json
    const state: GenerationState = {
      sourceChecksum: "src",
      configChecksum: "cfg",
      locales: ["en", "fr"],
      fieldCount: 5,
      generatedAt: "2026-01-01T00:00:00.000Z",
      localeChecksums: {
        fr: {
          specChecksum: "some-checksum",
          sourceChecksum: "src",
          configChecksum: "cfg",
          generatedAt: "2026-01-01T00:00:00.000Z",
        },
      },
    };

    const { toRegenerate, skipped } = getLocalesToRegenerate(
      "src",
      "cfg",
      ["fr"],
      state,
      TEST_DIR
    );
    expect(toRegenerate).toEqual(["fr"]);
    expect(skipped).toEqual([]);
  });

  test("handles mixed: some locales skip, others regenerate", () => {
    writeSpec("fr", { info: { title: "French" } });
    writeSpec("de", { info: { title: "German" } });
    const frChecksum = fileChecksum(join(TEST_DIR, "fr.json"));

    const state: GenerationState = {
      sourceChecksum: "src",
      configChecksum: "cfg",
      locales: ["en", "fr", "de", "ja"],
      fieldCount: 5,
      generatedAt: "2026-01-01T00:00:00.000Z",
      localeChecksums: {
        fr: {
          specChecksum: frChecksum,
          sourceChecksum: "src",
          configChecksum: "cfg",
          generatedAt: "2026-01-01T00:00:00.000Z",
        },
        de: {
          specChecksum: "stale-checksum",
          sourceChecksum: "src",
          configChecksum: "cfg",
          generatedAt: "2026-01-01T00:00:00.000Z",
        },
        // ja: not in checksums at all (new locale)
      },
    };

    const { toRegenerate, skipped } = getLocalesToRegenerate(
      "src",
      "cfg",
      ["fr", "de", "ja"],
      state,
      TEST_DIR
    );
    expect(skipped).toEqual(["fr"]);
    expect(toRegenerate).toEqual(["de", "ja"]);
  });
});

describe("buildLocaleChecksums", () => {
  beforeEach(setupTestDir);
  afterEach(cleanTestDir);

  test("builds checksums for generated locales", () => {
    writeSpec("en", { info: { title: "English" } });
    writeSpec("fr", { info: { title: "French" } });

    const result = buildLocaleChecksums(
      TEST_DIR,
      ["en", "fr"],
      "src-hash",
      "cfg-hash"
    );

    expect(result.en).toBeDefined();
    expect(result.en.sourceChecksum).toBe("src-hash");
    expect(result.en.configChecksum).toBe("cfg-hash");
    expect(result.en.specChecksum).toMatch(/^[a-f0-9]{64}$/);
    expect(result.en.generatedAt).toBeTruthy();

    expect(result.fr).toBeDefined();
    expect(result.fr.sourceChecksum).toBe("src-hash");
    expect(result.fr.specChecksum).not.toBe(result.en.specChecksum);
  });

  test("preserves existing checksums for skipped locales", () => {
    writeSpec("fr", { info: { title: "French" } });

    const existing: Record<string, LocaleChecksum> = {
      de: {
        specChecksum: "existing-de-checksum",
        sourceChecksum: "old-src",
        configChecksum: "old-cfg",
        generatedAt: "2025-01-01T00:00:00.000Z",
      },
    };

    const result = buildLocaleChecksums(
      TEST_DIR,
      ["fr"],
      "new-src",
      "new-cfg",
      existing
    );

    // fr should have new checksum
    expect(result.fr.sourceChecksum).toBe("new-src");
    // de should keep existing checksum
    expect(result.de.specChecksum).toBe("existing-de-checksum");
    expect(result.de.sourceChecksum).toBe("old-src");
  });

  test("overwrites existing checksum for regenerated locale", () => {
    writeSpec("fr", { info: { title: "Updated French" } });

    const existing: Record<string, LocaleChecksum> = {
      fr: {
        specChecksum: "old-fr-checksum",
        sourceChecksum: "old-src",
        configChecksum: "old-cfg",
        generatedAt: "2025-01-01T00:00:00.000Z",
      },
    };

    const result = buildLocaleChecksums(
      TEST_DIR,
      ["fr"],
      "new-src",
      "new-cfg",
      existing
    );

    expect(result.fr.sourceChecksum).toBe("new-src");
    expect(result.fr.configChecksum).toBe("new-cfg");
    expect(result.fr.specChecksum).not.toBe("old-fr-checksum");
  });
});
