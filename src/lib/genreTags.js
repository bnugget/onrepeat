// Same pattern as moodTags.js: self-classified, localStorage-persisted.
// We'd originally floated pulling genres from Last.fm's tag API, but
// that needs a backend/API key and a cleanup pass on messy folksonomy
// tags — self-tagging is faster to ship and, for a personal library,
// probably more accurate than crowd tags anyway. Same mechanism as
// mood, different preset list.

const STORAGE_KEY = "scrobble-genre-tags-v1";

export const GENRE_PRESETS = [
  { name: "Hip Hop", color: "#E88AA8" },
  { name: "R&B", color: "#F4A6C6" },
  { name: "Pop", color: "#A6D8F0" },
  { name: "Indie Rock", color: "#A6E8D0" },
  { name: "Alternative", color: "#A0E0C6" },
  { name: "Electronic / EDM", color: "#C6B6F0" },
  { name: "Rock", color: "#F4A6A6" },
  { name: "Folk / Acoustic", color: "#F5C6A0" },
  { name: "Jazz", color: "#B6C6F0" },
  { name: "Metal", color: "#9C7C93" },
  { name: "Classical", color: "#E8DCC0" },
  { name: "Country", color: "#F0E0A0" }
];

export const UNTAGGED_GENRE = "Untagged";
export const UNTAGGED_GENRE_COLOR = "#EDE0E6";

const PRESET_COLOR = new Map(GENRE_PRESETS.map((g) => [g.name, g.color]));

export function colorForGenre(genre) {
  if (genre === UNTAGGED_GENRE) return UNTAGGED_GENRE_COLOR;
  if (PRESET_COLOR.has(genre)) return PRESET_COLOR.get(genre);
  let hash = 0;
  for (let i = 0; i < genre.length; i++) hash = (hash * 31 + genre.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return `hsl(${hue}, 50%, 78%)`;
}

export function loadGenreTags() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveGenreTags(tags) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tags));
  } catch {
    // not fatal — just won't persist
  }
}

export function exportGenreTags(tags) {
  const blob = new Blob([JSON.stringify(tags, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "genre-tags.json";
  a.click();
  URL.revokeObjectURL(url);
}

export function parseImportedGenreTags(text) {
  const parsed = JSON.parse(text);
  if (typeof parsed !== "object" || Array.isArray(parsed) || parsed === null) {
    throw new Error("Expected a flat { artistName: genre } object.");
  }
  return parsed;
}
