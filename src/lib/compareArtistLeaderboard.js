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
    const songCounts = new Map(); // track name -> count, FULL (not capped)
    for (let i = 0; i < data.eventDate.length; i++) {
      const d = data.eventDate[i];
      if (d < fromInt || d > toInt) continue;
      totalPlays++;
      const name = data.artistNames[data.eventArtistIdx[i]];
      artistCounts.set(name, (artistCounts.get(name) || 0) + 1);
      if (name !== artistName) continue;
      artistPlays++;
      const track = data.songTrackName[data.eventSongIdx[i]];
      songCounts.set(track, (songCounts.get(track) || 0) + 1);
    }
    const topTracks = [...songCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, topSongs)
      .map(([track, count]) => ({ track, count }));

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
      topTracks,
      songCounts // full map, used to merge track comparisons without misreporting "0" for tracks just outside someone's own top N
    };
  }

  const a = stats(dataA);
  const b = stats(dataB);

  let biggerFan = null;
  if (a.plays > 0 || b.plays > 0) {
    biggerFan = a.percentile === b.percentile ? "tie" : a.percentile < b.percentile ? "A" : "B";
  }

  // Merge whichever tracks are "notable" for EITHER person (each
  // person's own top N) into one union, using the FULL count maps so
  // the other side's number is always their true count, not a false
  // zero just because that track wasn't in their own personal top N.
  const notableTracks = new Set([...a.topTracks.map((t) => t.track), ...b.topTracks.map((t) => t.track)]);
  const trackComparison = [...notableTracks]
    .map((track) => ({
      track,
      countA: a.songCounts.get(track) || 0,
      countB: b.songCounts.get(track) || 0
    }))
    .sort((x, y) => y.countA + y.countB - (x.countA + x.countB));

  return {
    artistName,
    nameA,
    nameB,
    a,
    b,
    biggerFan,
    trackComparison
  };
}
