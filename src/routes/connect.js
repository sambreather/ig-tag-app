// connect.js
// The "Connect via Instagram" flow. Two different halves live here:
//
//  - POST /clients/:clientId/connect-link is admin-only, mounted under
//    /api like every other admin action - it hands back a link to send
//    to whoever needs to approve the connection.
//
//  - GET /connect/:token, GET /connect/callback and POST /connect/deauthorize
//    are reached directly by a browser that has never logged into
//    ClipCatch (the manager approving on Instagram) or by Meta's own
//    servers. They're deliberately public - like the webhook route - and
//    rely on the single-use link token (or, for deauthorize, Meta's own
//    signature) instead of a login.

const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const publicRouter = express.Router();
const db = require('../services/db');
const auth = require('../services/instagramAuth');

const LINK_LIFETIME_MS = 24 * 60 * 60 * 1000;

function baseUrl() {
  return (process.env.APP_BASE_URL || '').replace(/\/$/, '');
}
function callbackUrl() {
  return `${baseUrl()}/connect/callback`;
}

// --- Admin: generate a link to send to whoever approves the connection ---
router.post('/clients/:clientId/connect-link', (req, res) => {
  if (!req.isAdmin) return res.status(403).json({ error: 'Admin access required' });
  const data = db.load();
  const client = data.clients.find(c => c.id === req.params.clientId);
  if (!client) return res.status(404).json({ error: 'Client not found' });

  const token = crypto.randomBytes(24).toString('hex');
  client.connectToken = token;
  client.connectTokenExpiresAt = new Date(Date.now() + LINK_LIFETIME_MS).toISOString();
  db.save(data);

  res.json({ url: `${baseUrl()}/connect/${token}`, expiresAt: client.connectTokenExpiresAt });
});

module.exports = router;
module.exports.publicRouter = publicRouter;

// --- Public: the pages/steps a non-logged-in browser actually visits ---
function findByConnectToken(data, token) {
  return data.clients.find(c => c.connectToken === token);
}
function linkExpired(client) {
  return !client.connectTokenExpiresAt || new Date(client.connectTokenExpiresAt).getTime() < Date.now();
}

function page(heading, sub, color) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>ClipCatch</title>
<style>
  body{background:#121212;color:#f2f1ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center;padding:24px}
  .card{max-width:360px}
  h1{font-size:18px;margin:0 0 8px;color:${color || '#f2f1ee'}}
  p{color:#a8a6a1;font-size:14px;margin:0}
</style></head><body><div class="card"><h1>${heading}</h1><p>${sub}</p></div></body></html>`;
}
const errorPage = msg => page(msg, 'Ask whoever sent you this link for a new one.');
const successPage = name => page(`✓ ${name} is now connected`, 'You can close this window.', '#4ade80');

publicRouter.get('/connect/:token', (req, res) => {
  const data = db.load();
  const client = findByConnectToken(data, req.params.token);
  if (!client || linkExpired(client)) return res.status(410).send(errorPage('This link has expired or already been used'));
  res.redirect(auth.buildAuthorizeUrl({ redirectUri: callbackUrl(), state: req.params.token }));
});

publicRouter.get('/connect/callback', async (req, res) => {
  const { code, state, error, error_reason: errorReason } = req.query;
  if (error) {
    return res.send(errorReason === 'user_denied'
      ? errorPage('Connection cancelled')
      : errorPage('Something went wrong connecting'));
  }
  if (!code || typeof state !== 'string') return res.status(400).send(errorPage('This link is missing information it needs'));

  const data = db.load();
  const client = findByConnectToken(data, state);
  if (!client || linkExpired(client)) return res.status(410).send(errorPage('This link has expired or already been used'));

  try {
    const { accessToken: shortLived, igUserId } = await auth.exchangeCodeForShortLivedToken(code, callbackUrl());
    const { accessToken, expiresInSeconds } = await auth.exchangeForLongLivedToken(shortLived);
    await auth.subscribeToMessages(accessToken);
    const igUsername = await auth.fetchUsername(igUserId, accessToken);

    // Re-load right before saving, in case something else changed this
    // client (or another) while we were busy talking to Instagram, and
    // apply only what this connection actually changed - same reasoning
    // as the other background jobs in this app.
    const fresh = db.load();
    const freshClient = fresh.clients.find(c => c.id === client.id);
    if (freshClient) {
      freshClient.igUserId = igUserId;
      freshClient.accessToken = accessToken;
      freshClient.tokenExpiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
      freshClient.igUsername = igUsername;
      freshClient.tokenNeedsReconnect = false;
      delete freshClient.connectToken; // single-use
      delete freshClient.connectTokenExpiresAt;
      db.save(fresh);
    }
    res.send(successPage(client.name));
  } catch (err) {
    console.error(`Connect flow failed for client ${client.id}:`, err.response?.data || err.message);
    res.send(errorPage('Something went wrong connecting - please ask for a new link'));
  }
});

// Meta calls this if someone removes ClipCatch's access from their
// Instagram settings. See the file header on instagramAuth.js - this
// payload format isn't confirmed for this specific API, so it's written
// so an unexpected shape logs itself for review rather than failing loudly.
publicRouter.post('/connect/deauthorize', express.urlencoded({ extended: false }), (req, res) => {
  const igUserId = auth.verifyDeauthPayload(req.body.signed_request);
  if (!igUserId) {
    console.error('Deauthorize callback: signature did not verify or payload was unexpected:', JSON.stringify(req.body));
    return res.sendStatus(200); // acknowledge regardless - Meta doesn't need us to succeed here
  }
  try {
    const data = db.load();
    const client = data.clients.find(c => c.igUserId === igUserId);
    if (client) {
      const fresh = db.load();
      const freshClient = fresh.clients.find(c => c.id === client.id);
      if (freshClient) { freshClient.tokenNeedsReconnect = true; db.save(fresh); }
    }
  } catch (err) {
    console.error('Deauthorize handling failed:', err.message);
  }
  res.sendStatus(200);
});
