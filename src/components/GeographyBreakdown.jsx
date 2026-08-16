import React, { useMemo } from "react";
import { countryBreakdown } from "../lib/listeningHabits.js";
import RankedList from "./RankedList.jsx";

export default function GeographyBreakdown({ data, fromInt, toInt }) {
  const items = useMemo(() => {
    return countryBreakdown(data, fromInt, toInt).map((r) => ({
      rank: r.rank,
      key: r.code,
      primary: r.name,
      secondary: r.code,
      count: r.count
    }));
  }, [data, fromInt, toInt]);

  if (items.length === 0) return null;

  return (
    <section className="mini-chart-card">
      <div className="mini-chart-head">
        <span className="insight-label">◆ Where you were listening</span>
        <span className="chart-hint">plays by connection country, current range</span>
      </div>
      <RankedList items={items} />
    </section>
  );
}
