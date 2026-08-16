/** Ranked breakdown of plays by platform/device within [fromInt, toInt].
 *  Returns [] (not null) when the dataset has no platform data at all
 *  (Last.fm-derived data), so callers can check .length rather than
 *  handling a separate null case. */
export function platformBreakdown(data, fromInt, toInt, limit = 10) {
  if (!data.eventPlatformIdx) return [];
  const { eventDate, eventPlatformIdx, platformNames } = data;
  const counts = new Map();
  for (let i = 0; i < eventDate.length; i++) {
    const d = eventDate[i];
    if (d < fromInt || d > toInt) continue;
    const pi = eventPlatformIdx[i];
    counts.set(pi, (counts.get(pi) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([idx, count], i) => ({ rank: i + 1, platform: platformNames[idx], count }));
}

const COUNTRY_NAMES = {
  US: "United States", CA: "Canada", GB: "United Kingdom", FR: "France",
  DE: "Germany", ES: "Spain", PT: "Portugal", NL: "Netherlands", SE: "Sweden",
  DK: "Denmark", JP: "Japan", HK: "Hong Kong", MX: "Mexico", GT: "Guatemala",
  IS: "Iceland", IT: "Italy", IE: "Ireland", AU: "Australia", BR: "Brazil",
  ZZ: "Unknown / offline"
};

/** Ranked breakdown of plays by connection country within
 *  [fromInt, toInt]. Same [] fallback as platformBreakdown. */
export function countryBreakdown(data, fromInt, toInt, limit = 15) {
  if (!data.eventCountryIdx) return [];
  const { eventDate, eventCountryIdx, countryNames } = data;
  const counts = new Map();
  for (let i = 0; i < eventDate.length; i++) {
    const d = eventDate[i];
    if (d < fromInt || d > toInt) continue;
    const ci = eventCountryIdx[i];
    counts.set(ci, (counts.get(ci) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([idx, count], i) => {
      const code = countryNames[idx];
      return { rank: i + 1, code, name: COUNTRY_NAMES[code] || code, count };
    });
}
