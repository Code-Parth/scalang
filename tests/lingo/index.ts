import { describe, test, expect } from "bun:test";
import {
  getEngine,
  translateText,
  translateMap,
  validateApiKey,
} from "../../packages/lingo/src/index";

const HAS_API_KEY = !!process.env.LINGODOTDEV_API_KEY;

/**
 * Integration tests — only run when LINGODOTDEV_API_KEY is set.
 * Run with:  LINGODOTDEV_API_KEY=<key> bun test tests/
 */
describe.skipIf(!HAS_API_KEY)("@scalang/lingo (integration)", () => {
  test("getEngine returns engine instance", () => {
    const engine = getEngine();
    expect(engine).toBeDefined();
  });

  test(
    "translateText translates a simple string",
    async () => {
      const result = await translateText("hello", "en", "fr");
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
      // Lingo.dev should return a French greeting — accept any non-empty result
      expect(result.toLowerCase()).not.toBe("hello");
    },
    { timeout: 30000 }
  );

  test(
    "translateMap translates key-value pairs",
    async () => {
      const input = {
        greeting: "Hello",
        farewell: "Goodbye",
      };
      const result = await translateMap(input, "en", "es");
      expect(Object.keys(result)).toEqual(["greeting", "farewell"]);
      expect(result.greeting!.length).toBeGreaterThan(0);
      expect(result.farewell!.length).toBeGreaterThan(0);
    },
    { timeout: 30000 }
  );

  test(
    "validateApiKey returns true for valid key",
    async () => {
      const key = process.env.LINGODOTDEV_API_KEY!;
      const valid = await validateApiKey(key);
      expect(valid).toBe(true);
    },
    { timeout: 30000 }
  );

  test(
    "validateApiKey returns false for invalid key",
    async () => {
      const valid = await validateApiKey("sk-invalid-key-000000");
      expect(valid).toBe(false);
    },
    { timeout: 30000 }
  );
});

describe("@scalang/lingo (unit)", () => {
  test("getEngine throws when no API key available", () => {
    // Temporarily unset the env var
    const saved = process.env.LINGODOTDEV_API_KEY;
    delete process.env.LINGODOTDEV_API_KEY;
    try {
      expect(() => getEngine("")).toThrow();
    } finally {
      if (saved) process.env.LINGODOTDEV_API_KEY = saved;
    }
  });
});
