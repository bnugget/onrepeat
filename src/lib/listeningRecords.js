import { dayIntToOrdinal, ordinalToDate } from "./dateUtils.js";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatDayInt(d) {
  const y = Math.floor(d / 10000);
  const m = Math.floor((d % 10000) / 100);
  const day = d % 100;
  return `${MONTH_SHORT[m - 1]} ${day}, ${y}`;
}
function formatYearMonth(ym) {
  const y = Math.floor(ym / 100);
  const m = ym % 100;
  return `${MONTH_NAMES[m - 1]} ${y}`;
}
function formatRange(startOrd, endOrd) {
  const s = ordinalToDate(startOrd);
  const e = ordinalToDate(endOrd);
  const fmt = (d) => `${MONTH_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`;
  return s.getUTCFullYear() === e.getUTCFullYear()
    ? `${fmt(s)}–${fmt(e)}, ${e.getUTCFullYear()}`
    : `${fmt(s)}, ${s.getUTCFullYear()} – ${fmt(e)}, ${e.getUTCFullYear()}`;
}

/** Longest run of a single artist within any N-day window — same
 *  sliding-window technique used by Obsession Index, generalized here
 *  for both songs and artists. */
function peakWindow(sortedOrdinals, windowDays) {
  let left = 0, best = 0, bestStart = sortedOrdinals[0], bestEnd = sortedOrdinals[0];
  for (let right = 0; right < sortedOrdinals.length; right++) {
    while (sortedOrdinals[right] - sortedOrdinals[left] > windowDays - 1) left++;
    const count = right - left + 1;
    if (count > best) {
      best = count;
      bestStart = sortedOrdinals[left];
      bestEnd = sortedOrdinals[right];
    }
  }
  return { best, bestStart, bestEnd };
}

/**
 * A set of fun superlative stats for one profile, scoped to
 * [fromInt, toInt]: best year/month, biggest single-song binges (1
 * day and 7 days), biggest single-artist binge, most minutes in a
 * day, longest listening streak, lifetime totals, average minutes
 * per day, and genre diversity. Minutes-based records return null if
 * the dataset has no ms_played data at all.
 */
