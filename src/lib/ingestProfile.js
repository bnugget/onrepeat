import Papa from "papaparse";

const THRESHOLD_MS = 30000; // "real listen" cutoff, same as before
const ASSUMED_LASTFM_MS = 210000; // ~3.5 min estimate — Last.fm has no duration data
const TOP_N = 100;

function normalizePlatform(raw) {
  if (!raw) return "Unknown/Offline";
  const r = raw.toLowerCase();
  if (r.includes("iphone") || r.includes("ipad") || (r.includes("ios") && !r.includes("osx"))) return "iOS";
  if (r.includes("android")) return "Android";
  if (r.includes("sonos")) return "Sonos";
  if (r.includes("amazon") || r.includes("echo") || r.includes("alexa")) return "Amazon Echo";
  if (r.includes("google") || r.includes("cast") || r.includes("chromecast")) return "Google Cast";
  if (r.includes("xbox")) return "Xbox";
  if (r.includes("web_player") || r === "web player" || r.includes("webplayer")) return "Web";
  if (r.includes("osx") || r.includes("os x") || r.includes("mac")) return "macOS";
  if (r.includes("windows") || r.includes("win32")) return "Windows";
  if (r.includes("linux")) return "Linux";
  if (r === "not_applicable" || r === "unknown" || r === "") return "Unknown/Offline";
  return "Other";
}

function dayIntOf(date) {
  return date.getUTCFullYear() * 10000 + (date.getUTCMonth() + 1) * 100 + date.getUTCDate();
}

/** Parse a Last.fm export CSV (columns: timestamp_unix, date, artist,
 *  track, album) into { date: Date, artist, track, album } rows,
 *  dropping the 1970-epoch rows Last.fm uses for missing timestamps. */
function parseLastfmCsv(fileText) {
  const parsed = Papa.parse(fileText, { header: true, skipEmptyLines: true });
  const rows = [];
  for (const row of parsed.data) {
    const dateStr = row.date;
    if (!dateStr) continue;
    const year = dateStr.split(",")[0]?.trim().split(" ").pop();
    if (year === "1970") continue;
    // Format: "16 Dec 2013, 03:56" — not reliably parsed by `new Date()` across browsers
    const m = /^(\d{1,2}) (\w{3}) (\d{4}), (\d{1,2}):(\d{2})$/.exec(dateStr.trim());
    if (!m) continue;
    const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const monthIdx = MONTHS.indexOf(m[2]);
    if (monthIdx === -1) continue;
    const date = new Date(Date.UTC(Number(m[3]), monthIdx, Number(m[1]), Number(m[4]), Number(m[5])));
    rows.push({
      date,
      artist: (row.artist || "").trim(),
      track: (row.track || "").trim(),
      album: (row.album || "").trim(),
      ms: ASSUMED_LASTFM_MS
    });
  }
  return rows;
}

/** Parse one or more Spotify "Extended Streaming History" JSON files
 *  into deduped, music-only, non-phantom rows. */
