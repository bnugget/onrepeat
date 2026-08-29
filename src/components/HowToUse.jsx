import React from "react";

function GuideStep({ number, title, children, visual }) {
  return (
    <div className="guide-step">
      <div className="guide-step-num">{number}</div>
      <div className="guide-step-body">
        <div className="guide-step-title">{title}</div>
        <div className="guide-step-desc">{children}</div>
        {visual}
      </div>
    </div>
  );
}

function GuideVisual({ label, children }) {
  return (
    <div className="guide-visual">
      <div className="guide-visual-label">{label}</div>
      {children}
    </div>
  );
}

/* --- Small previews built from the app's real CSS classes, so they look like the actual UI rather than a generic mockup --- */

function ProfileSwitcherPreview() {
  return (
    <div className="profile-switcher-list" style={{ position: "static", width: 280, boxShadow: "none" }}>
      <div className="profile-switcher-row">
        <button className="profile-switcher-name active" style={{ pointerEvents: "none" }}>
          <span>Your profile</span>
          <span className="chart-hint">142,301</span>
        </button>
        <button className="era-zoom" title="Upload fresher data" style={{ pointerEvents: "none" }} aria-hidden="true" tabIndex={-1}>↻</button>
        <button className="mood-x" title="Delete" style={{ pointerEvents: "none" }} aria-hidden="true" tabIndex={-1}>×</button>
      </div>
      <div className="profile-switcher-row">
        <button className="profile-switcher-name" style={{ pointerEvents: "none" }}>
          <span>A friend's profile</span>
          <span className="chart-hint">88,940</span>
        </button>
        <button className="era-zoom" title="Upload fresher data" style={{ pointerEvents: "none" }} aria-hidden="true" tabIndex={-1}>↻</button>
        <button className="mood-x" title="Delete" style={{ pointerEvents: "none" }} aria-hidden="true" tabIndex={-1}>×</button>
      </div>
    </div>
  );
}

function TagChipPreview({ label, color, extra }) {
  return (
    <span className="tagged-chip" style={{ borderColor: color, pointerEvents: "none" }}>
      <span className="sw" style={{ background: color }} />
      {label}
      {extra && <span style={{ marginLeft: 4 }}>{extra}</span>}
      <button className="mood-x" style={{ pointerEvents: "none" }} aria-hidden="true" tabIndex={-1}>×</button>
    </span>
  );
}

