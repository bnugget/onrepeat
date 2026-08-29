import React, { useMemo, useState } from "react";

/** Search-based artist picker, ordered by combined plays across both
 *  profiles — shown on focus even before typing, same pattern as
 *  GenreSearchPicker. */
export default function ArtistSearchPicker({ dataA, dataB, value, onChange, placeholder }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const rankedArtists = useMemo(() => {
    const counts = new Map();
    function tally(data) {
      for (let i = 0; i < data.eventArtistIdx.length; i++) {
        const name = data.artistNames[data.eventArtistIdx[i]];
        counts.set(name, (counts.get(name) || 0) + 1);
      }
    }
    tally(dataA);
    tally(dataB);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
  }, [dataA, dataB]);

  const filtered = query.trim()
    ? rankedArtists.filter((a) => a.name.toLowerCase().includes(query.trim().toLowerCase()))
    : rankedArtists;

  return (
    <div className="field">
      <label>Artist</label>
      <input
        type="text"
        placeholder={placeholder || "Search an artist…"}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
      />
      {focused && (
        <div className="dist-search-results">
          {filtered.length === 0 && <p className="mood-empty">No matches.</p>}
          {filtered.slice(0, 10).map((a) => (
            <button
              key={a.name}
              className="dist-search-result"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onChange(a.name); setQuery(""); setFocused(false); }}
            >
              <span>{a.name}</span>
              <span className="chart-hint">{a.count.toLocaleString()} plays</span>
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
