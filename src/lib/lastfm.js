// Last.fm's artist.getTopTags is a plain GET, no auth beyond the key,
// and Last.fm supports CORS — so this runs directly from the browser,
// no backend needed. https://www.last.fm/api/show/artist.getTopTags

const GENRE_KEYWORD_MAP = [
  [/hip.?hop|rap|trap/i, "Hip Hop"],
  [/r&b|rnb|\bsoul\b|neo soul/i, "R&B"],
  [/indie.*rock|rock.*indie/i, "Indie Rock"],
  [/edm|electronic|house|techno|\bdance\b|dubstep|drum and bass|garage|trance/i, "Electronic / EDM"],
  [/alternative/i, "Alternative"],
  [/folk|acoustic|singer.?songwriter/i, "Folk / Acoustic"],
  [/jazz/i, "Jazz"],
  [/metal/i, "Metal"],
  [/classical|orchestra/i, "Classical"],
  [/country/i, "Country"],
  [/\brock\b/i, "Rock"],
  [/\bpop\b/i, "Pop"]
];

/** Map a raw crowd-sourced Last.fm tag to one of our genre presets, or
 *  fall back to the raw tag itself (title-cased) as a custom genre. */
export function mapTagToGenre(rawTag) {
  if (!rawTag) return null;
  for (const [re, genre] of GENRE_KEYWORD_MAP) {
    if (re.test(rawTag)) return genre;
  }
  return rawTag.replace(/\b\w/g, (c) => c.toUpperCase());
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Fetch the single top tag for one artist. Throws with `.code` set
 *  to Last.fm's numeric error code (29 = rate limited) on failure. */
export async function fetchTopTag(artistName, apiKey) {
  const url = `https://ws.audioscrobbler.com/2.0/?method=artist.gettoptags&artist=${encodeURIComponent(artistName)}&api_key=${encodeURIComponent(apiKey)}&format=json`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) {
    const err = new Error(data.message || "Last.fm error");
    err.code = data.error;
    throw err;
  }
  const tags = data.toptags?.tag;
  if (!tags) return null;
  const first = Array.isArray(tags) ? tags[0] : tags; // Last.fm doesn't array-wrap a single tag
  return first?.name || null;
}

/**
 * Async generator: walks artistNames one at a time at roughly
 * `rateMs` between requests, yielding a result for each. On a
 * rate-limit error (code 29) it backs off and retries that one
 * artist once before giving up and moving on.
 */
export async function* fetchGenresBatch(artistNames, apiKey, { rateMs = 67, shouldStop } = {}) {
  let backoff = rateMs;
  for (const name of artistNames) {
    if (shouldStop && shouldStop()) return;

    try {
      const rawTag = await fetchTopTag(name, apiKey);
      const reason = rawTag ? null : "Last.fm returned no tags for this artist name";
      yield { name, genre: mapTagToGenre(rawTag), rawTag, error: null, reason };
      backoff = rateMs;
    } catch (err) {
      if (err.code === 29) {
        backoff = Math.min(backoff * 2, 4000);
        await sleep(backoff);
        try {
          const rawTag = await fetchTopTag(name, apiKey);
          const reason = rawTag ? null : "Last.fm returned no tags for this artist name";
          yield { name, genre: mapTagToGenre(rawTag), rawTag, error: null, reason };
        } catch (err2) {
          yield { name, genre: null, rawTag: null, error: err2.message || "failed", reason: `API error: ${err2.message || "failed"}` };
        }
      } else {
        yield { name, genre: null, rawTag: null, error: err.message || "failed", reason: `API error: ${err.message || "failed"}` };
      }
    }

    await sleep(backoff);
  }
}

/**
 * Drives fetchGenresBatch, flushing tagged results in chunks (so the
 * caller isn't doing a state update + localStorage write per artist)
 * and reporting progress as it goes.
 */
export async function runGenreFetch(artistNames, apiKey, { rateMs = 67, batchSize = 15, onBatch, onProgress, shouldStop } = {}) {
  let buffer = {};
  let processed = 0;
  let tagged = 0;
  let skipped = 0;
  const skippedDetails = [];

  for await (const result of fetchGenresBatch(artistNames, apiKey, { rateMs, shouldStop })) {
    processed++;
    if (result.genre) {
      buffer[result.name] = result.genre;
      tagged++;
    } else {
      skipped++;
      skippedDetails.push({ name: result.name, reason: result.reason || "Unknown" });
    }
    if (processed % batchSize === 0) {
      onBatch?.({ ...buffer });
      buffer = {};
    }
    onProgress?.({ processed, total: artistNames.length, tagged, skipped, currentName: result.name, skippedDetails: [...skippedDetails] });
    if (shouldStop && shouldStop()) break;
  }
  if (Object.keys(buffer).length > 0) onBatch?.({ ...buffer });
}
