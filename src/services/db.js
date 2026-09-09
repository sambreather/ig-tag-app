// db.js
// TEMPORARY: a simple JSON-file data store so the app has somewhere to keep
// clients/albums/videos while we build. This is NOT what we'll use once
// live - a real database (e.g. Postgres, which Railway can add as a plugin)
// should replace this before real client data is involved. Flagged clearly
// so this doesn't get missed later.

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'data.json');

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
