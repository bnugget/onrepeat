/** Which genres have the most artists tagged under them — a measure
 *  of how much of the library falls into that category, independent
 *  of date range or play activity (it's about the tagging itself). */
export function topGenresByTagCount(genreTags, n = 4) {
  const counts = new Map();
  for (const g of Object.values(genreTags)) {
    if (!g) continue;
    counts.set(g, (counts.get(g) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([genre, tagCount]) => ({ genre, tagCount }));
}

/** Every artist tagged with `genreName`, ranked by plays (or minutes)
 *  within [fromInt, toInt]. Returns the full ranked set plus genre
 *  totals/average — callers slice to top N for display, but % of
 *  total and vs-average should reflect the WHOLE genre, not just the
 *  visible slice. */
export function rankArtistsInGenre(data, genreTags, genreName, fromInt, toInt, by = "count") {
  const useMinutes = by === "minutes" && !!data.eventMsPlayed;
  const totals = new Map();
  for (let i = 0; i < data.eventDate.length; i++) {
    const d = data.eventDate[i];
    if (d < fromInt || d > toInt) continue;
    const ai = data.eventArtistIdx[i];
    const name = data.artistNames[ai];
    if (genreTags[name] !== genreName) continue;
    const inc = useMinutes ? data.eventMsPlayed[i] / 60000 : 1;
    totals.set(ai, (totals.get(ai) || 0) + inc);
  }
  const all = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([ai, count]) => ({ name: data.artistNames[ai], count: useMinutes ? Math.round(count) : count }));
  const total = all.reduce((a, r) => a + r.count, 0);
  const avg = all.length > 0 ? total / all.length : 0;
  return { all, total, avg, artistCount: all.length };
}
