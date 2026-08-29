import React, { useMemo, useState } from "react";

/**
 * Same include/exclude mental model as EntityIncludeExclude (artists,
 * albums), but for genre/mood/era — a small, fully-known set of
 * values rather than a huge catalog to fuzzy-search. So instead of
 * "type to search", this shows every option up front (sorted by play
 * count, most-used first) with an optional filter box for when a
 * genre/mood list itself gets long.
 *
 * items: [{ key, label, color, count }]
 */
export default function TagIncludeExclude({ label, items, includedList, excludedList, onInclude, onExclude, onRemoveIncluded, onRemoveExcluded }) {
  const [query, setQuery] = useState("");

  const itemByKey = useMemo(() => new Map(items.map((it) => [it.key, it])), [items]);

  const sorted = useMemo(() => {
    const filtered = query.trim()
      ? items.filter((it) => it.label.toLowerCase().includes(query.trim().toLowerCase()))
      : items;
    // Included/excluded items float to the top regardless of play
    // count, so an active selection is never buried below a long
    // list of untouched, higher-count items.
    const withPriority = [...filtered].sort((a, b) => {
      const aActive = includedList.includes(a.key) || excludedList.includes(a.key);
      const bActive = includedList.includes(b.key) || excludedList.includes(b.key);
      if (aActive !== bActive) return aActive ? -1 : 1;
      return b.count - a.count;
    });
    // Only cap the DEFAULT (unsearched) view — a long genre list is
    // fine to browse as "top 25 by plays", but search should still
    // reach everything, not just what happened to make that cut.
    return query.trim() ? withPriority : withPriority.slice(0, 25);
  }, [items, query, includedList, excludedList]);

  const isTruncated = !query.trim() && items.length > 25;

  if (items.length === 0) {
    return (
      <section className="mood-tagger">
        <div className="mood-tagger-head">
          <span className="insight-label">◆ {label}</span>
        </div>
        <p className="mood-empty">Nothing to filter by yet — tag some artists first.</p>
      </section>
    );
  }

  return (
    <section className="mood-tagger">
      <div className="mood-tagger-head">
        <span className="insight-label">◆ {label}</span>
        <span className="chart-hint">{includedList.length} included · {excludedList.length} excluded</span>
      </div>

      {(includedList.length > 0 || excludedList.length > 0) && (
        <div className="tagged-list" style={{ marginTop: 0, marginBottom: 14 }}>
          {includedList.length > 0 && (
            <>
              <div className="tagged-list-label">Included — only these show</div>
              <div className="tagged-chips">
                {includedList.map((key) => {
                  const it = itemByKey.get(key);
                  return (
                    <span className="tagged-chip" key={key} style={{ borderColor: "#7FC3E8" }}>
                      <span className="sw" style={{ background: "#7FC3E8" }} />
                      {it ? it.label : key}
                      <button className="mood-x" aria-label={`Remove ${it ? it.label : key} from included`} onClick={() => onRemoveIncluded(key)}>×</button>
                    </span>
                  );
                })}
              </div>
            </>
          )}
          {excludedList.length > 0 && (
            <>
              <div className="tagged-list-label" style={{ marginTop: includedList.length > 0 ? 10 : 0 }}>Excluded</div>
              <div className="tagged-chips">
                {excludedList.map((key) => {
                  const it = itemByKey.get(key);
                  return (
                    <span className="tagged-chip" key={key} style={{ borderColor: "#D6486E" }}>
                      <span className="sw" style={{ background: "#D6486E" }} />
                      {it ? it.label : key}
                      <button className="mood-x" aria-label={`Remove ${it ? it.label : key} from excluded`} onClick={() => onRemoveExcluded(key)}>×</button>
                    </span>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {items.length > 8 && (
        <div className="field" style={{ marginBottom: 10 }}>
          <label>Search</label>
          <input
            type="text"
            placeholder={`Search ${label.toLowerCase()}…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
        </div>
      )}

      {isTruncated && (
        <p className="chart-hint" style={{ textTransform: "none", marginBottom: 10 }}>
          Showing top 25 of {items.length} by plays — search above to find any of the rest.
        </p>
      )}

      <div className="tag-ie-list">
        {sorted.map((it) => {
          const isIncluded = includedList.includes(it.key);
          const isExcluded = excludedList.includes(it.key);
          return (
            <div className="mood-match-row" key={it.key}>
              <div className="mood-match-info">
                <span className="sw" style={{ background: it.color }} />
                <span className="mood-match-name">{it.label}</span>
                <span className="mood-match-count">{it.count.toLocaleString()} plays</span>
              </div>
              <div className="mood-pills">
                <button
                  className={`mood-pill${isIncluded ? " active" : ""}`}
                  style={{
                    borderColor: "#7FC3E8",
                    color: isIncluded ? "#4A3347" : "#7FC3E8",
                    background: isIncluded ? "#7FC3E8" : "transparent"
                  }}
                  onClick={() => (isIncluded ? onRemoveIncluded(it.key) : onInclude(it.key))}
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
                  onClick={() => (isExcluded ? onRemoveExcluded(it.key) : onExclude(it.key))}
                >
                  {isExcluded ? "Excluded ✓" : "Exclude"}
                </button>
              </div>
            </div>
          );
        })}
        {sorted.length === 0 && <p className="mood-empty">No matches.</p>}
      </div>
    </section>
  );
}
