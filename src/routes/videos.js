const express = require('express');
const router = express.Router();
const db = require('../services/db');
const storage = require('../services/storage');
const archiver = require('archiver');

// List videos for an album.
router.get('/albums/:albumId/videos', (req, res) => {
  const data = db.load();
  const videos = data.videos.filter(v => v.albumId === req.params.albumId && !v.deleted);
  // Each item gets a temporary (1 hour) link so the grid can show a real
  // preview picture instead of a placeholder. Not stored - made fresh each time.
  const withPreviews = videos.map(v => ({ ...v, previewUrl: storage.getSignedDownloadUrl(v.storageKey, 3600) }));
  res.json(withPreviews);
});

// Toggle a video's mark (save/delete/null) - used by the star button and Review Mode.
router.patch('/videos/:videoId/mark', (req, res) => {
  const data = db.load();
  const video = data.videos.find(v => v.id === req.params.videoId);
  if (!video) return res.status(404).json({ error: 'Video not found' });
  video.mark = req.body.mark; // 'save' | 'delete' | null
  db.save(data);
  res.json(video);
});

// Soft-delete a single video (moves it into Deleted Files).
router.post('/videos/:videoId/delete', async (req, res) => {
  const data = db.load();
  const video = data.videos.find(v => v.id === req.params.videoId);
  if (!video) return res.status(404).json({ error: 'Video not found' });
  video.storageKey = await storage.softDelete(video.storageKey);
  video.deleted = true;
  video.deletedAt = new Date().toISOString();
  db.save(data);
  res.json(video);
});

// Restore a soft-deleted video.
router.post('/videos/:videoId/restore', async (req, res) => {
  const data = db.load();
  const video = data.videos.find(v => v.id === req.params.videoId);
  if (!video) return res.status(404).json({ error: 'Video not found' });
  video.storageKey = await storage.restore(video.storageKey);
  video.deleted = false;
  video.deletedAt = null;
  db.save(data);
  res.json(video);
});

// Get a direct, time-limited download link for one video.
router.get('/videos/:videoId/download-url', (req, res) => {
  const data = db.load();
  const video = data.videos.find(v => v.id === req.params.videoId);
  if (!video) return res.status(404).json({ error: 'Video not found' });
  res.json({ url: storage.getSignedDownloadUrl(video.storageKey) });
});

// Download all "starred" (mark='save') videos in an album as a single .zip.
// NOTE: reads whatever's currently saved here, not what the browser shows
// on screen - see the matching note by downloadStarredBtn in app.js about
// Select All/None racing ahead of this if clicked in very quick succession.
router.get('/albums/:albumId/download-starred-zip', async (req, res) => {
  const data = db.load();
  const videos = data.videos.filter(v => v.albumId === req.params.albumId && v.mark === 'save' && !v.deleted);
  if (videos.length === 0) return res.status(400).json({ error: 'No starred videos' });

  res.attachment('starred-videos.zip');
  const archive = archiver('zip');
  archive.pipe(res);
  // In the real build: stream each file from B2 into the archive rather than
  // loading everything into memory first, for large batches.
  for (const video of videos) {
    const url = storage.getSignedDownloadUrl(video.storageKey);
    archive.append(await (await fetch(url)).arrayBuffer().then(Buffer.from), { name: `${video.tagger}_${video.timestamp}.${video.type === 'video' ? 'mp4' : 'jpg'}` });
  }
  archive.finalize();
});

// Every deleted video for a client, across all its albums (deleted or
// not) - the frontend groups these by album name for the Deleted Files
// screen. This covers both individually-deleted videos and ones that went
// with a whole deleted album.
router.get('/clients/:clientId/deleted-videos', (req, res) => {
  const data = db.load();
  const videos = data.videos.filter(v => v.clientId === req.params.clientId && v.deleted);
  const withAlbumNames = videos.map(v => {
    const album = data.albums.find(a => a.id === v.albumId);
    return {
      ...v,
      albumName: album ? album.name : 'Deleted capture',
      albumDeleted: album ? album.deleted : true,
      // Same idea as the main grid: a real preview picture instead of a
      // placeholder, via a temporary (1 hour) link, made fresh each time.
      previewUrl: storage.getSignedDownloadUrl(v.storageKey, 3600),
    };
  });
  res.json(withAlbumNames);
});

module.exports = router;
