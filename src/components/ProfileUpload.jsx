import React, { useState } from "react";
import { buildProfileData, mergeProfileData } from "../lib/ingestProfile.js";
import { createProfile, refreshProfileData, getProfileData } from "../lib/profilesApi.js";

export default function ProfileUpload({ userId, existingProfile, onDone, onCancel }) {
  const [name, setName] = useState(existingProfile?.name || "");
  const [lastfmFile, setLastfmFile] = useState(null);
  const [spotifyFiles, setSpotifyFiles] = useState([]);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [uploadMode, setUploadMode] = useState("merge"); // "merge" | "replace" — only relevant when refreshing an existing profile

  async function handleSubmit(e) {
    e.preventDefault();
    if (!existingProfile && !name.trim()) {
      setError("Give this profile a name.");
      return;
    }
    if (!lastfmFile && spotifyFiles.length === 0) {
      setError("Upload at least one file — a Last.fm CSV, one or more Spotify JSON files, or both.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setStatus("Reading files…");
      const lastfmText = lastfmFile ? await lastfmFile.text() : null;
      const spotifyTexts = await Promise.all(spotifyFiles.map((f) => f.text()));

      let profileData;
      if (existingProfile) {
        if (uploadMode === "replace") {
          profileData = buildProfileData(lastfmText, spotifyTexts, (msg) => setStatus(msg));
        } else {
          setStatus("Loading your existing data…");
          const existingData = await getProfileData(existingProfile.storage_path);
          profileData = mergeProfileData(existingData, lastfmText, spotifyTexts, (msg) => setStatus(msg));
        }
        setStatus(uploadMode === "replace" ? "Uploading replacement data…" : "Uploading merged data…");
        await refreshProfileData(existingProfile, profileData);
      } else {
        profileData = buildProfileData(lastfmText, spotifyTexts, (msg) => setStatus(msg));
        setStatus("Creating your profile…");
        await createProfile(userId, name, profileData);
      }
      setStatus(null);
      onDone();
    } catch (err) {
      setError(err.message || "Something went wrong processing that file.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="chart-card" style={{ maxWidth: 520, margin: "0 auto" }}>
      <div className="chart-head">
        <span className="ranked-primary" style={{ fontSize: 16 }}>
          {existingProfile ? `Refresh "${existingProfile.name}"` : "Create a new profile"}
        </span>
        {onCancel && <button className="btn" onClick={onCancel}>Cancel</button>}
      </div>

      {existingProfile && (
        <>
          <div className="content-toggle" style={{ marginBottom: 10 }}>
            <button className={uploadMode === "merge" ? "content-toggle-btn active" : "content-toggle-btn"} onClick={() => setUploadMode("merge")} type="button">
              Merge with existing
            </button>
            <button className={uploadMode === "replace" ? "content-toggle-btn active" : "content-toggle-btn"} onClick={() => setUploadMode("replace")} type="button">
              Replace entirely
            </button>
          </div>
          {uploadMode === "merge" ? (
            <p className="chart-hint" style={{ textTransform: "none", marginBottom: 12 }}>
              Whatever you upload here gets merged into this profile's existing data — you only need
              to include new files, not everything you've uploaded before.
            </p>
          ) : (
            <p className="chart-hint" style={{ textTransform: "none", marginBottom: 12, color: "var(--ink-dim)" }}>
              ⚠ This fully rebuilds the profile from only what you upload here — you must include
              every file you've ever uploaded (all Last.fm exports and all Spotify JSON files), not
              just new ones, or you'll lose history. Use this when data needs a clean re-ingest
              (e.g. after a processing fix), not for routine updates — "Merge with existing" is
              right for that.
            </p>
          )}
        </>
      )}

      <form onSubmit={handleSubmit}>
        {!existingProfile && (
          <div className="field" style={{ marginBottom: 12 }}>
            <label htmlFor="profileName">Profile name</label>
            <input
              id="profileName"
              type="text"
              placeholder="e.g. Bryan, or your username"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
        )}

        <div className="field" style={{ marginBottom: 12 }}>
          <label htmlFor="lastfmUpload">Last.fm export (.csv) — optional</label>
          <input
            id="lastfmUpload"
            type="file"
            accept=".csv"
            onChange={(e) => setLastfmFile(e.target.files?.[0] || null)}
          />
        </div>

        <div className="field" style={{ marginBottom: 16 }}>
          <label htmlFor="spotifyUpload">Spotify Extended Streaming History (.json) — optional, multiple files OK</label>
          <input
            id="spotifyUpload"
            type="file"
            accept=".json"
            multiple
            onChange={(e) => setSpotifyFiles(Array.from(e.target.files || []))}
          />
        </div>

        {error && <p className="insight-error" style={{ marginBottom: 10 }}>{error}</p>}
        {status && <p className="chart-hint" style={{ marginBottom: 10 }}>{status}</p>}

        <button className="btn primary" type="submit" disabled={busy} style={{ width: "100%", padding: "10px 12px" }}>
          {busy ? "Processing…" : existingProfile ? (uploadMode === "replace" ? "Replace profile data" : "Upload merged data") : "Create profile"}
        </button>
      </form>

      <p className="mood-empty" style={{ marginTop: 14 }}>
        Everything's parsed in your browser before it's uploaded — nothing raw ever leaves your
        device except the final processed dataset.
      </p>
    </section>
  );
}