function parseSpotifyJson(fileTexts) {
  const raw = [];
  for (const text of fileTexts) {
    try {
      const arr = JSON.parse(text);
      if (Array.isArray(arr)) raw.push(...arr);
    } catch {
      // skip unparseable file rather than fail the whole batch
    }
  }
  const seen = new Set();
  const rows = [];
  for (const r of raw) {
    const key = `${r.ts}|${r.spotify_track_uri}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!r.master_metadata_track_name) continue;
    const ms = r.ms_played || 0;
    if (ms <= 0) continue;
    const date = new Date(r.ts);
    if (isNaN(date.getTime())) continue;
    rows.push({
      date,
      artist: (r.master_metadata_album_artist_name || "").trim(),
      track: (r.master_metadata_track_name || "").trim(),
      album: (r.master_metadata_album_album_name || "").trim(),
      ms,
      reason: r.reason_start || "unknown",
      platform: normalizePlatform(r.platform || ""),
      country: r.conn_country || "ZZ"
    });
  }
  return rows;
}

/** Auto-detect where Spotify's export becomes reliably dense, so
 *  Last.fm can fill in whatever came before it. Heuristic: first
 *  month with 50+ events that stays at 30+ for the following two
 *  months (avoids a false trigger from a one-off early blip). Falls
 *  back to the earliest Spotify month if nothing meets that bar. */
function detectSpliceDayInt(spotifyRows) {
  if (spotifyRows.length === 0) return null;
  const monthly = new Map(); // "YYYY-MM" -> count
  for (const r of spotifyRows) {
    const key = `${r.date.getUTCFullYear()}-${String(r.date.getUTCMonth() + 1).padStart(2, "0")}`;
    monthly.set(key, (monthly.get(key) || 0) + 1);
  }
  const months = [...monthly.keys()].sort();
  function countAt(key) { return monthly.get(key) || 0; }
  function nextMonthKey(key) {
    const [y, m] = key.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + 1, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  for (const key of months) {
    if (countAt(key) < 50) continue;
    const next1 = nextMonthKey(key);
    const next2 = nextMonthKey(next1);
    if (countAt(next1) >= 30 && countAt(next2) >= 30) {
      const [y, m] = key.split("-").map(Number);
      return y * 10000 + m * 100 + 1;
    }
  }
  const [y, m] = months[0].split("-").map(Number);
  return y * 10000 + m * 100 + 1;
}

/**
 * Builds a full profile dataset from parsed rows — shared by both a
 * from-scratch upload and a merge with existing data (see
 * mergeProfileData below), so the splice/index/rank logic only lives
 * in one place.
 */
function buildFromRows(lastfmRows, spotifyRows, onProgress) {
  if (lastfmRows.length === 0 && spotifyRows.length === 0) {
    throw new Error("Couldn't find any usable listening history in the uploaded file(s).");
  }

  let spliceDayInt = null;
  let keptLastfm = lastfmRows;
  let keptSpotify = spotifyRows;

  if (lastfmRows.length > 0 && spotifyRows.length > 0) {
    onProgress?.("Detecting where Spotify data becomes reliable…");
    spliceDayInt = detectSpliceDayInt(spotifyRows);
    if (spliceDayInt) {
      keptLastfm = lastfmRows.filter((r) => dayIntOf(r.date) < spliceDayInt);
      keptSpotify = spotifyRows.filter((r) => dayIntOf(r.date) >= spliceDayInt);
    }
  }

  onProgress?.("Building indices…");

  const artistIdx = new Map();
  const allArtists = [];
  const songIdx = new Map();
  const songTrackName = [];
  const songArtistIdx = [];
  const albumIdx = new Map();
  const albumName = [];
  const albumArtistIdx = [];
  const reasonIdx = new Map();
  const reasonStartNames = [];
  const platformIdx = new Map();
  const platformNames = [];
  const countryIdx = new Map();
  const countryNames = [];

  function getArtist(name) {
    if (!artistIdx.has(name)) { artistIdx.set(name, allArtists.length); allArtists.push(name); }
    return artistIdx.get(name);
  }
  function getSong(ai, track) {
    const key = `${ai}|${track}`;
    if (!songIdx.has(key)) { songIdx.set(key, songTrackName.length); songTrackName.push(track); songArtistIdx.push(ai); }
    return songIdx.get(key);
  }
  function getAlbum(ai, album) {
    const key = `${ai}|${album}`;
    if (!albumIdx.has(key)) { albumIdx.set(key, albumName.length); albumName.push(album); albumArtistIdx.push(ai); }
    return albumIdx.get(key);
  }
  function getReason(name) {
    if (!reasonIdx.has(name)) { reasonIdx.set(name, reasonStartNames.length); reasonStartNames.push(name); }
    return reasonIdx.get(name);
  }
  function getPlatform(name) {
    if (!platformIdx.has(name)) { platformIdx.set(name, platformNames.length); platformNames.push(name); }
    return platformIdx.get(name);
  }
  function getCountry(code) {
    if (!countryIdx.has(code)) { countryIdx.set(code, countryNames.length); countryNames.push(code); }
    return countryIdx.get(code);
  }

  const LASTFM_REASON = getReason("lastfm_scrobble");
  const LASTFM_PLATFORM = getPlatform("Last.fm (no device data)");
  const LASTFM_COUNTRY = getCountry("ZZ");

  const eventDate = [];
  const eventArtistIdx = [];
  const eventSongIdx = [];
  const eventAlbumIdx = [];
  const eventMsPlayed = [];
  const eventReasonStart = [];
  const eventPlatformIdx = [];
  const eventCountryIdx = [];

  const artistCountsCounted = new Map();

  for (const r of keptLastfm) {
    if (!r.artist) continue;
    const ai = getArtist(r.artist);
    const si = getSong(ai, r.track);
    const alik = getAlbum(ai, r.album);
    eventDate.push(dayIntOf(r.date));
    eventArtistIdx.push(ai);
    eventSongIdx.push(si);
    eventAlbumIdx.push(alik);
    eventMsPlayed.push(ASSUMED_LASTFM_MS);
    eventReasonStart.push(LASTFM_REASON);
    eventPlatformIdx.push(LASTFM_PLATFORM);
    eventCountryIdx.push(LASTFM_COUNTRY);
    artistCountsCounted.set(ai, (artistCountsCounted.get(ai) || 0) + 1);
  }

  for (const r of keptSpotify) {
    if (!r.artist) continue;
    const ai = getArtist(r.artist);
    const si = getSong(ai, r.track);
    const alik = getAlbum(ai, r.album);
    const ri = getReason(r.reason);
    const pi = getPlatform(r.platform);
    const ci = getCountry(r.country);
    eventDate.push(dayIntOf(r.date));
    eventArtistIdx.push(ai);
    eventSongIdx.push(si);
    eventAlbumIdx.push(alik);
    eventMsPlayed.push(r.ms);
    eventReasonStart.push(ri);
    eventPlatformIdx.push(pi);
    eventCountryIdx.push(ci);
    if (r.ms >= THRESHOLD_MS) {
      artistCountsCounted.set(ai, (artistCountsCounted.get(ai) || 0) + 1);
    }
  }

  onProgress?.("Ranking artists…");
  const topIdx = [...artistCountsCounted.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP_N).map(([ai]) => ai);
  const top100 = topIdx.map((ai) => allArtists[ai]);
  const topRank = new Map(topIdx.map((ai, i) => [ai, i]));
  const artistBucket = allArtists.map((_, ai) => (topRank.has(ai) ? topRank.get(ai) : TOP_N));

  return {
    artistNames: allArtists,
    artistBucket,
    top100,
    eventDate,
    eventArtistIdx,
    eventSongIdx,
    songTrackName,
    songArtistIdx,
    eventAlbumIdx,
    albumName,
    albumArtistIdx,
    eventMsPlayed,
    eventReasonStart,
    reasonStartNames,
    eventPlatformIdx,
    platformNames,
    eventCountryIdx,
    countryNames,
    countPlayThresholdMs: THRESHOLD_MS,
    lastfmSpliceDate: spliceDayInt,
    lastfmAssumedMs: ASSUMED_LASTFM_MS
  };
}

/**
 * Builds a full profile dataset (same shape the dashboard already
 * expects) from raw uploaded file contents. `lastfmCsvText` and
 * `spotifyJsonTexts` are each optional — pass whichever the user
 * actually uploaded.
 */
export function buildProfileData(lastfmCsvText, spotifyJsonTexts, onProgress) {
  onProgress?.("Parsing files…");
  const lastfmRows = lastfmCsvText ? parseLastfmCsv(lastfmCsvText) : [];
  const spotifyRows = spotifyJsonTexts && spotifyJsonTexts.length ? parseSpotifyJson(spotifyJsonTexts) : [];
  return buildFromRows(lastfmRows, spotifyRows, onProgress);
}

/** Reconstructs {date, artist, track, album, ms, reason, platform,
 *  country} rows from an already-processed profile, splitting them
 *  back into "was this Last.fm or Spotify sourced" using the same
 *  synthetic markers the original ingest tagged Last.fm rows with.
 *  Date is reconstructed at noon UTC on the recorded day, since only
 *  day-level granularity is retained after processing — fine for
 *  re-running the splice/rank logic, which never needed finer than
 *  that anyway. */
function flattenProfileData(profileData) {
  const hasMs = !!profileData.eventMsPlayed;
  const lastfmRows = [];
  const spotifyRows = [];
  for (let i = 0; i < profileData.eventDate.length; i++) {
    const d = profileData.eventDate[i];
    const y = Math.floor(d / 10000);
    const m = Math.floor((d % 10000) / 100);
    const day = d % 100;
    const date = new Date(Date.UTC(y, m - 1, day, 12, 0, 0));
    const ai = profileData.eventArtistIdx[i];
    const si = profileData.eventSongIdx[i];
    const alik = profileData.eventAlbumIdx[i];
    const reason = profileData.eventReasonStart ? profileData.reasonStartNames[profileData.eventReasonStart[i]] : "unknown";
    const row = {
      date,
      artist: profileData.artistNames[ai],
      track: profileData.songTrackName[si],
      album: profileData.albumName[alik],
      ms: hasMs ? profileData.eventMsPlayed[i] : ASSUMED_LASTFM_MS,
      reason,
      platform: profileData.eventPlatformIdx ? profileData.platformNames[profileData.eventPlatformIdx[i]] : "Unknown/Offline",
      country: profileData.eventCountryIdx ? profileData.countryNames[profileData.eventCountryIdx[i]] : "ZZ"
    };
    if (reason === "lastfm_scrobble") lastfmRows.push(row);
    else spotifyRows.push(row);
  }
  return { lastfmRows, spotifyRows };
}

/** Composite key for merge-time dedup — day + artist + track + ms
 *  played. Not perfect (two genuinely repeated plays on the same day
 *  with an identical rounded ms value could coincidentally collide),
 *  but it correctly protects against the realistic case: someone
 *  re-uploads a Last.fm export that's a superset of their last one,
 *  or accidentally includes a Spotify file they'd already added
 *  before. Exact play-by-play timestamps aren't retained after
 *  processing, so this is the finest key available at merge time. */
function rowKey(r) {
  return `${dayIntOf(r.date)}|${r.artist}|${r.track}|${r.ms}`;
}
function dedupeRows(rows) {
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    const key = rowKey(r);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

/**
 * Refreshing a profile with new files should ADD to what's already
 * there, not replace it — raw source files are never retained, so
 * without this, refreshing with only a new Last.fm CSV (say) would
 * silently wipe out previously-ingested Spotify history. This
 * reconstructs the existing profile's rows, merges in whatever new
 * files were uploaded, dedupes, and re-runs the exact same
 * splice/index/rank pipeline a fresh upload would use.
 */
export function mergeProfileData(existingProfileData, lastfmCsvText, spotifyJsonTexts, onProgress) {
  onProgress?.("Reading existing profile…");
  const { lastfmRows: existingLastfm, spotifyRows: existingSpotify } = flattenProfileData(existingProfileData);

  onProgress?.("Parsing new files…");
  const newLastfmRows = lastfmCsvText ? parseLastfmCsv(lastfmCsvText) : [];
  const newSpotifyRows = spotifyJsonTexts && spotifyJsonTexts.length ? parseSpotifyJson(spotifyJsonTexts) : [];

  const mergedLastfm = dedupeRows([...existingLastfm, ...newLastfmRows]);
  const mergedSpotify = dedupeRows([...existingSpotify, ...newSpotifyRows]);

  return buildFromRows(mergedLastfm, mergedSpotify, onProgress);
}
