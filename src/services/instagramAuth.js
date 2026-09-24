// instagramAuth.js
// Everything to do with the "Connect via Instagram" OAuth flow: turning
// the one-time code Instagram hands back into a working, long-lived
// access token, the one-time webhook subscription that goes with it, and
// refreshing tokens before their 60-day clock runs out.
//
// See services/instagram.js for using an ALREADY-connected account's
// token day to day (downloading media, looking up a username) - this file
// is only about getting and renewing that token in the first place.
//
// The Instagram app ID/secret shown on the "API setup with Instagram
// login" dashboard page turned out to be the same as this app's main
// META_APP_ID/META_APP_SECRET (confirmed by comparing them directly), so
// those are reused here rather than needing separate env vars.
//
// The code/token-exchange and refresh requests below are checked directly
// against Meta's current Instagram Platform docs (Sept 2026). The
// deauthorize callback's exact payload is NOT documented for this newer
// API, so verifyDeauthPayload follows the older, well-established
// Facebook Login signed_request pattern instead, and is written
// defensively so an unexpected shape there can't crash the server - flag
// it if that turns out not to be how it actually arrives.

const axios = require('axios');
const crypto = require('crypto');

const APP_ID = process.env.META_APP_ID;
const APP_SECRET = process.env.META_APP_SECRET;

// What we ask a connecting account to grant. instagram_business_basic
// covers the account ID/username lookups; instagram_business_manage_messages
// is the one that actually lets Story mentions reach the webhook.
const SCOPES = 'instagram_business_basic,instagram_business_manage_messages';

/** Step 1: the URL to send the approving person's browser to. */
function buildAuthorizeUrl({ redirectUri, state }) {
  const params = new URLSearchParams({
    client_id: APP_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    state,
  });
  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}

/** Step 2: trade the one-time code for a short-lived token and the account's Instagram-scoped user ID. */
async function exchangeCodeForShortLivedToken(code, redirectUri) {
  const params = new URLSearchParams({
    client_id: APP_ID,
    client_secret: APP_SECRET,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    code,
  });
  const res = await axios.post('https://api.instagram.com/oauth/access_token', params);
  // Docs show the real shape as { data: [{ access_token, user_id, permissions }] } -
  // tolerate a flat object too in case that ever changes.
  const entry = res.data?.data?.[0] || res.data;
  if (!entry?.access_token || !entry?.user_id) throw new Error('Unexpected response from the code-exchange step');
  return { accessToken: entry.access_token, igUserId: String(entry.user_id) };
}

/** Step 3: swap that hour-long token for one that lasts 60 days. */
async function exchangeForLongLivedToken(shortLivedToken) {
  const res = await axios.get('https://graph.instagram.com/access_token', {
    params: { grant_type: 'ig_exchange_token', client_secret: APP_SECRET, access_token: shortLivedToken },
  });
  return { accessToken: res.data.access_token, expiresInSeconds: res.data.expires_in };
}

/** Refreshes an existing long-lived token for another 60 days - only works once it's at least 24h old and not yet expired. */
async function refreshLongLivedToken(accessToken) {
  const res = await axios.get('https://graph.instagram.com/refresh_access_token', {
    params: { grant_type: 'ig_refresh_token', access_token: accessToken },
  });
  return { accessToken: res.data.access_token, expiresInSeconds: res.data.expires_in };
}

/** The one-time "start sending this account's messages to our webhook" call - what used to be a manual curl command. */
async function subscribeToMessages(accessToken) {
  await axios.post('https://graph.instagram.com/me/subscribed_apps', null, {
    params: { subscribed_fields: 'messages', access_token: accessToken },
  });
}

/** Cosmetic only (shown in the admin UI as "connected as @x") - never worth failing the connection over. */
async function fetchUsername(igUserId, accessToken) {
  try {
    const res = await axios.get(`https://graph.instagram.com/${igUserId}`, {
      params: { fields: 'username', access_token: accessToken },
    });
    return res.data?.username || null;
  } catch {
    return null;
  }
}

/**
 * Verifies and decodes the deauthorize callback's signed_request (the
 * standard Facebook Login format - see the file header for why this one
 * piece is unconfirmed for this specific API). Returns the Instagram user
 * ID on a good signature, or null for anything that doesn't check out.
 */
function verifyDeauthPayload(signedRequest) {
  try {
    const [encodedSig, encodedPayload] = String(signedRequest).split('.');
    if (!encodedSig || !encodedPayload) return null;
    const sig = Buffer.from(encodedSig, 'base64url');
    const expectedSig = crypto.createHmac('sha256', APP_SECRET).update(encodedPayload).digest();
    if (sig.length !== expectedSig.length || !crypto.timingSafeEqual(sig, expectedSig)) return null;
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf-8'));
    return payload.user_id ? String(payload.user_id) : null;
  } catch {
    return null;
  }
}

module.exports = {
  buildAuthorizeUrl,
  exchangeCodeForShortLivedToken,
  exchangeForLongLivedToken,
  refreshLongLivedToken,
  subscribeToMessages,
  fetchUsername,
  verifyDeauthPayload,
};
