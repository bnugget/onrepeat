import React, { useMemo, useState } from "react";
import { buildComparison } from "../lib/compareContext.js";
import { compareArtist } from "../lib/compareArtistLeaderboard.js";
import { compareTimeSeries } from "../lib/compareTimeSeries.js";
import { compareGenreDistribution } from "../lib/compareGenreDistribution.js";
import { artistOverlapAnalysis } from "../lib/artistOverlapAnalysis.js";
import { computeListeningRecords } from "../lib/listeningRecords.js";
import { generateComparisonInsight } from "../lib/claudeApi.js";
import { getAnthropicKey, setAnthropicKey } from "../lib/settings.js";
import { renderMarkdownLite } from "../lib/markdownLite.jsx";
import { fetchAllGenreTags } from "../lib/genreTagsApi.js";
import { dateBounds } from "../lib/aggregate.js";
import RankedList from "./RankedList.jsx";
import ComparisonTable from "./ComparisonTable.jsx";
import CompareTimeSeriesChart from "./CompareTimeSeriesChart.jsx";
import GenrePieCompare from "./GenrePieCompare.jsx";
import ArtistOverlapScatter from "./ArtistOverlapScatter.jsx";
import CompareSidebar from "./CompareSidebar.jsx";
import ListeningRecords from "./ListeningRecords.jsx";
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
    title: <>Artist <span>Leaderboard</span></>,
    subhead: "Pick one artist you both listen to and see it head to head — who's the bigger fan relative to their own total listening, not just raw play count, plus each person's own top tracks by that artist."
  },
  timeseries: {
    eyebrow: "Compare Profiles",
    title: <>Artist <span>Trends</span></>,
    subhead: "Pick an artist or a shared genre and see both people's plays over time, side by side — useful for spotting whether you were both going through the same phase at the same time, or years apart."
  }
};

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
  const [minPlays, setMinPlays] = useState(10);

  const [insight, setInsight] = useState(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState(() => getAnthropicKey());
  const [showKeyField, setShowKeyField] = useState(!getAnthropicKey());

  const [artistQuery, setArtistQuery] = useState("");
  const [selectedArtist, setSelectedArtist] = useState(null);

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

  async function handleGenerateInsight() {
    const key = apiKeyInput.trim();
    if (!key) { setShowKeyField(true); return; }
    setAnthropicKey(key);
    setInsightLoading(true);
    try {
      const text = await generateComparisonInsight(comparison, key, instructions);
      setInsight(text);
    } catch (err) {
      setError(err.message || "Couldn't generate an insight.");
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
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="main-content">
        <div className="wrap">
          <div className="mobile-topbar">
            <button className="btn" onClick={() => setSidebarOpen(true)}>☰ Compare setup</button>
          </div>

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
              <nav className="page-nav">
                <button className={subTab === "overview" ? "page-tab active" : "page-tab"} onClick={() => setSubTab("overview")}>Overview</button>
                <button className={subTab === "records" ? "page-tab active" : "page-tab"} onClick={() => setSubTab("records")}>Listening Records</button>
                <button className={subTab === "report" ? "page-tab active" : "page-tab"} onClick={() => setSubTab("report")}>Insights Report</button>
                <button className={subTab === "leaderboard" ? "page-tab active" : "page-tab"} onClick={() => setSubTab("leaderboard")}>Artist Leaderboard</button>
                <button className={subTab === "timeseries" ? "page-tab active" : "page-tab"} onClick={() => setSubTab("timeseries")}>Artist Trends</button>
              </nav>

              {subTab === "overview" && comparison && (
                <>
                  <section className="chart-card" style={{ marginTop: 16 }}>
                <div className="chart-head">
                  <span className="ranked-primary" style={{ fontSize: 16 }}>{comparison.nameA} vs {comparison.nameB}</span>
                </div>
                <p className="chart-hint" style={{ textTransform: "none", fontSize: 12.5, marginBottom: 12 }}>
                  How much of each person's listening went to the same artists, proportionally —
                  not just whether you've both heard of the same people.
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
                        onItemClick={(item) => { setSelectedArtist(item.name); setSubTab("leaderboard"); }}
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
                  {showKeyField && (
                    <input
                      type="password"
                      className="insight-key-input"
                      placeholder="Anthropic API key..."
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                    />
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
                    {insightLoading ? "Thinking..." : insight ? "Regenerate" : "Generate comparison insight"}
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
                    For artists you both actually listen to — ranked by relative priority within
                    each person's own rotation (see the note above).
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
                    onItemClick={(item) => { setSelectedArtist(item.name); setSubTab("leaderboard"); }}
                  />
                </section>
              )}

              {overlap && overlap.mostDifferent.length > 0 && (
                <section className="chart-card" style={{ marginTop: 16 }}>
                  <div className="chart-head">
                    <span className="ranked-primary" style={{ fontSize: 16 }}>Most Different</span>
                  </div>
                  <p className="chart-hint" style={{ textTransform: "none", fontSize: 12.5, marginBottom: 10 }}>
                    Same rank-based approach as Bigger Fan, but across ALL artists — including ones
                    only one of you has ever played, which is often the most polarizing case there is.
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
                    onItemClick={(item) => { setSelectedArtist(item.name); setSubTab("leaderboard"); }}
                  />
                </section>
              )}
            </>
          )}

          {subTab === "leaderboard" && (
            <section className="chart-card" style={{ marginTop: 16 }}>
              <div className="field" style={{ marginBottom: 10 }}>
                <label>Artist</label>
                <input
                  type="text"
                  placeholder="Search an artist either of you has played..."
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
                    Bigger fan is based on rank within each person's own catalog, not raw % — see
                    Overview for why.
                  </p>
                  <div className="leaderboard-tracks-grid">
                    <section>
                      <div className="breakdown-col-label">{artistComparison.nameA}'s top tracks</div>
                      <RankedList items={artistComparison.a.topTracks.map((t, i) => ({ rank: i + 1, key: t.track, primary: t.track, count: t.count }))} />
                    </section>
                    <section>
                      <div className="breakdown-col-label">{artistComparison.nameB}'s top tracks</div>
                      <RankedList items={artistComparison.b.topTracks.map((t, i) => ({ rank: i + 1, key: t.track, primary: t.track, count: t.count }))} />
                    </section>
                  </div>
                </>
              )}
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
                    placeholder="Search an artist either of you has played..."
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
                    <div className="mood-pills" style={{ flexWrap: "wrap" }}>
                      {availableGenresForTs.map((g) => (
                        <button
                          key={g}
                          className={`mood-pill${tsFilterValue === g ? " active" : ""}`}
                          onClick={() => setTsFilterValue(g)}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
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
              <ListeningRecords recordsA={recordsA} recordsB={recordsB} nameA={profileA.name} nameB={profileB.name} />
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
