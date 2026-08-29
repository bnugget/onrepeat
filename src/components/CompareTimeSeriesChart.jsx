import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { PERSON_A_COLOR, PERSON_B_COLOR } from "../lib/constants.js";

function CompareTooltip({ active, payload, label, nameA, nameB }) {
  if (!active || !payload || !payload.length) return null;
  const a = payload.find((p) => p.dataKey === "personA")?.value || 0;
  const b = payload.find((p) => p.dataKey === "personB")?.value || 0;
  return (
    <div className="tooltip-inner">
      <div className="tt-label">{label}</div>
      <div className="tt-artist"><span className="sw" style={{ background: PERSON_A_COLOR }} /><span>{nameA}</span><span className="tt-val">{a}</span></div>
      <div className="tt-artist"><span className="sw" style={{ background: PERSON_B_COLOR }} /><span>{nameB}</span><span className="tt-val">{b}</span></div>
    </div>
  );
}

export default function CompareTimeSeriesChart({ rows, nameA, nameB }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <BarChart data={rows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#F3D9E8" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: "#9C7C93", fontSize: 11, fontFamily: "var(--mono)" }}
          axisLine={{ stroke: "#F3D9E8" }}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={20}
        />
        <YAxis tick={{ fill: "#9C7C93", fontSize: 11, fontFamily: "var(--mono)" }} axisLine={false} tickLine={false} width={40} allowDecimals={false} />
        <Tooltip cursor={{ fill: "rgba(232,99,159,0.06)" }} content={<CompareTooltip nameA={nameA} nameB={nameB} />} />
        <Bar dataKey="personA" name={nameA} fill={PERSON_A_COLOR} radius={[3, 3, 0, 0]} isAnimationActive={false} />
        <Bar dataKey="personB" name={nameB} fill={PERSON_B_COLOR} radius={[3, 3, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
