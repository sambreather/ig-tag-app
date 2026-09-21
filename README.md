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

## IMPORTANT: how Story mentions actually arrive

Meta's documentation is explicit that **mentions on Stories are not
supported** by the `/tags` or mentions endpoints. There is no way to poll
for Story mentions. They arrive only as a **messaging webhook event**,
with an attachment of type `story_mention`.

That means:
- The `instagram_business_manage_messages` permission IS required.
- A public webhook endpoint is required (`/webhook` in this app).
- Story mention media URLs are ephemeral, so we download immediately on
  receipt - which is what `routes/webhook.js` does.
- For accounts belonging to people without a role on the app (i.e. real
  clients), Advanced Access via App Review is required.

The old polling in `services/capture.js` is kept, but it only ever covers
feed-post photo tags and caption @mentions - NOT Stories. Webhooks are the
part that matters for this tool's actual purpose.

### Webhook setup steps (Meta dashboard)

1. Add `instagram_business_manage_messages` back under Permissions.
2. In Railway, set `META_WEBHOOK_VERIFY_TOKEN` to any random string you invent.
3. In the Meta app dashboard's Instagram webhook section, set:
   - **Callback URL:** `https://<your-railway-domain>/webhook`
   - **Verify token:** the exact same string from step 2
4. Click Verify and Save. Meta calls the endpoint once and expects the
   challenge echoed back - the app handles this automatically.
5. Subscribe to the **`messages`** field (this is the one carrying Story
   mentions - not `mentions`, which is captions/comments only).
6. The app must be in **Live/published** state to receive webhooks.

## Why data disappears on refresh (and how to fix it)

`src/services/db.js` currently stores everything in a single `data.json`
file on disk - fine for early testing, but **Railway rebuilds the
container from scratch on every redeploy**, and that file isn't committed
to Git (deliberately, since it's not meant to be real production data).
So each time new code gets pushed and Railway redeploys, that file gets
wiped and the app starts from empty again. It's not actually losing data
mid-session - it's losing it specifically at each redeploy, which is why
it can look inconsistent (fine one moment, empty after a refresh that
happens to follow a deploy).

**Quick fix (no code changes needed): add a Railway Volume.**
1. In your Railway project, open the service, go to **Settings → Volumes**,
   and add a new Volume - mount it at a path like `/data`.
2. In **Variables**, add `DATA_DIR=/data`.
3. Redeploy once. From then on, `data.json` lives on that persistent
   Volume instead of the container's throwaway filesystem, so it survives
   future redeploys.

**Proper long-term fix:** once there's real client data involved, swap
this JSON file for a real database (Railway can add Postgres as a plugin
in a couple of clicks) - a Volume-backed JSON file is a reasonable stepping
stone for testing, not something to rely on long-term with live data.

## What's NOT built yet (next steps)

- **The actual frontend UI** - the mockups we designed (album list, video
  grid, the unified preview/review modal, date/time picker, etc.) still need
  to be built as the real interface. This skeleton only has the API behind it.
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
