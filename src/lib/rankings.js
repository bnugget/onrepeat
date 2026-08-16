/** Grand total across ALL entries in range (not just the top N) — used
 *  as the denominator for "% of total" stats on the Top 100 pages. */
export function totalCount(data, fromInt, toInt, by = "count") {
  const useMinutes = by === "minutes" && !!data.eventMsPlayed;
  let total = 0;
  for (let i = 0; i < data.eventDate.length; i++) {
    const d = data.eventDate[i];
    if (d < fromInt || d > toInt) continue;
    total += useMinutes ? data.eventMsPlayed[i] / 60000 : 1;
  }
  return useMinutes ? Math.round(total) : total;
}

/** Rank artists by scrobble count (or total minutes listened, if
 *  `by: "minutes"` and the dataset has ms_played data) within
 *  [fromInt, toInt], descending. `data` should already have excluded
 *  artists stripped (App.jsx's filteredData) so exclusions apply here
 *  too, same as everywhere else. Recomputed live from whatever range
 *  is selected — this is NOT the static top100 baked into data.json
 *  at build time. */
export function rankArtists(data, fromInt, toInt, limit = 100, by = "count") {
  const { eventDate, eventArtistIdx, artistNames, eventMsPlayed } = data;
  const useMinutes = by === "minutes" && !!eventMsPlayed;
  const totals = new Map();
  for (let i = 0; i < eventDate.length; i++) {
    const d = eventDate[i];
    if (d < fromInt || d > toInt) continue;
    const ai = eventArtistIdx[i];
    const inc = useMinutes ? eventMsPlayed[i] / 60000 : 1;
    totals.set(ai, (totals.get(ai) || 0) + inc);
  }
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([idx, count], i) => ({ rank: i + 1, name: artistNames[idx], count: useMinutes ? Math.round(count) : count }));
}

/** Same idea, ranking individual songs (artist + track combos) rather
 *  than artists. */
export function rankSongs(data, fromInt, toInt, limit = 100, by = "count") {
  const { eventDate, eventSongIdx, songTrackName, songArtistIdx, artistNames, eventMsPlayed } = data;
  const useMinutes = by === "minutes" && !!eventMsPlayed;
  const totals = new Map();
  for (let i = 0; i < eventDate.length; i++) {
    const d = eventDate[i];
    if (d < fromInt || d > toInt) continue;
    const si = eventSongIdx[i];
    const inc = useMinutes ? eventMsPlayed[i] / 60000 : 1;
    totals.set(si, (totals.get(si) || 0) + inc);
  }
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([idx, count], i) => ({
      rank: i + 1,
      songIdx: idx,
      track: songTrackName[idx],
      artist: artistNames[songArtistIdx[idx]],
      count: useMinutes ? Math.round(count) : count
    }));
}

/** Same idea again, ranking albums (artist + album title combos).
 *  Scrobbles with a blank album field (singles, mostly) are skipped
 *  here — they're still in the underlying data for filtering
 *  purposes, just not meaningful as an "album" ranking. */
export function rankAlbums(data, fromInt, toInt, limit = 100, by = "count") {
  const { eventDate, eventAlbumIdx, albumName, albumArtistIdx, artistNames, eventMsPlayed } = data;
  const useMinutes = by === "minutes" && !!eventMsPlayed;
  const totals = new Map();
  for (let i = 0; i < eventDate.length; i++) {
    const d = eventDate[i];
    if (d < fromInt || d > toInt) continue;
    const alIdx = eventAlbumIdx[i];
    if (!albumName[alIdx]) continue;
    const inc = useMinutes ? eventMsPlayed[i] / 60000 : 1;
    totals.set(alIdx, (totals.get(alIdx) || 0) + inc);
  }
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([idx, count], i) => ({
      rank: i + 1,
      albumIdx: idx,
      album: albumName[idx],
      artist: artistNames[albumArtistIdx[idx]],
      count: useMinutes ? Math.round(count) : count
    }));
}
