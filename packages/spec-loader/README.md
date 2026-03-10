# @scalang/spec-loader

OpenAPI spec parser, field extractor, and translation injector for [Scalang](https://github.com/Code-Parth/scalang).

Loads OpenAPI specs from files or URLs, extracts translatable fields using configurable path patterns, and injects translations back into cloned specs.

## Installation

```bash
npm install @scalang/spec-loader
```

## Usage

### Load a Spec

```ts
import { loadSpec } from "@scalang/spec-loader";

// From a local file
const { spec, raw, format } = await loadSpec("./openapi.json");

// From a URL
const result = await loadSpec("https://api.example.com/openapi.json");
```

### Extract Translatable Fields

```ts
import { extractTranslatableFields } from "@scalang/spec-loader";

const fieldGroups = [
  { name: "info", enabled: true, fields: ["info.title", "info.description"] },
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
];

const translations = extractTranslatableFields(spec, fieldGroups);
// { "info.title": "My API", "paths./pets.get.summary": "List pets", ... }
```

### Inject Translations

```ts
import { cloneSpec, injectTranslations } from "@scalang/spec-loader";

const translatedSpec = cloneSpec(spec);
injectTranslations(translatedSpec, {
  "info.title": "Mon API",
  "paths./pets.get.summary": "Lister les animaux",
});
```

### Write Spec to File

```ts
import { writeSpec } from "@scalang/spec-loader";

writeSpec("./output/fr.json", translatedSpec, "json");
writeSpec("./output/fr.yaml", translatedSpec, "yaml");
```

### Utilities

```ts
import {
  isSpecUrl,
  getSpecFormat,
  parseSpecContent,
} from "@scalang/spec-loader";

isSpecUrl("https://example.com/spec.json"); // true
isSpecUrl("./spec.json"); // false

getSpecFormat("spec.yaml"); // "yaml"
getSpecFormat("spec.json"); // "json"

const parsed = parseSpecContent(rawString); // auto-detects JSON or YAML
```

## Field Path Patterns

The field extractor supports flexible path patterns:

| Pattern                                         | Matches                      |
| ----------------------------------------------- | ---------------------------- |
| `info.title`                                    | Exact path                   |
| `paths.*.*.summary`                             | Wildcard object keys         |
| `tags[*].description`                           | Array element iteration      |
| `paths./pets.get.summary`                       | Literal path keys (with `/`) |
| `components.schemas.*.properties.*.description` | Nested wildcards             |

## API

### `loadSpec(source: string): Promise<LoadSpecResult>`

Loads and validates an OpenAPI spec from a file path or URL.

### `extractTranslatableFields(spec, fieldGroups): TranslationMap`

Extracts translatable strings from a spec based on configured field groups. Returns a `Record<string, string>` mapping fully qualified paths to values.

### `injectTranslations(spec, translations): void`

Injects translated strings back into a spec object (mutates in place).

### `cloneSpec(spec): Record<string, unknown>`

Deep clones a spec via JSON serialization.

### `writeSpec(outputPath, spec, format): void`

Writes a spec to a file in JSON or YAML format, creating directories as needed.

## License

MIT
