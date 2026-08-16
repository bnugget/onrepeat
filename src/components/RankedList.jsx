import React from "react";

/**
 * items: [{ rank, key?, primary, secondary?, meta?, statLines?, count, barPct?, display? }]
 * - count: used for the trailing number unless `display` overrides it, and
 *   for the bar width unless `barPct` (0-100) overrides it.
 * - key: used to compare against selectedKey; defaults to rank if omitted.
 * - meta: a freeform small text line under secondary (Obsession Index,
 *   Compare Profiles — descriptive text that doesn't split into clean columns).
 * - statLines: 1-2 short strings (e.g. "2.1% of total", "+45% vs avg")
 *   rendered as their own dedicated column instead — used by Top 100
 *   and Song Distribution. If ANY item in the list has statLines, the
 *   column renders for the whole list.
 */
export default function RankedList({ items, onItemClick, selectedKey }) {
  if (items.length === 0) {
    return <p className="mood-empty" style={{ padding: "30px 0", textAlign: "center" }}>No plays in this date range.</p>;
  }

  const maxCount = items[0].count || 1;
  const clickable = typeof onItemClick === "function";
  const hasStatColumn = items.some((it) => it.statLines && it.statLines.length > 0);

  return (
    <div className={`ranked-list${hasStatColumn ? " with-stat-col" : ""}`}>
      {items.map((item) => {
        const itemKey = item.key !== undefined ? item.key : item.rank;
        const pct = item.barPct !== undefined ? item.barPct : (maxCount ? (item.count / maxCount) * 100 : 0);
        const displayText = item.display !== undefined ? item.display : item.count.toLocaleString();
        const selected = selectedKey !== undefined && selectedKey !== null && itemKey === selectedKey;
        return (
          <div
            className={`ranked-row${clickable ? " clickable" : ""}${selected ? " selected" : ""}`}
            key={item.rank}
            onClick={clickable ? () => onItemClick(item) : undefined}
          >
            <span className="ranked-rank">{item.rank}</span>
            <div className="ranked-info">
              <span className="ranked-primary">{item.primary}</span>
              {item.secondary && <span className="ranked-secondary">{item.secondary}</span>}
              {item.meta && <span className="ranked-meta">{item.meta}</span>}
            </div>
            {hasStatColumn && (
              <div className="ranked-stat-col">
                {(item.statLines || []).map((line, i) => <span key={i}>{line}</span>)}
              </div>
            )}
            <div className="ranked-bar-wrap">
              <div className="ranked-bar" style={{ width: `${pct}%` }} />
            </div>
            <span className="ranked-count">
              {displayText}
              {item.pop !== undefined && item.pop !== null && (
                item.pop === "new" ? (
                  <span className="tt-pop-new"> (NEW)</span>
                ) : (
                  <span className={item.pop >= 0 ? "tt-pop-up" : "tt-pop-down"}>
                    {" "}{item.pop >= 0 ? "▲" : "▼"}{Math.abs(item.pop).toFixed(0)}%
                  </span>
                )
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
