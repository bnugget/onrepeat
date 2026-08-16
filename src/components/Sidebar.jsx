import React, { useState } from "react";
import MoodTagger from "./MoodTagger.jsx";
import GenreTagger from "./GenreTagger.jsx";
import ErasManager from "./ErasManager.jsx";
import EntityIncludeExclude from "./EntityIncludeExclude.jsx";
import TagIncludeExclude from "./TagIncludeExclude.jsx";
import DateRangePicker from "./DateRangePicker.jsx";
import BackupRestore from "./BackupRestore.jsx";

function AccordionSection({ title, badge, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="accordion-section">
      <button className="accordion-header" onClick={() => setOpen((o) => !o)}>
        <span>{title}</span>
        <span className="accordion-meta">
          {badge ? <span className="accordion-badge">{badge}</span> : null}
          <span className={`accordion-chevron${open ? " open" : ""}`}>⌄</span>
        </span>
      </button>
      {open && <div className="accordion-body">{children}</div>}
    </div>
  );
}

export default function Sidebar({
  data,
  bounds,
  fromInt,
  toInt,
  onDateChange,
  onReset,
  moodTags,
  onSetMoodTag,
  onRemoveMoodTag,
  onImportMoodTags,
  genreTags,
  onSetGenreTag,
  onRemoveGenreTag,
  onImportGenreTags,
  genreFetchStatus,
  genreSyncStatus,
  onStartGenreFetch,
  onStopGenreFetch,
  eras,
  onAddEra,
  onRemoveEra,
  onZoomEra,
  eraBounds,
  artistSearchFn,
  includedArtists,
  excludedArtists,
  onIncludeArtist,
  onRemoveIncludedArtist,
  onExcludeArtist,
  onRemoveExcludedArtist,
  albumSearchFn,
  includedAlbums,
  excludedAlbums,
  onIncludeAlbum,
  onRemoveIncludedAlbum,
  onExcludeAlbum,
  onRemoveExcludedAlbum,
  genreFilterItems,
  genreInclude,
  genreExclude,
  onIncludeGenre,
  onExcludeGenre,
  onRemoveIncludedGenre,
  onRemoveExcludedGenre,
  moodFilterItems,
  moodInclude,
  moodExclude,
  onIncludeMood,
  onExcludeMood,
  onRemoveIncludedMood,
  onRemoveExcludedMood,
  eraFilterItems,
  eraInclude,
  eraExclude,
  onIncludeEra,
  onExcludeEra,
  onRemoveIncludedEra,
  onRemoveExcludedEra,
  minPlaysFilter,
  onMinPlaysChange,
  open,
  onClose
}) {
  return (
    <>
      {open && <div className="drawer-backdrop sidebar-backdrop" onClick={onClose} />}
      <aside className={`sidebar${open ? " open" : ""}`}>
        <div className="sidebar-head">
          <span className="eyebrow" style={{ margin: 0 }}>Filters &amp; config</span>
          <button className="sidebar-close" onClick={onClose} aria-label="Close filters">×</button>
        </div>

        <div className="sidebar-scroll">
          <DateRangePicker bounds={bounds} fromInt={fromInt} toInt={toInt} onChange={onDateChange} />
          <button className="btn" style={{ width: "100%" }} onClick={onReset}>Reset filters</button>

          <div className="field" style={{ marginTop: 12 }}>
            <label>Minimum plays (artist)</label>
            <div className="tabs" style={{ flexWrap: "wrap" }}>
              {[0, 10, 25, 50, 100, 250].map((n) => (
                <button
                  key={n}
                  className={minPlaysFilter === n ? "tab active" : "tab"}
                  onClick={() => onMinPlaysChange(n)}
                >
                  {n === 0 ? "Off" : `${n}+`}
                </button>
              ))}
            </div>
            <p className="mood-empty" style={{ marginTop: 6 }}>
              Artists under this total (within your date range) are dropped from every chart and
              page — not just hidden.
            </p>
          </div>

          <div className="sidebar-divider" />

          <AccordionSection title="Artists (include/exclude)" badge={includedArtists.length + excludedArtists.length || null}>
            <EntityIncludeExclude
              label="Artists"
              placeholder="Search any artist…"
              searchFn={artistSearchFn}
              includedList={includedArtists}
              excludedList={excludedArtists}
              onInclude={onIncludeArtist}
              onExclude={onExcludeArtist}
              onRemoveIncluded={onRemoveIncludedArtist}
              onRemoveExcluded={onRemoveExcludedArtist}
            />
          </AccordionSection>

          <AccordionSection title="Albums (include/exclude)" badge={includedAlbums.length + excludedAlbums.length || null}>
            <EntityIncludeExclude
              label="Albums"
              placeholder="Search any album or artist…"
              searchFn={albumSearchFn}
              includedList={includedAlbums}
              excludedList={excludedAlbums}
              onInclude={onIncludeAlbum}
              onExclude={onExcludeAlbum}
              onRemoveIncluded={onRemoveIncludedAlbum}
              onRemoveExcluded={onRemoveExcludedAlbum}
            />
          </AccordionSection>

          <AccordionSection title="Genres (include/exclude)" badge={genreInclude.length + genreExclude.length || null}>
            <TagIncludeExclude
              label="Genres"
              items={genreFilterItems}
              includedList={genreInclude}
              excludedList={genreExclude}
              onInclude={onIncludeGenre}
              onExclude={onExcludeGenre}
              onRemoveIncluded={onRemoveIncludedGenre}
              onRemoveExcluded={onRemoveExcludedGenre}
            />
          </AccordionSection>

          <AccordionSection title="Moods (include/exclude)" badge={moodInclude.length + moodExclude.length || null}>
            <TagIncludeExclude
              label="Moods"
              items={moodFilterItems}
              includedList={moodInclude}
              excludedList={moodExclude}
              onInclude={onIncludeMood}
              onExclude={onExcludeMood}
              onRemoveIncluded={onRemoveIncludedMood}
              onRemoveExcluded={onRemoveExcludedMood}
            />
          </AccordionSection>

          <AccordionSection title="Eras (include/exclude)" badge={eraInclude.length + eraExclude.length || null}>
            <TagIncludeExclude
              label="Eras"
              items={eraFilterItems}
              includedList={eraInclude}
              excludedList={eraExclude}
              onInclude={onIncludeEra}
              onExclude={onExcludeEra}
              onRemoveIncluded={onRemoveIncludedEra}
              onRemoveExcluded={onRemoveExcludedEra}
            />
          </AccordionSection>

          <div className="sidebar-divider" />

          <AccordionSection title="Mood tags" badge={Object.keys(moodTags).length || null}>
            <MoodTagger
              data={data}
              moodTags={moodTags}
              fromInt={fromInt}
              toInt={toInt}
              onSetTag={onSetMoodTag}
              onRemoveTag={onRemoveMoodTag}
              onImport={onImportMoodTags}
            />
          </AccordionSection>

          <AccordionSection title="Genre tags" badge={Object.keys(genreTags).length || null}>
            <p className="chart-hint" style={{ marginBottom: 6 }}>
              {genreSyncStatus === "syncing" && "Syncing shared genre tags…"}
              {genreSyncStatus === "synced" && "Shared with everyone using this project — tag once, everyone benefits."}
              {genreSyncStatus === "error" && "Couldn't sync shared tags — working from your local copy only."}
            </p>
            <p className="chart-hint" style={{ marginBottom: 10, textTransform: "none", color: "var(--ink-dim)" }}>
              {data.artistNames.filter((n) => genreTags[n]).length} of {data.artistNames.length} artists in
              this profile already tagged — inherited automatically from the shared library, no
              re-tagging needed for artists someone's tagged before.
            </p>
            <GenreTagger
              data={data}
              genreTags={genreTags}
              fromInt={fromInt}
              toInt={toInt}
              onSetTag={onSetGenreTag}
              onRemoveTag={onRemoveGenreTag}
              onImport={onImportGenreTags}
              fetchStatus={genreFetchStatus}
              onStartFetch={onStartGenreFetch}
              onStopFetch={onStopGenreFetch}
            />
          </AccordionSection>

          <AccordionSection title="Era tags" badge={eras.length || null}>
            <ErasManager eras={eras} onAdd={onAddEra} onRemove={onRemoveEra} onZoom={onZoomEra} bounds={eraBounds} />
          </AccordionSection>

          <div className="sidebar-divider" />
          <BackupRestore />
        </div>
      </aside>
    </>
  );
}
