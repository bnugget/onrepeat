import React, { useMemo, useState } from "react";
import { findArtistMatches } from "../lib/aggregate.js";
import { topTracksForArtist, skipRateForArtist, skipRateForSong } from "../lib/songDetail.js";
import RankedList from "./RankedList.jsx";
import RankModeToggle from "./RankModeToggle.jsx";

export default function SongDistributionPage({
  data,
  fromInt,
  toInt,
  artistNameToIdx,
  selectedArtist,
  onSelectArtist,
  selectedSong,
  onSelectSong
}) {
  const [query, setQuery] = useState("");
  const hasMinutes = !!data.eventMsPlayed;
  const [mode, setMode] = useState("count");

  const matches = useMemo(() => {
    if (!query.trim()) return [];
    return findArtistMatches(data, query, fromInt, toInt, 8);
  }, [data, query, fromInt, toInt]);

  const artistIdx = selectedArtist ? artistNameToIdx.get(selectedArtist) : undefined;

  const tracks = useMemo(() => {
    if (artistIdx === undefined) return [];
    return topTracksForArtist(data, artistIdx, fromInt, toInt, 500, mode);
  }, [data, artistIdx, fromInt, toInt, mode]);

  const artistTotal = useMemo(() => tracks.reduce((a, t) => a + t.count, 0), [tracks]);
  const avgPerTrack = tracks.length > 0 ? artistTotal / tracks.length : 0;

  const top5Share = useMemo(() => {
    if (artistTotal === 0) return null;
    const top5 = tracks.slice(0, 5).reduce((a, t) => a + t.count, 0);
    return (top5 / artistTotal) * 100;
  }, [tracks, artistTotal]);

  const trackItems = useMemo(
    () =>
      tracks.map((t, i) => {
        const pctOfTotal = artistTotal > 0 ? (t.count / artistTotal) * 100 : 0;
        const vsAvg = avgPerTrack > 0 ? ((t.count - avgPerTrack) / avgPerTrack) * 100 : 0;
        return {
          rank: i + 1,
          key: t.songIdx,
          primary: t.track,
          count: t.count,
          display: mode === "minutes" ? `${t.count.toLocaleString()}m` : undefined,
          statLines: [`${pctOfTotal.toFixed(1)}% of ${selectedArtist}`, `${vsAvg >= 0 ? "+" : ""}${vsAvg.toFixed(0)}% vs avg track`]
        };
      }),
    [tracks, artistTotal, avgPerTrack, mode, selectedArtist]
  );

  const skipRate = useMemo(() => {
    if (!selectedArtist || artistIdx === undefined) return null;
    return selectedSong
      ? skipRateForSong(data, selectedSong.songIdx, fromInt, toInt)
      : skipRateForArtist(data, artistIdx, fromInt, toInt);
  }, [data, selectedArtist, selectedSong, artistIdx, fromInt, toInt]);

  return (
    <>
      <header className="top">
        <p className="eyebrow">Song Distribution</p>
        <h1>Which Songs <span>Actually</span> Get Played?</h1>
        <p className="subhead">
          Pick an artist to see their tracks ranked by real listens, with each one's share of your
          total listening to that artist and how it compares to their average track. Only the date
          range above applies here — mood/genre tags, eras, and exclusions don't touch this page.
        </p>
      </header>

      <section className="chart-card">
        <div className="field" style={{ marginBottom: 10 }}>
          <label htmlFor="distArtistSearch">Artist</label>
          <input
            id="distArtistSearch"
            type="text"
            placeholder="Search any artist…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
        </div>

        {query.trim() && (
          <div className="dist-search-results">
            {matches.length === 0 && <p className="mood-empty">No matches in the current date range.</p>}
            {matches.map((m) => (
              <button
                key={m.name}
                className="dist-search-result"
                onClick={() => {
                  onSelectArtist(m.name);
                  onSelectSong(null);
                  setQuery("");
                }}
              >
                <span>{m.name}</span>
                <span className="chart-hint">{m.count.toLocaleString()} plays</span>
              </button>
            ))}
          </div>
        )}

        {!selectedArtist ? (
          <p className="mood-empty" style={{ padding: "30px 0", textAlign: "center" }}>
            Search for an artist above to get started.
          </p>
        ) : (
          <>
            <div className="chart-head" style={{ marginTop: 14 }}>
              <span className="ranked-primary" style={{ fontSize: 15 }}>{selectedArtist}</span>
              <RankModeToggle mode={mode} onChange={setMode} hasMinutes={hasMinutes} />
            </div>

            <div className="dist-stat-row">
              {skipRate && (
                <div className="skip-rate-badge">
                  <span className="skip-rate-pct">{skipRate.skipRatePct.toFixed(0)}%</span>
                  <span className="chart-hint">
                    skip rate{selectedSong ? ` — "${selectedSong.track}"` : ` — all of ${selectedArtist}`}
                    {" "}({skipRate.skipped.toLocaleString()} of {skipRate.total.toLocaleString()} plays under 30s)
                  </span>
                </div>
              )}
              {top5Share !== null && tracks.length > 5 && (
                <div className="skip-rate-badge">
                  <span className="skip-rate-pct">{top5Share.toFixed(0)}%</span>
                  <span className="chart-hint">of all {selectedArtist} listening comes from just their top 5 tracks</span>
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {selectedArtist && tracks.length > 0 && (
        <section className="chart-card" style={{ marginTop: 16 }}>
          <div className="chart-head">
            <span className="chart-hint">{tracks.length} distinct tracks, ranked by {mode === "minutes" ? "minutes listened" : "plays"}</span>
          </div>
          <RankedList
            items={trackItems}
            onItemClick={(item) => onSelectSong(selectedSong?.songIdx === item.key ? null : { songIdx: item.key, track: item.primary })}
            selectedKey={selectedSong?.songIdx ?? null}
          />
        </section>
      )}
    </>
  );
}
