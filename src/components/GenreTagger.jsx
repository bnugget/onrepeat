import React, { useMemo, useState, useRef } from "react";
import { findArtistMatches } from "../lib/aggregate.js";
import { GENRE_PRESETS, colorForGenre, exportGenreTags, parseImportedGenreTags } from "../lib/genreTags.js";
import { getLastfmKey, setLastfmKey } from "../lib/settings.js";
import GroupedTagList from "./GroupedTagList.jsx";
import UntaggedArtistsPanel from "./UntaggedArtistsPanel.jsx";

export default function GenreTagger({
  data,
  genreTags,
  fromInt,
  toInt,
  onSetTag,
  onRemoveTag,
  onImport,
  fetchStatus,
  onStartFetch,
  onStopFetch
}) {
  const [query, setQuery] = useState("");
  const [customGenre, setCustomGenre] = useState("");
  const [showSkipped, setShowSkipped] = useState(false);
  const [lastfmKeyInput, setLastfmKeyInput] = useState(() => getLastfmKey());
  const [rate, setRate] = useState(15);
  const fileRef = useRef(null);

  const remaining = data.artistNames.filter((n) => !genreTags[n]).length;
  const etaMin = Math.ceil(remaining / rate / 60);

  function saveKeyAndStart() {
    setLastfmKey(lastfmKeyInput.trim());
    onStartFetch(lastfmKeyInput.trim(), rate);
  }

  const matches = useMemo(() => {
    if (!query.trim()) return [];
    return findArtistMatches(data, query, fromInt, toInt, 8);
  }, [data, query, fromInt, toInt]);

  function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        onImport(parseImportedGenreTags(reader.result));
      } catch (err) {
        alert("Couldn't read that file: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <section className="mood-tagger">
      <div className="mood-tagger-head">
        <span className="insight-label">◆ Tag an artist's genre</span>
        <div className="mood-io">
          <button className="btn" onClick={() => exportGenreTags(genreTags)}>Export tags</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>Import tags</button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={handleImportFile} />
        </div>
      </div>

      <div className="lastfm-panel">
        <div className="lastfm-panel-head">
          <span className="chart-hint" style={{ textTransform: "none" }}>
            Auto-fill from Last.fm ({remaining.toLocaleString()} of {data.artistNames.length.toLocaleString()} artists untagged)
          </span>
        </div>

        {!fetchStatus.running && (
          <div className="lastfm-controls">
            <div className="field" style={{ flex: "1 1 220px" }}>
              <label htmlFor="lastfmKey">Last.fm API key</label>
              <input
                id="lastfmKey"
                type="password"
                placeholder="Paste your free Last.fm API key…"
                value={lastfmKeyInput}
                onChange={(e) => setLastfmKeyInput(e.target.value)}
              />
            </div>
            <div className="field" style={{ width: 90 }}>
              <label htmlFor="rate">Req/sec</label>
              <input id="rate" type="number" min="1" max="30" value={rate} onChange={(e) => setRate(Number(e.target.value) || 1)} />
            </div>
            <button
              className="btn primary"
              disabled={!lastfmKeyInput.trim() || remaining === 0}
              onClick={saveKeyAndStart}
              title={!lastfmKeyInput.trim() ? "Paste your Last.fm API key above first" : undefined}
            >
              {remaining === 0 ? "All artists tagged" : `Fetch all ${remaining.toLocaleString()} (~${etaMin}m)`}
            </button>
          </div>
        )}

        {fetchStatus.running && (
          <div className="lastfm-progress">
            <div className="lastfm-progress-bar">
              <div
                className="lastfm-progress-fill"
                style={{ width: `${fetchStatus.total ? (fetchStatus.processed / fetchStatus.total) * 100 : 0}%` }}
              />
            </div>
            <div className="lastfm-progress-row">
              <span className="chart-hint">
                {fetchStatus.processed.toLocaleString()} / {fetchStatus.total.toLocaleString()} · {fetchStatus.tagged.toLocaleString()} tagged · {fetchStatus.skipped.toLocaleString()} no match
                {fetchStatus.currentName ? ` · checking "${fetchStatus.currentName}"` : ""}
              </span>
              <button className="btn" onClick={onStopFetch}>Stop</button>
            </div>
          </div>
        )}

        {!fetchStatus.running && fetchStatus.skippedDetails && fetchStatus.skippedDetails.length > 0 && (
          <div className="lastfm-skipped">
            <button className="btn" style={{ width: "100%" }} onClick={() => setShowSkipped((s) => !s)}>
              {showSkipped ? "Hide" : "Show"} {fetchStatus.skippedDetails.length} skipped artist{fetchStatus.skippedDetails.length === 1 ? "" : "s"} and why
            </button>
            {showSkipped && (
              <div className="lastfm-skipped-list">
                {fetchStatus.skippedDetails.map((d) => (
                  <div className="lastfm-skipped-row" key={d.name}>
                    <span className="lastfm-skipped-name">{d.name}</span>
                    <span className="chart-hint" style={{ textTransform: "none" }}>{d.reason}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <UntaggedArtistsPanel data={data} genreTags={genreTags} fromInt={fromInt} toInt={toInt} onSetTag={onSetTag} />

      <div className="field" style={{ marginBottom: 10 }}>
        <label htmlFor="genreSearch">Find an artist</label>
        <input
          id="genreSearch"
          type="text"
          placeholder="Search any artist to tag…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
      </div>

      {query.trim() && matches.length === 0 && (
        <p className="mood-empty">No artists match that search in the current date range.</p>
      )}

      {matches.map((m) => {
        const current = genreTags[m.name];
        return (
          <div className="mood-match-row" key={m.name}>
            <div className="mood-match-info">
              <span className="mood-match-name">{m.name}</span>
              <span className="mood-match-count">{m.count.toLocaleString()} plays</span>
              {current && (
                <span className="mood-current" style={{ borderColor: colorForGenre(current) }}>
                  <span className="sw" style={{ background: colorForGenre(current) }} />
                  {current}
                  <button className="mood-x" aria-label={`Remove genre tag for ${m.name}`} onClick={() => onRemoveTag(m.name)}>×</button>
                </span>
              )}
            </div>
            <div className="mood-pills">
              {GENRE_PRESETS.map((g) => (
                <button
                  key={g.name}
                  className={`mood-pill${current === g.name ? " active" : ""}`}
                  style={{ borderColor: g.color, color: current === g.name ? "#4A3347" : g.color, background: current === g.name ? g.color : "transparent" }}
                  onClick={() => onSetTag(m.name, g.name)}
                >
                  {g.name}
                </button>
              ))}
              <input
                className="mood-custom-input"
                placeholder="custom…"
                value={customGenre}
                onChange={(e) => setCustomGenre(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customGenre.trim()) {
                    onSetTag(m.name, customGenre.trim());
                    setCustomGenre("");
                  }
                }}
              />
            </div>
          </div>
        );
      })}

      <GroupedTagList tags={genreTags} colorFn={colorForGenre} onRemove={onRemoveTag} itemLabel="artist" />
    </section>
  );
}
