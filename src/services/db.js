// db.js
// TEMPORARY: a simple JSON-file data store so the app has somewhere to keep
// clients/albums/videos while we build. This is NOT what we'll use once
// live - a real database (e.g. Postgres, which Railway can add as a plugin)
// should replace this before real client data is involved. Flagged clearly
// so this doesn't get missed later.

const fs = require('fs');
const path = require('path');
const defaultContent = require('./defaultContent');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..');
const DB_PATH = path.join(DATA_DIR, 'data.json');

// The app calls clients "artists" everywhere people see them. Saved wording
// from before that change holds the old default text, which would keep
// overriding the new defaults, so swap it - but only where it still matches
// the old default exactly (anything customised in Settings is left alone).
const RENAMED_WORDING = {
  clients: {
    addFirstClientHeading: ['Add your first client', 'Add your first artist'],
    addHeading: ['Add client', 'Add artist'],
    nameLabel: ['Client name', 'Artist name'],
    addButton: ['Add client', 'Add artist'],
    editHeading: ['Edit client', 'Edit artist'],
    deleteButton: ['Delete client', 'Delete artist'],
    deleteConfirm: ['Delete this client and all of its captures? This cannot be undone.', 'Delete this artist and all of their captures? This cannot be undone.'],
    missingNameWarning: ['Please enter a client name.', 'Please enter an artist name.'],
    addFailedWarning: ['Something went wrong adding this client. Please try again.', 'Something went wrong adding this artist. Please try again.'],
    savedToast: ['Client saved.', 'Artist saved.'],
  },
};
function migrateWording(content) {
  for (const [section, keys] of Object.entries(RENAMED_WORDING)) {
    for (const [key, [oldText, newText]] of Object.entries(keys)) {
      if (content && content[section] && content[section][key] === oldText) content[section][key] = newText;
    }
  }
}

function load() {
  if (!fs.existsSync(DB_PATH)) {
    return { clients: [], albums: [], videos: [], settings: { customCss: '', logoDataUrl: '', content: defaultContent } };
  }
  const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  // Backfill settings for databases created before this feature existed.
  if (!data.settings) data.settings = { customCss: '', logoDataUrl: '', content: defaultContent };
  migrateWording(data.settings.content);
  return data;
}

function save(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

module.exports = { load, save };
