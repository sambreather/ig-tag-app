// capture.js
// The core scheduled job: for every album currently "capturing", check its
// client's Instagram account for new mentions, and download anything new.
// Runs on a timer via node-cron (wired up in server.js).

const db = require('./db');
const instagram = require('./instagram');
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

async function pollActiveAlbums() {
  try {
    const data = db.load();
    const now = new Date();

    for (const album of data.albums) {
      if (album.status !== 'capturing') continue;

      if (album.end && new Date(album.end) <= now) {
        album.status = 'done';
        continue;
      }

      const client = data.clients.find(c => c.id === album.clientId);
      if (!client || !client.accessToken || !client.igUserId) continue;

      try {
        const mentions = await instagram.fetchRecentMentions(client.accessToken, client.igUserId);
        const alreadySeen = new Set(data.videos.filter(v => v.albumId === album.id).map(v => v.sourceMediaId));

        for (const mention of mentions) {
          if (alreadySeen.has(mention.id)) continue;

          const buffer = await instagram.downloadMediaFile(mention.media_url);
          const ext = mention.media_type === 'VIDEO' ? 'mp4' : 'jpg';
          const filename = `${mention.username}_${Date.now()}.${ext}`;

          const key = await storage.uploadMedia({
            clientId: client.id,
            albumId: album.id,
            filename,
            buffer,
            contentType: mention.media_type === 'VIDEO' ? 'video/mp4' : 'image/jpeg',
          });

          data.videos.push({
            id: `v_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            albumId: album.id,
            clientId: client.id,
            sourceMediaId: mention.id,
            tagger: mention.username,
            type: mention.media_type === 'VIDEO' ? 'video' : 'photo',
            storageKey: key,
            timestamp: mention.timestamp,
            mark: null,
            deleted: false,
          });
        }
      } catch (err) {
        // A single client's API hiccup shouldn't crash the whole poll cycle.
        console.error(`Capture poll failed for client ${client.id}:`, err.message);
      }
    }

    db.save(data);
  } catch (err) {
    // Nothing in this function should ever be able to take the whole
    // server down - log it and move on to the next scheduled run.
    console.error('pollActiveAlbums failed entirely:', err);
  }
}

module.exports = { pollActiveAlbums, purgeExpiredDeletions };
