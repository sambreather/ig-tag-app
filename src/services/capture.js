// capture.js
// The core scheduled job: for every album currently "capturing", check its
// client's Instagram account for new mentions, and download anything new.
// Runs on a timer via node-cron (wired up in server.js).

const db = require('./db');
const instagram = require('./instagram');
const storage = require('./storage');

async function pollActiveAlbums() {
  const data = db.load();
  const now = new Date();

  for (const album of data.albums) {
    if (album.status !== 'capturing') continue;

    // Auto-stop albums whose end time has passed.
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
        if (alreadySeen.has(mention.id)) continue; // already captured

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
}

module.exports = { pollActiveAlbums };
