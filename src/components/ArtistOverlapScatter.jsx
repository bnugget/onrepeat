import React from "react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Customized } from "recharts";

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

/** True diagonal split (not a horizontal-midline shortcut — that
 *  would actually mislead: a point can sit in the "upper half" by Y
 *  position while still being on the A-favors side of the y=x line).
 *  Computes real pixel coordinates from the chart's own axis scales
 *  so the shaded regions and the reference line agree exactly. */
function DiagonalOverlay({ xAxisMap, yAxisMap, maxVal, nameA, nameB }) {
  const xAxis = xAxisMap && Object.values(xAxisMap)[0];
  const yAxis = yAxisMap && Object.values(yAxisMap)[0];
  if (!xAxis || !yAxis) return null;
  const xScale = xAxis.scale;
  const yScale = yAxis.scale;

  const x0 = xScale(0);
  const x1 = xScale(maxVal);
  const y0 = yScale(0);
  const y1 = yScale(maxVal);

  const upperLeftPoints = `${x0},${y0} ${x0},${y1} ${x1},${y1}`;
  const lowerRightPoints = `${x0},${y0} ${x1},${y1} ${x1},${y0}`;
  const midX = (x0 + x1) / 2;
  const midY = (y0 + y1) / 2;

  return (
    <g>
      <polygon points={upperLeftPoints} fill="#7FC3E8" fillOpacity={0.08} />
      <polygon points={lowerRightPoints} fill="#E8639F" fillOpacity={0.08} />
      <text x={x0 + 10} y={y1 + 16} fontSize={10.5} fontFamily="ui-monospace, monospace" fill="#5B8DAE" fontWeight={700}>
        {nameB} more into it
      </text>
      <text x={x1 - 10} y={y0 - 10} fontSize={10.5} fontFamily="ui-monospace, monospace" fill="#C4467A" fontWeight={700} textAnchor="end">
        {nameA} more into it
      </text>
      <text
        x={midX + 8}
        y={midY - 8}
        fontSize={9.5}
        fontFamily="ui-monospace, monospace"
        fontStyle="italic"
        fill="#B896A8"
        textAnchor="middle"
        transform={`rotate(-45, ${midX + 8}, ${midY - 8})`}
      >
        equally into it
      </text>
    </g>
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
        <Customized component={(props) => <DiagonalOverlay {...props} maxVal={maxVal} nameA={nameA} nameB={nameB} />} />
        <ReferenceLine segment={[{ x: 0, y: 0 }, { x: maxVal, y: maxVal }]} stroke="#C9A8BE" strokeDasharray="4 4" />
        <Tooltip content={<ScatterTooltip nameA={nameA} nameB={nameB} />} cursor={{ strokeDasharray: "3 3" }} />
        <Scatter data={points} fill="#E8639F" isAnimationActive={false} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
