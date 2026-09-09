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

module.exports = {
  fetchRecentMentions,
  downloadMediaFile,
};
