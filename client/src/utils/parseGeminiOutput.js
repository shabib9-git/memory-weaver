/**
 * parseGeminiOutput.js — Parses structured fields from Gemini's outputXXX text.
 *
 * Gemini photo analysis uses a fixed format:
 *   DESCRIPTION: <text>
 *   MOOD: <text>
 *   LOCATION: <text>
 *   KEY ELEMENTS: ...
 *   MEMORY TITLE: <text>
 */

/**
 * Extracts a single-line field value from Gemini output text.
 * @param {string} text
 * @param {string} field  - e.g. "MOOD"
 * @returns {string|null}
 */
export function extractField(text, field) {
  if (!text) return null;
  const match = text.match(new RegExp(`${field}:\\s*(.+)`, 'i'));
  return match ? match[1].trim() : null;
}

/**
 * Returns a normalised, title-cased mood string or null.
 * Strips trailing punctuation and trims to the first clause.
 */
export function extractMood(text) {
  const raw = extractField(text, 'MOOD');
  if (!raw) return null;
  // Take only the first comma-separated value for brevity
  const first = raw.split(/[,;]/)[0].trim();
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

/**
 * Returns a location string or null. Ignores "Unknown" / "unclear".
 */
export function extractLocation(text) {
  const raw = extractField(text, 'LOCATION');
  if (!raw) return null;
  if (/unknown|unclear|not (visible|determinable)/i.test(raw)) return null;
  return raw.trim();
}

/**
 * Extracts memory title from outputXXX.
 */
export function extractMemoryTitle(text) {
  return extractField(text, 'MEMORY TITLE');
}
