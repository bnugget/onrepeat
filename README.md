# Listening Timeline

A multi-user listening-history dashboard: upload your Spotify Extended
Streaming History and/or Last.fm export, get a full exploratory
dashboard (top artists/songs/albums, mood/genre tagging, eras,
obsession index, AI-generated insights), and compare your taste
against friends who've done the same.

## Setup

**1. Supabase project.** Create one at supabase.com, then:
- SQL Editor → run the schema (creates the `profiles` table + RLS policies)
- Storage → create a bucket named exactly `profile-data` (private)
- SQL Editor → run the storage policies (lets any signed-in user *read* any
  profile, but only its owner can write/delete it)
- Authentication → Providers → Email → turn off **"Confirm email"**
  (auth uses a synthesized fake email under the hood — see below —
  so there's no real inbox to confirm)

**2. Local setup:**
```bash
cd music-viz
npm install
cp .env.example .env
# edit .env with your Supabase Project URL + anon public key
npm run dev
```

That's it — opens at `http://localhost:5173`.

## How auth works

Sign-up asks for a username and password only, no email — but
Supabase's auth system is built around email as the identifier under
the hood. The fix: usernames get silently turned into
`username@users.local` for auth purposes (see `src/lib/auth.js`).
Nobody ever sees "email" in the UI, and there's no real inbox
involved. The `anon` key in your `.env` is meant to be public — safety
is enforced by the RLS policies in Supabase, not by hiding that key.
The `service_role` key (also on the API settings page) is the actual
secret and should never go in this app.

## Architecture

- **Vite + React + Recharts**, no custom backend server — the app
  talks to Supabase directly from the browser (Postgres for profile
  metadata, Storage for the actual processed datasets, Auth for
  identity).
- **`src/lib/ingestProfile.js`** does all the heavy lifting client-side:
  parses an uploaded Last.fm CSV and/or Spotify JSON export(s),
  dedupes, strips phantom 0ms Spotify entries, and — if both sources
  are uploaded — auto-detects where Spotify's export becomes reliably
  dense (first month with 50+ events, sustained for 2 more months) and
  splices Last.fm in for everything before that point. Nothing raw
  ever leaves the browser; only the final processed dataset gets
  uploaded to Storage.
- **`src/lib/profilesApi.js`** is the Supabase read/write layer —
  `profiles` table holds lightweight metadata (name, owner, counts,
  date range, a pointer to the Storage file); the actual multi-MB
  dataset lives in Storage as one JSON blob per profile.
- **`src/Dashboard.jsx`** is the entire single-profile dashboard
  (charts, tagging, Top 100s, Obsession Index, etc.) — it's a pure
  function of a `rawData` prop now, no longer a static import, so it
  works identically whether that data came from a file on disk or a
  Supabase download.
- **`src/App.jsx`** is the new top-level shell: auth gate → profile
  picker/uploader → renders `Dashboard` for "My Dashboard" mode, or
  `GroupView` for comparing two profiles.
- **`src/components/GroupView.jsx`** is a first-pass two-profile
  comparison (shared artists, unique-to-each, a "compatibility" stat,
  an AI-generated comparison insight) — intentionally kept simple for
  now, pending more specific direction on what the real comparison
  views should look like.

## Data layer shape

Every profile's dataset has this shape — everything in `src/lib/`
reads through it:

- `artistNames`, `artistBucket`, `top100` — artist catalog + fixed
  chart-series ranking
- `eventDate`, `eventArtistIdx`, `eventSongIdx`, `eventAlbumIdx` —
  parallel arrays, one entry per scrobble
- `songTrackName`/`songArtistIdx`, `albumName`/`albumArtistIdx` —
  song/album catalogs
- `eventMsPlayed`, `eventReasonStart`/`reasonStartNames`,
  `eventPlatformIdx`/`platformNames`, `eventCountryIdx`/`countryNames`
  — Spotify-only fields (absent or defaulted for pure Last.fm data)
- `countPlayThresholdMs` — plays under this (default 30s) count as
  skips, not real listens, throughout the app

## Ideas for next passes

- Group View is a deliberate v1 — the actual comparison dashboards
  still need spec'ing out
- Auth currently has no "forgot password" flow, since there's no real
  email to send a reset link to — worth deciding how that should work
  before this goes beyond a small friend group
- Large uploads block the main thread during processing (a progress
  message shows, but the UI isn't interactive) — fine at current
  scale, would want a Web Worker if datasets get much bigger
