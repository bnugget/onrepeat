// Core data layer for the scrobble timeline.
// Everything downstream (yearly chart, monthly drilldown, future
// track/album drilldowns) reads through these functions so there's
// one place that understands the raw event shape.

export const OTHER_BUCKET = 100;
export const OTHER_COLOR = "#E8DCE3";

/** Procedural pastel palette for however many artist series we're
 *  showing — hand-picking 100+ distinct hex codes isn't practical, so
 *  this rotates hue evenly around the wheel with a touch of
 *  saturation/lightness variation between neighbors so adjacent
 *  stacked segments stay distinguishable. */
export function generateSeriesColors(n) {
  const colors = [];
  for (let i = 0; i < n; i++) {
    const hue = (i / n) * 360;
    const s = 0.5 + (i % 3) * 0.05;
    const l = 0.72 + (i % 2) * 0.06;
    colors.push(hslToHex(hue, s, l));
  }
  return colors;
}

function hslToHex(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r, g, b;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function seriesNames(topArtists) {
  return [...topArtists, "Other"];
}

// dateInt is YYYYMMDD. Helpers to pull year/month out fast.
export const yearOf = (d) => Math.floor(d / 10000);
export const monthOf = (d) => Math.floor((d % 10000) / 100);

/**
 * Aggregate raw events into a year -> [11 counts] map and a
 * year -> month -> [11 counts] map, respecting an optional
 * [fromInt, toInt] day-grain date range (inclusive, YYYYMMDD ints).
 */
export function aggregate(data, fromInt, toInt, weights) {
  const { eventDate, eventArtistIdx, artistBucket } = data;
  const bucketCount = Math.max(...artistBucket) + 1;
  const yearly = new Map();
  const monthly = new Map();

  for (let i = 0; i < eventDate.length; i++) {
    const d = eventDate[i];
    if (d < fromInt || d > toInt) continue;

    const bucket = artistBucket[eventArtistIdx[i]];
    const y = yearOf(d);
    const m = monthOf(d);
    const w = weights ? weights[i] : 1;

    if (!yearly.has(y)) yearly.set(y, new Array(bucketCount).fill(0));
    yearly.get(y)[bucket] += w;

    if (!monthly.has(y)) monthly.set(y, new Map());
    const yMap = monthly.get(y);
    if (!yMap.has(m)) yMap.set(m, new Array(bucketCount).fill(0));
    yMap.get(m)[bucket] += w;
  }

  return { yearly, monthly };
}

/**
 * Same shape as aggregate(), but buckets every scrobble by a mood
 * lookup instead of the fixed top-10 ranking. moodOfArtistIdx is a
 * plain array (length = artistNames.length) mapping each artist index
 * to an index into moodNames (last entry in moodNames should be
 * "Untagged" — everything not explicitly tagged falls there).
 */
export function aggregateMood(data, moodOfArtistIdx, moodNames, fromInt, toInt, weights) {
  const { eventDate, eventArtistIdx } = data;
  const n = moodNames.length;
  const yearly = new Map();
  const monthly = new Map();

  for (let i = 0; i < eventDate.length; i++) {
    const d = eventDate[i];
    if (d < fromInt || d > toInt) continue;

    const bucket = moodOfArtistIdx[eventArtistIdx[i]];
    const y = yearOf(d);
    const m = monthOf(d);
    const w = weights ? weights[i] : 1;

    if (!yearly.has(y)) yearly.set(y, new Array(n).fill(0));
    yearly.get(y)[bucket] += w;

    if (!monthly.has(y)) monthly.set(y, new Map());
    const yMap = monthly.get(y);
    if (!yMap.has(m)) yMap.set(m, new Array(n).fill(0));
    yMap.get(m)[bucket] += w;
  }

  return { yearly, monthly };
}

/**
 * Shannon entropy of the artist-play distribution, per year. Higher =
 * listening was spread across many artists that year; lower = a few
 * artists dominated. `normalized` divides by log2(unique artists that
 * year) so scores are comparable across years with different artist
 * counts (1.0 = perfectly even spread across however many artists you
 * played that year, 0 = only one artist all year).
 */
export function diversityByYear(data, fromInt = -Infinity, toInt = Infinity) {
  const { eventDate, eventArtistIdx } = data;
  const yearArtistCounts = new Map(); // year -> Map(artistIdx -> count)

  for (let i = 0; i < eventDate.length; i++) {
    const d = eventDate[i];
    if (d < fromInt || d > toInt) continue;
    const y = yearOf(d);
    const ai = eventArtistIdx[i];
    if (!yearArtistCounts.has(y)) yearArtistCounts.set(y, new Map());
    const m = yearArtistCounts.get(y);
    m.set(ai, (m.get(ai) || 0) + 1);
  }

  const rows = [];
  for (const [year, counts] of [...yearArtistCounts.entries()].sort((a, b) => a[0] - b[0])) {
    const total = [...counts.values()].reduce((a, b) => a + b, 0);
    let H = 0;
    for (const c of counts.values()) {
      const p = c / total;
      H -= p * Math.log2(p);
    }
    const uniqueArtists = counts.size;
    const maxH = uniqueArtists > 1 ? Math.log2(uniqueArtists) : 1;
    rows.push({
      year,
      label: String(year),
      entropy: H,
      normalized: uniqueArtists > 1 ? H / maxH : 0,
      uniqueArtists,
      totalPlays: total
    });
  }
  return rows;
}

/**
 * Weekly scrobble counts across the *entire* dataset span, with every
 * week present (zero-filled) so gaps in listening show up as a flat
 * valley rather than being skipped. x is a whole-day ordinal (see
 * dateUtils.js) representing the start of each 7-day bucket, so it
 * plots on an evenly-spaced continuous axis.
 */
export function weeklyCounts(data, ordinalOf) {
  const { eventDate } = data;
  const buckets = new Map(); // weekStartOrdinal -> count
  let minWeek = Infinity;
  let maxWeek = -Infinity;

  for (let i = 0; i < eventDate.length; i++) {
    const ord = ordinalOf(eventDate[i]);
    const week = Math.floor(ord / 7) * 7;
    buckets.set(week, (buckets.get(week) || 0) + 1);
    if (week < minWeek) minWeek = week;
    if (week > maxWeek) maxWeek = week;
  }

  const rows = [];
  for (let w = minWeek; w <= maxWeek; w += 7) {
    rows.push({ weekOrd: w, count: buckets.get(w) || 0 });
  }
  return rows;
}

/**
 * Buckets scrobbles by which user-defined era their date falls into
 * (NOT by artist, unlike aggregate()/aggregateMood() — this is a
 * date-based bucket, so an event's era depends only on when it was
 * played). Events outside every era land in the trailing "No Era"
 * bucket. If eras overlap, the first match (in the given array order)
 * wins.
 */
export function aggregateByEra(data, eraRanges, fromInt, toInt, weights) {
  const { eventDate } = data;
  const noEraIdx = eraRanges.length;
  const n = eraRanges.length + 1;
  const yearly = new Map();
  const monthly = new Map();

  for (let i = 0; i < eventDate.length; i++) {
    const d = eventDate[i];
    if (d < fromInt || d > toInt) continue;

    let bucket = noEraIdx;
    for (let e = 0; e < eraRanges.length; e++) {
      if (d >= eraRanges[e].startInt && d <= eraRanges[e].endInt) {
        bucket = e;
        break;
      }
    }

    const y = yearOf(d);
    const m = monthOf(d);
    const w = weights ? weights[i] : 1;

    if (!yearly.has(y)) yearly.set(y, new Array(n).fill(0));
    yearly.get(y)[bucket] += w;

    if (!monthly.has(y)) monthly.set(y, new Map());
    const yMap = monthly.get(y);
    if (!yMap.has(m)) yMap.set(m, new Array(n).fill(0));
    yMap.get(m)[bucket] += w;
  }

  return { yearly, monthly };
}

/** Full min/max day-int range present in the dataset. */
export function dateBounds(data) {
  let min = Infinity;
  let max = -Infinity;
  for (const d of data.eventDate) {
    if (d < min) min = d;
    if (d > max) max = d;
  }
  return { min, max };
}

export const dayIntToISO = (d) => {
  const y = Math.floor(d / 10000);
  const m = Math.floor((d % 10000) / 100);
  const day = d % 100;
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

export const isoToDayInt = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return y * 10000 + m * 100 + d;
};

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export const monthLabel = (m) => MONTH_LABELS[m - 1];

/**
 * Shape a yearly or monthly map into recharts-friendly rows:
 * [{ label: "2019", Drake: 337, Disclosure: 99, ..., Other: 5000 }, ...]
 */
export function toChartRows(map, names, keyFormatter) {
  const rows = [];
  const sortedKeys = [...map.keys()].sort((a, b) => a - b);
  for (const key of sortedKeys) {
    const counts = map.get(key);
    const row = { key, label: keyFormatter(key) };
    names.forEach((name, i) => {
      row[name] = counts[i];
    });
    rows.push(row);
  }
  return rows;
}

/** Look up a specific artist's filtered scrobble count by exact or substring name match. */
export function findArtistMatches(data, query, fromInt, toInt, limit = 5) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const { artistNames, eventDate, eventArtistIdx } = data;

  const matchingIdx = [];
  for (let i = 0; i < artistNames.length; i++) {
    if (artistNames[i].toLowerCase().includes(q)) {
      matchingIdx.push(i);
      if (matchingIdx.length > 500) break; // guard against pathological queries
    }
  }
  if (matchingIdx.length === 0) return [];

  const idxSet = new Set(matchingIdx);
  const counts = new Map();
  for (let i = 0; i < eventDate.length; i++) {
    const d = eventDate[i];
    if (d < fromInt || d > toInt) continue;
    const ai = eventArtistIdx[i];
    if (idxSet.has(ai)) counts.set(ai, (counts.get(ai) || 0) + 1);
  }

  return [...counts.entries()]
    .map(([idx, count]) => ({ name: artistNames[idx], count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** Same idea for albums — matches against album title OR artist name,
 *  since album titles alone are often ambiguous ("Greatest Hits"). */
export function findAlbumMatches(data, query, fromInt, toInt, limit = 8) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const { albumName, albumArtistIdx, artistNames, eventDate, eventAlbumIdx } = data;

  const matchingIdx = [];
  for (let i = 0; i < albumName.length; i++) {
    if (!albumName[i]) continue;
    if (albumName[i].toLowerCase().includes(q) || artistNames[albumArtistIdx[i]].toLowerCase().includes(q)) {
      matchingIdx.push(i);
      if (matchingIdx.length > 500) break;
    }
  }
  if (matchingIdx.length === 0) return [];

  const idxSet = new Set(matchingIdx);
  const counts = new Map();
  for (let i = 0; i < eventDate.length; i++) {
    const d = eventDate[i];
    if (d < fromInt || d > toInt) continue;
    const alIdx = eventAlbumIdx[i];
    if (idxSet.has(alIdx)) counts.set(alIdx, (counts.get(alIdx) || 0) + 1);
  }

  return [...counts.entries()]
    .map(([idx, count]) => ({ albumIdx: idx, album: albumName[idx], artist: artistNames[albumArtistIdx[idx]], count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
