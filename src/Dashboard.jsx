import React, { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "./components/Sidebar.jsx";
import TwoLevelNav from "./components/TwoLevelNav.jsx";
import InsightDrawer from "./components/InsightDrawer.jsx";
import StackedBarChart from "./components/StackedBarChart.jsx";
import LegendPanel from "./components/LegendPanel.jsx";
import CalendarHeatmap from "./components/CalendarHeatmap.jsx";
import PlatformBreakdown from "./components/PlatformBreakdown.jsx";
import GeographyBreakdown from "./components/GeographyBreakdown.jsx";
import TopArtistsPage from "./components/TopArtistsPage.jsx";
import ArtistsByGenrePage from "./components/ArtistsByGenrePage.jsx";
import TopSongsPage from "./components/TopSongsPage.jsx";
import TopAlbumsPage from "./components/TopAlbumsPage.jsx";
import SongDistributionPage from "./components/SongDistributionPage.jsx";
import ObsessionIndexPage from "./components/ObsessionIndexPage.jsx";
import RankedList from "./components/RankedList.jsx";
import {
  aggregate,
  aggregateMood,
  aggregateByEra,
  dateBounds,
  monthLabel,
  findArtistMatches,
  findAlbumMatches,
  seriesNames,
  generateSeriesColors,
  OTHER_COLOR,
  isoToDayInt,
  yearOf
} from "./lib/aggregate.js";
import { rankArtists, rankAlbums, rankSongs } from "./lib/rankings.js";
import {
  loadMoodTags,
  saveMoodTags,
  colorForMood,
  MOOD_PRESETS,
  UNTAGGED,
  UNTAGGED_COLOR
} from "./lib/moodTags.js";
import {
  loadGenreTags,
  saveGenreTags,
  colorForGenre,
  GENRE_PRESETS,
  UNTAGGED_GENRE,
  UNTAGGED_GENRE_COLOR
} from "./lib/genreTags.js";
import { fetchAllGenreTags, upsertGenreTag, upsertGenreTagsBatch, deleteGenreTagRemote } from "./lib/genreTagsApi.js";
import { loadExcludedArtists, saveExcludedArtists } from "./lib/excludedArtists.js";
import {
  includedArtistsStore,
  includedAlbumsStore,
  excludedAlbumsStore,
  genreFilterStore,
  moodFilterStore,
  eraFilterStore,
  genreExcludeStore,
  moodExcludeStore,
  eraExcludeStore,
  albumKey
} from "./lib/entityFilters.js";
import { loadEras, saveEras } from "./lib/eras.js";
import { dayIntToOrdinal } from "./lib/dateUtils.js";
import { runGenreFetch } from "./lib/lastfm.js";
import { MONTH_SHORT } from "./lib/constants.js";

function ordinalToDayInt(ord) {
  const dt = new Date(ord * 86400000);
  return dt.getUTCFullYear() * 10000 + (dt.getUTCMonth() + 1) * 100 + dt.getUTCDate();
}

function formatRangeLabel(dayInt) {
  const y = Math.floor(dayInt / 10000);
  const m = Math.floor((dayInt % 10000) / 100);
  return `${MONTH_SHORT[m - 1]} ${y}`;
}
function formatPrevMonthLabel(dayInt) {
  const y = Math.floor(dayInt / 10000);
  const m = Math.floor((dayInt % 10000) / 100);
  return m === 1 ? `${MONTH_SHORT[11]} ${y - 1}` : `${MONTH_SHORT[m - 2]} ${y}`;
}

const DASHBOARD_NAV_GROUPS = [
  { key: "summary", label: "Summary", subTabs: [
    { key: "dashboard", label: "Dashboard" },
    { key: "top100", label: "Top 100" }
  ]},
  { key: "deepDive", label: "Deep Dive", subTabs: [
    { key: "byGenre", label: "Artists by Genre" },
    { key: "songDistribution", label: "Song Distribution" }
  ]},
  { key: "discover", label: "Discover", subTabs: [
    { key: "obsessionIndex", label: "Obsession Index" }
  ]}
];

function daysInMonth(y, m) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}
function monthOfDayInt(dayInt) {
  return Math.floor((dayInt % 10000) / 100);
}

function sumTotals(rows, names) {
  const t = {};
  names.forEach((n) => (t[n] = 0));
  rows.forEach((r) => names.forEach((n) => (t[n] += r[n] || 0)));
  return t;
}

