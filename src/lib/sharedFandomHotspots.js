function periodKeyOf(d, grain) {
  const y = Math.floor(d / 10000);
  const m = Math.floor((d % 10000) / 100);
  return grain === "year" ? String(y) : `${y}-${String(m).padStart(2, "0")}`;
}

function countsByPeriodArtist(data, grain, fromInt, toInt) {
  const m = new Map(); // periodKey -> Map(artist -> count)
  for (let i = 0; i < data.eventDate.length; i++) {
    const d = data.eventDate[i];
    if (d < fromInt || d > toInt) continue;
    const period = periodKeyOf(d, grain);
    const artist = data.artistNames[data.eventArtistIdx[i]];
    if (!m.has(period)) m.set(period, new Map());
    const pm = m.get(period);
    pm.set(artist, (pm.get(artist) || 0) + 1);
  }
  return m;
}

/**
 * For each period, finds the artist that best represents MUTUAL
 * interest that period — scored by whichever person's count is
 * LOWER, not higher. This is deliberate: min(countA, countB) means
 * an artist only scores well if BOTH people were genuinely into it
 * that period, not just because one person went hard on it alone.
 * An artist with A=50/B=2 scores far worse than A=8/B=6, even though
 * the first has more total plays — that's the whole point.
 *
 * Returns at most maxHotspots periods, picked by highest score
 * across the whole date range.
 */
export function findSharedFandomHotspots(dataA, dataB, opts) {
  const { grain = "year", fromInt, toInt, maxHotspots = 5, minScore = 3 } = opts;

  const byPeriodA = countsByPeriodArtist(dataA, grain, fromInt, toInt);
  const byPeriodB = countsByPeriodArtist(dataB, grain, fromInt, toInt);

  const candidates = [];
  for (const [period, artistsA] of byPeriodA.entries()) {
    const artistsB = byPeriodB.get(period);
    if (!artistsB) continue;
    let bestArtist = null, bestScore = 0, bestCountA = 0, bestCountB = 0;
    for (const [artist, countA] of artistsA.entries()) {
      const countB = artistsB.get(artist) || 0;
      if (countB === 0) continue;
      const score = Math.min(countA, countB); // mutual interest, not raw volume
      if (score > bestScore) { bestScore = score; bestArtist = artist; bestCountA = countA; bestCountB = countB; }
    }
    if (bestArtist && bestScore >= minScore) {
      candidates.push({ period, artist: bestArtist, countA: bestCountA, countB: bestCountB, score: bestScore });
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  // Without this, the same artist can claim several of the slots if
  // their mutual peak spanned multiple consecutive periods — e.g.
  // three straight months of shared Kanye listening would show as
  // three separate bands. Keep only each artist's single
  // highest-scoring period, so the 5 slots surface variety across
  // different artists instead of one artist's whole hot streak.
  const seenArtists = new Set();
  const diversified = [];
  for (const c of candidates) {
    if (seenArtists.has(c.artist)) continue;
    seenArtists.add(c.artist);
    diversified.push(c);
    if (diversified.length >= maxHotspots) break;
  }

  return diversified;
}
