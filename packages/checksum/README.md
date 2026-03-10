# @scalang/checksum

Checksum-based caching and generation state management for [Scalang](https://github.com/Code-Parth/scalang).

Provides SHA-256 checksums for files and content, tracks generation state to enable smart skipping of unchanged specs, and manages retranslation caches.

## Installation

```bash
npm install @scalang/checksum
```

## Usage

### Compute Checksums

```ts
import { contentChecksum, fileChecksum } from "@scalang/checksum";

const hash = contentChecksum("some content");
// "a1b2c3d4..."

const fileHash = fileChecksum("./openapi.json");
// "e5f6a7b8..." or "" if file doesn't exist
```

### Smart Generation Skipping

```ts
import {
  fileChecksum,
  loadState,
  canSkipGeneration,
  saveState,
} from "@scalang/checksum";

const sourceChecksum = fileChecksum("./openapi.json");
const configChecksum = fileChecksum("./.scalang-config");
const previousState = loadState("./public/specs");

const canSkip = canSkipGeneration(
  sourceChecksum,
  configChecksum,
  ["en", "fr", "de"],
  previousState,
  true, // allSpecsExist
);

if (!canSkip) {
  // Run generation...

  saveState("./public/specs", {
    sourceChecksum,
    configChecksum,
    locales: ["en", "fr", "de"],
    fieldCount: 42,
    generatedAt: new Date().toISOString(),
  });
}
```

### Locale Checksums

```ts
import { computeLocaleChecksums } from "@scalang/checksum";

const checksums = computeLocaleChecksums("./public/specs", ["en", "fr", "de"]);
// { en: "a1b2...", fr: "c3d4...", de: "e5f6..." }
```

### Retranslation Cache

```ts
import {
  loadRetranslateCache,
  saveRetranslateCache,
} from "@scalang/checksum";

const cache = loadRetranslateCache("./public/specs");
// { "fr": ["info.title", "info.description"], ... }

cache["fr"].push("paths./pets.get.summary");
saveRetranslateCache("./public/specs", cache);
```

## API

### `contentChecksum(content: string): string`

Computes a SHA-256 hash. Normalizes JSON content for stable hashing across formatting changes.

### `fileChecksum(filePath: string): string`

Computes a SHA-256 hash of a file's content. Returns `""` if the file doesn't exist.

### `deepSortKeys(obj: unknown): unknown`

Recursively sorts object keys for stable JSON serialization.

### `computeLocaleChecksums(outputDir, locales): Record<string, string>`

Computes checksums for all locale spec files in the output directory.

### `loadState(outputDir): GenerationState | null`

Loads `.generation-state.json` from the output directory. Returns `null` if missing or corrupted.

### `saveState(outputDir, state): void`

Saves generation state to `.generation-state.json`.

### `canSkipGeneration(sourceChecksum, configChecksum, locales, previousState, allSpecsExist): boolean`

Returns `true` if all checksums match the previous state and all spec files exist.

### `loadRetranslateCache(outputDir): RetranslateCache`

Loads `.retranslate-cache.json` — maps locale codes to arrays of field paths confirmed identical to source.

### `saveRetranslateCache(outputDir, cache): void`

Saves the retranslation cache.

## License

MIT
