// storage.js
// Talks to our Backblaze B2 bucket. B2 supports the S3 API, so we use the
// standard aws-sdk client pointed at B2's endpoint instead of a bespoke library.

const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  endpoint: process.env.B2_ENDPOINT,
  accessKeyId: process.env.B2_KEY_ID,
  secretAccessKey: process.env.B2_APPLICATION_KEY,
  s3ForcePathStyle: true,
  signatureVersion: 'v4',
});

const BUCKET = process.env.B2_BUCKET_NAME;

/**
 * Uploads a media file (video or photo) for a given client/album.
 * Key format: <clientId>/<albumId>/<taggerUsername>_<timestamp>.<ext>
 * This keeps files organised on the bucket itself, mirroring how they're
 * organised in the app (per client, per album).
 */
async function uploadMedia({ clientId, albumId, filename, buffer, contentType }) {
  const key = `${clientId}/${albumId}/${filename}`;
  await s3.putObject({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }).promise();
  return key;
}

/** Soft delete: moves a file's key under a deleted/ prefix instead of removing it. */
async function softDelete(key) {
  const newKey = `deleted/${key}`;
  await s3.copyObject({ Bucket: BUCKET, CopySource: `${BUCKET}/${key}`, Key: newKey }).promise();
  await s3.deleteObject({ Bucket: BUCKET, Key: key }).promise();
  return newKey;
}

/** Restores a soft-deleted file back to its original key. */
async function restore(deletedKey) {
  const originalKey = deletedKey.replace(/^deleted\//, '');
  await s3.copyObject({ Bucket: BUCKET, CopySource: `${BUCKET}/${deletedKey}`, Key: originalKey }).promise();
  await s3.deleteObject({ Bucket: BUCKET, Key: deletedKey }).promise();
  return originalKey;
}

/** Permanently removes a file - only ever called by the 30-day cleanup job. */
async function permanentlyDelete(key) {
  await s3.deleteObject({ Bucket: BUCKET, Key: key }).promise();
}

/** Returns total bytes stored, for the storage-usage indicator. */
async function getTotalStorageBytes() {
  let total = 0;
  let continuationToken;
  do {
    const res = await s3.listObjectsV2({ Bucket: BUCKET, ContinuationToken: continuationToken }).promise();
    total += res.Contents.reduce((sum, obj) => sum + obj.Size, 0);
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);
  return total;
}

/** Generates a temporary signed URL so a browser can download a file directly from B2. */
function getSignedDownloadUrl(key, expiresInSeconds = 300) {
  return s3.getSignedUrl('getObject', { Bucket: BUCKET, Key: key, Expires: expiresInSeconds });
}

module.exports = {
  uploadMedia,
  softDelete,
  restore,
  permanentlyDelete,
  getTotalStorageBytes,
  getSignedDownloadUrl,
};
