// webhook.js
// Receives real-time notifications from Meta. This is how Story mentions
// actually reach us - Meta's docs are explicit that Story mentions are NOT
// available from the /tags or mentions endpoints, and can only arrive via
// the messaging webhook. A Story mention shows up as a message-type event
// with an attachment of type "story_mention".
//
// IMPORTANT: this route is deliberately mounted OUTSIDE the /api auth
// middleware, because Meta calls it directly and has no login. It's
// protected instead by (a) the verify token on setup and (b) an
// X-Hub-Signature-256 signature check on every incoming event.

const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../services/db');
const storage = require('../services/storage');
const instagram = require('../services/instagram');

// --- Step 1: Meta verifies the endpoint once, on setup ---
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// --- Step 2: Confirm the request genuinely came from Meta ---
function isValidSignature(req) {
  const signature = req.headers['x-hub-signature-256'];
  if (!signature || !process.env.META_APP_SECRET) return false;
  const expected = 'sha256=' + crypto
    .createHmac('sha256', process.env.META_APP_SECRET)
    .update(req.rawBody)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

// --- Step 3: Handle incoming events ---
router.post('/webhook', async (req, res) => {
  // Always acknowledge immediately. Meta retries (and eventually disables
  // the subscription) if we're slow or error out, so we respond first and
  // do the actual downloading afterwards.
  res.sendStatus(200);

  if (!isValidSignature(req)) {
    console.error('Webhook signature check failed - ignoring event.');
    return;
  }

  try {
    const body = req.body;
    if (body.object !== 'instagram') return;

    for (const entry of body.entry || []) {
      const igUserId = entry.id; // the client account that was mentioned
      for (const event of entry.messaging || []) {
        const attachments = event.message?.attachments || [];
        for (const attachment of attachments) {
          if (attachment.type !== 'story_mention') continue;
          await handleStoryMention({
            igUserId,
            mediaUrl: attachment.payload?.url,
            senderId: event.sender?.id,
            messageId: event.message?.mid,
            timestamp: event.timestamp,
          });
        }
      }
    }
  } catch (err) {
    console.error('Webhook processing failed:', err);
  }
});

// Checks, in order: the Content-Type header, the file's first bytes, then the
// URL. Defaults to video only if all three give no answer.
function detectMediaType(buffer, headerType, url) {
  const header = (headerType || '').split(';')[0].trim().toLowerCase();
  const image = (contentType, ext) => ({ type: 'photo', ext, contentType });
  const video = () => ({ type: 'video', ext: 'mp4', contentType: 'video/mp4' });

  if (header === 'image/png') return image(header, 'png');
  if (header === 'image/webp') return image(header, 'webp');
  if (header.startsWith('image/')) return image('image/jpeg', 'jpg');
  if (header.startsWith('video/')) return video();

  if (buffer.length > 12) {
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return image('image/jpeg', 'jpg');
    if (buffer.toString('latin1', 1, 4) === 'PNG') return image('image/png', 'png');
    if (buffer.toString('latin1', 0, 4) === 'RIFF' && buffer.toString('latin1', 8, 12) === 'WEBP') return image('image/webp', 'webp');
    if (buffer.toString('latin1', 4, 8) === 'ftyp') return video();
  }

  if (/\.(jpg|jpeg)(\?|$)/i.test(url)) return image('image/jpeg', 'jpg');
  if (/\.png(\?|$)/i.test(url)) return image('image/png', 'png');
  return video();
}

async function handleStoryMention({ igUserId, mediaUrl, senderId, messageId, timestamp }) {
  if (!mediaUrl) return;

  const data = db.load();
  const client = data.clients.find(c => c.igUserId === igUserId);
  if (!client) {
    console.log(`Story mention for unknown IG account ${igUserId} - ignoring.`);
    return;
  }

  // Only capture if this client currently has an active capture running.
  const now = new Date();
  const album = data.albums.find(a =>
    a.clientId === client.id &&
    a.status === 'capturing' &&
    (!a.end || new Date(a.end) > now)
  );
  if (!album) {
    console.log(`Story mention for ${client.name} but no active capture - ignoring.`);
    return;
  }

  // Skip if we've already stored this one (Meta can deliver more than once).
  if (data.videos.some(v => v.sourceMediaId === messageId)) return;

  // Story mention media URLs are ephemeral, so download straight away.
  const { buffer, contentType: sentType } = await instagram.downloadMedia(mediaUrl);

  // Work out photo vs video from what the server actually sent, not the URL
  // (Instagram's media URLs often have no file extension).
  const { type, ext, contentType } = detectMediaType(buffer, sentType, mediaUrl);

  // Look up who mentioned us, so the file can credit them properly.
  let taggerUsername = senderId;
  try {
    taggerUsername = await instagram.fetchUsername(senderId, client.accessToken) || senderId;
  } catch {
    // Non-fatal - fall back to the raw sender ID rather than losing the media.
  }

  const takenAt = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();
  const filename = `${taggerUsername}_${new Date(takenAt).toISOString().slice(0, 10)}_${Date.now()}.${ext}`;

  const key = await storage.uploadMedia({
    clientId: client.id,
    albumId: album.id,
    filename,
    buffer,
    contentType,
  });

  // Re-load before saving, in case another event landed while downloading.
  const fresh = db.load();
  fresh.videos.push({
    id: `v_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    albumId: album.id,
    clientId: client.id,
    sourceMediaId: messageId,
    tagger: taggerUsername,
    type,
    storageKey: key,
    timestamp: takenAt,
    mark: null,
    deleted: false,
  });
  db.save(fresh);

  console.log(`Captured story mention from @${taggerUsername} for ${client.name}.`);
}

module.exports = router;
