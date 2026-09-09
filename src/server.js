require('dotenv').config();
const express = require('express');
const path = require('path');
const cron = require('node-cron');

const clientsRouter = require('./routes/clients');
const albumsRouter = require('./routes/albums');
const videosRouter = require('./routes/videos');
const { pollActiveAlbums } = require('./services/capture');

const app = express();
app.use(express.json());

// --- Simple shared team login (matches the "one global login" decision) ---
app.use((req, res, next) => {
  if (req.path === '/login' || req.path.startsWith('/public')) return next();
  const auth = req.headers.authorization;
  if (auth === `Bearer ${process.env.TEAM_LOGIN_PASSWORD}`) return next();
  // The real frontend stores the password after login and sends it on every
  // request; this is deliberately simple to match how small the team is.
  res.status(401).json({ error: 'Not authenticated' });
});

app.use('/api', clientsRouter);
app.use('/api', albumsRouter);
app.use('/api', videosRouter);

app.use(express.static(path.join(__dirname, 'public')));

// Poll every 5 minutes for new tagged content on active captures.
cron.schedule('*/5 * * * *', () => {
  pollActiveAlbums().catch(err => console.error('Poll cycle error:', err));
});

// Also auto-stop any albums whose end time has just passed, every minute.
cron.schedule('* * * * *', () => {
  pollActiveAlbums().catch(() => {}); // pollActiveAlbums already handles end-time checks
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ig-tag-capture running on port ${PORT}`));
