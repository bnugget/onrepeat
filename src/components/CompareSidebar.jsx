import React from "react";
import DateRangePicker from "./DateRangePicker.jsx";
import ArtistSearchPicker from "./ArtistSearchPicker.jsx";
import GenreSearchPicker from "./GenreSearchPicker.jsx";
import AccordionSection from "./AccordionSection.jsx";

const MIN_PLAYS_OPTIONS = [0, 10, 25, 50, 100, 250]; // matches My Dashboard's min-plays presets exactly

export default function CompareSidebar({
  profiles,
  idA,
  idB,
  onIdAChange,
  onIdBChange,
  onCompare,
  loading,
  bothLoaded,
  combinedBounds,
  fromInt,
  toInt,
  onDateChange,
  minPlays,
  onMinPlaysChange,
  trendFilterType,
  onTrendFilterTypeChange,
  trendFilterValue,
  onTrendFilterValueChange,
  dataA,
  dataB,
  genreTags,
  open,
  onClose
}) {
  return (
    <>
      {open && <div className="drawer-backdrop sidebar-backdrop" onClick={onClose} />}
      <aside className={`sidebar${open ? " open" : ""}`}>
        <div className="sidebar-head">
          <span className="eyebrow" style={{ margin: 0 }}>Compare setup</span>
          <button className="sidebar-close" onClick={onClose} aria-label="Close filters">×</button>
        </div>

        <div className="sidebar-scroll">
          <div className="field" style={{ marginBottom: 10 }}>
            <label>Profile A</label>
            <select value={idA} onChange={(e) => onIdAChange(e.target.value)}>
              <option value="">Choose…</option>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 10 }}>
            <label>Profile B</label>
            <select value={idB} onChange={(e) => onIdBChange(e.target.value)}>
              <option value="">Choose…</option>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {idA && idB && idA === idB && <p className="insight-error" style={{ marginBottom: 10 }}>Pick two different profiles.</p>}
          <button
            className="btn primary"
            style={{ width: "100%" }}
            onClick={onCompare}
            disabled={!idA || !idB || idA === idB || loading}
            title={!idA || !idB ? "Pick both Profile A and Profile B first" : idA === idB ? "Pick two different profiles" : undefined}
          >
            {loading ? "Loading…" : "Compare"}
          </button>

          {bothLoaded && (
            <>
              <div className="sidebar-divider" />
              <DateRangePicker bounds={combinedBounds} fromInt={fromInt} toInt={toInt} onChange={onDateChange} />

              <div className="field" style={{ marginTop: 14 }}>
                <label>Minimum plays</label>
                <div className="tabs" style={{ flexWrap: "wrap" }}>
                  {MIN_PLAYS_OPTIONS.map((n) => (
                    <button key={n} className={minPlays === n ? "tab active" : "tab"} onClick={() => onMinPlaysChange(n)}>{n === 0 ? "Off" : `${n}+`}</button>
                  ))}
                </div>
                <p className="mood-empty" style={{ marginTop: 6 }}>
                  Applies to similarity, overlap, and "most different" — an artist only counts once
                  someone's played them at least this many times.
                </p>
              </div>

              <div className="sidebar-divider" />

              <div>
                <div className="accordion-group-label">Trend Chart</div>
                <div className="accordion-group">
                  <AccordionSection title="Filter" badge={trendFilterType !== "none" ? 1 : null}>
                    <div className="content-toggle" style={{ marginBottom: 10 }}>
                      <button
                        className={trendFilterType === "none" ? "content-toggle-btn active" : "content-toggle-btn"}
                        onClick={() => { onTrendFilterTypeChange("none"); onTrendFilterValueChange(null); }}
                      >
                        All
                      </button>
                      <button
                        className={trendFilterType === "artist" ? "content-toggle-btn active" : "content-toggle-btn"}
                        onClick={() => { onTrendFilterTypeChange("artist"); onTrendFilterValueChange(null); }}
                      >
                        Artist
                      </button>
                      <button
                        className={trendFilterType === "genre" ? "content-toggle-btn active" : "content-toggle-btn"}
                        onClick={() => { onTrendFilterTypeChange("genre"); onTrendFilterValueChange(null); }}
                      >
                        Genre
                      </button>
                    </div>
                    {trendFilterType === "artist" && (
                      <ArtistSearchPicker dataA={dataA} dataB={dataB} value={trendFilterValue} onChange={onTrendFilterValueChange} />
                    )}
                    {trendFilterType === "genre" && (
                      <GenreSearchPicker dataA={dataA} dataB={dataB} genreTags={genreTags} value={trendFilterValue} onChange={onTrendFilterValueChange} />
                    )}
                    {trendFilterType === "none" && (
                      <p className="mood-empty">Showing total plays for both people. Mood and Era aren't available here — they're personal, not shared between profiles.</p>
                    )}
                  </AccordionSection>
                </div>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
