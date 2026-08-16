import React, { useState } from "react";
import { ERA_PALETTE, newEra } from "../lib/eras.js";
import { dayIntToISO } from "../lib/aggregate.js";
import DateRangePicker from "./DateRangePicker.jsx";

export default function ErasManager({ eras, onAdd, onRemove, onZoom, bounds }) {
  const [label, setLabel] = useState("");
  const [startInt, setStartInt] = useState(bounds.min);
  const [endInt, setEndInt] = useState(bounds.max);
  const [rangeChosen, setRangeChosen] = useState(false);
  const [color, setColor] = useState(ERA_PALETTE[0]);

  function submit(e) {
    e.preventDefault();
    if (!label.trim()) return;
    if (!rangeChosen) {
      alert("Pick a date range for this era first.");
      return;
    }
    const era = newEra(label.trim(), dayIntToISO(startInt), dayIntToISO(endInt), color);
    onAdd(era);
    onZoom(era);
    setLabel("");
    setStartInt(bounds.min);
    setEndInt(bounds.max);
    setRangeChosen(false);
  }

  return (
    <section className="mood-tagger">
      <div className="mood-tagger-head">
        <span className="insight-label">◆ Mark an era</span>
        <span className="chart-hint">shaded as a band on the timeline above</span>
      </div>

      <form className="era-form" onSubmit={submit}>
        <div className="field" style={{ flex: "1 1 180px" }}>
          <label htmlFor="eraLabel">Label</label>
          <input
            id="eraLabel"
            type="text"
            placeholder="e.g. Breakup, Feeling good, Toronto…"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Date range</label>
          <DateRangePicker
            bounds={bounds}
            fromInt={startInt}
            toInt={endInt}
            onChange={(f, t) => { setStartInt(f); setEndInt(t); setRangeChosen(true); }}
          />
        </div>
        <div className="field">
          <label>Color</label>
          <div className="era-swatches">
            {ERA_PALETTE.map((c) => (
              <button
                type="button"
                key={c}
                className={`era-swatch${color === c ? " active" : ""}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>
        <button className="btn primary" type="submit">Add era</button>
      </form>

      {eras.length > 0 && (
        <div className="tagged-list">
          <div className="tagged-list-label">{eras.length} era{eras.length === 1 ? "" : "s"} marked</div>
          <div className="tagged-chips">
            {eras.map((e) => (
              <span className="tagged-chip" key={e.id} style={{ borderColor: e.color }}>
                <span className="sw" style={{ background: e.color }} />
                {e.label} — {e.startISO} to {e.endISO}
                <button className="era-zoom" onClick={() => onZoom(e)} title="Zoom the timeline to this era">⤢</button>
                <button className="mood-x" onClick={() => onRemove(e.id)}>×</button>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
