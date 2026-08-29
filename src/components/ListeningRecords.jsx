import React, { useState } from "react";
import { PERSON_A_COLOR, PERSON_B_COLOR } from "../lib/constants.js";
import { getDayEventBreakdown } from "../lib/listeningRecords.js";

function RecordRow({ label, sublabel, valueA, subA, valueB, subB, winner, unavailable, warningA, warningB }) {
  if (unavailable) return null;
  return (
    <div className="record-row">
      <div className={`record-side record-side-a${winner === "A" ? " winner" : ""}`}>
        {winner === "A" && <span className="record-trophy">🏆</span>}
        <span className="record-value" style={winner === "A" ? { color: PERSON_A_COLOR } : undefined}>{valueA}</span>
        {subA && <span className="record-sub">{subA}</span>}
        {warningA}
      </div>
      <div className="record-label">
        <span>{label}</span>
        {sublabel && <span className="record-sublabel">{sublabel}</span>}
      </div>
      <div className={`record-side record-side-b${winner === "B" ? " winner" : ""}`}>
        {winner === "B" && <span className="record-trophy">🏆</span>}
        <span className="record-value" style={winner === "B" ? { color: PERSON_B_COLOR } : undefined}>{valueB}</span>
        {subB && <span className="record-sub">{subB}</span>}
        {warningB}
      </div>
    </div>
  );
}

/** Shown next to an "impossible" day-minutes record — explains why
 *  it can't be right and lets the person actually see the underlying
 *  events, rather than just being told to distrust a number. */
function ImpossibleDayWarning({ data, dayInt, dayLabel }) {
  const [open, setOpen] = useState(false);
  if (!data || dayInt === null || dayInt === undefined) return null;

  return (
    <div style={{ marginTop: 4 }}>
      <button
        className="record-warning-btn"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        ⚠ Exceeds 24 hours — likely duplicate data. {open ? "Hide" : "Show"} events
      </button>
      {open && <DayEventBreakdown data={data} dayInt={dayInt} dayLabel={dayLabel} />}
    </div>
  );
}

