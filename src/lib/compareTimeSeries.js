import { MONTH_SHORT } from "./constants.js";

function yearOf(d) { return Math.floor(d / 10000); }
function monthOf(d) { return Math.floor((d % 10000) / 100); }
function daysInMonth(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }

/**
 * Two-person time series for one artist or one genre, binned by year
 * or month, continuous across [fromInt, toInt] (zero-filled, same
 * philosophy as the main dashboard's month grain) — so you can
 * actually see whether both people's listening to the same
 * artist/genre lined up in time or not.
 */
export function compareTimeSeries(dataA, dataB, opts) {
  const { grain = "year", filterType = "artist", filterValue, genreTags = {}, fromInt, toInt } = opts;

  function matches(data, i) {
    if (filterType === "none" || !filterValue) return true;
    const artistName = data.artistNames[data.eventArtistIdx[i]];
    if (filterType === "artist") return artistName === filterValue;
    if (filterType === "genre") return (genreTags[artistName] || null) === filterValue;
    return false;
  }

  function countsByPeriod(data) {
    const m = new Map();
    for (let i = 0; i < data.eventDate.length; i++) {
      const d = data.eventDate[i];
      if (d < fromInt || d > toInt) continue;
      if (!matches(data, i)) continue;
      const key = grain === "year" ? String(yearOf(d)) : `${yearOf(d)}-${String(monthOf(d)).padStart(2, "0")}`;
      m.set(key, (m.get(key) || 0) + 1);
    }
    return m;
  }

  const countsA = countsByPeriod(dataA);
  const countsB = countsByPeriod(dataB);

  const rows = [];
  if (grain === "year") {
    const startY = yearOf(fromInt);
    const endY = yearOf(toInt);
    for (let y = startY; y <= endY; y++) {
      const key = String(y);
      rows.push({ key, label: key, periodStart: y * 10000 + 101, periodEnd: y * 10000 + 1231, personA: countsA.get(key) || 0, personB: countsB.get(key) || 0 });
    }
  } else {
    let y = yearOf(fromInt);
    let m = monthOf(fromInt);
    const endY = yearOf(toInt);
    const endM = monthOf(toInt);
    while (y < endY || (y === endY && m <= endM)) {
      const key = `${y}-${String(m).padStart(2, "0")}`;
      rows.push({
        key,
        label: `${MONTH_SHORT[m - 1]} '${String(y).slice(2)}`,
        periodStart: y * 10000 + m * 100 + 1,
        periodEnd: y * 10000 + m * 100 + daysInMonth(y, m),
        personA: countsA.get(key) || 0,
        personB: countsB.get(key) || 0
      });
      m++;
      if (m > 12) { m = 1; y++; }
    }
  }
  return rows;
}
