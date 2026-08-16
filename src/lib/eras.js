// Eras are user-drawn time ranges ("Breakup", "Feeling good", "Toronto")
// pinned onto the listening timeline. Same idea as mood tags — entirely
// self-classified, no source of truth but you — persisted locally.

const STORAGE_KEY = "scrobble-eras-v1";

export const ERA_PALETTE = [
  "#F4A6C6", "#A6D8F0", "#C6B6F0", "#A6E8D0",
  "#F5C6A0", "#E88AA8", "#B6C6F0", "#F0E0A0"
];

export function loadEras() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveEras(eras) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(eras));
  } catch {
    // storage unavailable — not fatal, just won't persist
  }
}

export function newEra(label, startISO, endISO, color) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label,
    startISO,
    endISO,
    color
  };
}
