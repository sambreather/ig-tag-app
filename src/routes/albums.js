const express = require('express');
const router = express.Router();
const db = require('../services/db');

// List albums for a client, in the agreed order: Scheduled (soonest last),
// then Capturing, then Done (most recent first).
router.get('/clients/:clientId/albums', (req, res) => {
  const data = db.load();
  const albums = data.albums.filter(a => a.clientId === req.params.clientId);

  const order = { scheduled: 0, capturing: 1, done: 2 };
  albums.sort((a, b) => {
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    if (a.status === 'scheduled') return new Date(b.start) - new Date(a.start); // furthest-out first
    if (a.status === 'done') return new Date(b.end) - new Date(a.end); // most recent first
    return 0;
  });

  const withCounts = albums.map(a => {
    const albumVideos = data.videos.filter(v => v.albumId === a.id && !v.deleted);
    return {
      ...a,
      videoCount: albumVideos.filter(v => v.type === 'video').length,
      photoCount: albumVideos.filter(v => v.type === 'photo').length,
    };
  });

  res.json(withCounts);
});

// Create a new album (Schedule Capture / Start Capture).
router.post('/clients/:clientId/albums', (req, res) => {
  const data = db.load();
  const { name, start, end, startNow } = req.body;

  const album = {
    id: `a_${Date.now()}`,
    clientId: req.params.clientId,
    name: name || 'Untitled capture',
    status: startNow ? 'capturing' : 'scheduled',
    start: startNow ? new Date().toISOString() : start,
    end,
  };

  data.albums.push(album);
  db.save(data);
  res.status(201).json(album);
});

// Edit an album (name always; start/end only if not yet started/ended).
router.patch('/albums/:albumId', (req, res) => {
  const data = db.load();
  const album = data.albums.find(a => a.id === req.params.albumId);
  if (!album) return res.status(404).json({ error: 'Album not found' });

  const { name, start, end, startNow } = req.body;
  if (name) album.name = name;
  if (album.status !== 'capturing') {
    if (startNow) { album.status = 'capturing'; album.start = new Date().toISOString(); }
    else if (start) album.start = start;
  }
  if (album.status !== 'done' && end) album.end = end;

  db.save(data);
  res.json(album);
});

// Manually stop an active capture.
router.post('/albums/:albumId/stop', (req, res) => {
  const data = db.load();
  const album = data.albums.find(a => a.id === req.params.albumId);
  if (!album) return res.status(404).json({ error: 'Album not found' });
  album.status = 'done';
  album.end = new Date().toISOString();
  db.save(data);
  res.json(album);
});

// Delete an album (soft - just removes from active list; videos remain in storage).
router.delete('/albums/:albumId', (req, res) => {
  const data = db.load();
  data.albums = data.albums.filter(a => a.id !== req.params.albumId);
  db.save(data);
  res.status(204).end();
});

module.exports = router;
