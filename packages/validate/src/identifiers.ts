/**
 * Preserve and restore non-translatable identifiers ($ref, operationId, tag names).
 */

import type { VerificationResult } from "./result";
import { pass, fail, fixed } from "./result";

/**
 * Verify and optionally restore tag names from source to target.
 */
export function verifyTagNames(
  sourceSpec: Record<string, unknown>,
  targetSpec: Record<string, unknown>,
  locale: string,
  fixMode: boolean,
  result: VerificationResult
): boolean {
  const sourceTags = sourceSpec.tags as
    | Array<Record<string, string>>
    | undefined;
  const targetTags = targetSpec.tags as
    | Array<Record<string, string>>
    | undefined;

  if (!sourceTags || !targetTags) return false;

  let modified = false;
  let preserved = true;

  for (let i = 0; i < sourceTags.length; i++) {
    const srcTag = sourceTags[i];
    const tgtTag = targetTags[i];
    if (!srcTag || !tgtTag) continue;
    if (srcTag.name !== tgtTag.name) {
      preserved = false;
      if (fixMode) {
        tgtTag.name = srcTag.name!;
        modified = true;
        fixed(
          result,
          `Restored tag name "${srcTag.name}" in ${locale} (was "${tgtTag.name}")`
        );
      } else {
        fail(
          result,
          `Tag name changed: "${srcTag.name}" → "${tgtTag.name}" in ${locale}`
        );
      }
    }
  }

  if (preserved) {
    pass(result, `Tag names preserved (not translated)`);
  }

  return modified;
}

/**
 * Verify and optionally restore operationId values from source to target.
 */
export function verifyOperationIds(
  sourceSpec: Record<string, unknown>,
  targetSpec: Record<string, unknown>,
  locale: string,
  fixMode: boolean,
  result: VerificationResult
): boolean {
  const sourcePaths = sourceSpec.paths as Record<
    string,
    Record<string, Record<string, unknown>>
  >;
  const targetPaths = targetSpec.paths as Record<
    string,
    Record<string, Record<string, unknown>>
  >;

  if (!sourcePaths || !targetPaths) return false;

  let modified = false;
  let preserved = true;

  for (const [path, methods] of Object.entries(sourcePaths)) {
    for (const [method, op] of Object.entries(methods)) {
      if (typeof op !== "object" || !op) continue;
      const sourceOpId = op.operationId;
      const targetOp = targetPaths[path]?.[method];
      if (
        sourceOpId &&
        targetOp &&
        typeof targetOp === "object" &&
        "operationId" in targetOp
      ) {
        if (sourceOpId !== targetOp.operationId) {
          preserved = false;
          if (fixMode) {
            (targetOp as Record<string, unknown>).operationId = sourceOpId;
            modified = true;
            fixed(
              result,
              `Restored operationId "${sourceOpId}" at ${method.toUpperCase()} ${path} in ${locale}`
            );
          } else {
            fail(
              result,
              `operationId changed: "${sourceOpId}" → "${targetOp.operationId}" at ${method.toUpperCase()} ${path}`
            );
          }
        }
      }
    }
  }

  if (preserved) {
    pass(result, `operationId values preserved`);
  }

  return modified;
}

/**
 * Recursively check that all $ref values are identical between source and target.
 */
export function checkRefsPreserved(
  source: unknown,
  target: unknown,
  path = ""
): {
  allPreserved: boolean;
  count: number;
  broken: Array<{ path: string; source: string; target: string }>;
} {
  const result = {
    allPreserved: true,
    count: 0,
    broken: [] as Array<{ path: string; source: string; target: string }>,
  };

  if (
    source === null ||
    source === undefined ||
    typeof source !== "object" ||
    target === null ||
    target === undefined ||
    typeof target !== "object"
  ) {
    return result;
  }

  if (Array.isArray(source) && Array.isArray(target)) {
    for (let i = 0; i < source.length; i++) {
      const sub = checkRefsPreserved(source[i], target[i], `${path}[${i}]`);
      result.count += sub.count;
      result.broken.push(...sub.broken);
      if (!sub.allPreserved) result.allPreserved = false;
    }
  } else {
    const srcObj = source as Record<string, unknown>;
    const tgtObj = target as Record<string, unknown>;

    if ("$ref" in srcObj && "$ref" in tgtObj) {
      result.count++;
      if (srcObj["$ref"] !== tgtObj["$ref"]) {
        result.allPreserved = false;
        result.broken.push({
          path,
          source: String(srcObj["$ref"]),
          target: String(tgtObj["$ref"]),
        });
      }
    }

    for (const key of Object.keys(srcObj)) {
      const sub = checkRefsPreserved(
        srcObj[key],
        tgtObj[key],
        path ? `${path}.${key}` : key
      );
      result.count += sub.count;
      result.broken.push(...sub.broken);
      if (!sub.allPreserved) result.allPreserved = false;
    }
  }

  return result;
}

/**
 * Recursively restore $ref values from source to target.
 */
export function restoreRefs(source: unknown, target: unknown): void {
  if (
    source === null ||
    source === undefined ||
    typeof source !== "object" ||
    target === null ||
    target === undefined ||
    typeof target !== "object"
  )
    return;

  if (Array.isArray(source) && Array.isArray(target)) {
    for (let i = 0; i < source.length; i++) {
      restoreRefs(source[i], target[i]);
    }
  } else {
    const srcObj = source as Record<string, unknown>;
    const tgtObj = target as Record<string, unknown>;

    if ("$ref" in srcObj && "$ref" in tgtObj) {
      tgtObj["$ref"] = srcObj["$ref"];
    }

    for (const key of Object.keys(srcObj)) {
      restoreRefs(srcObj[key], tgtObj[key]);
    }
  }
}

/**
 * Verify $ref values and optionally restore them.
 */
export function verifyRefs(
  sourceSpec: Record<string, unknown>,
  targetSpec: Record<string, unknown>,
  locale: string,
  fixMode: boolean,
  vResult: VerificationResult
): boolean {
  const refCheck = checkRefsPreserved(sourceSpec, targetSpec);
  let modified = false;

  if (refCheck.allPreserved) {
    pass(vResult, `$ref values preserved (${refCheck.count} checked)`);
  } else {
    if (fixMode) {
      restoreRefs(sourceSpec, targetSpec);
      modified = true;
      for (const broken of refCheck.broken) {
        fixed(
          vResult,
          `Restored $ref "${broken.source}" in ${locale} (was "${broken.target}")`
        );
      }
    } else {
      for (const broken of refCheck.broken) {
        fail(vResult, `$ref changed: "${broken.source}" → "${broken.target}"`);
      }
    }
  }

  return modified;
}
