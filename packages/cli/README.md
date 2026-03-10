# @scalang/cli

CLI for generating multilingual OpenAPI specs and Scalar API reference sites with [Scalang](https://github.com/Code-Parth/scalang).

## Installation

```bash
npm install -g @scalang/cli
```

Or use directly with `npx` / `bunx`:

```bash
npx @scalang/cli create
```

## Commands

### `create`

Scaffolds a new Scalang project with interactive prompts.

```bash
scalang create
```

Prompts for:
- Project name
- Source OpenAPI spec (file path or URL)
- Source locale
- Target locales
- Lingo.dev API key

Generates:
- `.scalang-config` configuration file
- Copies the source spec into the project
- Initializes a Next.js app from the Scalang template

### `generate`

Translates the source spec into all configured locales.

```bash
scalang generate
```

Options:
| Flag | Description |
|------|-------------|
| `--force` | Skip checksum cache and regenerate all specs |
| `--retranslate` | Re-translate fields detected as identical to source |

Features:
- **Smart caching** — Skips generation when source spec and config haven't changed
- **Retranslation detection** — Identifies translated values that are identical to the source (e.g., proper nouns) and optionally re-translates them
- **Progress logging** — Shows per-locale translation progress with field counts

### `verify`

Validates translated specs for completeness and correctness.

```bash
scalang verify
```

Checks:
- Structural integrity against source spec
- Tag names preserved (not translated)
- Operation IDs preserved
- `$ref` paths preserved
- English content detection in non-English specs

## Configuration

The CLI reads from `.scalang-config` (JSON) in the project root:

```json
{
  "spec": "./petstore.json",
  "sourceLocale": "en",
  "locales": ["fr", "de", "ja"],
  "outputDir": "./public/specs",
  "scalarConfig": {
    "theme": "default",
    "layout": "modern"
  },
  "lingoConfig": {
    "batchSize": 50
  },
  "translatableFields": [
    {
      "name": "info",
      "enabled": true,
      "fields": ["info.title", "info.description"]
    },
    {
      "name": "operations",
      "enabled": true,
      "fields": ["paths.*.*.summary", "paths.*.*.description"]
    }
  ]
}
```

See [`@scalang/schema`](https://www.npmjs.com/package/@scalang/schema) for the full configuration schema.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `LINGODOTDEV_API_KEY` | API key for the Lingo.dev translation service |

## License

MIT
