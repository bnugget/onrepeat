import React, { useMemo, useState } from "react";

/**
 * Generic search + include/exclude filter. `searchFn(query)` should
 * return [{ key, primary, secondary?, count }]. `key` is whatever
 * stable string identifies the entity for persistence (artist name,
 * or "Artist — Album" for albums).
 */
export default function EntityIncludeExclude({
  label,
  placeholder,
  searchFn,
  includedList,
  excludedList,
  onInclude,
  onExclude,
  onRemoveIncluded,
  onRemoveExcluded
}) {
  const [query, setQuery] = useState("");

  const matches = useMemo(() => (query.trim() ? searchFn(query) : []), [query, searchFn]);

  return (
    <section className="mood-tagger">
      <div className="mood-tagger-head">
        <span className="insight-label">◆ {label}</span>
        <span className="chart-hint">{includedList.length} included · {excludedList.length} excluded</span>
      </div>

      <div className="field" style={{ marginBottom: 10 }}>
        <label>Search</label>
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
      </div>

      {query.trim() && matches.length === 0 && (
        <p className="mood-empty">No matches in the current date range.</p>
      )}

      {matches.map((m) => {
        const isIncluded = includedList.includes(m.key);
        const isExcluded = excludedList.includes(m.key);
        return (
          <div className="mood-match-row" key={m.key}>
            <div className="mood-match-info">
              <span className="mood-match-name">{m.primary}</span>
              {m.secondary && <span className="mood-match-count">{m.secondary}</span>}
              <span className="mood-match-count">{m.count.toLocaleString()} plays</span>
            </div>
            <div className="mood-pills">
              <button
                className={`mood-pill${isIncluded ? " active" : ""}`}
                style={{
                  borderColor: "#7FC3E8",
                  color: isIncluded ? "#4A3347" : "#7FC3E8",
                  background: isIncluded ? "#7FC3E8" : "transparent"
                }}
                onClick={() => (isIncluded ? onRemoveIncluded(m.key) : onInclude(m.key))}
              >
                {isIncluded ? "Included ✓" : "Include"}
              </button>
              <button
                className={`mood-pill${isExcluded ? " active" : ""}`}
                style={{
                  borderColor: "#D6486E",
                  color: isExcluded ? "#fff" : "#D6486E",
                  background: isExcluded ? "#D6486E" : "transparent"
                }}
                onClick={() => (isExcluded ? onRemoveExcluded(m.key) : onExclude(m.key))}
              >
                {isExcluded ? "Excluded ✓" : "Exclude"}
              </button>
            </div>
          </div>
        );
      })}

      {includedList.length > 0 && (
        <div className="tagged-list">
          <div className="tagged-list-label">Included — only these show, everything else is dropped</div>
          <div className="tagged-chips">
            {includedList.map((key) => (
              <span className="tagged-chip" key={key} style={{ borderColor: "#7FC3E8" }}>
                <span className="sw" style={{ background: "#7FC3E8" }} />
                {key}
                <button className="mood-x" aria-label={`Remove ${key} from included`} onClick={() => onRemoveIncluded(key)}>×</button>
              </span>
            ))}
          </div>
        </div>
      )}

      {excludedList.length > 0 && (
        <div className="tagged-list">
          <div className="tagged-list-label">Excluded</div>
          <div className="tagged-chips">
            {excludedList.map((key) => (
              <span className="tagged-chip" key={key} style={{ borderColor: "#D6486E" }}>
                <span className="sw" style={{ background: "#D6486E" }} />
                {key}
                <button className="mood-x" aria-label={`Remove ${key} from excluded`} onClick={() => onRemoveExcluded(key)}>×</button>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
