import React, { useMemo } from "react";
import { platformBreakdown } from "../lib/listeningHabits.js";
import RankedList from "./RankedList.jsx";

export default function PlatformBreakdown({ data, fromInt, toInt }) {
  const items = useMemo(() => {
    return platformBreakdown(data, fromInt, toInt).map((r) => ({
      rank: r.rank,
      key: r.platform,
      primary: r.platform,
      count: r.count
    }));
  }, [data, fromInt, toInt]);

  if (items.length === 0) return null;

  return (
    <section className="mini-chart-card">
      <div className="mini-chart-head">
        <span className="insight-label">◆ Listening devices</span>
        <span className="chart-hint">plays by platform, current range</span>
      </div>
      <RankedList items={items} />
    </section>
  );
}
