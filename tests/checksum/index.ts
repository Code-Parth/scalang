import { describe, expect, test } from "bun:test";
import {
  deepSortKeys,
  contentChecksum,
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
