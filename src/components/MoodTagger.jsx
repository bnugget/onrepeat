import React, { useMemo, useState, useRef } from "react";
import { findArtistMatches } from "../lib/aggregate.js";
import { MOOD_PRESETS, colorForMood, exportMoodTags, parseImportedTags } from "../lib/moodTags.js";
import GroupedTagList from "./GroupedTagList.jsx";

export default function MoodTagger({ data, moodTags, fromInt, toInt, onSetTag, onRemoveTag, onImport }) {
  const [query, setQuery] = useState("");
  const [customMood, setCustomMood] = useState("");
  const fileRef = useRef(null);

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
        onImport(parseImportedTags(reader.result));
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
        <span className="insight-label">◆ Tag an artist's mood</span>
        <div className="mood-io">
          <button className="btn" onClick={() => exportMoodTags(moodTags)}>Export tags</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>Import tags</button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={handleImportFile} />
        </div>
      </div>

      <div className="field" style={{ marginBottom: 10 }}>
        <label htmlFor="moodSearch">Find an artist</label>
        <input
          id="moodSearch"
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
        const current = moodTags[m.name];
        return (
          <div className="mood-match-row" key={m.name}>
            <div className="mood-match-info">
              <span className="mood-match-name">{m.name}</span>
              <span className="mood-match-count">{m.count.toLocaleString()} plays</span>
              {current && (
                <span className="mood-current" style={{ borderColor: colorForMood(current) }}>
                  <span className="sw" style={{ background: colorForMood(current) }} />
                  {current}
                  <button className="mood-x" onClick={() => onRemoveTag(m.name)}>×</button>
                </span>
              )}
            </div>
            <div className="mood-pills">
              {MOOD_PRESETS.map((p) => (
                <button
                  key={p.name}
                  className={`mood-pill${current === p.name ? " active" : ""}`}
                  style={{ borderColor: p.color, color: current === p.name ? "#4A3347" : p.color, background: current === p.name ? p.color : "transparent" }}
                  onClick={() => onSetTag(m.name, p.name)}
                >
                  {p.name}
                </button>
              ))}
              <input
                className="mood-custom-input"
                placeholder="custom…"
                value={customMood}
                onChange={(e) => setCustomMood(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customMood.trim()) {
                    onSetTag(m.name, customMood.trim());
                    setCustomMood("");
                  }
                }}
              />
            </div>
          </div>
        );
      })}

      <GroupedTagList tags={moodTags} colorFn={colorForMood} onRemove={onRemoveTag} itemLabel="artist" />
    </section>
  );
}
