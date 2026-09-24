const express = require('express');
const router = express.Router();
const db = require('../services/db');
const storage = require('../services/storage');

// A client's Instagram access token is a credential, and GET /clients is
// open to every logged-in user - including the team login, which is shared
// with colleagues. So the token itself never goes to the browser; the admin
// edit screen only needs to know whether one is saved.
function publicClient(client) {
  const { accessToken, ...rest } = client;
  return { ...rest, hasToken: !!accessToken };
}

router.get('/clients', (req, res) => {
  const data = db.load();
  res.json(data.clients.map(publicClient));
});

router.post('/clients', (req, res) => {
  if (!req.isAdmin) return res.status(403).json({ error: 'Admin access required' });
  const data = db.load();
  const client = {
    id: `c_${Date.now()}`,
    name: req.body.name,
    igUserId: req.body.igUserId || null,
    accessToken: req.body.accessToken || null,
  };
  data.clients.push(client);
  db.save(data);
  res.status(201).json(publicClient(client));
});

router.patch('/clients/:clientId', (req, res) => {
  if (!req.isAdmin) return res.status(403).json({ error: 'Admin access required' });
  const data = db.load();
  const client = data.clients.find(c => c.id === req.params.clientId);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  if (req.body.name !== undefined) client.name = req.body.name;
  if (req.body.igUserId !== undefined) client.igUserId = req.body.igUserId;
  // A blank token means "leave the saved one alone" - the edit screen no
  // longer shows the existing token, so an untouched box arrives empty.
  if (typeof req.body.accessToken === 'string' && req.body.accessToken.trim()) {
    client.accessToken = req.body.accessToken.trim();
  }
  db.save(data);
  res.json(publicClient(client));
});

// Deletes a client along with its albums and video records. The underlying
// files stay in B2 storage rather than being wiped - safer default, and
// they can be cleaned up separately if ever needed.
router.delete('/clients/:clientId', (req, res) => {
  if (!req.isAdmin) return res.status(403).json({ error: 'Admin access required' });
  const data = db.load();
  const { clientId } = req.params;
  data.clients = data.clients.filter(c => c.id !== clientId);
  data.albums = data.albums.filter(a => a.clientId !== clientId);
  data.videos = data.videos.filter(v => v.clientId !== clientId);
  db.save(data);
  res.status(204).end();
});

// Overall storage usage, for the storage-usage indicator.
router.get('/storage-usage', async (req, res) => {
  const bytes = await storage.getTotalStorageBytes();
  res.json({ bytes, gb: (bytes / (1024 ** 3)).toFixed(2) });
});

// NOTE: the real "Connect account" OAuth flow (Instagram Business Login)
// gets wired up here once the app has a live URL for Meta to redirect back
// to - see /docs/meta-setup-notes.md for what's already done on Meta's side.
router.get('/clients/:clientId/connect', (req, res) => {
  res.status(501).json({ note: 'OAuth connect flow to be wired up once the app is deployed with a public URL.' });
});

module.exports = router;
