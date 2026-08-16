import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ResponsiveContainer
} from "recharts";

function CustomTooltip({ active, payload, label, colorOf, visible, rows, metricLabel }) {
  if (!active || !payload || !payload.length) return null;
  const idx = rows.findIndex((r) => r.label === label);
  const prevRow = idx > 0 ? rows[idx - 1] : null;

  const entries = payload
    .filter((p) => visible[p.dataKey] !== false && p.value > 0)
    .sort((a, b) => b.value - a.value);
  const total = entries.reduce((a, b) => a + b.value, 0);

  return (
    <div className="tooltip-inner">
      <div className="tt-label">{label}</div>
      {entries.map((r) => {
        const prevVal = prevRow ? prevRow[r.dataKey] : undefined;
        const pop = prevVal ? ((r.value - prevVal) / prevVal) * 100 : null;
        return (
          <div className="tt-artist" key={r.dataKey}>
            <span className="sw" style={{ background: colorOf(r.dataKey) }} />
            <span>{r.dataKey}</span>
            <span className="tt-val">
              {r.value.toLocaleString()}
              {pop !== null ? (
                <span className={pop >= 0 ? "tt-pop-up" : "tt-pop-down"}>
                  {" "}{pop >= 0 ? "▲" : "▼"}{Math.abs(pop).toFixed(0)}%
                </span>
              ) : (
                <span className="tt-pop-new"> (NEW)</span>
              )}
            </span>
          </div>
        );
      })}
      <div className="tt-total">Total: {total.toLocaleString()} {metricLabel}</div>
    </div>
  );
}

export default function StackedBarChart({
  rows,
  names,
  colors,
  order,
  visible,
  eras,
  metricLabel = "plays",
  onBarClick
}) {
  const stackOrderList = order || names;
  const colorMap = useMemo(() => {
    const m = {};
    names.forEach((n, i) => (m[n] = colors[i]));
    return m;
  }, [names, colors]);

  const eraAreas = useMemo(() => {
    if (!eras || eras.length === 0) return [];
    return eras
      .map((era) => {
        const matching = rows.filter((r) => r.periodStart <= era.endInt && r.periodEnd >= era.startInt);
        if (matching.length === 0) return null;
        return { ...era, x1: matching[0].label, x2: matching[matching.length - 1].label };
      })
      .filter(Boolean);
  }, [eras, rows]);

  return (
    <ResponsiveContainer width="100%" height={420}>
      <BarChart
        data={rows}
        margin={{ top: 24, right: 10, left: 0, bottom: 0 }}
        onClick={(state) => {
          if (!state) return;
          let row = state.activePayload?.[0]?.payload;
          if (!row && state.activeTooltipIndex != null) {
            row = rows[state.activeTooltipIndex];
          }
          if (row && onBarClick) onBarClick(row.key);
        }}
      >
        <CartesianGrid stroke="#F3D9E8" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: "#9C7C93", fontSize: 11, fontFamily: "var(--mono)" }}
          axisLine={{ stroke: "#F3D9E8" }}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={20}
        />
        <YAxis
          tick={{ fill: "#9C7C93", fontSize: 11, fontFamily: "var(--mono)" }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip
          cursor={{ fill: "rgba(232,99,159,0.06)" }}
          content={<CustomTooltip colorOf={(k) => colorMap[k]} visible={visible} rows={rows} metricLabel={metricLabel} />}
        />
        {eraAreas.map((e) => (
          <ReferenceArea
            key={e.id}
            x1={e.x1}
            x2={e.x2}
            fill={e.color}
            fillOpacity={0.14}
            stroke={e.color}
            strokeOpacity={0.4}
            label={{ value: e.label, position: "insideTop", fill: e.color, fontSize: 10.5, fontFamily: "var(--mono)" }}
          />
        ))}
        {stackOrderList.map((name) =>
          visible[name] === false ? null : (
            <Bar
              key={name}
              dataKey={name}
              stackId="a"
              fill={colorMap[name]}
              cursor="pointer"
              isAnimationActive={false}
            />
          )
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}
