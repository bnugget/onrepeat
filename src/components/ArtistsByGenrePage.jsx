import React, { useMemo, useState } from "react";
import { topGenresByTagCount, rankArtistsInGenre } from "../lib/genreArtists.js";
import { colorForGenre } from "../lib/genreTags.js";
import RankedList from "./RankedList.jsx";
import RankModeToggle from "./RankModeToggle.jsx";

export default function ArtistsByGenrePage({ data, genreTags, fromInt, toInt }) {
  const hasMinutes = !!data.eventMsPlayed;
  const [mode, setMode] = useState("count");

  const topGenres = useMemo(() => topGenresByTagCount(genreTags, 6), [genreTags]);

  const genreData = useMemo(() => {
    return topGenres.map(({ genre, tagCount }) => {
      const { all, total, avg, artistCount } = rankArtistsInGenre(data, genreTags, genre, fromInt, toInt, mode);
      const items = all.slice(0, 10).map((r, i) => {
        const pctOfTotal = total > 0 ? (r.count / total) * 100 : 0;
        const vsAvg = avg > 0 ? ((r.count - avg) / avg) * 100 : 0;
        return {
          rank: i + 1,
          key: r.name,
          primary: r.name,
          count: r.count,
          display: mode === "minutes" ? `${r.count.toLocaleString()}m` : undefined,
          statLines: [`${pctOfTotal.toFixed(1)}% of genre`, `${vsAvg >= 0 ? "+" : ""}${vsAvg.toFixed(0)}% vs avg`]
        };
      });
      return { genre, tagCount, total, artistCount, items };
    });
  }, [topGenres, data, genreTags, fromInt, toInt, mode]);

  if (topGenres.length === 0) {
    return (
      <>
        <header className="top">
          <p className="eyebrow">Artists by Genre</p>
          <h1>Top Artists, <span>By Genre</span></h1>
        </header>
        <section className="chart-card">
          <p className="mood-empty" style={{ padding: "30px 0", textAlign: "center" }}>
            Tag some artists with genres first (sidebar → Genre tags) to see this breakdown.
          </p>
        </section>
      </>
    );
  }

  return (
    <>
      <header className="top">
        <p className="eyebrow">Your {topGenres.length} most-tagged genre{topGenres.length === 1 ? "" : "s"}</p>
        <h1>Top Artists, <span>By Genre</span></h1>
        <p className="subhead">
          The genres with the most artists tagged, each showing their top 10 most-played artists
          within your current date range and filters.
        </p>
      </header>

      <div className="chart-head" style={{ marginBottom: 16 }}>
        <RankModeToggle mode={mode} onChange={setMode} hasMinutes={hasMinutes} />
      </div>

      <div className="genre-columns">
        {genreData.map(({ genre, tagCount, total, artistCount, items }) => (
          <section className="chart-card" key={genre}>
            <div className="genre-column-head">
              <span className="sw" style={{ background: colorForGenre(genre) }} />
              <span className="ranked-primary" style={{ fontSize: 15 }}>{genre}</span>
            </div>
            <p className="chart-hint" style={{ marginBottom: 10 }}>
              {tagCount} artists tagged · {artistCount} with plays in range · {total.toLocaleString()} total {mode === "minutes" ? "minutes" : "plays"}
            </p>
            {items.length === 0 ? (
              <p className="mood-empty">No plays in this range.</p>
            ) : (
              <RankedList items={items} />
            )}
          </section>
        ))}
      </div>
    </>
  );
}
