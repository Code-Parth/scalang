# @scalang/lingo

[Lingo.dev](https://lingo.dev) translation engine wrapper for [Scalang](https://github.com/Code-Parth/scalang).

Provides batch translation of key-value maps, single string translation, and API key validation using the Lingo.dev SDK.

## Installation

```bash
npm install @scalang/lingo
```

## Usage

### Translate a Map of Strings

```ts
import { translateMap } from "@scalang/lingo";

const translations = {
  "info.title": "Pet Store API",
  "info.description": "A sample API for managing pets",
  "paths./pets.get.summary": "List all pets",
};

const translated = await translateMap(translations, "en", "fr");
// {
//   "info.title": "API de la boutique pour animaux",
//   "info.description": "Un exemple d'API pour gérer les animaux",
//   "paths./pets.get.summary": "Lister tous les animaux"
// }
```

### Translate a Single String

```ts
import { translateText } from "@scalang/lingo";

const text = await translateText("Hello world", "en", "fr");
// "Bonjour le monde"
```

### Validate API Key

```ts
import { validateApiKey } from "@scalang/lingo";

const isValid = await validateApiKey("your-api-key");
```

### Batch Size Control

```ts
const translated = await translateMap(translations, "en", "fr", 100);
// Processes in batches of 100 key-value pairs
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `LINGODOTDEV_API_KEY` | API key for the Lingo.dev translation service |

The API key can also be passed directly to `getEngine(apiKey)`.

## API

### `translateMap(translations, sourceLocale, targetLocale, batchSize?): Promise<Record<string, string>>`

Translates a key-value map in batches. Default batch size is 50. Logs progress for each batch.

### `translateText(text, sourceLocale, targetLocale): Promise<string>`

Translates a single text string.

### `getEngine(apiKey?): LingoDotDevEngine`

Gets or creates a Lingo.dev SDK engine instance. Uses the provided API key or falls back to `LINGODOTDEV_API_KEY` env var.

### `validateApiKey(apiKey): Promise<boolean>`

Tests if an API key is valid by performing a test translation.

## License

MIT
