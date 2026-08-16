/** For one specific artist (matched by name across both profiles),
 *  compare two people's engagement: total plays, what share of their
 *  own overall listening that artist represents, where it ranks
 *  within each person's own full catalog, and each person's own top
 *  songs by that artist.
 *
 *  "Bigger fan" uses the SAME rank-based approach as the Overview
 *  tab's Bigger Fan section — whoever has this artist closer to
 *  their own personal #1 wins, not whoever has the higher raw % of
 *  total listening. Raw % structurally favors whoever listens to
 *  fewer different artists overall, which isn't what "bigger fan"
 *  should mean. */
export function compareArtist(dataA, nameA, dataB, nameB, artistName, fromInt, toInt, topSongs = 10) {
  function stats(data) {
    let totalPlays = 0;
    let artistPlays = 0;
    const artistCounts = new Map();
    const songCounts = new Map();
    for (let i = 0; i < data.eventDate.length; i++) {
      const d = data.eventDate[i];
      if (d < fromInt || d > toInt) continue;
      totalPlays++;
      const name = data.artistNames[data.eventArtistIdx[i]];
      artistCounts.set(name, (artistCounts.get(name) || 0) + 1);
      if (name !== artistName) continue;
      artistPlays++;
      const si = data.eventSongIdx[i];
      songCounts.set(si, (songCounts.get(si) || 0) + 1);
    }
    const topTracks = [...songCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, topSongs)
      .map(([si, count]) => ({ track: data.songTrackName[si], count }));

    const rankedArtists = [...artistCounts.entries()].sort((a, b) => b[1] - a[1]);
    const catalogSize = rankedArtists.length;
    const rankIdx = rankedArtists.findIndex(([name]) => name === artistName);
    const rank = rankIdx === -1 ? null : rankIdx + 1;
    const percentile = rank === null ? 1 : rankIdx / catalogSize;

    return {
      plays: artistPlays,
      pctOfTotal: totalPlays > 0 ? (artistPlays / totalPlays) * 100 : 0,
      rank,
      catalogSize,
      percentile,
      topTracks
    };
  }

  const a = stats(dataA);
  const b = stats(dataB);

  let biggerFan = null;
  if (a.plays > 0 || b.plays > 0) {
    biggerFan = a.percentile === b.percentile ? "tie" : a.percentile < b.percentile ? "A" : "B";
  }

  return {
    artistName,
    nameA,
    nameB,
    a,
    b,
    biggerFan
  };
}
