function artistTotals(data, fromInt, toInt) {
  const m = new Map();
  for (let i = 0; i < data.eventDate.length; i++) {
    const d = data.eventDate[i];
    if (d < fromInt || d > toInt) continue;
    const name = data.artistNames[data.eventArtistIdx[i]];
    m.set(name, (m.get(name) || 0) + 1);
  }
  return m;
}

/** Map(artistName -> Map(trackName -> count)), scoped to [fromInt,toInt]. */
function songCountsByArtist(data, fromInt, toInt) {
  const m = new Map();
  for (let i = 0; i < data.eventDate.length; i++) {
    const d = data.eventDate[i];
    if (d < fromInt || d > toInt) continue;
    const artist = data.artistNames[data.eventArtistIdx[i]];
    const track = data.songTrackName[data.eventSongIdx[i]];
    if (!m.has(artist)) m.set(artist, new Map());
    const sm = m.get(artist);
    sm.set(track, (sm.get(track) || 0) + 1);
  }
  return m;
}

/** Percentile rank of each track within one person's plays of one
 *  artist — rank 1 (their most-played track by that artist) scores
 *  1.0, their least-played scores close to 0. */
function percentileMap(songCounts) {
  const sorted = [...songCounts.entries()].sort((a, b) => b[1] - a[1]);
  const n = sorted.length;
  const m = new Map();
  sorted.forEach(([track], i) => m.set(track, (n - i) / n));
  return m;
}

/**
 * Builds a "perfect playlist" — songs that are genuine favorites for
 * BOTH people, not just songs they've both technically heard. A
 * track qualifies only if it sits in the top percentile of each
 * person's OWN plays of that artist (default: top 30%), for artists
 * both people clear minArtistPlays of. Ranked by combined plays,
 * capped at maxSongs.
 */
export function buildPerfectPlaylist(dataA, dataB, fromInt, toInt, minArtistPlays, opts = {}) {
  const { percentileThreshold = 0.7, maxSongs = 50 } = opts;

  const artistsA = artistTotals(dataA, fromInt, toInt);
  const artistsB = artistTotals(dataB, fromInt, toInt);
  const sharedArtists = [...artistsA.keys()].filter(
    (name) => artistsA.get(name) >= minArtistPlays && (artistsB.get(name) || 0) >= minArtistPlays
  );

  const songsByArtistA = songCountsByArtist(dataA, fromInt, toInt);
  const songsByArtistB = songCountsByArtist(dataB, fromInt, toInt);

  const results = [];
  for (const artist of sharedArtists) {
    const songsA = songsByArtistA.get(artist);
    const songsB = songsByArtistB.get(artist);
    if (!songsA || !songsB) continue;
    const pctA = percentileMap(songsA);
    const pctB = percentileMap(songsB);

    for (const [track, countA] of songsA.entries()) {
      if (!songsB.has(track)) continue;
      const pA = pctA.get(track);
      const pB = pctB.get(track);
      if (pA >= percentileThreshold && pB >= percentileThreshold) {
        results.push({
          artist,
          track,
          countA,
          countB: songsB.get(track),
          pctA: Math.round(pA * 100),
          pctB: Math.round(pB * 100)
        });
      }
    }
  }

  results.sort((a, b) => b.countA + b.countB - (a.countA + a.countB));
  return results.slice(0, maxSongs);
}
