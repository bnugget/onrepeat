// Bundles every piece of config this app keeps in localStorage —
// mood/genre tags, eras, compare lists, include/exclude lists, tag
// filters — into one downloadable JSON file, and can restore all of
// it back in one go. This exists specifically so losing browser
// storage (wrong port, cleared site data, new machine) doesn't mean
// re-doing hours of tagging.

const KEYS = [
  "scrobble-mood-tags-v1",
  "scrobble-genre-tags-v1",
  "scrobble-eras-v1",
  "scrobble-excluded-artists-v1",
  "scrobble-included-artists-v1",
  "scrobble-included-albums-v1",
  "scrobble-excluded-albums-v1",
  "scrobble-genre-filter-v1",
  "scrobble-genre-exclude-v1",
  "scrobble-mood-filter-v1",
  "scrobble-mood-exclude-v1",
  "scrobble-era-filter-v1",
  "scrobble-era-exclude-v1"
];

/** How many of the known keys actually have data right now — used to
 *  show a meaningful count in the UI rather than a blind button. */
export function backupItemCount() {
  let n = 0;
  for (const key of KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) n++;
      else if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) n++;
    } catch {
      // ignore malformed entries for counting purposes
    }
  }
  return n;
}

export function exportAllData() {
  const bundle = { version: 1, exportedAt: new Date().toISOString(), data: {} };
  for (const key of KEYS) {
    const raw = localStorage.getItem(key);
    if (raw !== null) bundle.data[key] = raw;
  }
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `listening-dashboard-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Writes every key from the backup straight to localStorage. Caller
 *  is responsible for reloading the page afterward — React state was
 *  already initialized from the old (possibly empty) localStorage
 *  values, so a reload is the simplest reliable way to pick up the
 *  restored data everywhere at once. */
export function importAllData(jsonText) {
  const bundle = JSON.parse(jsonText);
  if (!bundle || typeof bundle.data !== "object" || Array.isArray(bundle.data)) {
    throw new Error("That doesn't look like a backup file from this app.");
  }
  let restored = 0;
  for (const key of KEYS) {
    if (bundle.data[key] !== undefined) {
      localStorage.setItem(key, bundle.data[key]);
      restored++;
    }
  }
  return restored;
}
