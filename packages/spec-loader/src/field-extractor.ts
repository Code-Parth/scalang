import type { TranslatableFieldGroup } from "@scalang/schema";

/**
 * A flat map of extracted translatable strings.
 * Keys are fully-qualified paths like "info.title", "paths./planets.get.summary"
 * Values are the string content (may contain Markdown).
 */
export type TranslationMap = Record<string, string>;

/**
 * Parse a field pattern into segments.
 * Handles patterns like:
 *   "info.title" → ["info", "title"]
 *   "tags[*].description" → ["tags", "[*]", "description"]
 *   "paths.*.*.summary" → ["paths", "*", "*", "summary"]
 */
function parsePattern(pattern: string): string[] {
  const segments: string[] = [];
  let current = "";

  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];

    if (char === "." && current !== "") {
      segments.push(current);
      current = "";
    } else if (char === "[") {
      if (current !== "") {
        segments.push(current);
        current = "";
      }
      const end = pattern.indexOf("]", i);
      if (end === -1) {
        throw new Error(`Unclosed bracket in pattern: ${pattern}`);
      }
      segments.push(pattern.slice(i, end + 1));
      i = end;
      if (pattern[i + 1] === ".") {
        i++;
      }
    } else {
      current += char;
    }
  }

  if (current !== "") {
    segments.push(current);
  }

  return segments;
}

/**
 * Recursively walk an object matching a field pattern and extract string values.
 */
function walkAndExtract(
  obj: unknown,
  segments: string[],
  currentPath: string,
  result: TranslationMap
): void {
  if (segments.length === 0) {
    if (typeof obj === "string" && obj.trim() !== "") {
      result[currentPath] = obj;
    }
    return;
  }

  if (obj === null || obj === undefined || typeof obj !== "object") {
    return;
  }

  const [segment, ...rest] = segments;

  if (segment === "*") {
    const record = obj as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      if (key.startsWith("$")) continue;
      const value = record[key];
      if (value !== null && value !== undefined) {
        const childPath = currentPath ? `${currentPath}.${key}` : key;
        walkAndExtract(value, rest, childPath, result);
      }
    }
  } else if (segment === "[*]") {
    if (!Array.isArray(obj)) return;
    for (let i = 0; i < obj.length; i++) {
      const childPath = `${currentPath}[${i}]`;
      walkAndExtract(obj[i], rest, childPath, result);
    }
  } else {
    const record = obj as Record<string, unknown>;
    if (segment! in record) {
      const childPath = currentPath ? `${currentPath}.${segment}` : segment!;
      walkAndExtract(record[segment!], rest, childPath, result);
    }
  }
}

/**
 * Extract all translatable string values from a spec based on field group config.
 */
export function extractTranslatableFields(
  spec: Record<string, unknown>,
  fieldGroups: TranslatableFieldGroup[]
): TranslationMap {
  const result: TranslationMap = {};

  for (const group of fieldGroups) {
    if (!group.enabled) continue;

    for (const pattern of group.fields) {
      const segments = parsePattern(pattern);
      walkAndExtract(spec, segments, "", result);
    }
  }

  return result;
}

/**
 * Inject translated strings back into a spec object.
 * The spec is mutated in place — pass a cloned copy.
 */
export function injectTranslations(
  spec: Record<string, unknown>,
  translations: TranslationMap
): void {
  for (const [path, value] of Object.entries(translations)) {
    setNestedValue(spec, path, value);
  }
}

/**
 * Set a value in a nested object using a dot-notation path with array indices.
 */
function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: string
): void {
  const parts = parsePath(path);
  let current: unknown = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (part === undefined) return;

    if (
      current === null ||
      current === undefined ||
      typeof current !== "object"
    ) {
      return;
    }

    if (typeof part === "number") {
      current = (current as unknown[])[part];
    } else {
      current = (current as Record<string, unknown>)[part];
    }
  }

  if (
    current === null ||
    current === undefined ||
    typeof current !== "object"
  ) {
    return;
  }

  const lastPart = parts[parts.length - 1];
  if (typeof lastPart === "number") {
    (current as unknown[])[lastPart] = value;
  } else if (lastPart !== undefined) {
    (current as Record<string, unknown>)[lastPart] = value;
  }
}

/**
 * Parse a fully-qualified path into segments.
 * "paths./planets.get.summary" → ["paths", "/planets", "get", "summary"]
 * "tags[0].description" → ["tags", 0, "description"]
 */
function parsePath(path: string): (string | number)[] {
  const result: (string | number)[] = [];
  let current = "";

  for (let i = 0; i < path.length; i++) {
    const char = path[i];

    if (char === "[") {
      if (current !== "") {
        result.push(current);
        current = "";
      }
      const end = path.indexOf("]", i);
      if (end === -1) break;
      const index = path.slice(i + 1, end);
      result.push(parseInt(index, 10));
      i = end;
      if (path[i + 1] === ".") i++;
    } else if (char === ".") {
      // Look ahead: if next char starts with /, it's part of a path key
      if (i + 1 < path.length && path[i + 1] === "/") {
        if (current !== "") {
          result.push(current);
          current = "";
        }
        let j = i + 1;
        while (j < path.length) {
          if (path[j] === "." && j + 1 < path.length && path[j + 1] !== "/") {
            break;
          }
          if (path[j] === "." && j + 1 >= path.length) {
            break;
          }
          if (path[j] === "[") {
            break;
          }
          if (path[j] === ".") {
            const rest = path.slice(j + 1);
            if (!rest.startsWith("/")) {
              break;
            }
          }
          current += path[j];
          j++;
        }
        result.push(current);
        current = "";
        i = j - 1;
      } else {
        if (current !== "") {
          result.push(current);
          current = "";
        }
      }
    } else {
      current += char;
    }
  }

  if (current !== "") {
    result.push(current);
  }

  return result;
}
