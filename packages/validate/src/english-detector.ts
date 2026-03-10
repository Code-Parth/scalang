/**
 * Common English stop words used to detect untranslated content.
 * Only checks high-frequency English words to reduce false positives.
 */
const ENGLISH_MARKERS = new Set([
  "the",
  "is",
  "are",
  "was",
  "were",
  "have",
  "has",
  "been",
  "will",
  "would",
  "could",
  "should",
  "this",
  "that",
  "with",
  "from",
  "your",
  "you",
  "they",
  "their",
  "which",
  "about",
  "into",
  "through",
  "before",
  "after",
  "between",
  "does",
  "didn",
  "doesn",
  "here",
  "there",
  "where",
  "when",
  "what",
  "whether",
  "because",
  "however",
  "another",
  "those",
  "these",
  "other",
  "each",
  "every",
  "already",
]);

/**
 * Detect likely untranslated English text in a string.
 * Returns a score (0–1) representing how "English" the text appears.
 * Strips code blocks, URLs, and identifiers before analysis.
 */
export function detectEnglishScore(text: string): {
  score: number;
  englishWords: string[];
  totalWords: number;
} {
  const cleaned = text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "")
    .replace(/https?:\/\/[^\s)]+/g, "")
    .replace(/#\/[^\s)]+/g, "")
    .replace(/\|[^|]*\|/g, "")
    .replace(/[<>[\](){}]/g, " ");

  const words = cleaned
    .toLowerCase()
    .split(/[\s/.,;:!?'"_-]+/)
    .filter((w) => w.length >= 3 && /^[a-z]+$/.test(w));

  if (words.length === 0) return { score: 0, englishWords: [], totalWords: 0 };

  const englishWords = words.filter((w) => ENGLISH_MARKERS.has(w));
  const score = englishWords.length / words.length;

  return {
    score,
    englishWords: [...new Set(englishWords)],
    totalWords: words.length,
  };
}
