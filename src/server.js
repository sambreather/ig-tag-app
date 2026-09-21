require('dotenv').config();
const express = require('express');
const path = require('path');
const cron = require('node-cron');

// Safety net: log unexpected errors instead of letting them silently kill
// the whole server (which was very likely the real cause of the crash/data
// loss cycle during testing).
process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));
process.on('uncaughtException', (err) => console.error('Uncaught exception:', err));

const clientsRouter = require('./routes/clients');
const albumsRouter = require('./routes/albums');
const videosRouter = require('./routes/videos');
const settingsRouter = require('./routes/settings');
const webhookRouter = require('./routes/webhook');
const { pollActiveAlbums, purgeExpiredDeletions } = require('./services/capture');
const db = require('./services/db');

const app = express();
// Logo uploads arrive as base64 data URLs, so allow a larger body than the
// 100kb default. We also keep the raw body, which the Meta webhook needs
// in order to verify its signature.
app.use(express.json({
  limit: '5mb',
  verify: (req, res, buf) => { req.rawBody = buf; },
}));

// Meta's webhook must be reachable WITHOUT our login, since Meta calls it
// directly. It's verified by its own signature check instead - see
// routes/webhook.js. Mounted before the /api auth middleware deliberately.
app.use('/', webhookRouter);

// The login page needs the logo before anyone has actually logged in, so
// this one small piece of settings is deliberately public - nothing else
// (wording, custom CSS, client data) is exposed here.
app.get('/public-logo', (req, res) => {
  const data = db.load();
  res.json({ logoDataUrl: data.settings.logoDataUrl || '' });
});

// Serve the frontend files (index.html, styles.css, app.js) with no login
// required - the login check below only protects the /api routes, so the
// login page itself is always reachable.
app.use(express.static(path.join(__dirname, 'public')));

// --- Login: username + password, with a team role and an admin role ---
// Credentials come from Railway environment variables, never hardcoded.
// The frontend sends "Basic <base64 of username:password>" on each request.
app.use('/api', (req, res, next) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Basic ')) return res.status(401).json({ error: 'Not authenticated' });

  let username, password;
  try {
    [username, password] = Buffer.from(auth.slice(6), 'base64').toString('utf-8').split(':');
  } catch {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const isAdmin = username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD;
  const isTeam = username === process.env.TEAM_USERNAME && password === process.env.TEAM_PASSWORD;

  if (!isAdmin && !isTeam) return res.status(401).json({ error: 'Not authenticated' });

  req.isAdmin = isAdmin; // routes use this to gate admin-only actions
  next();
});

app.use('/api', clientsRouter);
app.use('/api', albumsRouter);
app.use('/api', videosRouter);
app.use('/api', settingsRouter);

// Poll every 5 minutes for new tagged content on active captures.
cron.schedule('*/5 * * * *', () => {
  pollActiveAlbums().catch(err => console.error('Poll cycle error:', err));
});

// Also auto-stop any albums whose end time has just passed, every minute.
cron.schedule('* * * * *', () => {
  pollActiveAlbums().catch(() => {}); // pollActiveAlbums already handles end-time checks
});

// Permanently remove anything that's been in Deleted Files for 30+ days.
// Once a day is plenty - there's no urgency to the minute for this one.
cron.schedule('0 3 * * *', () => {
  purgeExpiredDeletions().catch(err => console.error('Purge cycle error:', err));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ig-tag-capture running on port ${PORT}`));