export default function Dashboard({ rawData }) {
  const BOUNDS = useMemo(() => dateBounds(rawData), [rawData]);
  const NAMES = useMemo(() => seriesNames(rawData.top100), [rawData]);
  const SERIES_COLORS = useMemo(
    () => [...generateSeriesColors(rawData.top100.length), OTHER_COLOR],
    [rawData]
  );
  const ARTIST_ORDER = useMemo(() => ["Other", ...[...rawData.top100].reverse()], [rawData]);

  const [page, setPage] = useState("dashboard");
  const [top100Mode, setTop100Mode] = useState("artists");
  const [distArtist, setDistArtist] = useState(null);
  const [distSong, setDistSong] = useState(null);
  const [tab, setTab] = useState("artist");
  const [metric, setMetric] = useState("count");
  const [fromInt, setFromInt] = useState(BOUNDS.min);
  const [toInt, setToInt] = useState(BOUNDS.max);
  const [visibleArtist, setVisibleArtist] = useState({});
  const [visibleMood, setVisibleMood] = useState({});
  const [visibleGenre, setVisibleGenre] = useState({});
  const [visibleEra, setVisibleEra] = useState({});
  const [chartGrain, setChartGrain] = useState("year");
  const [breakdownPeriod, setBreakdownPeriod] = useState(null);
  const [moodTags, setMoodTags] = useState(() => loadMoodTags());
  const [genreTags, setGenreTags] = useState(() => loadGenreTags());
  const [genreSyncStatus, setGenreSyncStatus] = useState("syncing"); // "syncing" | "synced" | "error"

  // On mount: pull the shared genre tag pool from Supabase (so a
  // friend's tagging work shows up automatically), then push up
  // anything that only exists locally so it becomes shared too.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const remote = await fetchAllGenreTags();
        if (cancelled) return;
        setGenreTags((local) => {
          const merged = { ...local, ...remote }; // remote wins on conflict — it's the shared source of truth
          const localOnly = {};
          for (const [artist, genre] of Object.entries(local)) {
            if (!(artist in remote)) localOnly[artist] = genre;
          }
          if (Object.keys(localOnly).length > 0) {
            upsertGenreTagsBatch(localOnly).catch((err) => console.warn("Genre tag push failed:", err.message));
          }
          return merged;
        });
        setGenreSyncStatus("synced");
      } catch (err) {
        console.warn("Genre tag sync failed:", err.message);
        setGenreSyncStatus("error");
      }
    })();
    return () => { cancelled = true; };
  }, []);
  const [excludedArtists, setExcludedArtists] = useState(() => loadExcludedArtists());
  const [includedArtists, setIncludedArtists] = useState(() => includedArtistsStore.load());
  const [includedAlbums, setIncludedAlbums] = useState(() => includedAlbumsStore.load());
  const [excludedAlbums, setExcludedAlbums] = useState(() => excludedAlbumsStore.load());
  const [genreInclude, setGenreInclude] = useState(() => genreFilterStore.load());
  const [genreExclude, setGenreExclude] = useState(() => genreExcludeStore.load());
  const [moodInclude, setMoodInclude] = useState(() => moodFilterStore.load());
  const [moodExclude, setMoodExclude] = useState(() => moodExcludeStore.load());
  const [eraInclude, setEraInclude] = useState(() => eraFilterStore.load());
  const [eraExclude, setEraExclude] = useState(() => eraExcludeStore.load());
  const [minPlaysFilter, setMinPlaysFilter] = useState(() => {
    try {
      const raw = localStorage.getItem("scrobble-min-plays-v1");
      return raw !== null ? Number(raw) || 0 : 100;
    } catch {
      return 100;
    }
  });
  const [eras, setEras] = useState(() => loadEras());
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => saveMoodTags(moodTags), [moodTags]);
  useEffect(() => saveGenreTags(genreTags), [genreTags]);
  useEffect(() => saveExcludedArtists(excludedArtists), [excludedArtists]);
  useEffect(() => includedArtistsStore.save(includedArtists), [includedArtists]);
  useEffect(() => includedAlbumsStore.save(includedAlbums), [includedAlbums]);
  useEffect(() => excludedAlbumsStore.save(excludedAlbums), [excludedAlbums]);
  useEffect(() => genreFilterStore.save(genreInclude), [genreInclude]);
  useEffect(() => genreExcludeStore.save(genreExclude), [genreExclude]);
  useEffect(() => moodFilterStore.save(moodInclude), [moodInclude]);
  useEffect(() => moodExcludeStore.save(moodExclude), [moodExclude]);
  useEffect(() => eraFilterStore.save(eraInclude), [eraInclude]);
  useEffect(() => eraExcludeStore.save(eraExclude), [eraExclude]);
  useEffect(() => {
    try { localStorage.setItem("scrobble-min-plays-v1", String(minPlaysFilter)); } catch { /* not fatal */ }
  }, [minPlaysFilter]);
  useEffect(() => saveEras(eras), [eras]);

  useEffect(() => {
    const validIds = new Set(eras.map((e) => e.id));
    setEraInclude((prev) => { const p = prev.filter((id) => validIds.has(id)); return p.length === prev.length ? prev : p; });
    setEraExclude((prev) => { const p = prev.filter((id) => validIds.has(id)); return p.length === prev.length ? prev : p; });
  }, [eras]);

  function addEra(era) { setEras((prev) => [...prev, era]); }
  function removeEra(id) { setEras((prev) => prev.filter((e) => e.id !== id)); }
  function zoomToEra(era) {
    const startOrd = dayIntToOrdinal(isoToDayInt(era.startISO)) - 21;
    const endOrd = dayIntToOrdinal(isoToDayInt(era.endISO)) + 21;
    setFromInt(Math.max(BOUNDS.min, ordinalToDayInt(startOrd)));
    setToInt(Math.min(BOUNDS.max, ordinalToDayInt(endOrd)));
  }

  const artistNameToIdx = useMemo(() => new Map(rawData.artistNames.map((n, i) => [n, i])), []);

  const albumKeyToIdx = useMemo(() => {
    const m = new Map();
    rawData.albumName.forEach((name, i) => {
      if (!name) return;
      m.set(albumKey(rawData.artistNames[rawData.albumArtistIdx[i]], name), i);
    });
    return m;
  }, []);

  const excludedIdxSet = useMemo(
    () => new Set(excludedArtists.map((n) => artistNameToIdx.get(n)).filter((i) => i !== undefined)),
    [excludedArtists, artistNameToIdx]
  );
  const includedArtistIdxSet = useMemo(
    () => new Set(includedArtists.map((n) => artistNameToIdx.get(n)).filter((i) => i !== undefined)),
    [includedArtists, artistNameToIdx]
  );
  const includedAlbumIdxSet = useMemo(
    () => new Set(includedAlbums.map((k) => albumKeyToIdx.get(k)).filter((i) => i !== undefined)),
    [includedAlbums, albumKeyToIdx]
  );
  const excludedAlbumIdxSet = useMemo(
    () => new Set(excludedAlbums.map((k) => albumKeyToIdx.get(k)).filter((i) => i !== undefined)),
    [excludedAlbums, albumKeyToIdx]
  );

  const eraRangesById = useMemo(() => {
    const m = new Map();
    eras.forEach((e) => m.set(e.id, { startInt: isoToDayInt(e.startISO), endInt: isoToDayInt(e.endISO) }));
    return m;
  }, [eras]);

  const filteredData = useMemo(() => {
    const hasArtistInclude = includedArtistIdxSet.size > 0;
    const hasAlbumInclude = includedAlbumIdxSet.size > 0;
    const genreIncludeSet = new Set(genreInclude);
    const genreExcludeSet = new Set(genreExclude);
    const moodIncludeSet = new Set(moodInclude);
    const moodExcludeSet = new Set(moodExclude);
    const includeEraRanges = eraInclude.map((id) => eraRangesById.get(id)).filter(Boolean);
    const excludeEraRanges = eraExclude.map((id) => eraRangesById.get(id)).filter(Boolean);
    const hasMsThreshold = !!rawData.eventMsPlayed;
    const threshold = rawData.countPlayThresholdMs || 30000;
    const hasMinPlays = minPlaysFilter > 0;

    const hasAnyFilter =
      excludedIdxSet.size > 0 || hasArtistInclude ||
      excludedAlbumIdxSet.size > 0 || hasAlbumInclude ||
      genreIncludeSet.size > 0 || genreExcludeSet.size > 0 ||
      moodIncludeSet.size > 0 || moodExcludeSet.size > 0 ||
      includeEraRanges.length > 0 || excludeEraRanges.length > 0 ||
      hasMsThreshold || hasMinPlays;
    if (!hasAnyFilter) return rawData;

    const eventDate = [];
    const eventArtistIdx = [];
    const eventSongIdx = [];
    const eventAlbumIdx = [];
    const eventMsPlayed = hasMsThreshold ? [] : undefined;
    const eventReasonStart = rawData.eventReasonStart ? [] : undefined;
    const eventPlatformIdx = rawData.eventPlatformIdx ? [] : undefined;
    const eventCountryIdx = rawData.eventCountryIdx ? [] : undefined;
    const artistCountsInView = hasMinPlays ? new Map() : null;

    for (let i = 0; i < rawData.eventDate.length; i++) {
      if (hasMsThreshold && rawData.eventMsPlayed[i] < threshold) continue;
      const d = rawData.eventDate[i];
      const ai = rawData.eventArtistIdx[i];
      if (excludedIdxSet.has(ai)) continue;
      if (hasArtistInclude && !includedArtistIdxSet.has(ai)) continue;
      const alIdx = rawData.eventAlbumIdx[i];
      if (excludedAlbumIdxSet.has(alIdx)) continue;
      if (hasAlbumInclude && !includedAlbumIdxSet.has(alIdx)) continue;

      const artistName = rawData.artistNames[ai];
      if (genreExcludeSet.size > 0 && genreExcludeSet.has(genreTags[artistName])) continue;
      if (genreIncludeSet.size > 0 && !genreIncludeSet.has(genreTags[artistName])) continue;
      if (moodExcludeSet.size > 0 && moodExcludeSet.has(moodTags[artistName])) continue;
      if (moodIncludeSet.size > 0 && !moodIncludeSet.has(moodTags[artistName])) continue;

      if (excludeEraRanges.some((r) => d >= r.startInt && d <= r.endInt)) continue;
      if (includeEraRanges.length > 0 && !includeEraRanges.some((r) => d >= r.startInt && d <= r.endInt)) continue;

      if (artistCountsInView && d >= fromInt && d <= toInt) {
        artistCountsInView.set(ai, (artistCountsInView.get(ai) || 0) + 1);
      }

      eventDate.push(d);
      eventArtistIdx.push(ai);
      eventSongIdx.push(rawData.eventSongIdx[i]);
      eventAlbumIdx.push(alIdx);
      if (eventMsPlayed) eventMsPlayed.push(rawData.eventMsPlayed[i]);
      if (eventReasonStart) eventReasonStart.push(rawData.eventReasonStart[i]);
      if (eventPlatformIdx) eventPlatformIdx.push(rawData.eventPlatformIdx[i]);
      if (eventCountryIdx) eventCountryIdx.push(rawData.eventCountryIdx[i]);
    }

    if (!hasMinPlays) {
      return {
        ...rawData,
        eventDate, eventArtistIdx, eventSongIdx, eventAlbumIdx,
        ...(eventMsPlayed ? { eventMsPlayed } : {}),
        ...(eventReasonStart ? { eventReasonStart } : {}),
        ...(eventPlatformIdx ? { eventPlatformIdx } : {}),
        ...(eventCountryIdx ? { eventCountryIdx } : {})
      };
    }

    // Second pass: drop every event belonging to an artist who didn't
    // clear the minimum-plays bar within the CURRENT date range —
    // once an artist fails that bar, they're out of the consideration
    // set entirely (not just outside the range), same as an excluded
    // artist would be.
    const qualifying = new Set([...artistCountsInView.entries()].filter(([, c]) => c >= minPlaysFilter).map(([ai]) => ai));
    const outDate = [], outArtistIdx = [], outSongIdx = [], outAlbumIdx = [];
    const outMs = eventMsPlayed ? [] : undefined;
    const outReason = eventReasonStart ? [] : undefined;
    const outPlatform = eventPlatformIdx ? [] : undefined;
    const outCountry = eventCountryIdx ? [] : undefined;
    for (let j = 0; j < eventDate.length; j++) {
      if (!qualifying.has(eventArtistIdx[j])) continue;
      outDate.push(eventDate[j]);
      outArtistIdx.push(eventArtistIdx[j]);
      outSongIdx.push(eventSongIdx[j]);
      outAlbumIdx.push(eventAlbumIdx[j]);
      if (outMs) outMs.push(eventMsPlayed[j]);
      if (outReason) outReason.push(eventReasonStart[j]);
      if (outPlatform) outPlatform.push(eventPlatformIdx[j]);
      if (outCountry) outCountry.push(eventCountryIdx[j]);
    }
    return {
      ...rawData,
      eventDate: outDate, eventArtistIdx: outArtistIdx, eventSongIdx: outSongIdx, eventAlbumIdx: outAlbumIdx,
      ...(outMs ? { eventMsPlayed: outMs } : {}),
      ...(outReason ? { eventReasonStart: outReason } : {}),
      ...(outPlatform ? { eventPlatformIdx: outPlatform } : {}),
      ...(outCountry ? { eventCountryIdx: outCountry } : {})
    };
  }, [
    excludedIdxSet, includedArtistIdxSet, excludedAlbumIdxSet, includedAlbumIdxSet,
    genreInclude, genreExclude, moodInclude, moodExclude, eraInclude, eraExclude,
    eraRangesById, genreTags, moodTags, minPlaysFilter, fromInt, toInt
  ]);

  const countedRawData = useMemo(() => {
    if (!rawData.eventMsPlayed) return rawData;
    const threshold = rawData.countPlayThresholdMs || 30000;
    const eventDate = [];
    const eventArtistIdx = [];
    const eventSongIdx = [];
    const eventAlbumIdx = [];
    const eventMsPlayed = [];
    const eventReasonStart = [];
    for (let i = 0; i < rawData.eventDate.length; i++) {
      if (rawData.eventMsPlayed[i] < threshold) continue;
      eventDate.push(rawData.eventDate[i]);
      eventArtistIdx.push(rawData.eventArtistIdx[i]);
      eventSongIdx.push(rawData.eventSongIdx[i]);
      eventAlbumIdx.push(rawData.eventAlbumIdx[i]);
      eventMsPlayed.push(rawData.eventMsPlayed[i]);
      if (rawData.eventReasonStart) eventReasonStart.push(rawData.eventReasonStart[i]);
    }
    return { ...rawData, eventDate, eventArtistIdx, eventSongIdx, eventAlbumIdx, eventMsPlayed, eventReasonStart };
  }, []);

  function addExclude(name) { setExcludedArtists((p) => (p.includes(name) ? p : [...p, name])); }
  function removeExclude(name) { setExcludedArtists((p) => p.filter((n) => n !== name)); }
  function addIncludeArtist(name) { setIncludedArtists((p) => (p.includes(name) ? p : [...p, name])); }
  function removeIncludeArtist(name) { setIncludedArtists((p) => p.filter((n) => n !== name)); }
  function addIncludeAlbum(key) { setIncludedAlbums((p) => (p.includes(key) ? p : [...p, key])); }
  function removeIncludeAlbum(key) { setIncludedAlbums((p) => p.filter((k) => k !== key)); }
  function addExcludeAlbum(key) { setExcludedAlbums((p) => (p.includes(key) ? p : [...p, key])); }
  function removeExcludeAlbum(key) { setExcludedAlbums((p) => p.filter((k) => k !== key)); }

  function includeGenre(g) { setGenreInclude((p) => (p.includes(g) ? p : [...p, g])); setGenreExclude((p) => p.filter((x) => x !== g)); }
  function removeIncludedGenre(g) { setGenreInclude((p) => p.filter((x) => x !== g)); }
  function excludeGenre(g) { setGenreExclude((p) => (p.includes(g) ? p : [...p, g])); setGenreInclude((p) => p.filter((x) => x !== g)); }
  function removeExcludedGenre(g) { setGenreExclude((p) => p.filter((x) => x !== g)); }

  function includeMood(m) { setMoodInclude((p) => (p.includes(m) ? p : [...p, m])); setMoodExclude((p) => p.filter((x) => x !== m)); }
  function removeIncludedMood(m) { setMoodInclude((p) => p.filter((x) => x !== m)); }
  function excludeMood(m) { setMoodExclude((p) => (p.includes(m) ? p : [...p, m])); setMoodInclude((p) => p.filter((x) => x !== m)); }
  function removeExcludedMood(m) { setMoodExclude((p) => p.filter((x) => x !== m)); }

  function includeEra(id) { setEraInclude((p) => (p.includes(id) ? p : [...p, id])); setEraExclude((p) => p.filter((x) => x !== id)); }
  function removeIncludedEra(id) { setEraInclude((p) => p.filter((x) => x !== id)); }
  function excludeEra(id) { setEraExclude((p) => (p.includes(id) ? p : [...p, id])); setEraInclude((p) => p.filter((x) => x !== id)); }
  function removeExcludedEra(id) { setEraExclude((p) => p.filter((x) => x !== id)); }

  const artistSearchFn = (query) =>
    findArtistMatches(rawData, query, fromInt, toInt, 8).map((m) => ({ key: m.name, primary: m.name, count: m.count }));
  const albumSearchFn = (query) =>
    findAlbumMatches(rawData, query, fromInt, toInt, 8).map((m) => ({
      key: albumKey(m.artist, m.album), primary: m.album, secondary: m.artist, count: m.count
    }));

  function setTag(artistName, mood) { setMoodTags((p) => ({ ...p, [artistName]: mood })); }
  function removeTag(artistName) { setMoodTags((p) => { const n = { ...p }; delete n[artistName]; return n; }); }
  function importTags(obj) { setMoodTags((p) => ({ ...p, ...obj })); }
  function setGenreTag(artistName, genre) {
    setGenreTags((p) => ({ ...p, [artistName]: genre }));
    upsertGenreTag(artistName, genre).catch((err) => console.warn("Genre tag sync failed:", err.message));
  }
  function removeGenreTag(artistName) {
    setGenreTags((p) => { const n = { ...p }; delete n[artistName]; return n; });
    deleteGenreTagRemote(artistName).catch((err) => console.warn("Genre tag sync failed:", err.message));
  }
  function importGenreTags(obj) {
    setGenreTags((p) => ({ ...p, ...obj }));
    upsertGenreTagsBatch(obj).catch((err) => console.warn("Genre tag sync failed:", err.message));
  }

  const [genreFetchStatus, setGenreFetchStatus] = useState({ running: false, processed: 0, total: 0, tagged: 0, skipped: 0, currentName: "", skippedDetails: [] });
  const genreFetchStopRef = useRef(false);

  async function startGenreFetch(apiKey, rate) {
    const alreadyTagged = new Set(Object.keys(genreTags));
    const toFetch = rawData.artistNames.filter((n) => !alreadyTagged.has(n));
    if (toFetch.length === 0 || !apiKey) return;
    genreFetchStopRef.current = false;
    setGenreFetchStatus({ running: true, processed: 0, total: toFetch.length, tagged: 0, skipped: 0, currentName: "", skippedDetails: [] });
    const rateMs = Math.max(20, Math.round(1000 / rate));
    await runGenreFetch(toFetch, apiKey, {
      rateMs,
      batchSize: Math.max(5, Math.round(rate)),
      onBatch: (batch) => importGenreTags(batch),
      onProgress: (p) => setGenreFetchStatus((s) => ({ ...s, ...p })),
      shouldStop: () => genreFetchStopRef.current
    });
    setGenreFetchStatus((s) => ({ ...s, running: false }));
  }
  function stopGenreFetch() { genreFetchStopRef.current = true; }

  const metricWeights = useMemo(() => {
    if (metric !== "minutes" || !filteredData.eventMsPlayed) return null;
    return filteredData.eventMsPlayed.map((ms) => ms / 60000);
  }, [metric, filteredData]);
  const metricLabel = metric === "minutes" ? "minutes" : "plays";
  const hasMinutes = !!rawData.eventMsPlayed;

  const { yearly, monthly } = useMemo(
    () => aggregate(filteredData, fromInt, toInt, metricWeights),
    [filteredData, fromInt, toInt, metricWeights]
  );

  const { moodNames, moodColors, moodOrder, moodOfArtistIdx } = useMemo(() => {
    const used = [];
    const seen = new Set();
    for (const mood of Object.values(moodTags)) { if (!seen.has(mood)) { seen.add(mood); used.push(mood); } }
    const presetOrder = MOOD_PRESETS.map((p) => p.name);
    used.sort((a, b) => {
      const ai = presetOrder.indexOf(a), bi = presetOrder.indexOf(b);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    });
    const names = [...used, UNTAGGED];
    const colors = [...used.map(colorForMood), UNTAGGED_COLOR];
    const order = [UNTAGGED, ...used];
    const untaggedIdx = names.length - 1;
    const moodArr = new Array(rawData.artistNames.length).fill(untaggedIdx);
    for (const [artistName, mood] of Object.entries(moodTags)) {
      const artistIdx = artistNameToIdx.get(artistName);
      if (artistIdx === undefined) continue;
      const moodIdx = names.indexOf(mood);
      if (moodIdx !== -1) moodArr[artistIdx] = moodIdx;
    }
    return { moodNames: names, moodColors: colors, moodOrder: order, moodOfArtistIdx: moodArr };
  }, [moodTags, artistNameToIdx]);

  const moodAgg = useMemo(
    () => aggregateMood(filteredData, moodOfArtistIdx, moodNames, fromInt, toInt, metricWeights),
    [filteredData, moodOfArtistIdx, moodNames, fromInt, toInt, metricWeights]
  );

  const { genreNames, genreColors, genreOrder, genreOfArtistIdx } = useMemo(() => {
    const used = [];
    const seen = new Set();
    for (const genre of Object.values(genreTags)) { if (!seen.has(genre)) { seen.add(genre); used.push(genre); } }
    const presetOrder = GENRE_PRESETS.map((g) => g.name);
    used.sort((a, b) => {
      const ai = presetOrder.indexOf(a), bi = presetOrder.indexOf(b);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    });
    const names = [...used, UNTAGGED_GENRE];
    const colors = [...used.map(colorForGenre), UNTAGGED_GENRE_COLOR];
    const order = [UNTAGGED_GENRE, ...used];
    const untaggedIdx = names.length - 1;
    const arr = new Array(rawData.artistNames.length).fill(untaggedIdx);
    for (const [artistName, genre] of Object.entries(genreTags)) {
      const artistIdx = artistNameToIdx.get(artistName);
      if (artistIdx === undefined) continue;
      const idx = names.indexOf(genre);
      if (idx !== -1) arr[artistIdx] = idx;
    }
    return { genreNames: names, genreColors: colors, genreOrder: order, genreOfArtistIdx: arr };
  }, [genreTags, artistNameToIdx]);

  const genreAgg = useMemo(
    () => aggregateMood(filteredData, genreOfArtistIdx, genreNames, fromInt, toInt, metricWeights),
    [filteredData, genreOfArtistIdx, genreNames, fromInt, toInt, metricWeights]
  );

  const NEUTRAL_ERA_COLOR = "#C9A8BE";
  const eraChartRanges = useMemo(
    () => eras.map((e) => ({ startInt: isoToDayInt(e.startISO), endInt: isoToDayInt(e.endISO) })),
    [eras]
  );
  const eraViewNames = useMemo(() => [...eras.map((e) => e.label), "No Era"], [eras]);
  const eraViewColors = useMemo(() => [...eras.map((e) => e.color), NEUTRAL_ERA_COLOR], [eras]);
  const eraViewOrder = useMemo(() => ["No Era", ...[...eras.map((e) => e.label)].reverse()], [eras]);
  const eraAgg = useMemo(
    () => aggregateByEra(filteredData, eraChartRanges, fromInt, toInt, metricWeights),
    [filteredData, eraChartRanges, fromInt, toInt, metricWeights]
  );

  const availableGenres = useMemo(() => {
    const used = [];
    const seen = new Set();
    for (const genre of Object.values(genreTags)) { if (!seen.has(genre)) { seen.add(genre); used.push(genre); } }
    return used.sort((a, b) => a.localeCompare(b));
  }, [genreTags]);
  const availableMoods = useMemo(() => {
    const used = [];
    const seen = new Set();
    for (const mood of Object.values(moodTags)) { if (!seen.has(mood)) { seen.add(mood); used.push(mood); } }
    return used.sort((a, b) => a.localeCompare(b));
  }, [moodTags]);

  const genreFilterItems = useMemo(() => {
    const counts = new Map();
    for (let i = 0; i < filteredData.eventDate.length; i++) {
      const d = filteredData.eventDate[i];
      if (d < fromInt || d > toInt) continue;
      const g = genreTags[filteredData.artistNames[filteredData.eventArtistIdx[i]]];
      if (!g) continue;
      counts.set(g, (counts.get(g) || 0) + 1);
    }
    return availableGenres.map((g) => ({ key: g, label: g, color: colorForGenre(g), count: counts.get(g) || 0 }));
  }, [filteredData, fromInt, toInt, genreTags, availableGenres]);

  const moodFilterItems = useMemo(() => {
    const counts = new Map();
    for (let i = 0; i < filteredData.eventDate.length; i++) {
      const d = filteredData.eventDate[i];
      if (d < fromInt || d > toInt) continue;
      const md = moodTags[filteredData.artistNames[filteredData.eventArtistIdx[i]]];
      if (!md) continue;
      counts.set(md, (counts.get(md) || 0) + 1);
    }
    return availableMoods.map((m) => ({ key: m, label: m, color: colorForMood(m), count: counts.get(m) || 0 }));
  }, [filteredData, fromInt, toInt, moodTags, availableMoods]);

  const eraFilterItems = useMemo(() => {
    return eras.map((e) => {
      const range = eraRangesById.get(e.id);
      let count = 0;
      if (range) {
        for (let i = 0; i < filteredData.eventDate.length; i++) {
          const d = filteredData.eventDate[i];
          if (d >= range.startInt && d <= range.endInt) count++;
        }
      }
      return { key: e.id, label: e.label, color: e.color, count };
    });
  }, [eras, eraRangesById, filteredData]);

  const TAB_CONFIG = {
    artist: { agg: { yearly, monthly }, names: NAMES, colors: SERIES_COLORS, order: ARTIST_ORDER, visible: visibleArtist, setVisible: setVisibleArtist },
    mood: { agg: moodAgg, names: moodNames, colors: moodColors, order: moodOrder, visible: visibleMood, setVisible: setVisibleMood },
    genre: { agg: genreAgg, names: genreNames, colors: genreColors, order: genreOrder, visible: visibleGenre, setVisible: setVisibleGenre },
    era: { agg: eraAgg, names: eraViewNames, colors: eraViewColors, order: eraViewOrder, visible: visibleEra, setVisible: setVisibleEra }
  };
  const cfg = TAB_CONFIG[tab];

  const rows = useMemo(() => {
    const src = cfg.agg.yearly;
    const srcMonthly = cfg.agg.monthly;
    const nm = cfg.names;

    if (chartGrain === "year") {
      const years = [...src.keys()].sort((a, b) => a - b);
      return years.map((y) => {
        const counts = src.get(y);
        const row = { key: y, label: String(y), periodStart: y * 10000 + 101, periodEnd: y * 10000 + 1231 };
        nm.forEach((name, i) => (row[name] = counts[i]));
        return row;
      });
    }

    const rowsArr = [];
    let y = yearOf(fromInt);
    let m = monthOfDayInt(fromInt);
    const endY = yearOf(toInt);
    const endM = monthOfDayInt(toInt);
    while (y < endY || (y === endY && m <= endM)) {
      const yMap = srcMonthly.get(y);
      const counts = (yMap && yMap.get(m)) || new Array(nm.length).fill(0);
      const row = {
        key: `${y}-${String(m).padStart(2, "0")}`,
        label: `${monthLabel(m)} '${String(y).slice(2)}`,
        periodStart: y * 10000 + m * 100 + 1,
        periodEnd: y * 10000 + m * 100 + daysInMonth(y, m)
      };
      nm.forEach((name, i) => (row[name] = counts[i]));
      rowsArr.push(row);
      m++;
      if (m > 12) { m = 1; y++; }
    }
    return rowsArr;
  }, [tab, chartGrain, cfg, fromInt, toInt]);

  const { names, colors, order, visible, setVisible } = cfg;
  const totals = useMemo(() => sumTotals(rows, names), [rows, names]);
  const roundedTotals = useMemo(() => {
    if (metric !== "minutes") return totals;
    const t = {};
    for (const k in totals) t[k] = Math.round(totals[k]);
    return t;
  }, [totals, metric]);

  function toggleSeries(name) { setVisible((v) => ({ ...v, [name]: v[name] === false ? true : false })); }
  function showAll() { setVisible({}); }
  function hideAll() {
    const next = {};
    names.forEach((n) => { next[n] = false; });
    setVisible(next);
  }
  function showTopArtists(n) {
    const next = {};
    NAMES.forEach((name, i) => {
      if (name !== "Other" && i >= n) next[name] = false;
    });
    setVisibleArtist(next);
  }
  function resetFilters() {
    setFromInt(BOUNDS.min);
    setToInt(BOUNDS.max);
    setVisibleArtist({});
    setVisibleMood({});
    setVisibleGenre({});
    setVisibleEra({});
    setChartGrain("year");
    setBreakdownPeriod(null);
  }
  function handlePeriodClick(key) {
    const idx = rows.findIndex((r) => r.key === key);
    if (idx === -1) return;
    const row = rows[idx];
    const prevRow = idx > 0 ? rows[idx - 1] : null;
    setBreakdownPeriod((prev) =>
      prev && prev.fromInt === row.periodStart && prev.toInt === row.periodEnd
        ? null
        : {
            label: row.label,
            fromInt: row.periodStart,
            toInt: row.periodEnd,
            prevFromInt: prevRow ? prevRow.periodStart : null,
            prevToInt: prevRow ? prevRow.periodEnd : null
          }
    );
  }
  function openSongDistribution(artistName, song) {
    setDistArtist(artistName);
    setDistSong(song || null);
    setPage("songDistribution");
  }

  const breakdownData = useMemo(() => {
    if (!breakdownPeriod) return null;
    const artists = rankArtists(filteredData, breakdownPeriod.fromInt, breakdownPeriod.toInt, 15);
    const albums = rankAlbums(filteredData, breakdownPeriod.fromInt, breakdownPeriod.toInt, 15);
    const songs = rankSongs(filteredData, breakdownPeriod.fromInt, breakdownPeriod.toInt, 15);

    const hasPrevPeriod = breakdownPeriod.prevFromInt !== null;
    const prevArtistMap = new Map();
    const prevAlbumMap = new Map();
    const prevSongMap = new Map();
    if (hasPrevPeriod) {
      rankArtists(filteredData, breakdownPeriod.prevFromInt, breakdownPeriod.prevToInt, 100000)
        .forEach((r) => prevArtistMap.set(r.name, r.count));
      rankAlbums(filteredData, breakdownPeriod.prevFromInt, breakdownPeriod.prevToInt, 100000)
        .forEach((r) => prevAlbumMap.set(r.albumIdx, r.count));
      rankSongs(filteredData, breakdownPeriod.prevFromInt, breakdownPeriod.prevToInt, 100000)
        .forEach((r) => prevSongMap.set(r.songIdx, r.count));
    }

    function withPop(list, prevMap, keyFn) {
      if (!hasPrevPeriod) return list.map((r) => ({ ...r, pop: null }));
      return list.map((r) => {
        const prevVal = prevMap.get(keyFn(r)) || 0;
        return { ...r, pop: prevVal === 0 ? "new" : ((r.count - prevVal) / prevVal) * 100 };
      });
    }

    return {
      artists: withPop(artists, prevArtistMap, (r) => r.name),
      albums: withPop(albums, prevAlbumMap, (r) => r.albumIdx),
      songs: withPop(songs, prevSongMap, (r) => r.songIdx)
    };
  }, [breakdownPeriod, filteredData]);

  const chartEras = useMemo(() => {
    if (tab === "era") return null;
    return eras.map((e) => ({
      id: e.id, label: e.label, color: e.color,
      startInt: isoToDayInt(e.startISO), endInt: isoToDayInt(e.endISO)
    }));
  }, [eras, tab]);

  const rangeTotal = useMemo(() => rows.reduce((a, r) => a + names.reduce((s, n) => s + (r[n] || 0), 0), 0), [rows, names]);

  return (
    <div className="app-shell">
      <Sidebar
        data={rawData}
        bounds={BOUNDS}
        fromInt={fromInt}
        toInt={toInt}
        onDateChange={(f, t) => { setFromInt(f); setToInt(t); }}
        minPlaysFilter={minPlaysFilter}
        onMinPlaysChange={setMinPlaysFilter}
        onReset={resetFilters}
        moodTags={moodTags}
        onSetMoodTag={setTag}
        onRemoveMoodTag={removeTag}
        onImportMoodTags={importTags}
        genreTags={genreTags}
        onSetGenreTag={setGenreTag}
        onRemoveGenreTag={removeGenreTag}
        onImportGenreTags={importGenreTags}
        genreFetchStatus={genreFetchStatus}
        genreSyncStatus={genreSyncStatus}
        onStartGenreFetch={startGenreFetch}
        onStopGenreFetch={stopGenreFetch}
        eras={eras}
        onAddEra={addEra}
        onRemoveEra={removeEra}
        onZoomEra={zoomToEra}
        eraBounds={BOUNDS}
        artistSearchFn={artistSearchFn}
        includedArtists={includedArtists}
        excludedArtists={excludedArtists}
        onIncludeArtist={addIncludeArtist}
        onRemoveIncludedArtist={removeIncludeArtist}
        onExcludeArtist={addExclude}
        onRemoveExcludedArtist={removeExclude}
        albumSearchFn={albumSearchFn}
        includedAlbums={includedAlbums}
        excludedAlbums={excludedAlbums}
        onIncludeAlbum={addIncludeAlbum}
        onRemoveIncludedAlbum={removeIncludeAlbum}
        onExcludeAlbum={addExcludeAlbum}
        onRemoveExcludedAlbum={removeExcludeAlbum}
        genreFilterItems={genreFilterItems}
        genreInclude={genreInclude}
        genreExclude={genreExclude}
        onIncludeGenre={includeGenre}
        onExcludeGenre={excludeGenre}
        onRemoveIncludedGenre={removeIncludedGenre}
        onRemoveExcludedGenre={removeExcludedGenre}
        moodFilterItems={moodFilterItems}
        moodInclude={moodInclude}
        moodExclude={moodExclude}
        onIncludeMood={includeMood}
        onExcludeMood={excludeMood}
        onRemoveIncludedMood={removeIncludedMood}
        onRemoveExcludedMood={removeExcludedMood}
        eraFilterItems={eraFilterItems}
        eraInclude={eraInclude}
        eraExclude={eraExclude}
        onIncludeEra={includeEra}
        onExcludeEra={excludeEra}
        onRemoveIncludedEra={removeIncludedEra}
        onRemoveExcludedEra={removeExcludedEra}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <InsightDrawer
        data={filteredData}
        fromInt={fromInt}
        toInt={toInt}
        moodTags={moodTags}
        genreTags={genreTags}
        eras={eras}
        excludedArtists={excludedArtists}
      />

      <main className="main-content">
        <div className="wrap">
          <div className="mobile-topbar">
            <button className="btn" onClick={() => setSidebarOpen(true)}>☰ Filters</button>
          </div>

          <TwoLevelNav groups={DASHBOARD_NAV_GROUPS} active={page} onChange={setPage} />

          {page === "byGenre" && <ArtistsByGenrePage data={filteredData} genreTags={genreTags} fromInt={fromInt} toInt={toInt} />}
          {page === "top100" && (
            <>
              <div className="content-toggle" style={{ marginBottom: 16 }}>
                <button className={top100Mode === "artists" ? "content-toggle-btn active" : "content-toggle-btn"} onClick={() => setTop100Mode("artists")}>Artists</button>
                <button className={top100Mode === "songs" ? "content-toggle-btn active" : "content-toggle-btn"} onClick={() => setTop100Mode("songs")}>Songs</button>
                <button className={top100Mode === "albums" ? "content-toggle-btn active" : "content-toggle-btn"} onClick={() => setTop100Mode("albums")}>Albums</button>
              </div>
              {top100Mode === "artists" && <TopArtistsPage data={filteredData} fromInt={fromInt} toInt={toInt} onSelectArtist={openSongDistribution} />}
              {top100Mode === "songs" && <TopSongsPage data={filteredData} fromInt={fromInt} toInt={toInt} onSelectSong={openSongDistribution} />}
              {top100Mode === "albums" && <TopAlbumsPage data={filteredData} fromInt={fromInt} toInt={toInt} />}
            </>
          )}
          {page === "songDistribution" && (
            <SongDistributionPage
              data={rawData}
              fromInt={fromInt}
              toInt={toInt}
              artistNameToIdx={artistNameToIdx}
              selectedArtist={distArtist}
              onSelectArtist={setDistArtist}
              selectedSong={distSong}
              onSelectSong={setDistSong}
            />
          )}
          {page === "obsessionIndex" && (
            <ObsessionIndexPage data={countedRawData} fromInt={fromInt} toInt={toInt} />
          )}

          {page === "dashboard" && (
            <>
              <header className="top">
                <p className="eyebrow">Spotify + Last.fm Archive · {formatRangeLabel(fromInt)} – {formatRangeLabel(toInt)}</p>
                <h1>Listening <span>Timeline</span></h1>
                <p className="subhead">
                  {rangeTotal.toLocaleString()} {metricLabel} in the selected range. Click a bar to
                  see what made it up. Filters, tagging, and eras all live in the sidebar.
                </p>
              </header>

              <section className="chart-card">
                <div className="chart-controls">
                  <div className="control-group">
                    <span className="control-label">View</span>
                    <div className="tabs">
                      <button className={tab === "artist" ? "tab active" : "tab"} onClick={() => setTab("artist")}>By Artist</button>
                      <button className={tab === "mood" ? "tab active" : "tab"} onClick={() => setTab("mood")}>By Mood</button>
                      <button className={tab === "genre" ? "tab active" : "tab"} onClick={() => setTab("genre")}>By Genre</button>
                      <button className={tab === "era" ? "tab active" : "tab"} onClick={() => setTab("era")}>By Era</button>
                    </div>
                  </div>

                  <div className="control-group">
                    <span className="control-label">Grain</span>
                    <div className="tabs">
                      <button className={chartGrain === "year" ? "tab active" : "tab"} onClick={() => setChartGrain("year")}>Year</button>
                      <button className={chartGrain === "month" ? "tab active" : "tab"} onClick={() => setChartGrain("month")}>Month</button>
                    </div>
                  </div>

                  {hasMinutes && (
                    <div className="control-group">
                      <span className="control-label">Metric</span>
                      <div className="tabs">
                        <button className={metric === "count" ? "tab active" : "tab"} onClick={() => setMetric("count")}>Times played</button>
                        <button className={metric === "minutes" ? "tab active" : "tab"} onClick={() => setMetric("minutes")}>Minutes</button>
                      </div>
                    </div>
                  )}

                  {tab === "artist" && (
                    <div className="control-group">
                      <span className="control-label">Show only</span>
                      <div className="tabs">
                        <button className="tab" onClick={() => showTopArtists(10)}>Top 10</button>
                        <button className="tab" onClick={() => showTopArtists(25)}>Top 25</button>
                        <button className="tab" onClick={() => showTopArtists(100)}>Top 100</button>
                      </div>
                    </div>
                  )}
                </div>
                <p className="chart-hint" style={{ marginTop: 10, marginBottom: 0 }}>click a bar for its artist/album/song breakdown</p>

                <div className="chart-with-legend">
                  <StackedBarChart
                    rows={rows}
                    names={names}
                    colors={colors}
                    order={order}
                    visible={visible}
                    eras={chartEras}
                    metricLabel={metricLabel}
                    onBarClick={handlePeriodClick}
                  />
                  <LegendPanel
                    names={names}
                    colors={colors}
                    visible={visible}
                    totals={roundedTotals}
                    onToggle={toggleSeries}
                    onShowAll={showAll}
                    onHideAll={hideAll}
                    metricLabel={metricLabel}
                  />
                </div>
              </section>

              {breakdownPeriod && breakdownData && (
                <section className="chart-card" style={{ marginTop: 16 }}>
                  <div className="chart-head">
                    <span className="chart-hint" style={{ textTransform: "none", fontSize: 13, color: "var(--ink)" }}>
                      Play breakdown — {breakdownPeriod.label} <span className="chart-hint" style={{ textTransform: "none" }}>(% vs previous period)</span>
                    </span>
                    <button className="btn" onClick={() => setBreakdownPeriod(null)}>Close</button>
                  </div>
                  <div className="breakdown-grid">
                    <div>
                      <div className="breakdown-col-label">Artists</div>
                      <RankedList
                        items={breakdownData.artists.map((r) => ({ rank: r.rank, key: r.name, primary: r.name, count: r.count, pop: r.pop }))}
                        onItemClick={(item) => openSongDistribution(item.primary)}
                      />
                    </div>
                    <div>
                      <div className="breakdown-col-label">Albums</div>
                      <RankedList
                        items={breakdownData.albums.map((r) => ({ rank: r.rank, key: r.albumIdx, primary: r.album, secondary: r.artist, count: r.count, pop: r.pop }))}
                      />
                    </div>
                    <div>
                      <div className="breakdown-col-label">Songs</div>
                      <RankedList
                        items={breakdownData.songs.map((r) => ({ rank: r.rank, key: r.songIdx, primary: r.track, secondary: r.artist, count: r.count, pop: r.pop }))}
                        onItemClick={(item) => openSongDistribution(item.secondary, { songIdx: item.key, track: item.primary })}
                      />
                    </div>
                  </div>
                </section>
              )}

              <CalendarHeatmap data={filteredData} minYear={yearOf(BOUNDS.min)} maxYear={yearOf(BOUNDS.max)} initialYear={yearOf(toInt)} />
              <PlatformBreakdown data={filteredData} fromInt={fromInt} toInt={toInt} />
              <GeographyBreakdown data={filteredData} fromInt={fromInt} toInt={toInt} />
            </>
          )}

          <footer>
            Source: {rawData.lastfmSpliceDate
              ? <>Last.fm plays through {formatPrevMonthLabel(rawData.lastfmSpliceDate)}, Spotify Extended
                  Streaming History from {formatRangeLabel(rawData.lastfmSpliceDate)} on</>
              : "Spotify Extended Streaming History"} ·{" "}
            {rawData.eventDate.length.toLocaleString()} events kept (phantom 0ms Spotify entries
            discarded) · plays under {(rawData.countPlayThresholdMs || 30000) / 1000}s counted as
            skips, not real listens · Last.fm-era minutes-listened figures are estimated
            (~{Math.round((rawData.lastfmAssumedMs || 210000) / 60000 * 10) / 10} min/play assumed —
            Last.fm doesn't record actual duration), Spotify-era figures are exact · Local build,
            no network calls except the Last.fm / Claude lookups you trigger yourself.
          </footer>
        </div>
      </main>
    </div>
  );
}
