import React, { useMemo, useState } from "react";

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];
const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function bucketOf(count) {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 10) return 3;
  return 4;
}
const BUCKET_COLORS = ["#FBEFF5", "#F5D3E4", "#EFA9CC", "#E86FA8", "#D6488B"];

export default function CalendarHeatmap({ data, minYear, maxYear, initialYear }) {
  const [year, setYear] = useState(initialYear ?? maxYear);

  const dayCounts = useMemo(() => {
    const m = new Map();
    for (const d of data.eventDate) {
      m.set(d, (m.get(d) || 0) + 1);
    }
    return m;
  }, [data]);

  const { weeks, monthLabels, total, activeDays } = useMemo(() => {
    // Start on the Sunday on/before Jan 1, end on the Saturday on/after Dec 31
    const jan1 = new Date(Date.UTC(year, 0, 1));
    const dec31 = new Date(Date.UTC(year, 11, 31));
    const start = new Date(jan1);
    start.setUTCDate(start.getUTCDate() - start.getUTCDay());
    const end = new Date(dec31);
    end.setUTCDate(end.getUTCDate() + (6 - end.getUTCDay()));

    const weeksArr = [];
    let cur = new Date(start);
    let total = 0;
    let activeDays = 0;
    let currentWeek = [];
    const monthLabels = [];
    let lastMonth = -1;

    while (cur <= end) {
      const inYear = cur.getUTCFullYear() === year;
      const dInt = cur.getUTCFullYear() * 10000 + (cur.getUTCMonth() + 1) * 100 + cur.getUTCDate();
      const count = inYear ? dayCounts.get(dInt) || 0 : null;
      if (inYear && count > 0) {
        total += count;
        activeDays++;
      }
      if (cur.getUTCDay() === 0 && cur.getUTCMonth() !== lastMonth && inYear) {
        monthLabels.push({ week: weeksArr.length, label: MONTH_LABELS[cur.getUTCMonth()] });
        lastMonth = cur.getUTCMonth();
      }
      currentWeek.push({ date: new Date(cur), count, inYear });
      if (cur.getUTCDay() === 6) {
        weeksArr.push(currentWeek);
        currentWeek = [];
      }
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    if (currentWeek.length) weeksArr.push(currentWeek);

    return { weeks: weeksArr, monthLabels, total, activeDays };
  }, [year, dayCounts]);

  // Month labels and day cells must share this exact same column
  // definition, or they drift apart — that was the alignment bug.
  const gridColStyle = { gridTemplateColumns: `repeat(${weeks.length}, 1fr)` };

  return (
    <section className="mini-chart-card">
      <div className="mini-chart-head">
        <span className="insight-label">◆ Calendar</span>
        <div className="cal-nav">
          <button className="btn" disabled={year <= minYear} aria-label="Previous year" onClick={() => setYear((y) => y - 1)}>‹</button>
          <span className="cal-year">{year}</span>
          <button className="btn" disabled={year >= maxYear} aria-label="Next year" onClick={() => setYear((y) => y + 1)}>›</button>
        </div>
      </div>
      <p className="chart-hint" style={{ marginBottom: 10 }}>
        {total.toLocaleString()} plays across {activeDays} active day{activeDays === 1 ? "" : "s"} in {year}
      </p>
      <div className="cal-wrap">
        <div className="cal-body">
          <div className="cal-daylabels-col">
            <div className="cal-corner" />
            <div className="cal-daylabels">
              {DAY_LABELS.map((d, i) => <span key={i}>{d}</span>)}
            </div>
          </div>
          <div className="cal-grid-col">
            <div className="cal-months" style={gridColStyle}>
              {monthLabels.map((m) => (
                <span key={m.label + m.week} className="cal-month-label" style={{ gridColumnStart: m.week + 1 }}>
                  {m.label}
                </span>
              ))}
            </div>
            <div className="cal-grid" style={gridColStyle}>
              {weeks.map((week, wi) => (
                <div className="cal-col" key={wi}>
                  {week.map((day, di) => (
                    <div
                      key={di}
                      className="cal-cell"
                      style={{ background: day.inYear ? BUCKET_COLORS[bucketOf(day.count || 0)] : "transparent" }}
                      title={day.inYear ? `${day.date.toISOString().slice(0, 10)}: ${day.count} play${day.count === 1 ? "" : "s"}` : ""}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="cal-legend">
        <span>Less</span>
        {BUCKET_COLORS.map((c) => <span key={c} className="cal-legend-cell" style={{ background: c }} />)}
        <span>More</span>
      </div>
    </section>
  );
}
