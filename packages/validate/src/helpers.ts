/**
 * Helpers for navigating and comparing nested JSON objects.
 */

import { readFileSync, writeFileSync } from "node:fs";

/**
 * Get a nested value from an object using a dot-notation path with array indices.
 */
export function getNestedValue(obj: unknown, path: string): unknown {
  const parts: (string | number)[] = [];
  let current = "";

  for (let i = 0; i < path.length; i++) {
    const char = path[i];
    if (char === "[") {
      if (current) {
        parts.push(current);
        current = "";
      }
      const end = path.indexOf("]", i);
      if (end === -1) break;
      parts.push(parseInt(path.slice(i + 1, end), 10));
      i = end;
      if (path[i + 1] === ".") i++;
    } else if (char === ".") {
      // Handle path-like keys starting with /
      if (i + 1 < path.length && path[i + 1] === "/") {
        if (current) {
          parts.push(current);
          current = "";
        }
        let j = i + 1;
        while (j < path.length && path[j] !== "[") {
          if (path[j] === "." && j + 1 < path.length && path[j + 1] !== "/") {
            break;
          }
          if (path[j] === "." && j + 1 >= path.length) {
            break;
          }
          current += path[j];
          j++;
        }
        parts.push(current);
        current = "";
        i = j - 1;
      } else {
        if (current) {
          parts.push(current);
          current = "";
        }
      }
    } else {
      current += char;
    }
  }
  if (current) parts.push(current);

  let val: unknown = obj;
  for (const part of parts) {
    if (val === null || val === undefined || typeof val !== "object")
      return undefined;
    if (typeof part === "number") {
      val = (val as unknown[])[part];
    } else {
      val = (val as Record<string, unknown>)[part];
    }
  }
  return val;
}

/**
 * Count total keys at all levels of a JSON object.
 */
export function countKeys(obj: unknown): number {
  if (obj === null || obj === undefined || typeof obj !== "object") return 0;
  let count = 0;
  if (Array.isArray(obj)) {
    count += obj.length;
    for (const item of obj) count += countKeys(item);
  } else {
    const keys = Object.keys(obj as Record<string, unknown>);
    count += keys.length;
    for (const key of keys)
      count += countKeys((obj as Record<string, unknown>)[key]);
  }
  return count;
}

/**
 * Read and parse a JSON file. Returns null if the file doesn't exist or is invalid.
 */
export function readJSON(filePath: string): Record<string, unknown> | null {
  try {
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Write a JSON object to a file, pretty-printed.
 */
export function writeJSON(
  filePath: string,
  data: Record<string, unknown>
): void {
  writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}
