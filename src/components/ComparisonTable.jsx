import React from "react";
import { PERSON_A_COLOR, PERSON_B_COLOR } from "../lib/constants.js";

/**
 * items: [{
 *   key, name,
 *   cellA: { value, sub? }, cellB: { value, sub? },
 *   winner: "A" | "B" | "tie" | null
 * }]
 * A proper two-column comparison instead of cramming both people's
 * numbers into a subtitle line — the winner's cell gets a trophy and
 * a tinted background so it reads at a glance, not after parsing text.
 */
export default function ComparisonTable({ items, nameA, nameB, onItemClick, hideWinner }) {
  if (items.length === 0) {
    return <p className="mood-empty" style={{ padding: "20px 0", textAlign: "center" }}>Nothing to compare yet.</p>;
  }
  const clickable = typeof onItemClick === "function";

  return (
    <div className="compare-table">
      <div className="compare-table-head">
        <span />
        <span />
        <span className="compare-table-head-name" style={{ color: PERSON_A_COLOR }}>{nameA}</span>
        <span className="compare-table-head-name" style={{ color: PERSON_B_COLOR }}>{nameB}</span>
      </div>
      {items.map((item, i) => {
        const winner = hideWinner ? null : item.winner;
        return (
          <div
            className={`compare-table-row${clickable ? " clickable" : ""}`}
            key={item.key}
            onClick={clickable ? () => onItemClick(item) : undefined}
          >
            <span className="compare-table-rank">{i + 1}</span>
            <span className="compare-table-name">
              {item.name}
              {item.nameSub && <span className="compare-table-name-sub">{item.nameSub}</span>}
            </span>
            <div className={`compare-table-cell${winner === "A" ? " winner" : ""}`} style={winner === "A" ? { borderColor: PERSON_A_COLOR, background: "rgba(232,99,159,0.08)" } : undefined}>
              {winner === "A" && <span className="compare-table-trophy">🏆</span>}
              <span className="compare-table-value">{item.cellA.value}</span>
              {item.cellA.badge && <span className="compare-table-badge" style={{ color: PERSON_A_COLOR, borderColor: PERSON_A_COLOR }}>{item.cellA.badge}</span>}
              {item.cellA.sub && <span className="compare-table-sub">{item.cellA.sub}</span>}
            </div>
            <div className={`compare-table-cell${winner === "B" ? " winner" : ""}`} style={winner === "B" ? { borderColor: PERSON_B_COLOR, background: "rgba(127,195,232,0.1)" } : undefined}>
              {winner === "B" && <span className="compare-table-trophy">🏆</span>}
              <span className="compare-table-value">{item.cellB.value}</span>
              {item.cellB.badge && <span className="compare-table-badge" style={{ color: PERSON_B_COLOR, borderColor: PERSON_B_COLOR }}>{item.cellB.badge}</span>}
              {item.cellB.sub && <span className="compare-table-sub">{item.cellB.sub}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
