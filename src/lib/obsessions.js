import { dayIntToOrdinal } from "./dateUtils.js";

/**
 * Detects "on repeat" bursts: songs played unusually many times within
 * a short rolling window. For each song, slides a `windowDays`-day
 * window across its play dates (only dates within [fromInt, toInt])
 * and records the window with the most plays. Returns the top bursts
 * across all songs, sorted by intensity, one best window per song.
 */
export function detectObsessions(
  data,
  { windowDays = 7, minPlays = 4, limit = 20, fromInt = -Infinity, toInt = Infinity } = {}
) {
  const { eventDate, eventSongIdx, songTrackName, songArtistIdx, artistNames } = data;

  // Group play ordinals per song, respecting the date range
  const playsBySong = new Map(); // songIdx -> array of ordinals
  for (let i = 0; i < eventDate.length; i++) {
    const d = eventDate[i];
    if (d < fromInt || d > toInt) continue;
    const ord = dayIntToOrdinal(d);
    const si = eventSongIdx[i];
    if (!playsBySong.has(si)) playsBySong.set(si, []);
    playsBySong.get(si).push(ord);
  }

  const bursts = [];
  for (const [songIdx, ordsUnsorted] of playsBySong.entries()) {
    if (ordsUnsorted.length < minPlays) continue;
    const ords = [...ordsUnsorted].sort((a, b) => a - b);

    // sliding window (two-pointer) over sorted ordinals
    let left = 0;
    let bestCount = 0;
    let bestStart = ords[0];
    let bestEnd = ords[0];
    for (let right = 0; right < ords.length; right++) {
      while (ords[right] - ords[left] > windowDays - 1) left++;
      const count = right - left + 1;
      if (count > bestCount) {
        bestCount = count;
        bestStart = ords[left];
        bestEnd = ords[right];
      }
    }

    if (bestCount >= minPlays) {
      bursts.push({
        songIdx,
        track: songTrackName[songIdx],
        artist: artistNames[songArtistIdx[songIdx]],
        count: bestCount,
        startOrd: bestStart,
        endOrd: bestEnd
      });
    }
  }

  bursts.sort((a, b) => b.count - a.count || a.startOrd - b.startOrd);
  return bursts.slice(0, limit);
}
