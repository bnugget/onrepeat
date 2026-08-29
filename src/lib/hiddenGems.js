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

function percentileMap(songCounts) {
  const sorted = [...songCounts.entries()].sort((a, b) => b[1] - a[1]);
  const n = sorted.length;
  const m = new Map();
  sorted.forEach(([track], i) => m.set(track, (n - i) / n));
  return m;
}

/**
 * The inverse of Perfect Playlist: for artists both people are
 * genuinely into, find songs that are a real favorite (top
 * percentile) for ONE person but that the OTHER person has never
 * played at all. Each suggestion carries its source person's play
 * count, percentile rank of that song within their own plays of that
 * artist, AND their rank of the artist itself within their whole
 * catalog — so a suggestion sourced from someone's #1 artist carries
 * more weight than one from an artist they only sort of like.
 */
export function buildHiddenGems(dataA, nameA, dataB, nameB, fromInt, toInt, minArtistPlays, opts = {}) {
  const { percentileThreshold = 0.7, maxSongs = 25 } = opts;

  const artistsA = artistTotals(dataA, fromInt, toInt);
  const artistsB = artistTotals(dataB, fromInt, toInt);
  const sharedArtists = [...artistsA.keys()].filter(
    (name) => artistsA.get(name) >= minArtistPlays && (artistsB.get(name) || 0) >= minArtistPlays
  );

  const songsByArtistA = songCountsByArtist(dataA, fromInt, toInt);
  const songsByArtistB = songCountsByArtist(dataB, fromInt, toInt);

  const rankedArtistsA = [...artistsA.entries()].sort((a, b) => b[1] - a[1]);
  const rankedArtistsB = [...artistsB.entries()].sort((a, b) => b[1] - a[1]);
  const artistRankA = new Map(rankedArtistsA.map(([name], i) => [name, i + 1]));
  const artistRankB = new Map(rankedArtistsB.map(([name], i) => [name, i + 1]));

  function buildSuggestions(songsSourceByArtist, songsTargetByArtist, artistRankSource, artistCatalogSize) {
    const suggestions = [];
    for (const artist of sharedArtists) {
      const songsSource = songsSourceByArtist.get(artist);
      if (!songsSource) continue;
      const songsTarget = songsTargetByArtist.get(artist);
      const pctSource = percentileMap(songsSource);
      for (const [track, count] of songsSource.entries()) {
        const targetCount = songsTarget?.get(track) || 0;
        if (targetCount > 0) continue;
        const pct = pctSource.get(track);
        if (pct < percentileThreshold) continue;
        suggestions.push({
          artist,
          track,
          sourceCount: count,
          sourcePercentile: Math.round(pct * 100),
          artistRank: artistRankSource.get(artist) || null,
          artistCatalogSize
        });
      }
    }
    suggestions.sort((a, b) => b.sourceCount - a.sourceCount);
    return suggestions.slice(0, maxSongs);
  }

  return {
    nameA,
    nameB,
    forA: buildSuggestions(songsByArtistB, songsByArtistA, artistRankB, artistsB.size),
    forB: buildSuggestions(songsByArtistA, songsByArtistB, artistRankA, artistsA.size)
  };
}
