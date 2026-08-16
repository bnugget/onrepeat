import React, { useMemo, useState } from "react";
import { artistObsessionIndex, songObsessionIndex, formatPeakRange } from "../lib/obsessionIndex.js";
import { detectObsessions } from "../lib/obsessions.js";
import { ordinalToLabel } from "../lib/dateUtils.js";
import RankedList from "./RankedList.jsx";

const WINDOW_OPTIONS = [3, 7, 14, 30];
const MIN_PLAYS_OPTIONS = [5, 10, 20, 50];

export default function ObsessionIndexPage({ data, fromInt, toInt }) {
  const [windowDays, setWindowDays] = useState(7);
  const [mode, setMode] = useState("artist"); // "artist" | "song"
  const [minPlays, setMinPlays] = useState(20);

  const results = useMemo(() => {
    return mode === "artist"
      ? artistObsessionIndex(data, windowDays, fromInt, toInt, minPlays, 100)
      : songObsessionIndex(data, windowDays, fromInt, toInt, minPlays, 100);
  }, [data, mode, windowDays, minPlays, fromInt, toInt]);

  const items = useMemo(
    () =>
      results.map((r, i) => ({
        rank: i + 1,
        key: mode === "artist" ? r.name : `${r.artist}—${r.track}`,
        primary: mode === "artist" ? r.name : r.track,
        secondary: mode === "song" ? r.artist : undefined,
        meta: `${r.peakCount}/${r.totalPlays} plays in range · peaked ${formatPeakRange(r.peakStart, r.peakEnd)}${r.replayCount > 0 ? ` · ${r.replayCount} manual replay${r.replayCount === 1 ? "" : "s"}` : ""}`,
        count: r.totalPlays,
        barPct: r.index,
        display: `${r.index.toFixed(0)}%`
      })),
    [results, mode]
  );

  const onRepeat = useMemo(
    () => detectObsessions(data, { windowDays, minPlays: 4, limit: 20, fromInt, toInt }),
    [data, windowDays, fromInt, toInt]
  );

  return (
    <>
      <header className="top">
        <p className="eyebrow">Obsession Index</p>
        <h1>How <span>Obsessed</span> Are You?</h1>
        <p className="subhead">
          For each {mode}, this blends how concentrated its plays were into your single most
          intense {windowDays}-day stretch with how often you manually hit "play again" right
          after (a stronger signal than proximity alone, where available). High score = a real
          binge. Low score = steady, spread-out listening — a favorite, not an obsession. Only the
          date range above applies; other filters don't touch this page.
        </p>
      </header>

      <section className="chart-card">
        <div className="chart-head">
          <div className="tabs">
            <button className={mode === "artist" ? "tab active" : "tab"} onClick={() => setMode("artist")}>By Artist</button>
            <button className={mode === "song" ? "tab active" : "tab"} onClick={() => setMode("song")}>By Song</button>
          </div>
          <div className="chart-head-right">
            <span className="chart-hint">peak window</span>
            <div className="tabs">
              {WINDOW_OPTIONS.map((d) => (
                <button key={d} className={windowDays === d ? "tab active" : "tab"} onClick={() => setWindowDays(d)}>
                  {d}d
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="chart-head" style={{ marginTop: 4 }}>
          <span className="chart-hint">
            minimum plays — filters out low-sample noise (a {mode} with 5 plays crammed into one
            week isn't really an "obsession," it's just your whole history with it)
          </span>
          <div className="chart-head-right">
            <div className="tabs">
              {MIN_PLAYS_OPTIONS.map((n) => (
                <button key={n} className={minPlays === n ? "tab active" : "tab"} onClick={() => setMinPlays(n)}>
                  {n}+
                </button>
              ))}
            </div>
          </div>
        </div>

        {items.length === 0 ? (
          <p className="mood-empty" style={{ padding: "30px 0", textAlign: "center" }}>
            Nothing clears {minPlays}+ plays in this range — try lowering the minimum or widening the date range.
          </p>
        ) : (
          <RankedList items={items} />
        )}
      </section>

      <section className="mini-chart-card" style={{ marginTop: 16 }}>
        <div className="mini-chart-head">
          <span className="insight-label">◆ On repeat</span>
          <span className="chart-hint">songs played 4+ times within the {windowDays}-day window above</span>
        </div>

        {onRepeat.length === 0 ? (
          <p className="mood-empty">
            No obsession-level bursts in this range at a {windowDays}-day window — try widening the
            date range or the window size above.
          </p>
        ) : (
          <div className="obsession-list">
            {onRepeat.map((o, i) => (
              <div className="obsession-row" key={`${o.songIdx}-${o.startOrd}`}>
                <span className="obsession-rank">{i + 1}</span>
                <div className="obsession-info">
                  <span className="obsession-track">{o.track}</span>
                  <span className="obsession-artist">{o.artist}</span>
                </div>
                <span className="obsession-week">{ordinalToLabel(o.startOrd)}</span>
                <span className="obsession-count">{o.count}×</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
