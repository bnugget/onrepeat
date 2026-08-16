/** Whether event i counts as a "real" listen — always true for
 *  Last.fm-derived data (no ms_played field at all, so nothing to
 *  threshold against), threshold-checked for Spotify-derived data. */
function isCounted(data, i) {
  if (!data.eventMsPlayed) return true;
  const threshold = data.countPlayThresholdMs || 30000;
  return data.eventMsPlayed[i] >= threshold;
}

/** Top tracks for one specific artist, ranked by real listens (or
 *  minutes listened, if `by: "minutes"`), within [fromInt, toInt].
 *  Skips are excluded when ms_played data exists. `artistIdx` should
 *  be resolved by the caller. */
export function topTracksForArtist(data, artistIdx, fromInt, toInt, limit = 500, by = "count") {
  const { eventDate, eventArtistIdx, eventSongIdx, songTrackName, eventMsPlayed } = data;
  const useMinutes = by === "minutes" && !!eventMsPlayed;
  const totals = new Map();
  for (let i = 0; i < eventDate.length; i++) {
    if (eventArtistIdx[i] !== artistIdx) continue;
    const d = eventDate[i];
    if (d < fromInt || d > toInt) continue;
    if (!isCounted(data, i)) continue;
    const si = eventSongIdx[i];
    const inc = useMinutes ? eventMsPlayed[i] / 60000 : 1;
    totals.set(si, (totals.get(si) || 0) + inc);
  }
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([idx, count]) => ({ songIdx: idx, track: songTrackName[idx], count: useMinutes ? Math.round(count) : count }));
}

/** Skip rate for a specific song: needs to see BOTH skips and real
 *  listens, so this deliberately does not apply the counted-play
 *  threshold like topTracksForArtist does — that's the whole point.
 *  Returns null if there's no ms_played data at all (Last.fm-derived
 *  datasets have nothing to compute this from). */
export function skipRateForSong(data, songIdx, fromInt, toInt) {
  if (!data.eventMsPlayed) return null;
  const { eventDate, eventSongIdx } = data;
  const threshold = data.countPlayThresholdMs || 30000;
  let total = 0;
  let skipped = 0;
  for (let i = 0; i < eventDate.length; i++) {
    if (eventSongIdx[i] !== songIdx) continue;
    const d = eventDate[i];
    if (d < fromInt || d > toInt) continue;
    total++;
    if (data.eventMsPlayed[i] < threshold) skipped++;
  }
  if (total === 0) return null;
  return { total, skipped, counted: total - skipped, skipRatePct: (skipped / total) * 100 };
}

/** Same as skipRateForSong, but aggregated across all of an artist's
 *  songs. */
export function skipRateForArtist(data, artistIdx, fromInt, toInt) {
  if (!data.eventMsPlayed) return null;
  const { eventDate, eventArtistIdx } = data;
  const threshold = data.countPlayThresholdMs || 30000;
  let total = 0;
  let skipped = 0;
  for (let i = 0; i < eventDate.length; i++) {
    if (eventArtistIdx[i] !== artistIdx) continue;
    const d = eventDate[i];
    if (d < fromInt || d > toInt) continue;
    total++;
    if (data.eventMsPlayed[i] < threshold) skipped++;
  }
  if (total === 0) return null;
  return { total, skipped, counted: total - skipped, skipRatePct: (skipped / total) * 100 };
}