export function computeListeningRecords(data, fromInt, toInt, genreTags = {}) {
  const hasMs = !!data.eventMsPlayed;

  const yearCounts = new Map();
  const monthCounts = new Map(); // key: year*100+month
  const daySongCounts = new Map(); // key: dayInt -> Map(songIdx -> count)
  const dayMsPlayed = new Map(); // key: dayInt -> total ms
  const activeDays = new Set();
  const songDayLists = new Map(); // songIdx -> [ordinal,...]
  const artistDayLists = new Map(); // artistIdx -> [ordinal,...]
  const genreCounts = new Map(); // genre -> play count (Untagged excluded)

  let totalPlays = 0;
  let totalMs = 0;
  let minDate = Infinity;

  for (let i = 0; i < data.eventDate.length; i++) {
    const d = data.eventDate[i];
    if (d < fromInt || d > toInt) continue;
    totalPlays++;
    if (d < minDate) minDate = d;

    const y = Math.floor(d / 10000);
    const m = Math.floor((d % 10000) / 100);
    const ymKey = y * 100 + m;
    yearCounts.set(y, (yearCounts.get(y) || 0) + 1);
    monthCounts.set(ymKey, (monthCounts.get(ymKey) || 0) + 1);

    const si = data.eventSongIdx[i];
    if (!daySongCounts.has(d)) daySongCounts.set(d, new Map());
    const sm = daySongCounts.get(d);
    sm.set(si, (sm.get(si) || 0) + 1);

    if (hasMs) {
      const ms = data.eventMsPlayed[i];
      dayMsPlayed.set(d, (dayMsPlayed.get(d) || 0) + ms);
      totalMs += ms;
    }

    activeDays.add(d);

    const ord = dayIntToOrdinal(d);
    if (!songDayLists.has(si)) songDayLists.set(si, []);
    songDayLists.get(si).push(ord);

    const ai = data.eventArtistIdx[i];
    if (!artistDayLists.has(ai)) artistDayLists.set(ai, []);
    artistDayLists.get(ai).push(ord);

    const artistName = data.artistNames[ai];
    const genre = genreTags[artistName];
    if (genre) genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
  }

  if (totalPlays === 0) return null;

  let bestYear = null, bestYearCount = 0;
  for (const [y, c] of yearCounts) if (c > bestYearCount) { bestYear = y; bestYearCount = c; }

  let bestYM = null, bestYMCount = 0;
  for (const [ym, c] of monthCounts) if (c > bestYMCount) { bestYM = ym; bestYMCount = c; }

  let bestDaySong = null, bestDaySongCount = 0, bestDaySongDay = null;
  for (const [day, sm] of daySongCounts) {
    for (const [si, c] of sm) {
      if (c > bestDaySongCount) { bestDaySongCount = c; bestDaySong = si; bestDaySongDay = day; }
    }
  }

  let bestMsDay = null, bestMsDayValue = 0;
  if (hasMs) {
    for (const [day, ms] of dayMsPlayed) if (ms > bestMsDayValue) { bestMsDayValue = ms; bestMsDay = day; }
  }

  let bestSongWindow = null, bestSongWindowCount = 0, bestSongWindowStart = null, bestSongWindowEnd = null;
  for (const [si, ordsRaw] of songDayLists) {
    const ords = [...ordsRaw].sort((a, b) => a - b);
    const { best, bestStart, bestEnd } = peakWindow(ords, 7);
    if (best > bestSongWindowCount) {
      bestSongWindowCount = best;
      bestSongWindow = si;
      bestSongWindowStart = bestStart;
      bestSongWindowEnd = bestEnd;
    }
  }

  let bestArtistWindow = null, bestArtistWindowCount = 0, bestArtistWindowStart = null, bestArtistWindowEnd = null;
  for (const [ai, ordsRaw] of artistDayLists) {
    const ords = [...ordsRaw].sort((a, b) => a - b);
    const { best, bestStart, bestEnd } = peakWindow(ords, 7);
    if (best > bestArtistWindowCount) {
      bestArtistWindowCount = best;
      bestArtistWindow = ai;
      bestArtistWindowStart = bestStart;
      bestArtistWindowEnd = bestEnd;
    }
  }

  const sortedOrdinals = [...activeDays].map(dayIntToOrdinal).sort((a, b) => a - b);
  let longestStreak = 0, curStreak = 0, prevOrd = null;
  for (const ord of sortedOrdinals) {
    curStreak = prevOrd !== null && ord === prevOrd + 1 ? curStreak + 1 : 1;
    if (curStreak > longestStreak) longestStreak = curStreak;
    prevOrd = ord;
  }

  // Average minutes/day over the full comparison window (including
  // days with zero plays) — reflects real day-to-day habit, not just
  // "when they do listen, how much."
  const daysInRange = dayIntToOrdinal(toInt) - dayIntToOrdinal(fromInt) + 1;
  const avgMinutesPerDay = hasMs && daysInRange > 0 ? totalMs / 60000 / daysInRange : null;

  // Genre diversity via Shannon entropy, converted to "effective
  // number of genres" (e^H) — the standard way to measure how evenly
  // spread a distribution is, not just how many categories exist.
  // Someone tagged across 9 genres but 95% concentrated in one scores
  // close to 1, not 9 — raw genre count alone would overstate
  // diversity for a listener who's really just very into one thing.
  let effectiveGenres = null;
  const totalGenrePlays = [...genreCounts.values()].reduce((a, b) => a + b, 0);
  if (totalGenrePlays > 0) {
    let entropy = 0;
    for (const c of genreCounts.values()) {
      const p = c / totalGenrePlays;
      entropy += -p * Math.log(p);
    }
    effectiveGenres = Math.exp(entropy);
  }

  return {
    totalPlays,
    totalMinutes: hasMs ? Math.round(totalMs / 60000) : null,
    avgMinutesPerDay,

    bestYear,
    bestYearCount,

    bestYearMonthLabel: bestYM !== null ? formatYearMonth(bestYM) : null,
    bestYearMonthCount: bestYMCount,

    bestDaySongTrack: bestDaySong !== null ? data.songTrackName[bestDaySong] : null,
    bestDaySongArtist: bestDaySong !== null ? data.artistNames[data.songArtistIdx[bestDaySong]] : null,
    bestDaySongCount,
    bestDaySongDayLabel: bestDaySongDay !== null ? formatDayInt(bestDaySongDay) : null,

    bestDayMinutes: hasMs && bestMsDay !== null ? Math.round(bestMsDayValue / 60000) : null,
    bestDayMinutesDayLabel: bestMsDay !== null ? formatDayInt(bestMsDay) : null,

    bestSongWindowTrack: bestSongWindow !== null ? data.songTrackName[bestSongWindow] : null,
    bestSongWindowArtist: bestSongWindow !== null ? data.artistNames[data.songArtistIdx[bestSongWindow]] : null,
    bestSongWindowCount,
    bestSongWindowRangeLabel: bestSongWindowStart !== null ? formatRange(bestSongWindowStart, bestSongWindowEnd) : null,

    bestArtistWindowName: bestArtistWindow !== null ? data.artistNames[bestArtistWindow] : null,
    bestArtistWindowCount,
    bestArtistWindowRangeLabel: bestArtistWindowStart !== null ? formatRange(bestArtistWindowStart, bestArtistWindowEnd) : null,

    longestStreak,
    firstDate: minDate !== Infinity ? minDate : null,
    firstDateLabel: minDate !== Infinity ? formatDayInt(minDate) : null,

    effectiveGenres,
    distinctGenresTagged: genreCounts.size
  };
}
