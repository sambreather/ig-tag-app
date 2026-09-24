// capture.js
// Background jobs that run on a timer (wired up in server.js). Capturing
// itself happens entirely in the webhook (routes/webhook.js) - Story
// mentions only ever arrive that way, in real time, while a capture is
// live. This file used to also poll Instagram's /tags endpoint as a backup,
// but that endpoint returns ordinary tagged posts (Reels, feed posts) going
// back indefinitely, not Story mentions - on a brand new capture it would
// pull in months-old, unrelated posts as if they'd just been captured. It's
// been removed; what's left here just auto-ends captures whose time is up.

const db = require('./db');
const storage = require('./storage');

// Anything soft-deleted more than 30 days ago gets permanently removed -
// both from B2 storage and from our own records. Runs once a day.
//
// A video's record is only dropped once its file has really been deleted
// from storage. If storage refuses (network blip, bad key, B2 down), the
// record stays, so tomorrow's run tries again - dropping it anyway used to
// leave the file sitting in the bucket with nothing pointing at it, never
// to be cleaned up.
async function purgeExpiredDeletions() {
  try {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const isExpired = item => item.deleted && item.deletedAt && new Date(item.deletedAt).getTime() < cutoff;

    // Read-only snapshot to decide what to delete; the (slow) storage calls
    // happen against this.
    const snapshot = db.load();
    const purgedIds = new Set();
    for (const video of snapshot.videos) {
      if (!isExpired(video)) continue;
      try {
        await storage.permanentlyDelete(video.storageKey);
        purgedIds.add(video.id);
      } catch (err) {
        console.error(`Failed to purge storage for video ${video.id} - keeping its record so the next run retries:`, err.message);
      }
    }

    // Re-load right before saving (no waiting in between) and apply only
    // this run's changes on top of whatever is there now - saving the
    // snapshot instead would overwrite anything saved while we were busy
    // talking to storage (e.g. a Story captured at that moment).
    const data = db.load();
    const videosBefore = data.videos.length;
    const albumsBefore = data.albums.length;
    data.videos = data.videos.filter(v => !purgedIds.has(v.id));

    // Albums have no file of their own. Drop an expired one only when none
    // of its videos are still waiting on a retry, so no video is left
    // pointing at an album that no longer exists.
    const albumsStillInUse = new Set(data.videos.map(v => v.albumId));
    data.albums = data.albums.filter(a => !(isExpired(a) && !albumsStillInUse.has(a.id)));

    if (data.videos.length !== videosBefore || data.albums.length !== albumsBefore) db.save(data);
  } catch (err) {
    console.error('purgeExpiredDeletions failed entirely:', err);
  }
}

// Marks any capture whose end time has passed as "done". Runs every minute.
async function autoStopEndedAlbums() {
  try {
    const data = db.load();
    const now = new Date();
    const endedAlbumIds = data.albums
      .filter(a => a.status === 'capturing' && !a.deleted && a.end && new Date(a.end) <= now)
      .map(a => a.id);

    if (endedAlbumIds.length === 0) return; // nothing changed - don't touch the data file

    // Re-load right before saving, and apply only this run's own changes on
    // top of whatever is there now - avoids clobbering a capture the
    // webhook (or a user) saved in the meantime.
    const fresh = db.load();
    for (const album of fresh.albums) {
      if (endedAlbumIds.includes(album.id) && album.status === 'capturing') album.status = 'done';
    }
    db.save(fresh);
  } catch (err) {
    // Nothing in this function should ever be able to take the whole
    // server down - log it and move on to the next scheduled run.
    console.error('autoStopEndedAlbums failed entirely:', err);
  }
}

module.exports = { autoStopEndedAlbums, purgeExpiredDeletions };
