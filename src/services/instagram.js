// instagram.js
// Talks to Meta's Instagram Graph API. Each client account has its own
// long-lived access token, stored against that client in the database
// (not implemented yet - see db.js placeholder).

const axios = require('axios');

const GRAPH_BASE = 'https://graph.instagram.com';

/**
 * Fetches recent mentions/tags for a given Instagram Business account.
 * Meta's exact endpoint/field names shift periodically - this wraps that
 * call in one place so future adjustments only need to happen here.
 */
async function fetchRecentMentions(accessToken, igUserId) {
  const url = `${GRAPH_BASE}/${igUserId}/tags`;
  const res = await axios.get(url, {
    params: {
      fields: 'id,media_type,media_url,timestamp,username,permalink',
      access_token: accessToken,
    },
  });
  return res.data.data || [];
}

/** Downloads the actual media file bytes for a given mention's media_url. */
async function downloadMediaFile(mediaUrl) {
  const res = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
  return Buffer.from(res.data);
}

/**
 * Same download, but also returns the Content-Type the server sent, so the
 * caller can tell photos from videos without guessing from the URL.
 */
async function downloadMedia(mediaUrl) {
  const res = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
  return { buffer: Buffer.from(res.data), contentType: res.headers['content-type'] || '' };
}

/**
 * Looks up the @username behind a sender ID from a webhook event.
 * Webhooks only give us an ID, but we want the handle so the file name
 * and on-screen credit are actually useful to the team.
 */
async function fetchUsername(senderId, accessToken) {
  if (!senderId || !accessToken) return null;
  const res = await axios.get(`${GRAPH_BASE}/${senderId}`, {
    params: { fields: 'username', access_token: accessToken },
  });
  return res.data?.username || null;
}

module.exports = {
  fetchRecentMentions,
  downloadMediaFile,
  downloadMedia,
  fetchUsername,
};
