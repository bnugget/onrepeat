function genrePlayCounts(data, genreTags, fromInt, toInt) {
  const counts = new Map();
  for (let i = 0; i < data.eventDate.length; i++) {
    const d = data.eventDate[i];
    if (d < fromInt || d > toInt) continue;
    const name = data.artistNames[data.eventArtistIdx[i]];
    const genre = genreTags[name] || "Untagged";
    counts.set(genre, (counts.get(genre) || 0) + 1);
  }
  return counts;
}

function cosineSimilarityMap(mapA, mapB) {
  const all = new Set([...mapA.keys(), ...mapB.keys()]);
  let dot = 0, magA = 0, magB = 0;
  for (const k of all) {
    const a = Math.log(1 + (mapA.get(k) || 0));
    const b = Math.log(1 + (mapB.get(k) || 0));
    dot += a * b;
    magA += a * a;
    magB += b * b;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * Both people's genre breakdown, sharing the SAME top-10 genre
 * vocabulary (by combined plays) so the two pies are directly
 * comparable slice-for-slice rather than each picking their own top
 * 10 and ending up incomparable. "Other" catches named genres outside
 * the top 10; "Untagged" is tracked separately since it's a data-
 * completeness signal, not a taste signal.
 */
export function compareGenreDistribution(dataA, dataB, genreTags, fromInt, toInt, maxGenres = 10) {
  const countsA = genrePlayCounts(dataA, genreTags, fromInt, toInt);
  const countsB = genrePlayCounts(dataB, genreTags, fromInt, toInt);

  const combined = new Map();
  for (const [g, c] of countsA) combined.set(g, (combined.get(g) || 0) + c);
  for (const [g, c] of countsB) combined.set(g, (combined.get(g) || 0) + c);

  const genreOrder = [...combined.entries()]
    .filter(([g]) => g !== "Untagged")
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxGenres)
    .map(([g]) => g);

  function pieData(counts) {
    const total = [...counts.values()].reduce((a, b) => a + b, 0);
    // Each pie sorts by ITS OWN values (largest slice first) — using
    // the shared combined order here instead would make an
    // individual pie look randomly ordered whenever this person's
    // own ranking doesn't match the combined one.
    const namedSlices = genreOrder
      .map((g) => ({ name: g, value: counts.get(g) || 0 }))
      .filter((s) => s.value > 0)
      .sort((a, b) => b.value - a.value);
    const namedSum = namedSlices.reduce((a, s) => a + s.value, 0);
    const untagged = counts.get("Untagged") || 0;
    const otherSum = total - namedSum - untagged;
    const slices = [...namedSlices];
    if (otherSum > 0) slices.push({ name: "Other", value: otherSum });
    if (untagged > 0) slices.push({ name: "Untagged", value: untagged });
    return { slices, total };
  }

  const pieA = pieData(countsA);
  const pieB = pieData(countsB);
  const similarityPct = Math.round(cosineSimilarityMap(countsA, countsB) * 100);

  return { genreOrder, pieA, pieB, similarityPct };
}
