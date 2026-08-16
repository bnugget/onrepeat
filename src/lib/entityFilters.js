// Generic localStorage-backed list store, used for all the new
// include/exclude and tag-filter lists below so we're not
// hand-rolling load/save boilerplate five times over.
function makeListStore(storageKey) {
  return {
    load() {
      try {
        const raw = localStorage.getItem(storageKey);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    },
    save(list) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(list));
      } catch {
        // not fatal
      }
    }
  };
}

export const includedArtistsStore = makeListStore("scrobble-included-artists-v1");
export const includedAlbumsStore = makeListStore("scrobble-included-albums-v1");
export const excludedAlbumsStore = makeListStore("scrobble-excluded-albums-v1");
// "Filter" stores below are reused as the INCLUDE half of genre/mood/era
// include+exclude filtering — same storage keys as before so existing
// selections carry over, just with an EXCLUDE counterpart added.
export const genreFilterStore = makeListStore("scrobble-genre-filter-v1");
export const moodFilterStore = makeListStore("scrobble-mood-filter-v1");
export const eraFilterStore = makeListStore("scrobble-era-filter-v1");
export const genreExcludeStore = makeListStore("scrobble-genre-exclude-v1");
export const moodExcludeStore = makeListStore("scrobble-mood-exclude-v1");
export const eraExcludeStore = makeListStore("scrobble-era-exclude-v1");

/** Stable string key for an album entity, used for persistence and
 *  as the include/exclude list identifier. */
export function albumKey(artistName, albumName) {
  return `${artistName} — ${albumName}`;
}
