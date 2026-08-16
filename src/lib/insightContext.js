import { dayIntToISO, isoToDayInt } from "./aggregate.js";

/** Total plays per tag value (mood or genre) within [fromInt, toInt],
 *  for whichever artists have that tag assigned. */
function tagBreakdown(data, tagMap, fromInt, toInt) {
  const { eventDate, eventArtistIdx, artistNames } = data;
  const counts = new Map();
  for (let i = 0; i < eventDate.length; i++) {
    const d = eventDate[i];
    if (d < fromInt || d > toInt) continue;
    const tag = tagMap[artistNames[eventArtistIdx[i]]];
    if (!tag) continue;
    counts.set(tag, (counts.get(tag) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([tag, count]) => ({ tag, count }));
}

/** Core summary of a date range: totals, top artists, and optional
 *  mood/genre breakdowns. Reused for both the top-level selected
 *  range and for each individual era below. */
function summarizeRange(data, fromInt, toInt, { moodTags, genreTags } = {}) {
  const { eventDate, eventArtistIdx, artistNames } = data;
  const counts = new Map();
  let total = 0;

  for (let i = 0; i < eventDate.length; i++) {
    const d = eventDate[i];
    if (d < fromInt || d > toInt) continue;
    total++;
    const ai = eventArtistIdx[i];
    counts.set(ai, (counts.get(ai) || 0) + 1);
  }

  const topArtists = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([idx, count]) => ({ artist: artistNames[idx], count }));

  const summary = {
    totalPlays: total,
    uniqueArtistsInRange: counts.size,
    topArtists
  };

  if (moodTags && Object.keys(moodTags).length > 0) {
    const mb = tagBreakdown(data, moodTags, fromInt, toInt);
    if (mb.length > 0) summary.moodBreakdown = mb;
  }
  if (genreTags && Object.keys(genreTags).length > 0) {
    const gb = tagBreakdown(data, genreTags, fromInt, toInt);
    if (gb.length > 0) summary.genreBreakdown = gb;
  }

  return summary;
}

/**
 * Compact summary handed to Claude as prompt context. `data` should
 * already have excluded artists' events stripped out (App.jsx builds
 * this filtered dataset) so the insight never gets diluted by
 * artists the person has chosen to exclude.
 *
 * Each era gets its OWN summary computed over its own date range,
 * independent of the currently selected top-level range — this is
 * what makes "compare my two eras" answerable even if both eras
 * aren't inside whatever range happens to be selected right now.
 */
export function buildInsightContext(data, fromInt, toInt, { moodTags, genreTags, eras, excludedArtists } = {}) {
  const context = {
    dateRange: { from: dayIntToISO(fromInt), to: dayIntToISO(toInt) },
    ...summarizeRange(data, fromInt, toInt, { moodTags, genreTags })
  };

  if (excludedArtists && excludedArtists.length > 0) {
    context.excludedArtists = excludedArtists;
  }

  if (eras && eras.length > 0) {
    context.eras = eras.map((e) => ({
      label: e.label,
      start: e.startISO,
      end: e.endISO,
      ...summarizeRange(data, isoToDayInt(e.startISO), isoToDayInt(e.endISO), { moodTags, genreTags })
    }));
  }

  return context;
}
