# @scalang/validate

OpenAPI spec verification for [Scalang](https://github.com/Code-Parth/scalang).

Verifies translated specs for completeness, structural integrity, and translation quality. Detects untranslated content by English-language scoring and validates key identifiers like `operationId`, tag names, and `$ref` paths are preserved.

## Installation

```bash
npm install @scalang/validate
```

## Usage

### Verify All Specs

```ts
import { verifySpecs } from "@scalang/validate";

const result = await verifySpecs("./public/specs", {
  sourceLocale: "en",
  locales: ["en", "fr", "de"],
  translatableFieldGroups: fieldGroups,
});

if (result.valid) {
  console.log("All specs verified");
} else {
  for (const issue of result.issues) {
    console.warn(
      `[${issue.locale}] ${issue.field}: ${issue.type} — ${issue.message}`
    );
  }
}
```

### Check Individual Aspects

```ts
import {
  detectEnglishScore,
  verifyTagNames,
  verifyOperationIds,
  verifyRefs,
} from "@scalang/validate";

// Detect untranslated content (0 = no English, 1 = all English)
const score = detectEnglishScore("Bonjour le monde");
// ~0.0

// Verify tag names match across locales
const tagIssues = verifyTagNames(sourceSpec, translatedSpec, "fr");

// Verify operationIds are preserved
const opIdIssues = verifyOperationIds(sourceSpec, translatedSpec, "fr");

// Verify $ref paths are preserved
const refIssues = verifyRefs(sourceSpec, translatedSpec, "fr");
```

## Verification Pipeline

`verifySpecs` runs a comprehensive pipeline:

1. **Structure Check** — Ensures translated spec has same structure as source
2. **Tag Name Verification** — Tag names must not be translated
3. **OperationId Verification** — Operation IDs must be preserved
4. **$ref Verification** — JSON references must not be translated
5. **English Detection** — Flags fields with high English scores in non-English locales
6. **Ref Restoration** — Optionally restores broken `$ref` paths

## API

### `verifySpecs(outputDir, options): Promise<VerificationResult>`

Full verification pipeline. Returns `{ valid: boolean, issues: VerificationIssue[] }`.

### `detectEnglishScore(text: string): number`

Returns 0–1 score indicating how likely text is English. Uses common English word frequency analysis.

### `verifyTagNames(source, translated, locale): VerificationIssue[]`

Checks that tag names are unchanged between source and translated specs.

### `verifyOperationIds(source, translated, locale): VerificationIssue[]`

Checks that `operationId` values are preserved.

### `verifyRefs(source, translated, locale): VerificationIssue[]`

Checks that `$ref` paths are unchanged.

### `restoreRefs(source, translated): void`

Restores `$ref` values from source spec into translated spec (mutates in place).

## Issue Types

| Type                     | Description                                   |
| ------------------------ | --------------------------------------------- |
| `untranslated`           | Field still contains English text             |
| `missing-field`          | Field exists in source but not in translation |
| `tag-translated`         | Tag name was incorrectly translated           |
| `operationId-translated` | Operation ID was incorrectly translated       |
| `ref-translated`         | `$ref` path was incorrectly translated        |

## License

MIT
