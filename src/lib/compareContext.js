import { MONTH_SHORT } from "./constants.js";

/** Log-weighted cosine similarity between two artist play-count
 *  maps. Log weighting keeps one person's single mega-favorite from
 *  dominating the score the way raw counts would, without needing an
 *  arbitrary cap — someone with 2,000 Drake plays and someone with
 *  200 both read as "big Drake fan" rather than the first swamping
 *  the comparison outright. */
function cosineSimilarity(mapA, mapB) {
  const allArtists = new Set([...mapA.keys(), ...mapB.keys()]);
  let dot = 0, magA = 0, magB = 0;
  for (const artist of allArtists) {
    const a = Math.log(1 + (mapA.get(artist) || 0));
    const b = Math.log(1 + (mapB.get(artist) || 0));
    dot += a * b;
    magA += a * a;
    magB += b * b;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export function similarityLabel(pct) {
  if (pct < 15) return "Pretty different taste";
  if (pct < 35) return "Some overlap";
  if (pct < 55) return "Solid overlap";
  if (pct < 75) return "Very similar taste";
  return "Basically the same person";
}

function formatDayInt(dayInt) {
  const y = Math.floor(dayInt / 10000);
  const m = Math.floor((dayInt % 10000) / 100);
  const d = dayInt % 100;
  return `${MONTH_SHORT[m - 1]} ${d}, ${y}`;
}

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

/**
 * Full comparison between two profiles within [fromInt, toInt].
 * minPlays is a hard cutoff — an artist only counts toward
 * similarity, shared favorites, or "only X" lists once a person has
 * played them at least this many times. Below that, one listen
 * doesn't mean anything about taste.
 */
export function buildComparison(dataA, nameA, dataB, nameB, opts = {}) {
  const { fromInt = -Infinity, toInt = Infinity, minPlays = 5, topN = 15 } = opts;

  const countsA = artistCounts(dataA, fromInt, toInt);
  const countsB = artistCounts(dataB, fromInt, toInt);

  const qualA = new Map([...countsA.entries()].filter(([, c]) => c >= minPlays));
  const qualB = new Map([...countsB.entries()].filter(([, c]) => c >= minPlays));

  const similarityPct = Math.round(cosineSimilarity(qualA, qualB) * 100);

  const shared = [];
  for (const [name, cA] of qualA.entries()) {
    if (qualB.has(name)) shared.push({ name, countA: cA, countB: qualB.get(name) });
  }
  shared.sort((a, b) => b.countA + b.countB - (a.countA + a.countB));

  const onlyA = [...qualA.entries()]
    .filter(([name]) => !qualB.has(name))
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([name, count]) => ({ name, count }));
  const onlyB = [...qualB.entries()]
    .filter(([name]) => !qualA.has(name))
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([name, count]) => ({ name, count }));

  const topA = [...countsA.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const topB = [...countsB.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const recommendToB = topA.filter(([name]) => !countsB.has(name)).slice(0, 5).map(([name, count]) => ({ name, count }));
  const recommendToA = topB.filter(([name]) => !countsA.has(name)).slice(0, 5).map(([name, count]) => ({ name, count }));

  let totalA = 0;
  for (const c of countsA.values()) totalA += c;
  let totalB = 0;
  for (const c of countsB.values()) totalB += c;

  return {
    nameA,
    nameB,
    dateRangeLabel: fromInt === -Infinity || toInt === Infinity ? "all time" : `${formatDayInt(fromInt)} – ${formatDayInt(toInt)}`,
    minPlaysThreshold: minPlays,
    similarityPct,
    similarityLabel: similarityLabel(similarityPct),
    totalA,
    totalB,
    qualifyingArtistsA: qualA.size,
    qualifyingArtistsB: qualB.size,
    shared: shared.slice(0, topN),
    sharedCount: shared.length,
    onlyA,
    onlyB,
    recommendToA,
    recommendToB
  };
}
