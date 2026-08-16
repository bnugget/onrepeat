import React, { useMemo, useState } from "react";
import { rankSongs, totalCount } from "../lib/rankings.js";
import RankedList from "./RankedList.jsx";
import RankModeToggle from "./RankModeToggle.jsx";

export default function TopSongsPage({ data, fromInt, toInt, onSelectSong }) {
  const hasMinutes = !!data.eventMsPlayed;
  const [mode, setMode] = useState("count");

  const ranked = useMemo(() => rankSongs(data, fromInt, toInt, 100, mode), [data, fromInt, toInt, mode]);
  const grandTotal = useMemo(() => totalCount(data, fromInt, toInt, mode), [data, fromInt, toInt, mode]);
  const avg = ranked.length > 0 ? ranked.reduce((a, r) => a + r.count, 0) / ranked.length : 0;

  const items = useMemo(() => {
    return ranked.map((r) => {
      const pctOfTotal = grandTotal > 0 ? (r.count / grandTotal) * 100 : 0;
      const vsAvg = avg > 0 ? ((r.count - avg) / avg) * 100 : 0;
      return {
        rank: r.rank,
        key: r.songIdx,
        primary: r.track,
        secondary: r.artist,
        count: r.count,
        display: mode === "minutes" ? `${r.count.toLocaleString()}m` : undefined,
        statLines: [`${pctOfTotal.toFixed(1)}% of total`, `${vsAvg >= 0 ? "+" : ""}${vsAvg.toFixed(0)}% vs avg`],
        _artist: r.artist,
        _songIdx: r.songIdx,
        _track: r.track
      };
    });
  }, [ranked, grandTotal, avg, mode]);

  return (
    <>
      <header className="top">
        <p className="eyebrow">Ranked · {items.length} song{items.length === 1 ? "" : "s"}</p>
        <h1>Top <span>100 Songs</span></h1>
        <p className="subhead">
          Ordered by {mode === "minutes" ? "minutes listened" : "play count"}, descending,
          within your currently selected date range. Each row shows its share of total listening
          and how it compares to the average across this list. Click a song to see its listening
          distribution.
        </p>
      </header>
      <section className="chart-card">
        <div className="chart-head">
          <RankModeToggle mode={mode} onChange={setMode} hasMinutes={hasMinutes} />
        </div>
        <RankedList
          items={items}
          onItemClick={
            onSelectSong
              ? (item) => onSelectSong(item._artist, { songIdx: item._songIdx, track: item._track })
              : undefined
          }
        />
      </section>
    </>
  );
}
