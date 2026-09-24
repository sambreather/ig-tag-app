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
const connectRouter = require('./routes/connect');
const { autoStopEndedAlbums, purgeExpiredDeletions, refreshExpiringTokens } = require('./services/capture');
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

// The "Connect via Instagram" link, its callback, and Meta's deauthorize
// notice are all reached by browsers/servers with no ClipCatch login -
// same reasoning as the webhook above. Public by route, not by data: each
// one relies on its own single-use token or signature instead.
app.use('/', connectRouter.publicRouter);

// The login page needs the logo before anyone has actually logged in, so
// this one small piece of settings is deliberately public - nothing else
// (wording, custom CSS, client data) is exposed here.
app.get('/public-logo', (req, res) => {
  const data = db.load();
  res.json({ logoDataUrl: data.settings.logoDataUrl || '' });
});

// Meta requires public Privacy Policy and Data Deletion pages to publish the
// app. These are deliberately open to everyone (Meta's reviewers have no
// login) and contain no data - just static text.
app.get('/privacy', (req, res) => res.sendFile(path.join(__dirname, 'public', 'privacy.html')));
app.get('/data-deletion', (req, res) => res.sendFile(path.join(__dirname, 'public', 'data-deletion.html')));

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
app.use('/api', connectRouter);

// Auto-stop any captures whose end time has just passed. Capturing itself
// happens live via the webhook, not on a timer - see services/capture.js.
cron.schedule('* * * * *', () => {
  autoStopEndedAlbums().catch(err => console.error('Auto-stop cycle error:', err));
});

// Permanently remove anything that's been in Deleted Files for 30+ days.
// Once a day is plenty - there's no urgency to the minute for this one.
cron.schedule('0 3 * * *', () => {
  purgeExpiredDeletions().catch(err => console.error('Purge cycle error:', err));
});

// Refresh any connected account's token before its 60-day clock runs out.
cron.schedule('0 4 * * *', () => {
  refreshExpiringTokens().catch(err => console.error('Token refresh cycle error:', err));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ig-tag-capture running on port ${PORT}`));
