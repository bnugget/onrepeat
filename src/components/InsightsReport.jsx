import React, { useState } from "react";
import { generateComparisonReport, parseReportSections } from "../lib/claudeApi.js";
import { getAnthropicKey, setAnthropicKey } from "../lib/settings.js";
import { renderMarkdownLite } from "../lib/markdownLite.jsx";

export default function InsightsReport({ comparison, genreCmp, overlap }) {
  const [sections, setSections] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [instructions, setInstructions] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState(() => getAnthropicKey());
  const [showKeyField, setShowKeyField] = useState(!getAnthropicKey());

  async function handleGenerate() {
    const key = apiKeyInput.trim();
    if (!key) {
      setShowKeyField(true);
      return;
    }
    setAnthropicKey(key);
    setLoading(true);
    setError(null);
    try {
      const context = {
        nameA: comparison.nameA,
        nameB: comparison.nameB,
        dateRangeLabel: comparison.dateRangeLabel,
        similarityPct: comparison.similarityPct,
        similarityLabel: comparison.similarityLabel,
        sharedArtistCount: comparison.sharedCount,
        topContributors: overlap.topContributors.slice(0, 8).map((c) => ({
          name: c.name, countA: c.countA, countB: c.countB, pctA: +c.pctA.toFixed(1), pctB: +c.pctB.toFixed(1)
        })),
        mostDifferent: overlap.mostDifferent.slice(0, 8).map((d) => ({
          name: d.name, rankA: d.rankA, rankB: d.rankB, pctA: +d.pctA.toFixed(1), pctB: +d.pctB.toFixed(1)
        })),
        onlyA: comparison.onlyA.slice(0, 8).map((r) => ({ name: r.name, count: r.count })),
        onlyB: comparison.onlyB.slice(0, 8).map((r) => ({ name: r.name, count: r.count })),
        genreSimilarityPct: genreCmp.similarityPct,
        genresA: genreCmp.pieA.slices.map((s) => ({ name: s.name, pct: genreCmp.pieA.total > 0 ? +((s.value / genreCmp.pieA.total) * 100).toFixed(1) : 0 })),
        genresB: genreCmp.pieB.slices.map((s) => ({ name: s.name, pct: genreCmp.pieB.total > 0 ? +((s.value / genreCmp.pieB.total) * 100).toFixed(1) : 0 }))
      };
      const text = await generateComparisonReport(context, key, instructions);
      setSections(parseReportSections(text));
    } catch (err) {
      setError(err.message || "Couldn't generate the report.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 16 }}>
      <section className="chart-card">
        <p className="chart-hint" style={{ textTransform: "none", fontSize: 12.5, marginBottom: 12 }}>
          A structured, AI-written breakdown of this comparison — summary, artist overlap, genre
          overlap, and a fun compatibility verdict — all grounded in the actual numbers above, not
          generic filler.
        </p>
        {showKeyField && (
          <input
            type="password"
            className="insight-key-input"
            placeholder="Anthropic API key..."
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            style={{ marginBottom: 10 }}
          />
        )}
        <label className="insight-instructions-label" htmlFor="reportInstructions">
          Custom instructions (optional)
        </label>
        <textarea
          id="reportInstructions"
          className="insight-instructions"
          placeholder='e.g. "focus on our hip hop overlap" or "make the verdict extra dramatic"'
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={2}
        />
        <button className="btn primary" onClick={handleGenerate} disabled={loading} style={{ marginTop: 10 }}>
          {loading ? "Writing report..." : sections ? "Regenerate report" : "Generate report"}
        </button>
        {error && <p className="insight-error" style={{ marginTop: 10 }}>{error}</p>}
      </section>

      {sections && sections.map((s) => (
        <section
          className={`chart-card${s.title.toLowerCase().includes("verdict") ? " report-verdict-card" : ""}`}
          style={{ marginTop: 16 }}
          key={s.title}
        >
          <div className="breakdown-col-label">{s.title}</div>
          <div className="insight-body">{renderMarkdownLite(s.body)}</div>
        </section>
      ))}
    </div>
  );
}
