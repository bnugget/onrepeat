// Artists to fully exclude from aggregation everywhere (charts,
// timeline, calendar, on-repeat, and the AI insight) — not just
// hidden from one chart. Persisted locally like everything else here.

const STORAGE_KEY = "scrobble-excluded-artists-v1";

export function loadExcludedArtists() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveExcludedArtists(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // not fatal
  }
}
