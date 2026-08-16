import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { colorForGenre } from "../lib/genreTags.js";

const OTHER_COLOR = "#C9A8BE";
const UNTAGGED_COLOR = "#E8DCE3";

function colorFor(name) {
  if (name === "Other") return OTHER_COLOR;
  if (name === "Untagged") return UNTAGGED_COLOR;
  return colorForGenre(name);
}

function PieTooltip({ active, payload, total }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0];
  const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : "0";
  return (
    <div className="tooltip-inner">
      <div className="tt-artist">
        <span className="sw" style={{ background: colorFor(d.name) }} />
        <span>{d.name}</span>
        <span className="tt-val">{pct}%</span>
      </div>
    </div>
  );
}

function GenrePie({ title, slices, total }) {
  return (
    <div className="genre-pie-col">
      <p className="chart-hint" style={{ textAlign: "center", marginBottom: 6 }}>{title}</p>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={slices} dataKey="value" nameKey="name" innerRadius={40} outerRadius={80} isAnimationActive={false}>
            {slices.map((s, i) => <Cell key={i} fill={colorFor(s.name)} />)}
          </Pie>
          <Tooltip content={<PieTooltip total={total} />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function GenrePieCompare({ genreCmp, nameA, nameB }) {
  const legendGenres = [...genreCmp.genreOrder, "Other", "Untagged"];
  return (
    <section className="chart-card">
      <div className="chart-head">
        <span className="ranked-primary" style={{ fontSize: 16 }}>Genre Breakdown</span>
        <div className="skip-rate-badge" style={{ margin: 0 }}>
          <span className="skip-rate-pct">{genreCmp.similarityPct}%</span>
          <span className="chart-hint">genre similarity</span>
        </div>
      </div>
      <p className="chart-hint" style={{ textTransform: "none", fontSize: 12.5, marginBottom: 10 }}>
        Each person's top 10 genres, using the same slice-for-slice categories so the two pies are
        directly comparable — a bigger Hip Hop slice on one side than the other means exactly what
        it looks like.
      </p>
      <div className="genre-pie-row">
        <GenrePie title={nameA} slices={genreCmp.pieA.slices} total={genreCmp.pieA.total} />
        <GenrePie title={nameB} slices={genreCmp.pieB.slices} total={genreCmp.pieB.total} />
      </div>
      <div className="genre-pie-legend">
        {legendGenres.map((g) => (
          <span className="genre-legend-chip" key={g}>
            <span className="sw" style={{ background: colorFor(g) }} />
            {g}
          </span>
        ))}
      </div>
      <p className="mood-empty" style={{ marginTop: 10, textAlign: "center" }}>
        "Untagged" means that artist hasn't been genre-tagged in either profile yet — switch your
        active profile (top bar) to tag more artists and this fills in.
      </p>
    </section>
  );
}
