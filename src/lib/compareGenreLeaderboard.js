/** Within one genre, the union of both people's top artists — not
 *  just shared ones, since "my top Hip Hop artists vs. yours" is a
 *  meaningful comparison even where only one person has an artist at
 *  all. Sorted by combined plays, capped to topN. */
export function compareGenreLeaderboard(dataA, nameA, dataB, nameB, genreTags, genreName, fromInt, toInt, topN = 15) {
  function artistCountsInGenre(data) {
    const m = new Map();
    for (let i = 0; i < data.eventDate.length; i++) {
      const d = data.eventDate[i];
      if (d < fromInt || d > toInt) continue;
      const name = data.artistNames[data.eventArtistIdx[i]];
      if (genreTags[name] !== genreName) continue;
      m.set(name, (m.get(name) || 0) + 1);
    }
    return m;
  }

  const countsA = artistCountsInGenre(dataA);
  const countsB = artistCountsInGenre(dataB);

  const union = new Set([...countsA.keys(), ...countsB.keys()]);
  const rows = [...union]
    .map((name) => ({
      name,
      countA: countsA.get(name) || 0,
      countB: countsB.get(name) || 0
    }))
    .sort((a, b) => b.countA + b.countB - (a.countA + a.countB));

  return { genreName, nameA, nameB, rows: rows.slice(0, topN), totalArtists: rows.length };
}
