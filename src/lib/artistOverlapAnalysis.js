function artistCounts(data, fromInt, toInt) {
  const m = new Map();
  for (let i = 0; i < data.eventDate.length; i++) {
    const d = data.eventDate[i];
    if (d < fromInt || d > toInt) continue;
    const name = data.artistNames[data.eventArtistIdx[i]];
    m.set(name, (m.get(name) || 0) + 1);
  }
  return m;
}

/** Ranks every artist within one person's own listening (1 = their
 *  most-played) and converts that to a 0-1 percentile so it's
 *  comparable across two people with very differently sized catalogs
 *  — a broad listener's #2 and a narrow listener's #2 are directly
 *  comparable this way, unlike raw play-share, which structurally
 *  runs lower for anyone who spreads their listening across more
 *  artists regardless of how much they actually love any one of
 *  them. */
function rankMap(counts) {
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const total = sorted.length;
  const m = new Map();
  sorted.forEach(([name], i) => {
    m.set(name, { rank: i + 1, percentile: total > 0 ? i / total : 0 });
  });
  return { rankInfo: m, total };
}

/**
 * Everything needed for the artist-overlap visuals on the Overview
 * tab: scatter points (each shared artist's play share for both
 * people — X/Y near the diagonal means balanced fandom, far off it
 * means lopsided), which shared artists actually drove the cosine
 * similarity score the most, and which artists are most polarizing —
 * ranked by the GAP in each artist's relative standing within each
 * person's own rotation (percentile rank), not by raw play share,
 * since raw share is confounded by how many other artists each
 * person also listens to.
 */
export function artistOverlapAnalysis(dataA, dataB, fromInt, toInt, minPlays) {
  const countsA = artistCounts(dataA, fromInt, toInt);
  const countsB = artistCounts(dataB, fromInt, toInt);

  let totalA = 0;
  for (const c of countsA.values()) totalA += c;
  let totalB = 0;
  for (const c of countsB.values()) totalB += c;

  const { rankInfo: rankInfoA, total: catalogSizeA } = rankMap(countsA);
  const { rankInfo: rankInfoB, total: catalogSizeB } = rankMap(countsB);

  function percentileFor(rankInfo, name) {
    const info = rankInfo.get(name);
    return info ? info.percentile : 1; // never played at all = maximally low relative priority
  }
  function rankFor(rankInfo, name) {
    const info = rankInfo.get(name);
    return info ? info.rank : null; // null = never played
  }

  const qualA = new Map([...countsA.entries()].filter(([, c]) => c >= minPlays));
  const qualB = new Map([...countsB.entries()].filter(([, c]) => c >= minPlays));

  const scatterPoints = [];
  for (const [name, cA] of qualA.entries()) {
    if (!qualB.has(name)) continue;
    const cB = qualB.get(name);
    scatterPoints.push({
      name,
      countA: cA,
      countB: cB,
      pctA: totalA > 0 ? (cA / totalA) * 100 : 0,
      pctB: totalB > 0 ? (cB / totalB) * 100 : 0
    });
  }

  const topContributors = scatterPoints
    .map((p) => ({ ...p, contribution: Math.log(1 + p.countA) * Math.log(1 + p.countB) }))
    .sort((a, b) => b.contribution - a.contribution);

  // "Bigger fan" for shared artists specifically — same rank-based
  // normalization as "most different," restricted to artists you
  // BOTH actually listen to (unlike most-different, which
  // deliberately includes one-sided cases that would otherwise just
  // dominate this list and answer a different question).
  const biggerFanRanking = scatterPoints
    .map((p) => {
      const rankA = rankFor(rankInfoA, p.name);
      const rankB = rankFor(rankInfoB, p.name);
      const percentileA = percentileFor(rankInfoA, p.name);
      const percentileB = percentileFor(rankInfoB, p.name);
      const gapPct = Math.round(Math.abs(percentileA - percentileB) * 100);
      const biggerFan = percentileA < percentileB ? "A" : percentileB < percentileA ? "B" : "tie";
      return { ...p, rankA, rankB, catalogSizeA, catalogSizeB, gapPct, biggerFan };
    })
    .sort((a, b) => b.gapPct - a.gapPct);

  const allArtists = new Set([...countsA.keys(), ...countsB.keys()]);
  const diffs = [];
  for (const name of allArtists) {
    const cA = countsA.get(name) || 0;
    const cB = countsB.get(name) || 0;
    if (cA < minPlays && cB < minPlays) continue;
    const pctA = totalA > 0 ? (cA / totalA) * 100 : 0;
    const pctB = totalB > 0 ? (cB / totalB) * 100 : 0;
    const rankA = rankFor(rankInfoA, name);
    const rankB = rankFor(rankInfoB, name);
    const rankGapPct = Math.round(Math.abs(percentileFor(rankInfoA, name) - percentileFor(rankInfoB, name)) * 100);
    diffs.push({
      name,
      countA: cA,
      countB: cB,
      pctA,
      pctB,
      rankA,
      rankB,
      catalogSizeA,
      catalogSizeB,
      rankGapPct,
      delta: Math.abs(pctA - pctB)
    });
  }
  diffs.sort((a, b) => b.rankGapPct - a.rankGapPct || b.delta - a.delta);

  return {
    scatterPoints,
    topContributors,
    biggerFanRanking,
    mostDifferent: diffs.slice(0, 8),
    totalA,
    totalB
  };
}
