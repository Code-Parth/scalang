import { LingoDotDevEngine } from "lingo.dev/sdk";

let engineInstance: LingoDotDevEngine | null = null;

/**
 * Get or create the Lingo.dev translation engine.
 * Uses the provided API key or falls back to LINGODOTDEV_API_KEY env var.
 */
export function getEngine(apiKey?: string): LingoDotDevEngine {
  const key = apiKey ?? process.env.LINGODOTDEV_API_KEY;
  if (!key) {
    throw new Error(
      "LINGODOTDEV_API_KEY is required.\n" +
        "Get your API key at https://lingo.dev and add it to your .env file."
    );
  }

  // Return cached engine only if no explicit key provided (uses env)
  if (!apiKey && engineInstance) return engineInstance;

  const engine = new LingoDotDevEngine({ apiKey: key });
  if (!apiKey) engineInstance = engine;
  return engine;
}

/**
 * Translate a map of key-value strings from one locale to another.
 * Processes in batches to avoid overwhelming the API.
 */
export async function translateMap(
  translations: Record<string, string>,
  sourceLocale: string,
  targetLocale: string,
  batchSize: number = 50
): Promise<Record<string, string>> {
  const engine = getEngine();
  const entries = Object.entries(translations);
  const result: Record<string, string> = {};

  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    const batchObj: Record<string, string> = {};

    for (const [key, value] of batch) {
      batchObj[key] = value;
    }

    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(entries.length / batchSize);
    console.log(
      `  [batch] Translating batch ${batchNum}/${totalBatches} (${batch.length} strings)...`
    );

    const translated = await engine.localizeObject(batchObj, {
      sourceLocale,
      targetLocale,
    });

    for (const [key, value] of Object.entries(translated)) {
      if (typeof value === "string") {
        result[key] = value;
      }
    }
  }

  return result;
}

/**
 * Translate a single text string from one locale to another.
 */
export async function translateText(
  text: string,
  sourceLocale: string,
  targetLocale: string
): Promise<string> {
  const engine = getEngine();
  const translated = await engine.localizeObject(
    { text },
    { sourceLocale, targetLocale }
  );
  return (translated as Record<string, string>).text ?? text;
}

/**
 * Validate that an API key is working by making a test translation call.
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const engine = new LingoDotDevEngine({ apiKey });
    await engine.localizeObject(
      { test: "hello" },
      { sourceLocale: "en", targetLocale: "fr" }
    );
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("401") || msg.toLowerCase().includes("unauthorized")) {
      return false;
    }
    return false;
  }
}
