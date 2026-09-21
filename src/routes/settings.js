const express = require('express');
const router = express.Router();
const db = require('../services/db');

// Any logged-in user (team or admin) can read settings, since the whole
// app needs the wording/CSS/logo to render correctly.
router.get('/settings', (req, res) => {
  const data = db.load();
  res.json(data.settings);
});

// Only an admin can change settings.
router.patch('/settings', (req, res) => {
  if (!req.isAdmin) return res.status(403).json({ error: 'Admin access required' });
  const data = db.load();
  if (req.body.content !== undefined) data.settings.content = req.body.content;
  if (req.body.customCss !== undefined) data.settings.customCss = req.body.customCss;
  if (req.body.logoDataUrl !== undefined) data.settings.logoDataUrl = req.body.logoDataUrl;
  db.save(data);
  res.json(data.settings);
});

module.exports = router;
