import { dayIntToOrdinal } from "./dateUtils.js";

import { MONTH_SHORT } from "./constants.js";

function periodStart(d, grain) {
  if (grain === "week") {
    const day = d.getUTCDay();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
  }
  if (grain === "month") return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  return new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
}

function periodAdvance(d, grain) {
  const nd = new Date(d);
  if (grain === "week") nd.setUTCDate(nd.getUTCDate() + 7);
  else if (grain === "month") nd.setUTCMonth(nd.getUTCMonth() + 1);
  else nd.setUTCFullYear(nd.getUTCFullYear() + 1);
  return nd;
}

function toOrdinal(d) {
  return Math.floor(d.getTime() / 86400000);
}

export function labelFor(d, grain) {
  if (grain === "year") return String(d.getUTCFullYear());
  if (grain === "month") return `${MONTH_SHORT[d.getUTCMonth()]} '${String(d.getUTCFullYear()).slice(2)}`;
  return `${MONTH_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/**
 * Bucket every scrobble into week/month/year periods across
 * [fromInt, toInt] (YYYYMMDD ints), zero-filling empty periods so
 * gaps in listening show up as a flat valley instead of vanishing
 * from the chart. `ord` is whole-days-since-epoch (see dateUtils.js)
 * so periods of different real lengths (28–31 day months) still sit
 * on an accurate, evenly-scaled time axis.
 */
export function periodCounts(eventDate, grain, fromInt, toInt) {
  const counts = new Map(); // ordinal(periodStart) -> count
  for (let i = 0; i < eventDate.length; i++) {
    const d = eventDate[i];
    if (d < fromInt || d > toInt) continue;
    const ord = dayIntToOrdinal(d);
    const dt = new Date(ord * 86400000);
    const key = toOrdinal(periodStart(dt, grain));
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  if (counts.size === 0) return [];

  const keys = [...counts.keys()].sort((a, b) => a - b);
  const minDate = new Date(keys[0] * 86400000);
  const maxDate = new Date(keys[keys.length - 1] * 86400000);

  const rows = [];
  let cur = minDate;
  while (toOrdinal(cur) <= toOrdinal(maxDate)) {
    const key = toOrdinal(cur);
    rows.push({ ord: key, label: labelFor(cur, grain), count: counts.get(key) || 0 });
    cur = periodAdvance(cur, grain);
  }
  return rows;
}
