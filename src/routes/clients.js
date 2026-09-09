const express = require('express');
const router = express.Router();
const db = require('../services/db');
const storage = require('../services/storage');

router.get('/clients', (req, res) => {
  const data = db.load();
  res.json(data.clients);
});

router.post('/clients', (req, res) => {
  const data = db.load();
  const client = { id: `c_${Date.now()}`, name: req.body.name, igUserId: null, accessToken: null };
  data.clients.push(client);
  db.save(data);
  res.status(201).json(client);
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
