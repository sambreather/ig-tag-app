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
async function purgeExpiredDeletions() {
  try {
    const data = db.load();
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const videosToKeep = [];
    for (const video of data.videos) {
      if (video.deleted && video.deletedAt && new Date(video.deletedAt).getTime() < cutoff) {
        try {
          await storage.permanentlyDelete(video.storageKey);
        } catch (err) {
          console.error(`Failed to purge storage for video ${video.id}:`, err.message);
        }
        continue; // drop it from our records either way
      }
      videosToKeep.push(video);
    }
    data.videos = videosToKeep;

    // Albums themselves have no file to remove from storage (their videos
    // already handled their own files above) - just drop the record.
    data.albums = data.albums.filter(a =>
      !(a.deleted && a.deletedAt && new Date(a.deletedAt).getTime() < cutoff)
    );

    db.save(data);
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
