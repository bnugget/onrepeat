import React, { useMemo, useState } from "react";
import { buildComparison } from "../lib/compareContext.js";
import { compareArtist } from "../lib/compareArtistLeaderboard.js";
import { compareTimeSeries } from "../lib/compareTimeSeries.js";
import { findSharedFandomHotspots } from "../lib/sharedFandomHotspots.js";
import { compareGenreDistribution } from "../lib/compareGenreDistribution.js";
import { artistOverlapAnalysis } from "../lib/artistOverlapAnalysis.js";
import { multiplierBadge } from "../lib/compareFormat.js";
import { computeListeningRecords } from "../lib/listeningRecords.js";
import { generateComparisonInsight } from "../lib/claudeApi.js";
import { getAnthropicKey, setAnthropicKey } from "../lib/settings.js";
import { renderMarkdownLite } from "../lib/markdownLite.jsx";
import { fetchAllGenreTags } from "../lib/genreTagsApi.js";
import { dateBounds } from "../lib/aggregate.js";
import ComparisonTable from "./ComparisonTable.jsx";
import RankedList from "./RankedList.jsx";
import CompareTimeSeriesChart from "./CompareTimeSeriesChart.jsx";
import TrendOverlayChart from "./TrendOverlayChart.jsx";
import GenrePieCompare from "./GenrePieCompare.jsx";
import ArtistOverlapScatter from "./ArtistOverlapScatter.jsx";
import CompareSidebar from "./CompareSidebar.jsx";
import ListeningRecords from "./ListeningRecords.jsx";
import { compareGenreLeaderboard } from "../lib/compareGenreLeaderboard.js";
import { buildPerfectPlaylist } from "../lib/perfectPlaylist.js";
import { buildHiddenGems } from "../lib/hiddenGems.js";
import GenreSearchPicker from "./GenreSearchPicker.jsx";
import TwoLevelNav from "./TwoLevelNav.jsx";
import InsightsReport from "./InsightsReport.jsx";

const SUBTAB_META = {
  overview: {
    eyebrow: "Compare Profiles",
    title: <>Compare <span>Two Profiles</span></>,
    subhead: "A similarity score built to ignore one-off listens, a genre breakdown, which artists you're both genuinely into vs. just one of you, and where your taste diverges most."
  },
  records: {
    eyebrow: "Compare Profiles",
    title: <>Listening <span>Records</span></>,
    subhead: "Head-to-head superlatives — biggest binges, busiest years, longest streaks. Purely for bragging rights, not normalized for fairness like the rest of this comparison."
  },
  report: {
    eyebrow: "Compare Profiles",
    title: <>Insights <span>Report</span></>,
    subhead: "A written research-style report pulling everything else on this page into one narrative — summary, artist overlap, genre overlap, and a fun taste-match verdict."
  },
  leaderboard: {
    eyebrow: "Compare Profiles",
    title: <>Leaderboard</>,
    subhead: "Head to head by artist or by genre — toggle below. Who's the bigger fan relative to their own total listening, not just raw play count."
  },
  playlist: {
    eyebrow: "Compare Profiles",
    title: <>Perfect <span>Playlist</span></>,
    subhead: "Songs that are genuine favorites for both of you — not just artists you share, but the specific tracks that rank near the top of each person's own listening for that artist."
  },
  hiddenGems: {
    eyebrow: "Compare Profiles",
    title: <>Hidden <span>Gems</span></>,
    subhead: "The inverse of Perfect Playlist — for artists you're both genuinely into, songs that are a real favorite for one of you but that the other has never played at all. Grounded recommendations, not cold guesses."
  },
  timeseries: {
    eyebrow: "Compare Profiles",
    title: <>Play <span>Trends</span></>,
    subhead: "Pick an artist or a shared genre and see both people's plays over time, side by side — useful for spotting whether you were both going through the same phase at the same time, or years apart."
  }
};

const COMPARE_NAV_GROUPS = [
  { key: "summary", label: "Summary", subTabs: [
    { key: "overview", label: "Overview" },
    { key: "records", label: "Listening Records" },
    { key: "report", label: "Insights Report" }
  ]},
  { key: "deepDive", label: "Deep Dive", subTabs: [
    { key: "leaderboard", label: "Leaderboard" },
    { key: "timeseries", label: "Play Trends" }
  ]},
  { key: "discover", label: "Discover", subTabs: [
    { key: "playlist", label: "Perfect Playlist" },
    { key: "hiddenGems", label: "Hidden Gems" }
  ]}
];

