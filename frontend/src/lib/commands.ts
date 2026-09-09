/** Deterministic voice command resolver (Pass 3).
 *
 * Matching is case- and punctuation-insensitive and runs BEFORE any future
 * AI routing. Only exact normalized phrases match; bare "start" opens the
 * lesson from Home but never advances the lesson.
 */

export type HomeCommand = "start-lesson";
export type LessonCommand = "next" | "back" | "repeat" | "start-quiz";

export function normalizeCommand(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .replace(/'(s|m|re|ll|ve|d)\b/g, "")
    .replace(/'/g, "")
    .trim();
}

const HOME_START_PHRASES = new Set([
  "start lesson",
  "start the lesson",
  "start",
  "begin lesson",
  "start learning",
  "open lesson",
  "lets learn",
  "learn",
  "multiplication and division",
  "multiplication",
  "division",
]);

const LESSON_NEXT_PHRASES = new Set([
  "next",
  "continue",
  "go",
  "next scene",
  "go next",
  "go on",
  "move on",
  "go forward",
]);

const LESSON_BACK_PHRASES = new Set([
  "back",
  "go back",
  "previous",
  "go previous",
  "go backward",
  "go backwards",
]);

const LESSON_REPEAT_PHRASES = new Set([
  "repeat",
  "repeat that",
  "repeat please",
  "say again",
  "say it again",
  "what was that",
  "one more time",
]);

const LESSON_QUIZ_PHRASES = new Set(["start quiz", "quiz me", "begin quiz"]);

export function resolveHomeCommand(raw: string): HomeCommand | null {
  if (HOME_START_PHRASES.has(normalizeCommand(raw))) {
    return "start-lesson";
  }
  return null;
}

export function resolveLessonCommand(
  raw: string,
  isLastScene: boolean,
): LessonCommand | null {
  const text = normalizeCommand(raw);
  if (LESSON_NEXT_PHRASES.has(text)) {
    return "next";
  }
  if (LESSON_BACK_PHRASES.has(text)) {
    return "back";
  }
  if (LESSON_REPEAT_PHRASES.has(text)) {
    return "repeat";
  }
  // Quiz commands are only recognized on the final scene.
  if (isLastScene && LESSON_QUIZ_PHRASES.has(text)) {
    return "start-quiz";
  }
  return null;
}