function DayEventBreakdown({ data, dayInt, dayLabel }) {
  const breakdown = getDayEventBreakdown(data, dayInt);
  const totalMin = Math.round(breakdown.totalMs / 60000);
  return (
    <div className="day-breakdown">
      <p className="chart-hint" style={{ textTransform: "none", marginBottom: 8 }}>
        {breakdown.totalCount} events on {dayLabel}, totaling {totalMin.toLocaleString()} minutes.
        {breakdown.duplicateGroups > 0
          ? ` ${breakdown.duplicateGroups} exact-duplicate group${breakdown.duplicateGroups === 1 ? "" : "s"} found — same artist, track, and play length appearing more than once, most likely from an overlapping data upload.`
          : " No exact duplicates found — worth checking for near-duplicates (same song, slightly different play length) or a source-data issue instead."}
      </p>
      <div className="day-breakdown-list">
        {breakdown.events.map((e, i) => (
          <div className={`day-breakdown-row${e.exactDuplicateCount > 1 ? " dup" : ""}`} key={i}>
            <span className="day-breakdown-track">{e.track} — {e.artist}</span>
            <span className="day-breakdown-meta">
              {e.ms !== null ? `${Math.round(e.ms / 1000)}s` : ""}
              {e.exactDuplicateCount > 1 ? ` · ${e.exactDuplicateCount}× identical` : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function higherWins(a, b) {
  if (a === null || a === undefined) return b !== null && b !== undefined ? "B" : null;
  if (b === null || b === undefined) return "A";
  if (a === b) return "tie";
  return a > b ? "A" : "B";
}
function earlierWins(dayIntA, dayIntB) {
  if (dayIntA === null) return dayIntB !== null ? "B" : null;
  if (dayIntB === null) return "A";
  if (dayIntA === dayIntB) return "tie";
  return dayIntA < dayIntB ? "A" : "B";
}

export default function ListeningRecords({ recordsA, recordsB, nameA, nameB, dataA, dataB }) {
  if (!recordsA || !recordsB) {
    return <p className="mood-empty" style={{ padding: "30px 0", textAlign: "center" }}>Not enough data to compute records yet.</p>;
  }

  return (
    <section className="chart-card">
      <div className="records-head">
        <span className="records-head-name" style={{ color: PERSON_A_COLOR }}>{nameA}</span>
        <span className="records-head-vs">RECORD</span>
        <span className="records-head-name" style={{ color: PERSON_B_COLOR }}>{nameB}</span>
      </div>

      <RecordRow
        label="Total plays"
        valueA={recordsA.totalPlays.toLocaleString()}
        valueB={recordsB.totalPlays.toLocaleString()}
        winner={higherWins(recordsA.totalPlays, recordsB.totalPlays)}
      />

      {recordsA.totalMinutes !== null && recordsB.totalMinutes !== null && (
        <RecordRow
          label="Total time listened"
          valueA={`${Math.round(recordsA.totalMinutes / 60).toLocaleString()} hrs`}
          valueB={`${Math.round(recordsB.totalMinutes / 60).toLocaleString()} hrs`}
          winner={higherWins(recordsA.totalMinutes, recordsB.totalMinutes)}
        />
      )}

      {recordsA.avgMinutesPerDay !== null && recordsB.avgMinutesPerDay !== null && (
        <RecordRow
          label="Avg. time listened per day"
          sublabel="across the whole date range, including quiet days"
          valueA={`${recordsA.avgMinutesPerDay.toFixed(1)} min`}
          valueB={`${recordsB.avgMinutesPerDay.toFixed(1)} min`}
          winner={higherWins(recordsA.avgMinutesPerDay, recordsB.avgMinutesPerDay)}
        />
      )}

      {recordsA.effectiveGenres !== null && recordsB.effectiveGenres !== null && (
        <RecordRow
          label="Most diverse taste"
          sublabel="effective number of genres — evenness, not just variety"
          valueA={recordsA.effectiveGenres.toFixed(1)}
          subA={`${recordsA.distinctGenresTagged} genres tagged`}
          valueB={recordsB.effectiveGenres.toFixed(1)}
          subB={`${recordsB.distinctGenresTagged} genres tagged`}
          winner={higherWins(recordsA.effectiveGenres, recordsB.effectiveGenres)}
        />
      )}

      <RecordRow
        label="Year with most plays"
        valueA={recordsA.bestYear}
        subA={`${recordsA.bestYearCount.toLocaleString()} plays`}
        valueB={recordsB.bestYear}
        subB={`${recordsB.bestYearCount.toLocaleString()} plays`}
        winner={higherWins(recordsA.bestYearCount, recordsB.bestYearCount)}
      />

      <RecordRow
        label="Month with most plays"
        valueA={recordsA.bestYearMonthLabel}
        subA={`${recordsA.bestYearMonthCount.toLocaleString()} plays`}
        valueB={recordsB.bestYearMonthLabel}
        subB={`${recordsB.bestYearMonthCount.toLocaleString()} plays`}
        winner={higherWins(recordsA.bestYearMonthCount, recordsB.bestYearMonthCount)}
      />

      <RecordRow
        label="Most plays of one song in a day"
        sublabel="same song, same day"
        valueA={`${recordsA.bestDaySongCount}×`}
        subA={`"${recordsA.bestDaySongTrack}" — ${recordsA.bestDaySongArtist} (${recordsA.bestDaySongDayLabel})`}
        valueB={`${recordsB.bestDaySongCount}×`}
        subB={`"${recordsB.bestDaySongTrack}" — ${recordsB.bestDaySongArtist} (${recordsB.bestDaySongDayLabel})`}
        winner={higherWins(recordsA.bestDaySongCount, recordsB.bestDaySongCount)}
      />

      <RecordRow
        label="Most plays of one song in 7 days"
        valueA={`${recordsA.bestSongWindowCount}×`}
        subA={`"${recordsA.bestSongWindowTrack}" — ${recordsA.bestSongWindowArtist} (${recordsA.bestSongWindowRangeLabel})`}
        valueB={`${recordsB.bestSongWindowCount}×`}
        subB={`"${recordsB.bestSongWindowTrack}" — ${recordsB.bestSongWindowArtist} (${recordsB.bestSongWindowRangeLabel})`}
        winner={higherWins(recordsA.bestSongWindowCount, recordsB.bestSongWindowCount)}
      />

      <RecordRow
        label="Most plays of one song in a month"
        valueA={`${recordsA.bestMonthSongCount}×`}
        subA={`"${recordsA.bestMonthSongTrack}" — ${recordsA.bestMonthSongArtist} (${recordsA.bestMonthSongLabel})`}
        valueB={`${recordsB.bestMonthSongCount}×`}
        subB={`"${recordsB.bestMonthSongTrack}" — ${recordsB.bestMonthSongArtist} (${recordsB.bestMonthSongLabel})`}
        winner={higherWins(recordsA.bestMonthSongCount, recordsB.bestMonthSongCount)}
      />

      <RecordRow
        label="Most plays of one song in a year"
        valueA={`${recordsA.bestYearSongCount}×`}
        subA={`"${recordsA.bestYearSongTrack}" — ${recordsA.bestYearSongArtist} (${recordsA.bestYearSongYearLabel})`}
        valueB={`${recordsB.bestYearSongCount}×`}
        subB={`"${recordsB.bestYearSongTrack}" — ${recordsB.bestYearSongArtist} (${recordsB.bestYearSongYearLabel})`}
        winner={higherWins(recordsA.bestYearSongCount, recordsB.bestYearSongCount)}
      />

      {recordsA.bestDayMinutes !== null && recordsB.bestDayMinutes !== null && (
        <RecordRow
          label="Most minutes listened in a day"
          valueA={`${recordsA.bestDayMinutes.toLocaleString()} min`}
          subA={recordsA.bestDayMinutesDayLabel}
          valueB={`${recordsB.bestDayMinutes.toLocaleString()} min`}
          subB={recordsB.bestDayMinutesDayLabel}
          winner={higherWins(recordsA.bestDayMinutes, recordsB.bestDayMinutes)}
          warningA={recordsA.bestDayMinutesImpossible && (
            <ImpossibleDayWarning data={dataA} dayInt={recordsA.bestDayMinutesDayInt} dayLabel={recordsA.bestDayMinutesDayLabel} />
          )}
          warningB={recordsB.bestDayMinutesImpossible && (
            <ImpossibleDayWarning data={dataB} dayInt={recordsB.bestDayMinutesDayInt} dayLabel={recordsB.bestDayMinutesDayLabel} />
          )}
        />
      )}

      <RecordRow
        label="Biggest single-artist binge"
        sublabel="most plays of one artist in 7 days"
        valueA={`${recordsA.bestArtistWindowCount}×`}
        subA={`${recordsA.bestArtistWindowName} (${recordsA.bestArtistWindowRangeLabel})`}
        valueB={`${recordsB.bestArtistWindowCount}×`}
        subB={`${recordsB.bestArtistWindowName} (${recordsB.bestArtistWindowRangeLabel})`}
        winner={higherWins(recordsA.bestArtistWindowCount, recordsB.bestArtistWindowCount)}
      />

      <RecordRow
        label="Longest listening streak"
        sublabel="consecutive days with at least one play"
        valueA={`${recordsA.longestStreak} days`}
        valueB={`${recordsB.longestStreak} days`}
        winner={higherWins(recordsA.longestStreak, recordsB.longestStreak)}
      />

      <RecordRow
        label="Been tracked the longest"
        valueA={recordsA.firstDateLabel}
        valueB={recordsB.firstDateLabel}
        winner={earlierWins(recordsA.firstDate, recordsB.firstDate)}
      />
    </section>
  );
}