export default function GroupView({ profiles, getProfileData }) {
  const [idA, setIdA] = useState("");
  const [idB, setIdB] = useState("");
  const [dataA, setDataA] = useState(null);
  const [dataB, setDataB] = useState(null);
  const [genreTags, setGenreTags] = useState({});
  const [genreTagsError, setGenreTagsError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [subTab, setSubTab] = useState("overview");

  const [fromInt, setFromInt] = useState(null);
  const [toInt, setToInt] = useState(null);
  const [minPlays, setMinPlays] = useState(100);

  const [insight, setInsight] = useState(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState(() => getAnthropicKey());
  const [showKeyField, setShowKeyField] = useState(false);

  const [artistQuery, setArtistQuery] = useState("");
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [genreLBSelection, setGenreLBSelection] = useState(null);
  const [leaderboardMode, setLeaderboardMode] = useState("artist");
  const [trendGrain, setTrendGrain] = useState("year");
  const [trendFilterType, setTrendFilterType] = useState("none");
  const [trendFilterValue, setTrendFilterValue] = useState(null);
  const [showHotspots, setShowHotspots] = useState(true);

  const [tsGrain, setTsGrain] = useState("year");
  const [tsFilterType, setTsFilterType] = useState("artist");
  const [tsQuery, setTsQuery] = useState("");
  const [tsFilterValue, setTsFilterValue] = useState(null);
  const [showAllContributors, setShowAllContributors] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const profileA = profiles.find((p) => p.id === idA);
  const profileB = profiles.find((p) => p.id === idB);
  const bothLoaded = !!(dataA && dataB && fromInt !== null);

  const combinedBounds = useMemo(() => {
    if (!dataA || !dataB) return null;
    const ba = dateBounds(dataA);
    const bb = dateBounds(dataB);
    return { min: Math.min(ba.min, bb.min), max: Math.max(ba.max, bb.max) };
  }, [dataA, dataB]);

  async function loadComparison() {
    if (!idA || !idB || idA === idB) return;
    setLoading(true);
    setError(null);
    setGenreTagsError(null);
    setInsight(null);
    setSelectedArtist(null);
    setTsFilterValue(null);
    try {
      const [a, b] = await Promise.all([
        getProfileData(profileA.storage_path),
        getProfileData(profileB.storage_path)
      ]);
      setDataA(a);
      setDataB(b);
      const ba = dateBounds(a);
      const bb = dateBounds(b);
      setFromInt(Math.min(ba.min, bb.min));
      setToInt(Math.max(ba.max, bb.max));

      // Genre tags are supplementary — if this fails, the comparison
      // itself should still work, just without genre data. But the
      // failure needs to be visible, not silently swallowed into an
      // empty object that looks identical to "nobody's tagged
      // anything yet."
      try {
        const tags = await fetchAllGenreTags();
        setGenreTags(tags);
      } catch (genreErr) {
        console.error("Compare Profiles: fetchAllGenreTags failed —", genreErr);
        setGenreTags({});
        setGenreTagsError(genreErr.message || "Unknown error loading shared genre tags.");
      }
    } catch (err) {
      setError(err.message || "Couldn't load one of those profiles.");
    } finally {
      setLoading(false);
    }
  }

  const comparison = useMemo(() => {
    if (!bothLoaded) return null;
    return buildComparison(dataA, profileA.name, dataB, profileB.name, { fromInt, toInt, minPlays });
  }, [bothLoaded, dataA, dataB, profileA, profileB, fromInt, toInt, minPlays]);

  const genreCmp = useMemo(() => {
    if (!bothLoaded) return null;
    return compareGenreDistribution(dataA, dataB, genreTags, fromInt, toInt, 10);
  }, [bothLoaded, dataA, dataB, genreTags, fromInt, toInt]);

  const overlap = useMemo(() => {
    if (!bothLoaded) return null;
    return artistOverlapAnalysis(dataA, dataB, fromInt, toInt, minPlays);
  }, [bothLoaded, dataA, dataB, fromInt, toInt, minPlays]);

  const recordsA = useMemo(() => (bothLoaded ? computeListeningRecords(dataA, fromInt, toInt, genreTags) : null), [bothLoaded, dataA, fromInt, toInt, genreTags]);
  const recordsB = useMemo(() => (bothLoaded ? computeListeningRecords(dataB, fromInt, toInt, genreTags) : null), [bothLoaded, dataB, fromInt, toInt, genreTags]);

  const trendRows = useMemo(() => {
    if (!bothLoaded) return [];
    return compareTimeSeries(dataA, dataB, {
      grain: trendGrain,
      filterType: trendFilterType,
      filterValue: trendFilterValue,
      genreTags,
      fromInt,
      toInt
    });
  }, [bothLoaded, dataA, dataB, trendGrain, trendFilterType, trendFilterValue, genreTags, fromInt, toInt]);

  // Hotspots only make sense against total plays — filtering to one
  // artist/genre and THEN highlighting a different artist's overlap
  // would be a confusing mismatch, so this only computes in "All" mode.
  const trendHotspots = useMemo(() => {
    if (!bothLoaded || trendFilterType !== "none") return [];
    const raw = findSharedFandomHotspots(dataA, dataB, { grain: trendGrain, fromInt, toInt, maxHotspots: 5 });
    const rowByPeriod = new Map(trendRows.map((r, i) => [r.key, { ...r, colIndex: i }]));

    const withPosition = raw
      .map((h) => {
        const row = rowByPeriod.get(h.period);
        if (!row) return null;
        return { ...h, label: row.label, colIndex: row.colIndex, periodStart: row.periodStart, periodEnd: row.periodEnd };
      })
      .filter(Boolean)
      .sort((a, b) => a.colIndex - b.colIndex);

    // Pills placed close together in time collide horizontally at
    // this chart's width — stagger onto a new vertical tier whenever
    // a pill would land within MIN_GAP columns of the last one
    // already placed in its tier, instead of letting them overlap.
    const MIN_GAP = Math.max(2, Math.ceil(trendRows.length / 8));
    const lastColByTier = [];
    return withPosition.map((h) => {
      let tier = 0;
      while (lastColByTier[tier] !== undefined && h.colIndex - lastColByTier[tier] < MIN_GAP) tier++;
      lastColByTier[tier] = h.colIndex;
      return { ...h, tier };
    });
  }, [bothLoaded, trendFilterType, dataA, dataB, trendGrain, fromInt, toInt, trendRows]);

  function handleHotspotClick(h) {
    setSelectedArtist(h.artist);
    setLeaderboardMode("artist");
    setFromInt(h.periodStart);
    setToInt(h.periodEnd);
    setSubTab("leaderboard");
  }

  const perfectPlaylist = useMemo(() => {
    if (!bothLoaded) return [];
    return buildPerfectPlaylist(dataA, dataB, fromInt, toInt, minPlays);
  }, [bothLoaded, dataA, dataB, fromInt, toInt, minPlays]);

  const hiddenGems = useMemo(() => {
    if (!bothLoaded) return null;
    return buildHiddenGems(dataA, comparison?.nameA || profileA?.name, dataB, comparison?.nameB || profileB?.name, fromInt, toInt, minPlays);
  }, [bothLoaded, dataA, dataB, fromInt, toInt, minPlays, comparison, profileA, profileB]);

  const genreLeaderboard = useMemo(() => {
    if (!bothLoaded || !genreLBSelection) return null;
    return compareGenreLeaderboard(dataA, comparison?.nameA || profileA?.name, dataB, comparison?.nameB || profileB?.name, genreTags, genreLBSelection, fromInt, toInt);
  }, [bothLoaded, dataA, dataB, genreTags, genreLBSelection, fromInt, toInt, comparison, profileA, profileB]);

  async function handleGenerateInsight() {
    const key = apiKeyInput.trim();
    if (key) setAnthropicKey(key);
    setInsightLoading(true);
    setError(null);
    try {
      const text = await generateComparisonInsight(comparison, key || undefined, instructions);
      setInsight(text);
    } catch (err) {
      setError(err.message || "Couldn't generate an insight.");
      if (!key) setShowKeyField(true);
    } finally {
      setInsightLoading(false);
    }
  }

  const artistMatches = useMemo(() => {
    if (!bothLoaded || !artistQuery.trim()) return [];
    const q = artistQuery.trim().toLowerCase();
    const union = new Set(
      [...dataA.artistNames, ...dataB.artistNames].filter((n) => n.toLowerCase().includes(q))
    );
    return [...union].sort().slice(0, 8);
  }, [bothLoaded, artistQuery, dataA, dataB]);

  const artistComparison = useMemo(() => {
    if (!bothLoaded || !selectedArtist) return null;
    return compareArtist(dataA, profileA.name, dataB, profileB.name, selectedArtist, fromInt, toInt);
  }, [bothLoaded, selectedArtist, dataA, dataB, profileA, profileB, fromInt, toInt]);

  const tsArtistMatches = useMemo(() => {
    if (!bothLoaded || tsFilterType !== "artist" || !tsQuery.trim()) return [];
    const q = tsQuery.trim().toLowerCase();
    const union = new Set(
      [...dataA.artistNames, ...dataB.artistNames].filter((n) => n.toLowerCase().includes(q))
    );
    return [...union].sort().slice(0, 8);
  }, [bothLoaded, tsFilterType, tsQuery, dataA, dataB]);

  const availableGenresForTs = useMemo(() => {
    if (!bothLoaded) return [];
    const used = new Set();
    [...dataA.artistNames, ...dataB.artistNames].forEach((n) => {
      if (genreTags[n]) used.add(genreTags[n]);
    });
    return [...used].sort();
  }, [bothLoaded, dataA, dataB, genreTags]);

  const tsRows = useMemo(() => {
    if (!bothLoaded || !tsFilterValue) return [];
    return compareTimeSeries(dataA, dataB, {
      grain: tsGrain,
      filterType: tsFilterType,
      filterValue: tsFilterValue,
      genreTags,
      fromInt,
      toInt
    });
  }, [bothLoaded, dataA, dataB, tsGrain, tsFilterType, tsFilterValue, genreTags, fromInt, toInt]);

  return (
    <div className="app-shell">
      <CompareSidebar
        profiles={profiles}
        idA={idA}
        idB={idB}
        onIdAChange={setIdA}
        onIdBChange={setIdB}
        onCompare={loadComparison}
        loading={loading}
        bothLoaded={bothLoaded}
        combinedBounds={combinedBounds}
        fromInt={fromInt}
        toInt={toInt}
        onDateChange={(f, t) => { setFromInt(f); setToInt(t); }}
        minPlays={minPlays}
        onMinPlaysChange={setMinPlays}
        trendFilterType={trendFilterType}
        onTrendFilterTypeChange={setTrendFilterType}
        trendFilterValue={trendFilterValue}
        onTrendFilterValueChange={setTrendFilterValue}
        dataA={dataA}
        dataB={dataB}
        genreTags={genreTags}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="main-content">
        <div className="wrap">
          <div className="mobile-topbar">
            <button className="btn" onClick={() => setSidebarOpen(true)}>☰ Compare setup</button>
          </div>

          {bothLoaded && (
            <TwoLevelNav groups={COMPARE_NAV_GROUPS} active={subTab} onChange={setSubTab} />
          )}

          <header className="top">
            <p className="eyebrow">{bothLoaded ? SUBTAB_META[subTab].eyebrow : "Compare Profiles"}</p>
            <h1>{bothLoaded ? SUBTAB_META[subTab].title : <>Compare <span>Two Profiles</span></>}</h1>
            <p className="subhead">
              {bothLoaded
                ? SUBTAB_META[subTab].subhead
                : "See how two people's music taste actually compares — a similarity score built to ignore one-off listens, a genre breakdown, which artists you're both genuinely into vs. just one of you, and whether you were listening to the same things at the same time. Mood and eras are personal and don't carry over here. Pick two profiles from the sidebar to get started."}
            </p>
          </header>

          {error && <p className="insight-error">{error}</p>}
          {genreTagsError && (
            <p className="insight-error">
              Couldn't load shared genre tags ({genreTagsError}) — genre-related sections below
              will be empty until this loads successfully. Check your connection and try Compare
              again; if it keeps happening, check the browser console for the full error.
            </p>
          )}

          {!bothLoaded && !error && (
            <div className="compare-empty-state">
              <span className="compare-empty-icon">🎧</span>
              <p className="compare-empty-title">Pick two profiles to compare</p>
              <p className="mood-empty" style={{ marginBottom: 20 }}>
                Use the sidebar to choose Profile A and Profile B, then hit Compare.
              </p>
              <div className="compare-empty-preview">
                <span className="compare-empty-chip">Taste similarity</span>
                <span className="compare-empty-chip">Genre breakdown</span>
                <span className="compare-empty-chip">Artist overlap</span>
                <span className="compare-empty-chip">Listening records</span>
                <span className="compare-empty-chip">AI compatibility report</span>
              </div>
            </div>
          )}

          {bothLoaded && (
            <>
              {subTab === "overview" && comparison && (
                <>
                  <section className="chart-card" style={{ marginTop: 16 }}>
                    <div className="chart-head">
                      <span className="ranked-primary" style={{ fontSize: 16 }}>Listening trends over time</span>
                      <div style={{ display: "flex", gap: 16, alignItems: "flex-end" }}>
                        <div className="control-group">
                          <span className="control-label">Hotspots</span>
                          <div className="content-toggle">
                            <button className={showHotspots ? "content-toggle-btn active" : "content-toggle-btn"} onClick={() => setShowHotspots(true)}>On</button>
                            <button className={!showHotspots ? "content-toggle-btn active" : "content-toggle-btn"} onClick={() => setShowHotspots(false)}>Off</button>
                          </div>
                        </div>
                        <div className="control-group">
                          <span className="control-label">Grain</span>
                          <div className="tabs">
                            <button className={trendGrain === "year" ? "tab active" : "tab"} onClick={() => setTrendGrain("year")}>Year</button>
                            <button className={trendGrain === "month" ? "tab active" : "tab"} onClick={() => setTrendGrain("month")}>Month</button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="chart-hint" style={{ textTransform: "none", fontSize: 12.5, marginBottom: 12 }}>
                      Both people's plays overlaid, no grouping — just whether your listening moved
                      together over time or not. Filter by artist or genre in the sidebar; defaults
                      to total plays.{trendFilterType === "none"
                        ? " Shaded bands mark up to 5 periods where you were both genuinely into the same artist — scored by whichever of you listened less, so one person going hard alone doesn't count. Click a pill to see that artist head-to-head, scoped to that exact period."
                        : " Hotspot bands only apply in \"All\" mode — clear the sidebar filter to see them."}
                    </p>
                    <TrendOverlayChart
                      rows={trendRows}
                      nameA={comparison.nameA}
                      nameB={comparison.nameB}
                      hotspots={showHotspots && trendFilterType === "none" ? trendHotspots : null}
                      onHotspotClick={handleHotspotClick}
                    />
                  </section>

                  <section className="chart-card" style={{ marginTop: 16 }}>
                <div className="chart-head">
                  <span className="ranked-primary" style={{ fontSize: 16 }}>{comparison.nameA} vs {comparison.nameB}</span>
                </div>
                <p className="chart-hint" style={{ textTransform: "none", fontSize: 12.5, marginBottom: 12 }}>
                  How much of each person's listening went to the same artists, proportionally —
                  not just whether you've both heard of the same people. Most of what's below —
                  Bigger Fan, Most Different, and the leaderboards — ranks by standing within each
                  person's own rotation rather than raw %, so a wider-ranging listener doesn't look
                  like a smaller fan of everything by default.
                </p>

                <div className="similarity-standalone">
                  <span className="similarity-hero-pct">{comparison.similarityPct}%</span>
                  <span className="similarity-hero-caption">taste similarity</span>
                  <span className="chart-hint" style={{ marginTop: 4 }}>{comparison.similarityLabel}</span>
                  <span className="chart-hint" style={{ marginTop: 8, textTransform: "none", color: "var(--ink-dim)" }}>
                    {comparison.sharedCount} artists both of you have {minPlays}+ plays of
                  </span>
                </div>

                <div style={{ marginTop: 20 }}>
                  <div className="breakdown-col-label">Top contributors to this score</div>
                  <p className="mood-empty" style={{ marginBottom: 8 }}>
                    Shared artists you're both proportionally into, ranked by how much they moved
                    the % above.
                  </p>
                  {overlap && overlap.topContributors.length > 0 ? (
                    <>
                      <ComparisonTable
                        nameA={comparison.nameA}
                        nameB={comparison.nameB}
                        hideWinner
                        items={(showAllContributors ? overlap.topContributors : overlap.topContributors.slice(0, 5)).map((c) => ({
                          key: c.name,
                          name: c.name,
                          cellA: { value: c.countA.toLocaleString(), sub: `${c.pctA.toFixed(1)}%` },
                          cellB: { value: c.countB.toLocaleString(), sub: `${c.pctB.toFixed(1)}%` }
                        }))}
                        onItemClick={(item) => { setSelectedArtist(item.name); setLeaderboardMode("artist"); setSubTab("leaderboard"); }}
                      />
                      {overlap.topContributors.length > 5 && (
                        <button className="btn" style={{ marginTop: 10, width: "100%" }} onClick={() => setShowAllContributors((s) => !s)}>
                          {showAllContributors ? "Show fewer" : `Show all ${overlap.topContributors.length}`}
                        </button>
                      )}
                    </>
                  ) : (
                    <p className="mood-empty">No shared artists clear {minPlays}+ plays yet.</p>
                  )}
                </div>

                <div className="insight-regen" style={{ marginTop: 20 }}>
                  {showKeyField ? (
                    <input
                      type="password"
                      className="insight-key-input"
                      placeholder="Anthropic API key…"
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                    />
                  ) : (
                    <button className="insight-instructions-label" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }} onClick={() => setShowKeyField(true)}>
                      Use your own Anthropic API key instead →
                    </button>
                  )}
                  <label className="insight-instructions-label" htmlFor="compareInstructions">
                    Custom instructions (optional)
                  </label>
                  <textarea
                    id="compareInstructions"
                    className="insight-instructions"
                    placeholder='e.g. "focus only on hip hop overlap" or "roast us a little"'
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    rows={2}
                  />
                  <button className="btn primary" onClick={handleGenerateInsight} disabled={insightLoading}>
                    {insightLoading ? "Thinking…" : insight ? "Regenerate" : "Generate comparison insight"}
                  </button>
                </div>
                {insight && <div className="insight-body" style={{ marginTop: 12 }}>{renderMarkdownLite(insight)}</div>}
              </section>

              {genreCmp && (
                <div style={{ marginTop: 16 }}>
                  <GenrePieCompare genreCmp={genreCmp} nameA={comparison.nameA} nameB={comparison.nameB} />
                </div>
              )}

              {overlap && (
                <section className="chart-card" style={{ marginTop: 16 }}>
                  <div className="chart-head">
                    <span className="ranked-primary" style={{ fontSize: 16 }}>Artist Overlap</span>
                  </div>
                  <p className="chart-hint" style={{ textTransform: "none", fontSize: 12.5, marginBottom: 4 }}>
                    Every shared artist plotted by each person's play share. Dots near the dashed
                    line mean balanced fandom; dots far off it mean one of you cares a lot more.
                  </p>
                  <ArtistOverlapScatter points={overlap.scatterPoints} nameA={comparison.nameA} nameB={comparison.nameB} />
                </section>
              )}

              {overlap && overlap.biggerFanRanking.length > 0 && (
                <section className="chart-card" style={{ marginTop: 16 }}>
                  <div className="chart-head">
                    <span className="ranked-primary" style={{ fontSize: 16 }}>Bigger Fan</span>
                  </div>
                  <p className="chart-hint" style={{ textTransform: "none", fontSize: 12.5, marginBottom: 10 }}>
                    For artists you both actually listen to — same ranking approach noted above.
                  </p>
                  <ComparisonTable
                    nameA={comparison.nameA}
                    nameB={comparison.nameB}
                    items={overlap.biggerFanRanking.slice(0, 10).map((p) => ({
                      key: p.name,
                      name: p.name,
                      cellA: { value: `#${p.rankA}`, sub: `of ${p.catalogSizeA} · ${p.pctA.toFixed(1)}%` },
                      cellB: { value: `#${p.rankB}`, sub: `of ${p.catalogSizeB} · ${p.pctB.toFixed(1)}%` },
                      winner: p.biggerFan
                    }))}
                    onItemClick={(item) => { setSelectedArtist(item.name); setLeaderboardMode("artist"); setSubTab("leaderboard"); }}
                  />
                </section>
              )}

              {overlap && overlap.mostDifferent.length > 0 && (
                <section className="chart-card" style={{ marginTop: 16 }}>
                  <div className="chart-head">
                    <span className="ranked-primary" style={{ fontSize: 16 }}>Most Different</span>
                  </div>
                  <p className="chart-hint" style={{ textTransform: "none", fontSize: 12.5, marginBottom: 10 }}>
                    Same approach as Bigger Fan, extended to ALL artists — including ones only one
                    of you has ever played, often the most polarizing case there is.
                  </p>
                  <ComparisonTable
                    nameA={comparison.nameA}
                    nameB={comparison.nameB}
                    hideWinner
                    items={overlap.mostDifferent.map((d) => ({
                      key: d.name,
                      name: d.name,
                      nameSub: `${d.rankGapPct}% gap`,
                      cellA: d.rankA ? { value: `#${d.rankA}`, sub: `of ${d.catalogSizeA} · ${d.pctA.toFixed(1)}%` } : { value: "—", sub: "never played" },
                      cellB: d.rankB ? { value: `#${d.rankB}`, sub: `of ${d.catalogSizeB} · ${d.pctB.toFixed(1)}%` } : { value: "—", sub: "never played" }
                    }))}
                    onItemClick={(item) => { setSelectedArtist(item.name); setLeaderboardMode("artist"); setSubTab("leaderboard"); }}
                  />
                </section>
              )}
            </>
          )}

          {subTab === "leaderboard" && (
            <section className="chart-card" style={{ marginTop: 16 }}>
              <div className="content-toggle" style={{ marginBottom: 14 }}>
                <button className={leaderboardMode === "artist" ? "content-toggle-btn active" : "content-toggle-btn"} onClick={() => setLeaderboardMode("artist")}>Artist</button>
                <button className={leaderboardMode === "genre" ? "content-toggle-btn active" : "content-toggle-btn"} onClick={() => setLeaderboardMode("genre")}>Genre</button>
              </div>

              {leaderboardMode === "artist" ? (
                <>
                  <div className="field" style={{ marginBottom: 10 }}>
                    <label>Artist</label>
                    <input
                      type="text"
                      placeholder="Search an artist either of you has played…"
                      value={artistQuery}
                      onChange={(e) => setArtistQuery(e.target.value)}
                    />
                  </div>
                  {artistQuery.trim() && (
                    <div className="dist-search-results">
                      {artistMatches.length === 0 && <p className="mood-empty">No matches.</p>}
                      {artistMatches.map((name) => (
                        <button key={name} className="dist-search-result" onClick={() => { setSelectedArtist(name); setArtistQuery(""); }}>
                          <span>{name}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {!selectedArtist ? (
                    <p className="mood-empty" style={{ padding: "30px 0", textAlign: "center" }}>Search an artist above to compare.</p>
                  ) : artistComparison && (
                    <>
                      <div className="chart-head" style={{ marginTop: 8 }}>
                        <span className="ranked-primary" style={{ fontSize: 16 }}>{artistComparison.artistName}</span>
                      </div>
                      <div className="leaderboard-kpi-row">
                        <div className={`leaderboard-kpi${artistComparison.biggerFan === "A" ? " winner" : ""}`}>
                          {artistComparison.biggerFan === "A" && <span className="record-trophy">🏆</span>}
                          <span className="leaderboard-kpi-value">{artistComparison.a.plays.toLocaleString()}</span>
                          <span className="leaderboard-kpi-caption">{artistComparison.nameA} plays</span>
                          <span className="chart-hint" style={{ marginTop: 6, textTransform: "none" }}>
                            #{artistComparison.a.rank} of {artistComparison.a.catalogSize} artists · {artistComparison.a.pctOfTotal.toFixed(1)}% of their listening
                          </span>
                        </div>
                        <div className={`leaderboard-kpi${artistComparison.biggerFan === "B" ? " winner" : ""}`}>
                          {artistComparison.biggerFan === "B" && <span className="record-trophy">🏆</span>}
                          <span className="leaderboard-kpi-value">{artistComparison.b.plays.toLocaleString()}</span>
                          <span className="leaderboard-kpi-caption">{artistComparison.nameB} plays</span>
                          <span className="chart-hint" style={{ marginTop: 6, textTransform: "none" }}>
                            #{artistComparison.b.rank} of {artistComparison.b.catalogSize} artists · {artistComparison.b.pctOfTotal.toFixed(1)}% of their listening
                          </span>
                        </div>
                      </div>
                      <p className="chart-hint" style={{ textTransform: "none", fontSize: 12, marginBottom: 16 }}>
                        "Bigger fan" uses the same ranking approach as Overview, not raw play count.
                      </p>
                      <div className="breakdown-col-label">Top tracks, side by side</div>
                      <ComparisonTable
                        nameA={artistComparison.nameA}
                        nameB={artistComparison.nameB}
                        hideWinner
                        items={artistComparison.trackComparison.map((t) => {
                          const { badgeA, badgeB } = multiplierBadge(t.countA, t.countB);
                          return {
                            key: t.track,
                            name: t.track,
                            cellA: { value: t.countA.toLocaleString(), badge: badgeA },
                            cellB: { value: t.countB.toLocaleString(), badge: badgeB }
                          };
                        })}
                      />
                    </>
                  )}
                </>
              ) : (
                <>
                  <GenreSearchPicker
                    dataA={dataA}
                    dataB={dataB}
                    genreTags={genreTags}
                    value={genreLBSelection}
                    onChange={setGenreLBSelection}
                    placeholder="Search a genre, e.g. Hip Hop…"
                  />

                  {!genreLBSelection ? (
                    <p className="mood-empty" style={{ padding: "30px 0", textAlign: "center" }}>Pick a genre above to compare.</p>
                  ) : genreLeaderboard && (
                    <>
                      <div className="chart-head" style={{ marginTop: 12 }}>
                        <span className="ranked-primary" style={{ fontSize: 16 }}>{genreLeaderboard.genreName}</span>
                        <span className="chart-hint">{genreLeaderboard.totalArtists} artist{genreLeaderboard.totalArtists === 1 ? "" : "s"} between you</span>
                      </div>
                      <ComparisonTable
                        nameA={genreLeaderboard.nameA}
                        nameB={genreLeaderboard.nameB}
                        items={genreLeaderboard.rows.map((r) => {
                          const { badgeA, badgeB } = multiplierBadge(r.countA, r.countB);
                          return {
                            key: r.name,
                            name: r.name,
                            cellA: { value: r.countA.toLocaleString(), badge: badgeA },
                            cellB: { value: r.countB.toLocaleString(), badge: badgeB },
                            winner: r.countA === r.countB ? "tie" : r.countA > r.countB ? "A" : "B"
                          };
                        })}
                        onItemClick={(item) => { setSelectedArtist(item.name); setLeaderboardMode("artist"); }}
                      />
                    </>
                  )}
                </>
              )}
            </section>
          )}

          {subTab === "playlist" && (
            <section className="chart-card" style={{ marginTop: 16 }}>
              <p className="chart-hint" style={{ textTransform: "none", fontSize: 12.5, marginBottom: 12 }}>
                Top 30% of each person's own plays for that artist, both sides. Capped at 50 songs.
              </p>
              {perfectPlaylist.length === 0 ? (
                <p className="mood-empty" style={{ padding: "30px 0", textAlign: "center" }}>
                  No mutual favorites clear the bar yet — try lowering Minimum Plays in the sidebar.
                </p>
              ) : (
                <ComparisonTable
                  nameA={comparison?.nameA || profileA?.name}
                  nameB={comparison?.nameB || profileB?.name}
                  hideWinner
                  items={perfectPlaylist.map((p) => ({
                    key: `${p.artist}|${p.track}`,
                    name: p.track,
                    nameSub: p.artist,
                    cellA: { value: p.countA.toLocaleString(), sub: `${p.pctA}th %ile` },
                    cellB: { value: p.countB.toLocaleString(), sub: `${p.pctB}th %ile` }
                  }))}
                  onItemClick={(item) => { setSelectedArtist(item.nameSub); setLeaderboardMode("artist"); setSubTab("leaderboard"); }}
                />
              )}
            </section>
          )}

          {subTab === "hiddenGems" && hiddenGems && (
            <section className="chart-card" style={{ marginTop: 16 }}>
              <p className="chart-hint" style={{ textTransform: "none", fontSize: 12.5, marginBottom: 12 }}>
                Same top-30% favorite bar as Perfect Playlist. Artist rank shown is how big a fan
                the source person is of that artist overall — a pick from their #1 favorite artist
                carries more weight than one from an artist they only sort of like.
              </p>
              <div className="gems-grid">
                <section>
                  <div className="breakdown-col-label">For {hiddenGems.nameA}</div>
                  {hiddenGems.forA.length === 0 ? (
                    <p className="mood-empty" style={{ padding: "20px 0", textAlign: "center" }}>Nothing qualifies yet.</p>
                  ) : (
                    <RankedList
                      items={hiddenGems.forA.map((g, i) => ({
                        rank: i + 1,
                        key: `${g.artist}|${g.track}`,
                        primary: g.track,
                        secondary: g.artist,
                        count: g.sourceCount,
                        meta: `${hiddenGems.nameB}: ${g.sourcePercentile}th %ile of this artist · their #${g.artistRank} of ${g.artistCatalogSize} artists overall`
                      }))}
                      onItemClick={(item) => { setSelectedArtist(item.secondary); setLeaderboardMode("artist"); setSubTab("leaderboard"); }}
                    />
                  )}
                </section>
                <section>
                  <div className="breakdown-col-label">For {hiddenGems.nameB}</div>
                  {hiddenGems.forB.length === 0 ? (
                    <p className="mood-empty" style={{ padding: "20px 0", textAlign: "center" }}>Nothing qualifies yet.</p>
                  ) : (
                    <RankedList
                      items={hiddenGems.forB.map((g, i) => ({
                        rank: i + 1,
                        key: `${g.artist}|${g.track}`,
                        primary: g.track,
                        secondary: g.artist,
                        count: g.sourceCount,
                        meta: `${hiddenGems.nameA}: ${g.sourcePercentile}th %ile of this artist · their #${g.artistRank} of ${g.artistCatalogSize} artists overall`
                      }))}
                      onItemClick={(item) => { setSelectedArtist(item.secondary); setLeaderboardMode("artist"); setSubTab("leaderboard"); }}
                    />
                  )}
                </section>
              </div>
            </section>
          )}

          {subTab === "timeseries" && (
            <section className="chart-card" style={{ marginTop: 16 }}>
              <div className="chart-head">
                <div className="tabs">
                  <button className={tsFilterType === "artist" ? "tab active" : "tab"} onClick={() => { setTsFilterType("artist"); setTsFilterValue(null); }}>By Artist</button>
                  <button className={tsFilterType === "genre" ? "tab active" : "tab"} onClick={() => { setTsFilterType("genre"); setTsFilterValue(null); }}>By Genre</button>
                </div>
                <div className="chart-head-right">
                  <div className="tabs">
                    <button className={tsGrain === "year" ? "tab active" : "tab"} onClick={() => setTsGrain("year")}>Year</button>
                    <button className={tsGrain === "month" ? "tab active" : "tab"} onClick={() => setTsGrain("month")}>Month</button>
                  </div>
                </div>
              </div>

              {tsFilterType === "artist" ? (
                <div className="field" style={{ margin: "10px 0" }}>
                  <label>Artist</label>
                  <input
                    type="text"
                    placeholder="Search an artist either of you has played…"
                    value={tsQuery}
                    onChange={(e) => setTsQuery(e.target.value)}
                  />
                  {tsQuery.trim() && (
                    <div className="dist-search-results">
                      {tsArtistMatches.length === 0 && <p className="mood-empty">No matches.</p>}
                      {tsArtistMatches.map((name) => (
                        <button key={name} className="dist-search-result" onClick={() => { setTsFilterValue(name); setTsQuery(""); }}>
                          <span>{name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ margin: "10px 0" }}>
                  {availableGenresForTs.length === 0 ? (
                    <p className="mood-empty">
                      Neither profile has any genre-tagged artists yet. Genre tags are per-artist —
                      switch your active profile (top bar) to each one and tag some artists
                      (sidebar → Genre tags) to unlock this.
                    </p>
                  ) : (
                    <GenreSearchPicker
                      dataA={dataA}
                      dataB={dataB}
                      genreTags={genreTags}
                      value={tsFilterValue}
                      onChange={setTsFilterValue}
                      placeholder="Search a genre…"
                    />
                  )}
                </div>
              )}

              {!tsFilterValue ? (
                <p className="mood-empty" style={{ padding: "30px 0", textAlign: "center" }}>
                  Pick an {tsFilterType} above to see both people's listening over time.
                </p>
              ) : (
                <>
                  <p className="chart-hint" style={{ margin: "10px 0" }}>{tsFilterValue}</p>
                  <CompareTimeSeriesChart rows={tsRows} nameA={profileA.name} nameB={profileB.name} />
                </>
              )}
            </section>
          )}

          {subTab === "records" && (
            <div style={{ marginTop: 16 }}>
              <ListeningRecords recordsA={recordsA} recordsB={recordsB} nameA={profileA.name} nameB={profileB.name} dataA={dataA} dataB={dataB} />
            </div>
          )}

          {subTab === "report" && comparison && genreCmp && overlap && (
            <InsightsReport comparison={comparison} genreCmp={genreCmp} overlap={overlap} />
          )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
