import React, { useMemo, useState } from "react";
import { aggregate, dateBounds } from "../lib/aggregate.js";
import { buildInsightContext } from "../lib/insightContext.js";
import { generateInsight } from "../lib/claudeApi.js";
import { getAnthropicKey, setAnthropicKey, getCustomInstructions, setCustomInstructions } from "../lib/settings.js";
import { renderMarkdownLite } from "../lib/markdownLite.jsx";

const DEFAULT_INSIGHT = `Click "Generate" below for a breakdown of what stands out in your listening — favorite eras, dominant artists, surprising gaps, and more, based on your actual data and current filters.`;

export default function InsightDrawer({ data, fromInt, toInt, moodTags, genreTags, eras, excludedArtists }) {
  const [open, setOpen] = useState(false);
  const [anthropicKeyInput, setAnthropicKeyInput] = useState(() => getAnthropicKey());
  const [instructions, setInstructions] = useState(() => getCustomInstructions());
  const [dynamicText, setDynamicText] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showKeyField, setShowKeyField] = useState(!getAnthropicKey());

  const rangeIsFull = useMemo(() => {
    const { min, max } = dateBounds(data);
    return fromInt === min && toInt === max;
  }, [data, fromInt, toInt]);

  const includesLine = useMemo(() => {
    const parts = [
      moodTags && Object.keys(moodTags).length > 0 ? `${Object.keys(moodTags).length} mood tags` : null,
      genreTags && Object.keys(genreTags).length > 0 ? `${Object.keys(genreTags).length} genre tags` : null,
      eras && eras.length > 0 ? `${eras.length} era${eras.length === 1 ? "" : "s"}` : null,
      excludedArtists && excludedArtists.length > 0 ? `${excludedArtists.length} artist${excludedArtists.length === 1 ? "" : "s"} excluded` : null
    ].filter(Boolean);
    return parts.length > 0 ? `Includes: ${parts.join(", ")}` : "Tag some moods, genres, or eras to enrich this";
  }, [moodTags, genreTags, eras, excludedArtists]);

  async function regenerate() {
    const key = anthropicKeyInput.trim();
    if (!key) {
      setShowKeyField(true);
      return;
    }
    setAnthropicKey(key);
    setCustomInstructions(instructions);
    setLoading(true);
    setError(null);
    try {
      const context = buildInsightContext(data, fromInt, toInt, { moodTags, genreTags, eras, excludedArtists });
      const text = await generateInsight(context, key, instructions);
      setDynamicText(text);
    } catch (err) {
      setError(err.message || "Something went wrong generating the insight.");
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const { min, max } = dateBounds(data);
    const { yearly } = aggregate(data, min, max);
    const totalAll = data.eventDate.length;

    let top10Sum = 0;
    const yearTotals = new Map();
    for (const [year, counts] of yearly.entries()) {
      const sum = counts.reduce((a, b) => a + b, 0);
      yearTotals.set(year, sum);
      top10Sum += counts.slice(0, 10).reduce((a, b) => a + b, 0);
    }

    let peakYear = null, peakCount = -1;
    for (const [y, t] of yearTotals.entries()) {
      if (t > peakCount) { peakCount = t; peakYear = y; }
    }

    const years = [...yearTotals.keys()].sort((a, b) => a - b);
    const gapYears = [];
    for (let y = years[0]; y <= years[years.length - 1]; y++) {
      if (!yearTotals.has(y)) gapYears.push(y);
    }

    return {
      totalAll,
      top10Pct: totalAll ? ((top10Sum / totalAll) * 100).toFixed(1) : "0",
      peakYear,
      peakCount,
      spanStart: years[0],
      spanEnd: years[years.length - 1],
      gapYears,
      uniqueArtists: data.artistNames.length
    };
  }, [data]);

  return (
    <>
      <button className="insight-fab" onClick={() => setOpen(true)}>
        <span>✦</span> Insight
      </button>

      {open && <div className="drawer-backdrop" onClick={() => setOpen(false)} />}

      <aside className={`insight-drawer${open ? " open" : ""}`} aria-hidden={!open}>
        <div className="drawer-head">
          <span className="insight-label">◆ Generated insight</span>
          <button className="drawer-close" onClick={() => setOpen(false)} aria-label="Close">×</button>
        </div>

        <div className="drawer-scroll">
          <span className="insight-meta">{stats.totalAll.toLocaleString()} plays analyzed all-time</span>

          <div className="insight-body">
            {dynamicText ? renderMarkdownLite(dynamicText) : renderMarkdownLite(DEFAULT_INSIGHT)}
          </div>

          <div className="insight-regen">
            {showKeyField && (
              <input
                type="password"
                className="insight-key-input"
                placeholder="Anthropic API key…"
                value={anthropicKeyInput}
                onChange={(e) => setAnthropicKeyInput(e.target.value)}
              />
            )}
            <label className="insight-instructions-label" htmlFor="customInstructions">
              Custom instructions (optional)
            </label>
            <textarea
              id="customInstructions"
              className="insight-instructions"
              placeholder='e.g. "do a deep dive comparing my two eras"'
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={2}
            />
            <button className="btn primary" onClick={regenerate} disabled={loading}>
              {loading
                ? "Thinking…"
                : dynamicText
                  ? "Regenerate"
                  : rangeIsFull
                    ? "Generate fresh insight"
                    : "Generate for this date range"}
            </button>
            {error && <span className="insight-error">{error}</span>}
          </div>
          {dynamicText && !rangeIsFull && (
            <p className="chart-hint" style={{ margin: "6px 0 0" }}>scoped to your current date range</p>
          )}
          <p className="chart-hint" style={{ margin: "6px 0 0" }}>{includesLine}</p>
        </div>
      </aside>
    </>
  );
}
