import React, { useMemo } from "react";

/** Side-panel legend: sorted list instead of a wrapped blob of chips
 *  below the chart — the whole point is making it easy to scan which
 *  series matter and toggle them, which a wall of equal-sized pills
 *  never really supported once there are 100 of them. */
export default function LegendPanel({ names, colors, visible, totals, onToggle, onShowAll, onHideAll, metricLabel = "plays" }) {
  const sorted = useMemo(() => {
    return names
      .map((name, i) => ({ name, color: colors[i], total: totals[name] || 0 }))
      .sort((a, b) => b.total - a.total);
  }, [names, colors, totals]);

  return (
    <div className="legend-panel">
      <div className="legend-panel-head">
        <span className="chart-hint">sorted by {metricLabel}</span>
        <div className="legend-panel-head-btns">
          <button className="btn" onClick={onShowAll}>Show all</button>
          <button className="btn" onClick={onHideAll}>Remove all</button>
        </div>
      </div>
      <div className="legend-panel-list">
        {sorted.map((item) => {
          const isOff = visible[item.name] === false;
          return (
            <div
              key={item.name}
              className={`legend-panel-row${isOff ? " off" : ""}`}
              onClick={() => onToggle(item.name)}
              title={isOff ? "Click to show" : "Click to hide"}
            >
              <span className="sw" style={{ background: item.color }} />
              <span className="legend-panel-name">{item.name}</span>
              <span className="legend-panel-value">{item.total.toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
