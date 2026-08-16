// Mood tags are entirely user-generated (you decide Avril Lavigne is
// "Sad" to you — there's no canonical source for this). They persist
// in localStorage since this is a single-user local app; export/import
// below exists so you don't lose them if browser storage gets cleared.

const STORAGE_KEY = "scrobble-mood-tags-v1";

export const MOOD_PRESETS = [
  { name: "Happy", color: "#F0E0A0" },
  { name: "Sad", color: "#A6D8F0" },
  { name: "Chill", color: "#A6E8D0" },
  { name: "Energetic", color: "#F4A6A6" },
  { name: "Nostalgic", color: "#C6B6F0" },
  { name: "Romantic", color: "#F4A6C6" },
  { name: "Angry", color: "#E88A8A" },
  { name: "Dark", color: "#9C7C93" },
  { name: "Hype", color: "#F5C6A0" }
];

export const UNTAGGED = "Untagged";
export const UNTAGGED_COLOR = "#EDE0E6";

const PRESET_NAMES = new Set(MOOD_PRESETS.map((m) => m.name));
const PRESET_COLOR = new Map(MOOD_PRESETS.map((m) => [m.name, m.color]));

// Deterministic color for a custom (non-preset) mood string, so it's
// stable across reloads without needing to store the color itself.
export function colorForMood(mood) {
  if (mood === UNTAGGED) return UNTAGGED_COLOR;
  if (PRESET_COLOR.has(mood)) return PRESET_COLOR.get(mood);
  let hash = 0;
  for (let i = 0; i < mood.length; i++) hash = (hash * 31 + mood.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return `hsl(${hue}, 55%, 78%)`;
}

export function loadMoodTags() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveMoodTags(tags) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tags));
  } catch {
    // localStorage unavailable (private browsing, quota) — tags just
    // won't persist across reloads. Not fatal for a demo.
  }
}

export function exportMoodTags(tags) {
  const blob = new Blob([JSON.stringify(tags, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mood-tags.json";
  a.click();
  URL.revokeObjectURL(url);
}

export function parseImportedTags(text) {
  const parsed = JSON.parse(text);
  if (typeof parsed !== "object" || Array.isArray(parsed) || parsed === null) {
    throw new Error("Expected a flat { artistName: mood } object.");
  }
  return parsed;
}
