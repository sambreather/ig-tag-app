# ig-tag-capture

Internal tool for capturing Instagram Story/Reel mentions across managed
client accounts, on a schedule.

## What's built so far

- **Backend skeleton** (Express): routes for clients, albums, and videos,
  matching the agreed spec (album statuses, soft delete, marking, etc.)
- **Storage service**: talks to Backblaze B2 (S3-compatible) - upload, soft
  delete, restore, permanent delete, storage usage total, signed download URLs
- **Instagram service**: fetches tagged mentions and downloads the media, using
  a client's access token
- **Capture scheduler**: polls every 5 minutes for new mentions on any
  "capturing" album, and auto-stops albums whose end time has passed

## Frontend

A real, working plain HTML/CSS/JS frontend now lives in `src/public/` -
login screen, client picker, album list (chronological order, live-green
border, aligned columns), the new-album/settings form with the calendar +
time picker, the video grid, and the unified preview/review modal with
keyboard shortcuts. It calls the real API routes directly.

**Known gaps in this first pass:**
- Icons are simple placeholder characters (see the bottom of `styles.css`) -
  swap for a real icon set once we're polishing visuals.
- The Deleted Files screen isn't fully wired up yet - it needs a new
  `GET /api/clients/:id/deleted-videos` endpoint (grouped by album) that
  hasn't been added to `routes/videos.js` yet.
- Undoing a whole-album deletion isn't wired up (individual video undo
  works).
- Not yet tested against a real Node install or real Backblaze/Instagram
  credentials - next real step once you're ready.

## What's NOT built yet (next steps)

- **A real database** - `src/services/db.js` is a temporary JSON-file store
  so the API has somewhere to save data. This should be swapped for a proper
  database (Railway can add Postgres as a plugin) before real client data
  is involved.
- **The OAuth "Connect account" flow** - needs the app to have a real public
  URL first (comes from deploying to Railway), so it's stubbed out in
  `routes/clients.js` for now.
- **Team login** - currently a single shared password check as a placeholder,
  matching the "one global login" decision, but not yet wired to a real
  login screen.
- **Zip download** for starred videos is written but untested against real
  files.

## Environment variables

See `.env.example` for everything needed. In Railway, these get set under
the project's Variables tab, not committed to the repo.

## Running locally (once Node is installed)

```
npm install
cp .env.example .env   # then fill in real values
npm run dev
```
