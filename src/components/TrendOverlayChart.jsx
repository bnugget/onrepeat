import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea, ResponsiveContainer } from "recharts";
import { PERSON_A_COLOR, PERSON_B_COLOR } from "../lib/constants.js";

const HOTSPOT_COLORS = [PERSON_A_COLOR, PERSON_B_COLOR, "#B896A8", "#7FC3E8", "#E8639F"];

function TrendTooltip({ active, payload, label, nameA, nameB }) {
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

function HotspotLabel({ viewBox, artist, index, tier, hotspot, onClick }) {
  if (!viewBox) return null;
  const { x, width } = viewBox;
  const cx = x + width / 2;
  const color = HOTSPOT_COLORS[index % HOTSPOT_COLORS.length];
  const y = 4 + tier * 22;
  return (
    <g
      className="hotspot-pill"
      onClick={() => onClick(hotspot)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(hotspot); } }}
      role="button"
      tabIndex={0}
      aria-label={`See ${artist}'s artist leaderboard comparison for this period`}
    >
      <rect x={cx - 34} y={y} width={68} height={18} rx={9} fill={color} fillOpacity={0.16} />
      <text x={cx} y={y + 12.5} textAnchor="middle" fontSize={10} fontFamily="var(--mono)" fontWeight={700} fill={color}>
        {artist.length > 10 ? artist.slice(0, 9) + "…" : artist}
      </text>
    </g>
  );
}

/** Two overlaid lines, no grouping/stacking — deliberately simple,
 *  just "did your listening move together over time or not." Shared
 *  fandom hotspots (periods where both people were genuinely into
 *  the same artist) render as shaded vertical bands with the artist
 *  name, when provided and enabled. Hotspots clustered close
 *  together in time carry a pre-assigned `tier` (see GroupView.jsx)
 *  so their labels stagger onto separate rows instead of colliding —
 *  the chart's top margin grows to fit however many tiers are used.
 *  Clicking a pill jumps to that artist's Leaderboard comparison,
 *  scoped to that hotspot's exact date range. */
export default function TrendOverlayChart({ rows, nameA, nameB, hotspots, onHotspotClick }) {
  const maxTier = hotspots && hotspots.length ? Math.max(...hotspots.map((h) => h.tier || 0)) : 0;
  const topMargin = 26 + maxTier * 22;

  return (
    <ResponsiveContainer width="100%" height={320 + maxTier * 22}>
      <LineChart data={rows} margin={{ top: topMargin, right: 10, left: 0, bottom: 0 }}>
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
        <Tooltip content={<TrendTooltip nameA={nameA} nameB={nameB} />} />
        {hotspots && hotspots.map((h, i) => (
          <ReferenceArea
            key={h.label}
            x1={h.label}
            x2={h.label}
            fill={HOTSPOT_COLORS[i % HOTSPOT_COLORS.length]}
            fillOpacity={0.1}
            ifOverflow="visible"
            label={<HotspotLabel artist={h.artist} index={i} tier={h.tier || 0} hotspot={h} onClick={onHotspotClick} />}
          />
        ))}
        <Line type="monotone" dataKey="personA" name={nameA} stroke={PERSON_A_COLOR} strokeWidth={2} dot={false} isAnimationActive={false} />
        <Line type="monotone" dataKey="personB" name={nameB} stroke={PERSON_B_COLOR} strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
