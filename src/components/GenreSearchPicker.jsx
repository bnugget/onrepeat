import React, { useMemo, useState } from "react";

/** Search-based genre picker, ordered by how many artists (across
 *  both profiles) carry that tag — shown on focus even before typing,
 *  same "browse or search" pattern as the artist pickers elsewhere on
 *  this page. Replaces a wall of pill buttons for anyone with a lot
 *  of tagged genres. */
export default function GenreSearchPicker({ dataA, dataB, genreTags, value, onChange, placeholder }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const rankedGenres = useMemo(() => {
    const counts = new Map();
    [...dataA.artistNames, ...dataB.artistNames].forEach((n) => {
      const g = genreTags[n];
      if (g) counts.set(g, (counts.get(g) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([genre, count]) => ({ genre, count }));
  }, [dataA, dataB, genreTags]);

  const filtered = query.trim()
    ? rankedGenres.filter((g) => g.genre.toLowerCase().includes(query.trim().toLowerCase()))
    : rankedGenres;

  return (
    <div className="field">
      <label>Genre</label>
      <input
        type="text"
        placeholder={placeholder || "Search a genre…"}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
      />
      {focused && (
        <div className="dist-search-results">
          {rankedGenres.length === 0 && <p className="mood-empty">No genre-tagged artists yet.</p>}
          {filtered.length === 0 && rankedGenres.length > 0 && <p className="mood-empty">No matches.</p>}
          {filtered.slice(0, 10).map((g) => (
            <button
              key={g.genre}
              className="dist-search-result"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onChange(g.genre); setQuery(""); setFocused(false); }}
            >
              <span>{g.genre}</span>
              <span className="chart-hint">{g.count} artist{g.count === 1 ? "" : "s"}</span>
            </button>
          ))}
        </div>
      )}
      {value && (
        <p className="chart-hint" style={{ marginTop: 6, textTransform: "none" }}>
          Selected: <strong style={{ color: "var(--ink)" }}>{value}</strong>
        </p>
      )}
    </div>
  );
}
