import React, { useMemo, useState } from "react";
import { rankArtists } from "../lib/rankings.js";
import { GENRE_PRESETS, colorForGenre } from "../lib/genreTags.js";
import { fetchTopTag, mapTagToGenre } from "../lib/lastfm.js";
import { getLastfmKey } from "../lib/settings.js";

const SHOW_COUNT = 20;

/** A prioritized cleanup queue: the highest-play-count artists that
 *  still have no genre, so effort goes where it matters most (the
 *  80/20) instead of hunting through a full, unranked artist list.
 *  Each row supports a one-off Last.fm re-check (for the "name
 *  didn't resolve" case) or manual tagging right there. */
export default function UntaggedArtistsPanel({ data, genreTags, fromInt, toInt, onSetTag }) {
  const [customGenre, setCustomGenre] = useState({});
  const [retrying, setRetrying] = useState({});
  const [retryResult, setRetryResult] = useState({});
  const [showAll, setShowAll] = useState(false);

  const topUntagged = useMemo(() => {
    const ranked = rankArtists(data, fromInt, toInt, 100000);
    return ranked.filter((r) => !genreTags[r.name]);
  }, [data, fromInt, toInt, genreTags]);

  const visible = showAll ? topUntagged : topUntagged.slice(0, SHOW_COUNT);

  async function retryOne(name) {
    const apiKey = getLastfmKey();
    if (!apiKey) {
      alert("Add your Last.fm API key above (in the Auto-fill section) first.");
      return;
    }
    setRetrying((r) => ({ ...r, [name]: true }));
    try {
      const rawTag = await fetchTopTag(name, apiKey);
      const genre = mapTagToGenre(rawTag);
      if (genre) {
        onSetTag(name, genre);
        setRetryResult((r) => ({ ...r, [name]: { success: true, rawTag } }));
      } else {
        setRetryResult((r) => ({ ...r, [name]: { success: false, reason: "Still no tags found on Last.fm for this name" } }));
      }
    } catch (err) {
      setRetryResult((r) => ({ ...r, [name]: { success: false, reason: err.message || "Request failed" } }));
    } finally {
      setRetrying((r) => ({ ...r, [name]: false }));
    }
  }

  if (topUntagged.length === 0) return null;

  return (
    <div className="untagged-panel">
      <div className="mood-tagger-head">
        <span className="insight-label">◆ Top untagged artists</span>
        <span className="chart-hint">{topUntagged.length.toLocaleString()} untagged, sorted by plays</span>
      </div>
      <p className="mood-empty" style={{ marginBottom: 10 }}>
        The highest-play-count artists still missing a genre — covering these first gets the most
        value for the least effort.
      </p>

      {visible.map((r) => {
        const result = retryResult[r.name];
        return (
          <div className="mood-match-row" key={r.name}>
            <div className="mood-match-info">
              <span className="mood-match-name">{r.name}</span>
              <span className="mood-match-count">{r.count.toLocaleString()} plays</span>
              {result && (
                <span className="chart-hint" style={{ textTransform: "none", color: result.success ? "var(--accent)" : "var(--ink-faint)" }}>
                  {result.success ? `Tagged via Last.fm: "${result.rawTag}"` : result.reason}
                </span>
              )}
            </div>
            <div className="mood-pills">
              <button className="btn" disabled={retrying[r.name]} onClick={() => retryOne(r.name)}>
                {retrying[r.name] ? "Checking…" : "↻ Retry Last.fm"}
              </button>
              {GENRE_PRESETS.map((g) => (
                <button
                  key={g.name}
                  className="mood-pill"
                  style={{ borderColor: g.color, color: g.color }}
                  onClick={() => onSetTag(r.name, g.name)}
                >
                  {g.name}
                </button>
              ))}
              <input
                className="mood-custom-input"
                placeholder="custom…"
                value={customGenre[r.name] || ""}
                onChange={(e) => setCustomGenre((c) => ({ ...c, [r.name]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (customGenre[r.name] || "").trim()) {
                    onSetTag(r.name, customGenre[r.name].trim());
                    setCustomGenre((c) => ({ ...c, [r.name]: "" }));
                  }
                }}
              />
            </div>
          </div>
        );
      })}

      {topUntagged.length > SHOW_COUNT && (
        <button className="btn" style={{ width: "100%", marginTop: 8 }} onClick={() => setShowAll((s) => !s)}>
          {showAll ? "Show fewer" : `Show all ${topUntagged.length.toLocaleString()}`}
        </button>
      )}
    </div>
  );
}
