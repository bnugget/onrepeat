import { dayIntToOrdinal, ordinalToDate } from "./dateUtils.js";

import { MONTH_SHORT } from "./constants.js";

export function formatPeakRange(startOrd, endOrd) {
  const s = ordinalToDate(startOrd);
  const e = ordinalToDate(endOrd);
  const fmt = (d) => `${MONTH_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`;
  const sameYear = s.getUTCFullYear() === e.getUTCFullYear();
  return sameYear
    ? `${fmt(s)}–${fmt(e)}, ${e.getUTCFullYear()}`
    : `${fmt(s)}, ${s.getUTCFullYear()} – ${fmt(e)}, ${e.getUTCFullYear()}`;
}

/** Sliding-window peak: the densest run of `windowDays` within a
 *  sorted list of day-ordinals, and how many plays fell inside it. */
function peakWindow(sortedOrdinals, windowDays) {
  let left = 0;
  let best = 0;
  let bestStart = sortedOrdinals[0];
  let bestEnd = sortedOrdinals[0];
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
 * Obsession Index: a blend of two signals.
 *  1. Concentration — what share of an entity's total plays happened
 *     inside its single most intense `windowDays`-day stretch. 100%
 *     means every play happened in one window; low means plays were
 *     spread evenly. Not the same as play count — a decade-long
 *     steady favorite scores low here even with a huge total.
 *  2. Replay rate — what share of plays were an explicit manual
 *     rewind (Spotify's reason_start === "backbtn"), the single
 *     strongest available signal for "I needed to hear that again
 *     right now." When present, this adds up to +20 points on top of
 *     the concentration score. Only available on Spotify-derived
 *     data (eventReasonStart) — silently skipped otherwise.
 */
function rankByObsession(groups, windowDays, minPlays, limit, buildResult) {
  const results = [];
  for (const [key, entry] of groups.entries()) {
    const ordsUnsorted = entry.ords;
    if (ordsUnsorted.length < minPlays) continue;
    const ords = [...ordsUnsorted].sort((a, b) => a - b);
    const { best, bestStart, bestEnd } = peakWindow(ords, windowDays);
    const totalPlays = ords.length;
    const concentration = (best / totalPlays) * 100;
    const replayCount = entry.replays;
    const replayRate = totalPlays > 0 ? replayCount / totalPlays : 0;
    const replayBonus = Math.min(20, replayRate * 20);
    const index = Math.min(100, concentration + replayBonus);
    results.push(
      buildResult(key, {
        totalPlays,
        peakCount: best,
        concentration,
        replayCount,
        index,
        peakStart: bestStart,
        peakEnd: bestEnd
      })
    );
  }
  results.sort((a, b) => b.index - a.index || b.replayCount - a.replayCount || b.totalPlays - a.totalPlays);
  return results.slice(0, limit);
}

function backbtnIdx(data) {
  if (!data.reasonStartNames) return -1;
  return data.reasonStartNames.indexOf("backbtn");
}

export function artistObsessionIndex(data, windowDays, fromInt, toInt, minPlays = 5, limit = 100) {
  const { eventDate, eventArtistIdx, artistNames, eventReasonStart } = data;
  const backIdx = backbtnIdx(data);
  const byArtist = new Map();
  for (let i = 0; i < eventDate.length; i++) {
    const d = eventDate[i];
    if (d < fromInt || d > toInt) continue;
    const ai = eventArtistIdx[i];
    if (!byArtist.has(ai)) byArtist.set(ai, { ords: [], replays: 0 });
    const entry = byArtist.get(ai);
    entry.ords.push(dayIntToOrdinal(d));
    if (eventReasonStart && backIdx !== -1 && eventReasonStart[i] === backIdx) entry.replays++;
  }
  return rankByObsession(byArtist, windowDays, minPlays, limit, (ai, stats) => ({
    name: artistNames[ai],
    ...stats
  }));
}

export function songObsessionIndex(data, windowDays, fromInt, toInt, minPlays = 4, limit = 100) {
  const { eventDate, eventSongIdx, songTrackName, songArtistIdx, artistNames, eventReasonStart } = data;
  const backIdx = backbtnIdx(data);
  const bySong = new Map();
  for (let i = 0; i < eventDate.length; i++) {
    const d = eventDate[i];
    if (d < fromInt || d > toInt) continue;
    const si = eventSongIdx[i];
    if (!bySong.has(si)) bySong.set(si, { ords: [], replays: 0 });
    const entry = bySong.get(si);
    entry.ords.push(dayIntToOrdinal(d));
    if (eventReasonStart && backIdx !== -1 && eventReasonStart[i] === backIdx) entry.replays++;
  }
  return rankByObsession(bySong, windowDays, minPlays, limit, (si, stats) => ({
    track: songTrackName[si],
    artist: artistNames[songArtistIdx[si]],
    ...stats
  }));
}
