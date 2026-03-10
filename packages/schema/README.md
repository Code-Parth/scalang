# @scalang/schema

Configuration schema and types for Scalang CLI — template generation, verification, and localization.

## Installation

```bash
bun add @scalang/schema
# or
npm install @scalang/schema
```

## Usage

### TypeScript types

```ts
import type { ScalangConfig, TranslatableFieldGroup } from "@scalang/schema";
```

### Validation

```ts
import { validateConfig, assertValidConfig } from "@scalang/schema";

const result = validateConfig(config);
if (result.valid) {
  console.log(result.data);
} else {
  console.error(result.errors);
}

// Or throw on invalid
assertValidConfig(config);
```

### Constants

```ts
import {
  SUPPORTED_LOCALES,
  LINGO_LOCALE_CODES_SHORT,
  LINGO_LOCALE_CODES_FULL,
  SCALAR_THEMES,
  SCALAR_LAYOUTS,
  SCALAR_DOCUMENT_DOWNLOAD_TYPES,
  SCALAR_OPERATION_TITLE_SOURCES,
  SCALAR_SHOW_DEVELOPER_TOOLS,
  DEFAULT_TRANSLATABLE_FIELDS,
  DEFAULT_LINGO_CONFIG,
} from "@scalang/schema";
```

### Scalar types

```ts
import type {
  ApiReferenceConfiguration,
  ApiReferenceConfigurationWithSource,
  ApiReferenceConfigurationWithMultipleSources,
  AnyApiReferenceConfiguration,
} from "@scalang/schema";
```

### Lingo.dev compatibility

Locale fields (`sourceLocale`, `targetLocales`, `defaultLocale`) use BCP 47 format and are validated via `@lingo.dev/_locales`. The schema aligns with `@lingo.dev/_spec`:

- **Locale codes**: Use `LINGO_LOCALE_CODES_SHORT` or `LINGO_LOCALE_CODES_FULL` from `@lingo.dev/_spec`
- **Validation**: `validateConfig` uses `isValidLocale` from `@lingo.dev/_locales`
- **LingoLocaleConfig**: Maps to `localeSchema` (`source` + `targets`) for interoperability

```ts
import {
  LINGO_LOCALE_CODES_SHORT,
  LINGO_LOCALE_CODES_FULL,
  SUPPORTED_LOCALES,
} from "@scalang/schema";
import type {
  LocaleCode,
  LocaleCodeShort,
  LingoLocaleConfig,
} from "@scalang/schema";
```

## Schema reference

To enable editor intellisense and validation for your config file, add `$schema`:

**Hosted (when deployed):**

```json
{
  "$schema": "https://scalang.codeparth.dev/api/schema",
  "source": "./specs/openapi.json",
  "sourceLocale": "en",
  "targetLocales": ["fr", "de"],
  "defaultLocale": "en",
  "translatableFields": [
    { "name": "info", "enabled": true, "fields": ["info.title"] }
  ]
}
```

**Local package:**

```json
"$schema": "./node_modules/@scalang/schema/schema.json"
```

**Programmatic:**

```ts
import { schema } from "@scalang/schema";
```

## Testing

```bash
bun test  # from repo root, runs all tests including API tests
```

API tests hit `https://scalang.codeparth.dev` by default. To run against localhost:

```bash
SCALANG_API_URL=http://localhost:3000 bun test
```