function LegendPreview() {
  const rows = [
    { name: "Drake", color: "#E8639F", value: "5,207" },
    { name: "KAYTRANADA", color: "#7FC3E8", value: "3,981" },
    { name: "SZA", color: "#F0B86E", value: "2,650" }
  ];
  return (
    <div className="legend-panel" style={{ maxWidth: 240 }}>
      <div className="legend-panel-list">
        {rows.map((r) => (
          <div key={r.name} className="legend-panel-row" style={{ pointerEvents: "none" }}>
            <span className="sw" style={{ background: r.color }} />
            <span className="legend-panel-name">{r.name}</span>
            <span className="legend-panel-value">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HowToUse() {
  return (
    <div className="wrap">
      <header className="top">
        <p className="eyebrow">How to Use</p>
        <h1>Getting <span>Started</span></h1>
        <p className="subhead">
          A quick walkthrough for setting up a profile and getting the most out of both My
          Dashboard and Compare Profiles.
        </p>
      </header>

      <section className="chart-card">
        <div className="breakdown-col-label" style={{ marginBottom: 4 }}>How to Set Up</div>

        <GuideStep number={1} title="Create a profile">
          Sign in, then use the profile switcher in the top-right corner and choose{" "}
          <b>+ New profile</b>. Give it a name, then upload your Spotify Extended Streaming History
          (JSON files, request one from Spotify's privacy settings) and/or a Last.fm export (CSV).
          You can upload just one or both — everything is parsed in your browser before anything
          gets uploaded.
        </GuideStep>

        <GuideStep
          number={2}
          title="Adding new data later"
          visual={
            <GuideVisual label="Top-right profile switcher">
              <ProfileSwitcherPreview />
            </GuideVisual>
          }
        >
          Got a newer export with more history? Open the profile switcher (top right), find the
          profile, and click the <b>↻ refresh icon</b> next to it. That re-runs the upload for that
          same profile — same name, same identity, just refreshed data — rather than creating a
          duplicate.
        </GuideStep>

        <GuideStep number={3} title="My Dashboard vs. Compare Profiles">
          <b>My Dashboard</b> is a deep dive into one profile at a time — whichever one is
          currently active. Charts, mood/genre/era tagging, Top 100s, Obsession Index, and
          single-profile AI insights all live here.
          <br /><br />
          <b>Compare Profiles</b> is for two profiles at once — yours and a friend's, or any two
          people who've both set up a profile. It's a separate analysis: similarity scores, genre
          and artist overlap, head-to-head records, and an AI-written compatibility report.
        </GuideStep>
      </section>

      <section className="chart-card" style={{ marginTop: 16 }}>
        <div className="breakdown-col-label" style={{ marginBottom: 4 }}>How to Use</div>

        <GuideStep
          number={1}
          title="Look at artist trends over time"
          visual={
            <GuideVisual label="Legend panel (My Dashboard)">
              <LegendPreview />
            </GuideVisual>
          }
        >
          On My Dashboard's main chart, use <b>View</b> to switch between By Artist / Mood / Genre
          / Era, and <b>Grain</b> to zoom between Year and Month. The legend on the right is
          clickable — toggle individual series on or off to isolate what you care about, or use{" "}
          <b>Show only → Top 10/25/100</b> to declutter a chart with a lot of series. In Compare
          Profiles, the <b>Artist Trends</b> tab does the same thing for two people at once — pick
          one artist or a shared genre and see both people's plays over time, side by side.
        </GuideStep>

        <GuideStep number={2} title="Break out or drill down into any period">
          Click any bar in the main chart to open a breakdown panel showing exactly what made up
          that period — top artists, albums, and songs, each with a PoP% badge showing how it
          changed versus the period right before it. It's the fastest way to go from "this year
          looks big" to "here's specifically why."
        </GuideStep>

        <GuideStep number={3} title="See your top songs for one artist">
          Click an artist's name almost anywhere it appears — the chart breakdown, the Top 100
          Artists page, search results — and it jumps to <b>Song Distribution</b>: a ranked list of
          that artist's tracks, each with a skip rate and how it compares to that artist's average
          track.
        </GuideStep>

        <GuideStep
          number={4}
          title="Set up Mood Tags"
          visual={
            <GuideVisual label="A tagged mood chip">
              <TagChipPreview label="Nostalgic" color="#F0B86E" />
            </GuideVisual>
          }
        >
          In the sidebar, open <b>Mood tags</b>, search an artist, and tag them with a mood —
          Chill, Hype, Sad, whatever categories are meaningful to you. Moods are personal to you
          and stay local to your own tagging. Once you've tagged a handful of artists, switch the
          main chart's <b>View</b> to <b>By Mood</b> — combined with Eras (below), this is how you
          find out whether a mood clustered around a specific stretch of your life, rather than
          just guessing.
        </GuideStep>

        <GuideStep
          number={5}
          title="Set up Eras"
          visual={
            <GuideVisual label="A marked era chip">
              <TagChipPreview label="College Years" color="#8FD4A8" extra="— Sep 2019 to May 2023" />
            </GuideVisual>
          }
        >
          In the sidebar, open <b>Era tags</b>, give it a label and a date range (the same date
          picker used everywhere else, including quick presets like "Last Year"), and it shows up
          as a shaded band across the timeline. Eras aren't just visual — the AI Insight drawer can
          reference them by name directly ("what dominated my College Years vs. my Breakup era"),
          and in Compare Profiles, any date-range comparison naturally lines up against whatever
          eras you've marked.
        </GuideStep>
      </section>

      <section className="chart-card" style={{ marginTop: 16 }}>
        <div className="breakdown-col-label" style={{ marginBottom: 10 }}>A few more things worth knowing</div>
        <ul className="insight-list">
          <li><b>Genre tags are shared, mood tags aren't.</b> Tag an artist's genre once and it's visible to everyone using this project — genre is objective enough to treat as shared community data. Mood is personal, so it stays local to you.</li>
          <li><b>Minimum Plays</b> (sidebar on My Dashboard, or the Compare Profiles sidebar) filters out one-off listens from every chart and calculation — useful if a single accidental play of something is cluttering your view.</li>
          <li><b>Obsession Index</b> hunts for the most intense binge windows in your history — not just "most played," but "most played in the shortest stretch of time," which surfaces genuine phases rather than just lifetime favorites.</li>
          <li><b>Backup</b>, at the bottom of the sidebar, exports every tag, filter, and era you've set up as one JSON file — worth doing before clearing your browser or switching computers, since none of that lives on a server.</li>
          <li>The <b>✦ Insight</b> tab floating on the right edge of My Dashboard opens the full AI insight drawer at any time — it's scoped to whatever date range and filters you currently have active.</li>
        </ul>
      </section>
    </div>
  );
}
