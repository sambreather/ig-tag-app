// db.js
// TEMPORARY: a simple JSON-file data store so the app has somewhere to keep
// clients/albums/videos while we build. This is NOT what we'll use once
// live - a real database (e.g. Postgres, which Railway can add as a plugin)
// should replace this before real client data is involved. Flagged clearly
// so this doesn't get missed later.

const fs = require('fs');
const path = require('path');

// The data file lives wherever DATA_DIR points to. By default that's the
// project folder itself - fine for local testing, but on Railway this
// resets on every redeploy since it's not a persisted location. Set the
// DATA_DIR environment variable to a mounted Volume's path (e.g. /data)
// to make this survive redeploys. See README for the full explanation.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..');
const DB_PATH = path.join(DATA_DIR, 'data.json');

function load() {
  if (!fs.existsSync(DB_PATH)) {
    return { clients: [], albums: [], videos: [] };
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function save(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

module.exports = { load, save };
