import React from "react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";

function ScatterTooltip({ active, payload, nameA, nameB }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="tooltip-inner">
      <div className="tt-label">{d.name}</div>
      <div className="tt-artist"><span>{nameA}</span><span className="tt-val">{d.countA} ({d.pctA.toFixed(1)}%)</span></div>
      <div className="tt-artist"><span>{nameB}</span><span className="tt-val">{d.countB} ({d.pctB.toFixed(1)}%)</span></div>
    </div>
  );
}

export default function ArtistOverlapScatter({ points, nameA, nameB }) {
  if (points.length === 0) {
    return <p className="mood-empty" style={{ padding: "30px 0", textAlign: "center" }}>No shared artists clear the minimum-plays threshold yet.</p>;
  }
  const maxVal = Math.max(...points.map((p) => Math.max(p.pctA, p.pctB))) * 1.15;

  return (
    <ResponsiveContainer width="100%" height={360}>
      <ScatterChart margin={{ top: 10, right: 24, left: 10, bottom: 24 }}>
        <CartesianGrid stroke="#F3D9E8" />
        <XAxis
          type="number"
          dataKey="pctA"
          name={nameA}
          domain={[0, maxVal]}
          tick={{ fill: "#9C7C93", fontSize: 11, fontFamily: "var(--mono)" }}
          tickFormatter={(v) => v.toFixed(1)}
          label={{ value: `${nameA}'s % of their listening`, position: "insideBottom", offset: -14, fontSize: 11, fill: "#9C7C93" }}
        />
        <YAxis
          type="number"
          dataKey="pctB"
          name={nameB}
          domain={[0, maxVal]}
          tick={{ fill: "#9C7C93", fontSize: 11, fontFamily: "var(--mono)" }}
          tickFormatter={(v) => v.toFixed(1)}
          label={{ value: `${nameB}'s % of their listening`, angle: -90, position: "insideLeft", fontSize: 11, fill: "#9C7C93" }}
        />
        <ReferenceLine segment={[{ x: 0, y: 0 }, { x: maxVal, y: maxVal }]} stroke="#C9A8BE" strokeDasharray="4 4" />
        <Tooltip content={<ScatterTooltip nameA={nameA} nameB={nameB} />} cursor={{ strokeDasharray: "3 3" }} />
        <Scatter data={points} fill="#E8639F" isAnimationActive={false} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
