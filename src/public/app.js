// app.js — the real frontend, talking to the actual API routes built in
// src/routes/. Structure mirrors the interactive mockups we designed.

// --- Icons ---
// Clean inline SVG icons (no external font/CDN dependency), matching the
// line-icon style used in the original interactive mockups. Each uses
// stroke="currentColor" so it automatically picks up the button/element's
// text color - including hover, active, and disabled states already
// defined in styles.css, with no extra CSS needed per icon.
const ICONS = {
  back: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>',
  plus: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  'chevron-left': '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  'chevron-right': '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
  download: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16"/></svg>',
  star: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 16.9 5.8 20.3l1.6-6.8L2.2 8.9l6.9-.6L12 2z"/></svg>',
  x: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  settings: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m4 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z"/></svg>',
  play: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" stroke="none"><path d="M8 5v14l11-7z"/></svg>',
  grid: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  'grid-large': '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="18" rx="1"/></svg>',
};

// Finds every <i class="icon-xxx"> inside the given root (or the whole
// page by default) and swaps in the real SVG. Called once on load, and
// again after anything that inserts new icon markup dynamically (the
// album list, the video grid, etc.), so icons are always real rather
// than left as bare text placeholders.
function renderIcons(root) {
  (root || document).querySelectorAll('i[class*="icon-"]').forEach(el => {
    const name = [...el.classList].find(c => c.startsWith('icon-') && c !== 'icon-btn' && c !== 'icon-green' && ICONS[c.slice(5)]);
    if (name) el.innerHTML = ICONS[name.slice(5)];
  });
}
renderIcons(); // covers every icon already sitting in the static HTML

// The login screen shows the logo if one's set, falling back to the text
// heading otherwise. This runs immediately, before any login happens.
fetch('/public-logo').then(r => r.json()).then(({ logoDataUrl }) => {
  if (logoDataUrl) {
    document.getElementById('loginLogo').src = logoDataUrl;
    document.getElementById('loginLogo').style.display = 'block';
    document.getElementById('loginHeading').style.display = 'none';

    let fav = document.querySelector('link[rel="icon"]');
    if (!fav) { fav = document.createElement('link'); fav.rel = 'icon'; document.head.appendChild(fav); }
    fav.href = logoDataUrl;
  }
}).catch(() => {}); // no logo set yet, or offline - the text heading stays as the fallback

const state = {
  authHeader: localStorage.getItem('authHeader') || null,
  isAdmin: localStorage.getItem('isAdmin') === 'true',
  clients: [],
  currentClientId: null,
  albums: [],
  currentAlbumId: null,
  videos: [],
  gridSize: 'small',
  previewMode: 'grid', // 'grid' | 'deleted'
  previewIdx: 0,
  deletedVideos: [],
  formTarget: null, // { clientId, albumId } or { clientId, albumId: null } for new
  formStartVal: '', formStartDate: null, formStartIsNow: false,
  formEndVal: '', formEndDate: null,
  calMonth: new Date().getMonth(), calYear: new Date().getFullYear(),
  pickerField: null,
  modalOpen: false,
};

// --- Apply all static text from content.js, so wording only needs editing there ---
function applyContent() {
  document.title = CONTENT.pageTitle;
  document.querySelector('#screenLogin h1').textContent = CONTENT.login.heading;
  document.getElementById('loginUsername').placeholder = CONTENT.login.usernamePlaceholder;
  document.getElementById('loginPassword').placeholder = CONTENT.login.passwordPlaceholder;
  document.getElementById('loginBtn').textContent = CONTENT.login.loginButton;

  if (CONTENT.settings) {
    document.getElementById('settingsHeading').textContent = CONTENT.settings.heading;
    document.getElementById('settingsLogoLabel').textContent = CONTENT.settings.logoLabel;
    document.getElementById('settingsCssLabel').textContent = CONTENT.settings.customCssLabel;
    document.getElementById('settingsTextLabel').textContent = CONTENT.settings.textLabel;
    document.getElementById('saveSettingsBtn').textContent = CONTENT.settings.saveButton;
    document.getElementById('customCssInput').placeholder = CONTENT.settings.customCssPlaceholder;
  }
  if (CONTENT.footer) {
    document.getElementById('settingsLink').textContent = CONTENT.footer.settingsLink;
    document.getElementById('logoutLink').textContent = CONTENT.footer.logoutLink;
  }
  if (CONTENT.clients.deleteButton) {
    document.getElementById('deleteClientBtn').textContent = CONTENT.clients.deleteButton;
  }

  document.getElementById('deletedFilesBtn').innerHTML = `<i class="icon-trash"></i> ${CONTENT.topbar.deletedButton}`;
  document.getElementById('newAlbumBtn').innerHTML = `<i class="icon-plus icon-green"></i> ${CONTENT.topbar.newAlbumButton}`;

  document.getElementById('formName').placeholder = CONTENT.albumForm.namePlaceholder;
  document.getElementById('formStartLockedNote').textContent = CONTENT.albumForm.startLockedNote;
  document.getElementById('formEndLockedNote').textContent = CONTENT.albumForm.endLockedNote;
  document.getElementById('pickerNowLink').textContent = CONTENT.albumForm.startCapturingNowLink;

  document.getElementById('timeSelect').previousElementSibling.textContent = CONTENT.picker.timeLabel;
  document.getElementById('pickerCancel').textContent = CONTENT.picker.cancelButton;
  document.getElementById('pickerDone').textContent = CONTENT.picker.doneButton;

  const sortSel = document.getElementById('sortSelect');
  sortSel.innerHTML = `
    <option value="newest">${CONTENT.videos.sortNewest}</option>
    <option value="oldest">${CONTENT.videos.sortOldest}</option>
    <option value="az">${CONTENT.videos.sortAlphabetical}</option>`;

  document.getElementById('previewHintRow').textContent = CONTENT.preview.hintRow;
  document.getElementById('previewRestoreBtn').textContent = CONTENT.deletedFiles.restoreButton;
  document.querySelector('#deletedView .meta-text').textContent = CONTENT.deletedFiles.retentionNote;

  document.querySelector('#noClientsView .screen-title').textContent = CONTENT.clients.addFirstClientHeading;
  document.getElementById('newClientName').placeholder = CONTENT.clients.namePlaceholder;
  document.getElementById('newClientIgId').placeholder = CONTENT.clients.igIdPlaceholder;
  document.getElementById('newClientToken').placeholder = CONTENT.clients.tokenPlaceholder;
  document.getElementById('addClientBtn').textContent = CONTENT.clients.addButton;
  document.querySelector('#editClientView .screen-title').textContent = CONTENT.clients.editHeading;
  document.getElementById('saveClientEditBtn').textContent = CONTENT.clients.saveButton;
  document.querySelectorAll('#noClientsView label')[0].textContent = CONTENT.clients.nameLabel;
  document.querySelectorAll('#noClientsView label')[1].textContent = CONTENT.clients.igIdLabel;
  document.querySelectorAll('#noClientsView label')[2].textContent = CONTENT.clients.tokenLabel;
  document.querySelectorAll('#editClientView label')[0].textContent = CONTENT.clients.nameLabel;
  document.querySelectorAll('#editClientView label')[1].textContent = CONTENT.clients.igIdLabel;
  document.querySelectorAll('#editClientView label')[2].textContent = CONTENT.clients.tokenLabel;
  renderIcons();
}
applyContent();

// Fills {placeholders} in a wording string, e.g. fill(CONTENT.x, {count: 3}).
// Wording is stored as plain text (not code) so it stays safely editable
// from the admin Settings screen.
function fill(template, values) {
  return String(template || '').replace(/\{(\w+)\}/g, (_, key) =>
    values[key] !== undefined ? values[key] : `{${key}}`);
}

// --- API helper ---
async function api(path, opts = {}) {
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': state.authHeader,
      ...(opts.headers || {}),
    },
  });
  if (res.status === 401) { showLogin(); throw new Error('Not authenticated'); }
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.status === 204 ? null : res.json();
}

document.getElementById('logoutLink').addEventListener('click', () => {
  localStorage.removeItem('authHeader');
  localStorage.removeItem('isAdmin');
  state.authHeader = null;
  state.isAdmin = false;
  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';
  document.getElementById('loginError').textContent = '';
  showLogin();
});

// --- Login ---
function showLogin() {
  document.getElementById('screenLogin').style.display = 'flex';
  document.getElementById('screenApp').style.display = 'none';
}
document.getElementById('loginBtn').addEventListener('click', doLogin);
document.getElementById('loginPassword').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
document.getElementById('loginUsername').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
async function doLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  state.authHeader = 'Basic ' + btoa(`${username}:${password}`);
  try {
    await api('/clients');
    // Determine admin status by attempting an admin-only no-op change.
    // A 403 means valid login but team-level access.
    try {
      await api('/settings', { method: 'PATCH', body: JSON.stringify({}) });
      state.isAdmin = true;
    } catch {
      state.isAdmin = false;
    }
    localStorage.setItem('authHeader', state.authHeader);
    localStorage.setItem('isAdmin', String(state.isAdmin));
    startApp();
  } catch {
    document.getElementById('loginError').textContent = CONTENT.login.errorIncorrect;
  }
}

async function startApp() {
  document.getElementById('screenLogin').style.display = 'none';
  document.getElementById('screenApp').style.display = 'block';

  await loadSettings();

  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = state.isAdmin ? '' : 'none';
  });

  state.clients = await api('/clients');
  const sel = document.getElementById('clientSelect');
  sel.innerHTML = state.clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  sel.onchange = () => showAlbums(sel.value);

  if (state.clients.length) {
    showAlbums(state.clients[0].id);
  } else if (state.isAdmin) {
    // Only an admin can actually add clients, so show the add-client screen.
    showScreen('noClientsView');
  } else {
    showScreen('albumsView');
    document.getElementById('albumList').innerHTML = '<div class="meta-text">No clients set up yet.</div>';
  }
}

// --- Settings (wording, custom CSS, logo) ---
async function loadSettings() {
  try {
    const settings = await api('/settings');
    state.settings = settings;
    if (settings.content) deepMerge(CONTENT, settings.content);
    applyContent();
    applyCustomCss(settings.customCss);
    applyLogo(settings.logoDataUrl);
  } catch {
    // Fall back to the built-in defaults in content.js.
    applyContent();
  }
}

// Merges saved wording over the defaults, so any field added in a later
// version still has a sensible value even if the saved copy predates it.
function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

function applyCustomCss(css) {
  let el = document.getElementById('customCssTag');
  if (!el) {
    el = document.createElement('style');
    el.id = 'customCssTag';
    document.head.appendChild(el);
  }
  el.textContent = css || '';
}

function applyLogo(dataUrl) {
  const header = document.getElementById('appLogo');
  const preview = document.getElementById('settingsLogoPreview');
  if (dataUrl) {
    header.src = dataUrl; header.style.display = 'block';
    preview.src = dataUrl; preview.style.display = 'block';
    let fav = document.querySelector('link[rel="icon"]');
    if (!fav) { fav = document.createElement('link'); fav.rel = 'icon'; document.head.appendChild(fav); }
    fav.href = dataUrl;
  } else {
    header.style.display = 'none';
    preview.style.display = 'none';
  }
}

// Turns a key like "namePlaceholder" into "Name placeholder" so the
// settings screen reads in plain English rather than code.
function humaniseKey(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, c => c.toUpperCase())
    .toLowerCase()
    .replace(/^./, c => c.toUpperCase());
}

// Builds one labelled text box per piece of wording, grouped by section.
// Generated from the content itself, so any wording added in future
// automatically appears here without extra work.
function renderContentFields(content) {
  const wrap = document.getElementById('contentFields');
  wrap.innerHTML = '';

  for (const [section, value] of Object.entries(content)) {
    if (typeof value === 'string') {
      wrap.appendChild(buildField([section], section, value));
      continue;
    }
    const group = document.createElement('div');
    group.className = 'content-group';
    const title = document.createElement('div');
    title.className = 'content-group-title';
    title.textContent = humaniseKey(section);
    group.appendChild(title);
    for (const [key, text] of Object.entries(value)) {
      if (typeof text !== 'string') continue;
      group.appendChild(buildField([section, key], key, text));
    }
    wrap.appendChild(group);
  }
}

function buildField(pathParts, key, value) {
  const row = document.createElement('div');
  row.className = 'content-field';
  const label = document.createElement('label');
  label.textContent = humaniseKey(key);
  const input = document.createElement(value.length > 60 ? 'textarea' : 'input');
  if (input.tagName === 'TEXTAREA') input.rows = 2;
  else input.type = 'text';
  input.value = value;
  input.dataset.path = pathParts.join('.');
  row.appendChild(label);
  row.appendChild(input);
  return row;
}

// Reads every generated box back into the same nested shape the app uses.
function collectContentFields() {
  const result = {};
  document.querySelectorAll('#contentFields [data-path]').forEach(input => {
    const parts = input.dataset.path.split('.');
    if (parts.length === 1) {
      result[parts[0]] = input.value;
    } else {
      if (!result[parts[0]]) result[parts[0]] = {};
      result[parts[0]][parts[1]] = input.value;
    }
  });
  return result;
}

document.getElementById('settingsLink').addEventListener('click', () => {
  showScreen('settingsView');
  document.getElementById('customCssInput').value = state.settings?.customCss || '';
  renderContentFields(state.settings?.content || CONTENT);
});
document.getElementById('backFromSettingsBtn').addEventListener('click', () => showScreen('albumsView'));

document.getElementById('logoFileInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    state.pendingLogoDataUrl = reader.result;
    document.getElementById('settingsLogoPreview').src = reader.result;
    document.getElementById('settingsLogoPreview').style.display = 'block';
  };
  reader.readAsDataURL(file);
});

document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
  try {
    const body = {
      content: collectContentFields(),
      customCss: document.getElementById('customCssInput').value,
    };
    if (state.pendingLogoDataUrl) body.logoDataUrl = state.pendingLogoDataUrl;
    const saved = await api('/settings', { method: 'PATCH', body: JSON.stringify(body) });
    state.settings = saved;
    state.pendingLogoDataUrl = null;
    deepMerge(CONTENT, saved.content);
    applyContent();
    applyCustomCss(saved.customCss);
    applyLogo(saved.logoDataUrl);

    showAlbums(state.currentClientId);
    showToast(CONTENT.settings?.savedToast || 'Settings saved.', null);
  } catch {
    showAlert('Something went wrong saving these settings. Please try again.');
  }
});

document.getElementById('deleteClientBtn').addEventListener('click', () => {
  showConfirm(CONTENT.clients.deleteConfirm, async () => {
    try {
      await api(`/clients/${state.currentClientId}`, { method: 'DELETE' });
      startApp();
    } catch {
      showAlert(CONTENT.clients.saveFailedWarning);
    }
  });
});

document.getElementById('addClientBtn').addEventListener('click', async () => {
  const name = document.getElementById('newClientName').value.trim();
  const igUserId = document.getElementById('newClientIgId').value.trim();
  const accessToken = document.getElementById('newClientToken').value.trim();
  if (!name) { showAlert(CONTENT.clients.missingNameWarning); return; }
  try {
    await api('/clients', { method: 'POST', body: JSON.stringify({ name, igUserId, accessToken }) });
    startApp();
  } catch (err) {
    showAlert(CONTENT.clients.addFailedWarning);
  }
});

if (state.authHeader) startApp().catch(showLogin); else showLogin();

document.getElementById('editClientBtn').addEventListener('click', () => {
  const client = state.clients.find(c => c.id === state.currentClientId);
  if (!client) return;
  document.getElementById('editClientName').value = client.name || '';
  document.getElementById('editClientIgId').value = client.igUserId || '';
  document.getElementById('editClientToken').value = client.accessToken || '';
  showScreen('editClientView');
});
document.getElementById('backFromEditClientBtn').addEventListener('click', () => showScreen('albumsView'));
document.getElementById('saveClientEditBtn').addEventListener('click', async () => {
  const name = document.getElementById('editClientName').value.trim();
  if (!name) { showAlert(CONTENT.clients.missingNameWarning); return; }
  try {
    await api(`/clients/${state.currentClientId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name,
        igUserId: document.getElementById('editClientIgId').value.trim(),
        accessToken: document.getElementById('editClientToken').value.trim(),
      }),
    });
    await startApp();
    showToast(CONTENT.clients.savedToast, null);
  } catch (err) {
    showAlert(CONTENT.clients.saveFailedWarning);
  }
});

// --- Screens ---
// Every top-level screen in the app is listed here. Whichever navigation
// action runs, this is the ONLY thing that should decide what's visible -
// that guarantees exactly one screen shows at a time, with nothing left
// stacked underneath from an earlier click.
const ALL_SCREENS = ['albumsView', 'albumFormView', 'videosView', 'deletedView', 'editClientView', 'settingsView', 'noClientsView'];
function showScreen(id) {
  ALL_SCREENS.forEach(s => {
    const el = document.getElementById(s);
    if (el) el.style.display = (s === id) ? 'block' : 'none';
  });
  document.querySelector('.topbar').style.display = (id === 'albumsView') ? 'flex' : 'none';
}

// --- Albums list ---
async function showAlbums(clientId) {
  state.currentClientId = clientId;
  document.getElementById('clientSelect').value = clientId;
  showScreen('albumsView');
  state.albums = await api(`/clients/${clientId}/albums`);
  renderAlbumList();
}

function renderAlbumList() {
  const list = document.getElementById('albumList');
  list.innerHTML = state.albums.map(a => {
    const isLive = a.status === 'capturing';
    const statusLabel = a.status === 'capturing' ? CONTENT.albumList.statusCapturing : a.status === 'scheduled' ? CONTENT.albumList.statusScheduled : CONTENT.albumList.statusDone;
    const filesText = a.status === 'scheduled' ? '' :
      `<span class="bold">${(a.videoCount || 0) + (a.photoCount || 0)} files</span> <span class="muted">(${a.videoCount || 0} videos/${a.photoCount || 0} photos)</span>`;
    const dates = a.status === 'capturing' ? `Started ${fmtShort(a.start)}` : `${fmtShort(a.start)} → ${fmtShort(a.end)}`;
    return `
      <div class="album-row ${isLive ? 'live' : ''}">
        <div class="info" data-open="${a.id}">
          <div class="name">${a.name}</div>
          <div class="dates">${dates}</div>
        </div>
        <div class="files">${filesText}</div>
        <div class="status ${isLive ? 'live' : ''}">${statusLabel}</div>
        <div class="row-actions">
          <button data-settings="${a.id}" class="icon-btn" aria-label="Album settings"><i class="icon-settings"></i></button>
          <button data-delalbum="${a.id}" class="icon-btn" aria-label="Delete album"><i class="icon-trash"></i></button>
        </div>
      </div>`;
  }).join('');

  list.querySelectorAll('[data-open]').forEach(el => el.addEventListener('click', () => openAlbum(el.dataset.open)));
  list.querySelectorAll('[data-settings]').forEach(el => el.addEventListener('click', () => openAlbumForm(el.dataset.settings)));
  list.querySelectorAll('[data-delalbum]').forEach(el => el.addEventListener('click', () => deleteAlbum(el.dataset.delalbum)));
  renderIcons(list);
}

function fmtShort(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

async function deleteAlbum(albumId) {
  const album = state.albums.find(a => a.id === albumId);
  showConfirm(fill(CONTENT.albumForm.deleteConfirm, { name: album ? album.name : 'this capture' }), async () => {
    await api(`/albums/${albumId}`, { method: 'DELETE' });
    showAlbums(state.currentClientId);
    showToast(CONTENT.videos.albumDeletedToast, async () => {
      await api(`/albums/${albumId}/restore`, { method: 'POST' });
      showAlbums(state.currentClientId);
    });
  });
}

// --- New album / settings form (shared) ---
document.getElementById('newAlbumBtn').addEventListener('click', () => openAlbumForm(null));
document.getElementById('backFromFormBtn').addEventListener('click', () => showAlbums(state.currentClientId));

function openAlbumForm(albumId) {
  const album = albumId ? state.albums.find(a => a.id === albumId) : null;
  state.formTarget = { clientId: state.currentClientId, albumId };
  document.getElementById('formTitle').textContent = album ? CONTENT.albumForm.titleEdit : CONTENT.albumForm.titleNew;
  document.getElementById('formName').value = album ? album.name : '';
  state.formStartVal = album && album.start ? fmtShort(album.start) : '';
  state.formEndVal = album && album.end ? fmtShort(album.end) : '';
  state.formStartDate = album && album.start ? new Date(album.start) : null;
  state.formEndDate = album && album.end ? new Date(album.end) : null;
  state.formStartIsNow = false;

  // Start is locked once the capture has actually begun - whether it's
  // still running or already finished. Only a truly untouched, still
  // "scheduled" capture has an editable start time.
  const startLocked = album && album.status !== 'scheduled';
  const endLocked = album && album.status === 'done';
  document.getElementById('formStartField').textContent = state.formStartVal || CONTENT.albumForm.startPlaceholder;
  document.getElementById('formEndField').textContent = state.formEndVal || CONTENT.albumForm.endPlaceholder;
  document.getElementById('formStartField').disabled = !!startLocked;
  document.getElementById('formEndField').disabled = !!endLocked;
  document.getElementById('formStartLockedNote').style.display = startLocked ? 'block' : 'none';
  document.getElementById('formEndLockedNote').style.display = endLocked ? 'block' : 'none';
  document.getElementById('saveFormBtn').textContent = album ? CONTENT.albumForm.saveButtonEdit : CONTENT.albumForm.saveButtonNew;
  showScreen('albumFormView');
}

document.getElementById('formStartField').addEventListener('click', () => { if (!event.target.disabled) openPicker('start'); });
document.getElementById('formEndField').addEventListener('click', () => { if (!event.target.disabled) openPicker('end'); });

document.getElementById('saveFormBtn').addEventListener('click', async () => {
  const name = document.getElementById('formName').value.trim();
  if (!name) {
    showAlert(CONTENT.albumForm.missingNameWarning);
    return;
  }
  if (!state.formStartDate || !state.formEndDate) {
    showAlert(CONTENT.albumForm.missingDatesWarning);
    return;
  }
  if (state.formEndDate <= state.formStartDate) {
    showAlert(CONTENT.albumForm.endBeforeStartWarning);
    return;
  }
  const doSave = async () => {
    const { clientId, albumId } = state.formTarget;
    const body = { name };
    if (state.formStartIsNow) body.startNow = true;
    else if (state.formStartDate) body.start = state.formStartDate.toISOString();
    if (state.formEndDate) body.end = state.formEndDate.toISOString();

    if (albumId) await api(`/albums/${albumId}`, { method: 'PATCH', body: JSON.stringify(body) });
    else await api(`/clients/${clientId}/albums`, { method: 'POST', body: JSON.stringify(body) });
    showAlbums(clientId);
    showToast(CONTENT.albumForm.savedToast, null);
  };

  if (state.formStartDate && state.formEndDate) {
    const diffDays = (state.formEndDate - state.formStartDate) / (1000 * 60 * 60 * 24);
    if (diffDays > 3) {
      showConfirm(fill(CONTENT.albumForm.longCaptureWarning, { days: Math.round(diffDays) }), doSave);
      return;
    }
  }
  doSave();
});

// --- Date/time picker ---
function openPicker(field) {
  state.pickerField = field;
  document.getElementById('pickerNowLink').style.display = field === 'start' ? 'block' : 'none';
  const existing = field === 'start' ? state.formStartDate : state.formEndDate;
  // If opening the End picker for the first time (no end chosen yet) and a
  // Start has already been set, default to Start + 1 hour for convenience.
  const prefill = existing || (field === 'end' && state.formStartDate ? new Date(state.formStartDate.getTime() + 60 * 60 * 1000) : null);
  const base = prefill || new Date();
  state.calMonth = base.getMonth(); state.calYear = base.getFullYear();
  renderCalendar(prefill);
  document.getElementById('timeSelect').innerHTML = Array.from({ length: 24 }, (_, h) =>
    `<option value="${h}">${String(h).padStart(2, '0')}:00</option>`).join('');
  document.getElementById('timeSelect').value = base.getHours();
  document.getElementById('pickerModal').style.display = 'flex';
}
function renderCalendar(selectedDate) {
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  document.getElementById('calMonthLabel').textContent = `${monthNames[state.calMonth]} ${state.calYear}`;
  const first = new Date(state.calYear, state.calMonth, 1);
  const daysInMonth = new Date(state.calYear, state.calMonth + 1, 0).getDate();
  const today = new Date(); today.setHours(0,0,0,0);
  const showTodayAsDefault = !selectedDate; // only fall back to highlighting "today" when nothing has been chosen yet
  const grid = document.getElementById('calGrid');
  let html = ['S','M','T','W','T','F','S'].map(d => `<div class="cal-day-label">${d}</div>`).join('');
  for (let i = 0; i < first.getDay(); i++) html += '<div></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const thisDate = new Date(state.calYear, state.calMonth, d);
    const isPast = thisDate < today;
    const isToday = thisDate.getTime() === today.getTime();
    const isSelected = selectedDate && selectedDate.getFullYear() === state.calYear && selectedDate.getMonth() === state.calMonth && selectedDate.getDate() === d;
    html += `<button data-day="${d}" ${isPast ? 'disabled' : ''} class="${isSelected ? 'selected' : (isToday && showTodayAsDefault ? 'today' : '')}">${d}</button>`;
  }
  grid.innerHTML = html;
  if (selectedDate && selectedDate.getFullYear() === state.calYear && selectedDate.getMonth() === state.calMonth) {
    grid.dataset.selectedDay = selectedDate.getDate();
  } else {
    delete grid.dataset.selectedDay;
  }
  grid.querySelectorAll('button:not(:disabled)').forEach(btn => btn.addEventListener('click', () => {
    grid.querySelectorAll('button').forEach(b => b.classList.remove('selected', 'today'));
    btn.classList.add('selected');
    grid.dataset.selectedDay = btn.dataset.day;
  }));
}
document.getElementById('calPrev').addEventListener('click', () => { state.calMonth--; if (state.calMonth < 0) { state.calMonth = 11; state.calYear--; } renderCalendar(state.pickerField === 'start' ? state.formStartDate : state.formEndDate); });
document.getElementById('calNext').addEventListener('click', () => { state.calMonth++; if (state.calMonth > 11) { state.calMonth = 0; state.calYear++; } renderCalendar(state.pickerField === 'start' ? state.formStartDate : state.formEndDate); });
document.getElementById('pickerCancel').addEventListener('click', () => document.getElementById('pickerModal').style.display = 'none');
document.getElementById('pickerNowLink').addEventListener('click', () => {
  state.formStartVal = 'Now'; state.formStartIsNow = true; state.formStartDate = new Date();
  document.getElementById('formStartField').textContent = 'Now';
  document.getElementById('pickerModal').style.display = 'none';
  document.getElementById('saveFormBtn').textContent = CONTENT.albumForm.saveButtonStartNow;
});
document.getElementById('pickerDone').addEventListener('click', () => {
  const day = parseInt(document.getElementById('calGrid').dataset.selectedDay || new Date().getDate());
  const hour = parseInt(document.getElementById('timeSelect').value);
  const chosen = new Date(state.calYear, state.calMonth, day, hour, 0);
  const label = fmtShort(chosen.toISOString());
  if (state.pickerField === 'start') { state.formStartVal = label; state.formStartDate = chosen; state.formStartIsNow = false; document.getElementById('formStartField').textContent = label; }
  else { state.formEndVal = label; state.formEndDate = chosen; document.getElementById('formEndField').textContent = label; }
  document.getElementById('pickerModal').style.display = 'none';
});

// --- Videos grid ---
async function openAlbum(albumId) {
  state.currentAlbumId = albumId;
  const album = state.albums.find(a => a.id === albumId);
  document.getElementById('albumTitle').textContent = album.name;
  document.getElementById('albumMeta').textContent = `${fmtShort(album.start)} → ${fmtShort(album.end)}`;
  state.videos = await api(`/albums/${albumId}/videos`);
  sortVideos(document.getElementById('sortSelect').value);
  renderGrid();
  showScreen('videosView');
}
document.getElementById('backBtn').addEventListener('click', () => showAlbums(state.currentClientId));
document.getElementById('sortSelect').addEventListener('change', e => { sortVideos(e.target.value); renderGrid(); });
document.getElementById('sizeToggle').addEventListener('click', () => {
  state.gridSize = state.gridSize === 'small' ? 'large' : 'small';
  document.getElementById('sizeToggle').innerHTML = state.gridSize === 'small' ? '<i class="icon-grid-large"></i>' : '<i class="icon-grid"></i>';
  renderIcons(document.getElementById('sizeToggle'));
  renderGrid();
});

function sortVideos(mode) {
  if (mode === 'newest') state.videos.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  else if (mode === 'oldest') state.videos.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  else state.videos.sort((a, b) => a.tagger.localeCompare(b.tagger));
}

// "9.45pm, 23/09/26" - matches the style used for the card meta row.
function formatCardMeta(timestamp) {
  const d = new Date(timestamp);
  let h = d.getHours();
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  const m = String(d.getMinutes()).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  return `${h}.${m}${ampm}, ${day}/${month}/${year}`;
}

function renderGrid() {
  const grid = document.getElementById('videoGrid');
  grid.className = 'video-grid' + (state.gridSize === 'large' ? ' large' : '');
  grid.innerHTML = state.videos.map((v, idx) => `
    <div class="video-card ${v.mark || ''}">
      <div class="thumb" data-idx="${idx}">
        ${v.previewUrl ? (v.type === 'photo'
          ? `<img class="thumb-media" src="${v.previewUrl}" loading="lazy" alt="">`
          : `<video class="thumb-media" src="${v.previewUrl}#t=0.1" preload="metadata" muted playsinline></video>`) : ''}
        ${v.type === 'photo' ? '' : '<i class="icon-play"></i>'}
      </div>
      <div class="card-footer">
        <div class="card-meta-row">
          <span class="card-tagger">@${v.tagger}</span>
          <span class="card-time">${formatCardMeta(v.timestamp)}</span>
        </div>
        <div class="card-actions">
          <button data-dl="${idx}" aria-label="Download"><i class="icon-download"></i></button>
          <button data-star="${idx}" class="${v.mark==='save'?'active':''}" aria-label="Toggle starred"><i class="icon-star"></i></button>
          <button data-trash="${idx}" aria-label="Delete"><i class="icon-trash"></i></button>
        </div>
      </div>
    </div>`).join('');

  grid.querySelectorAll('.thumb').forEach(el => el.addEventListener('click', () => openPreview(parseInt(el.dataset.idx))));
  grid.querySelectorAll('[data-star]').forEach(el => el.addEventListener('click', async e => {
    e.stopPropagation();
    const v = state.videos[el.dataset.star];
    v.mark = v.mark === 'save' ? null : 'save';
    await api(`/videos/${v.id}/mark`, { method: 'PATCH', body: JSON.stringify({ mark: v.mark }) });
    renderGrid();
  }));
  grid.querySelectorAll('[data-trash]').forEach(el => el.addEventListener('click', e => { e.stopPropagation(); deleteSingle(parseInt(el.dataset.trash)); }));
  grid.querySelectorAll('[data-dl]').forEach(el => el.addEventListener('click', async e => {
    e.stopPropagation();
    const v = state.videos[el.dataset.dl];
    const { url } = await api(`/videos/${v.id}/download-url`);
    window.open(url, '_blank');
  }));
  updateActionButtons();
  renderIcons(grid);
}

function updateActionButtons() {
  const starred = state.videos.filter(v => v.mark === 'save').length;
  const dlBtn = document.getElementById('downloadStarredBtn');
  dlBtn.style.display = starred ? 'inline-flex' : 'none';
  document.getElementById('starredCount').textContent = starred;

  const marked = state.videos.filter(v => v.mark === 'delete').length;
  const trashBtn = document.getElementById('deleteMarkedBtn');
  trashBtn.style.display = marked ? 'inline-flex' : 'none';
  document.getElementById('markedCount').textContent = marked;
}

async function deleteSingle(idx) {
  const v = state.videos[idx];
  await api(`/videos/${v.id}/delete`, { method: 'POST' });
  state.videos.splice(idx, 1);
  renderGrid();
  showToast(CONTENT.videos.deleteSingleToast, async () => {
    await api(`/videos/${v.id}/restore`, { method: 'POST' });
    state.videos.push(v);
    sortVideos(document.getElementById('sortSelect').value);
    renderGrid();
  });
}

document.getElementById('downloadStarredBtn').addEventListener('click', () => {
  const count = state.videos.filter(v => v.mark === 'save').length;
  showConfirm(fill(CONTENT.videos.downloadStarredConfirm, { count }), () => {
    window.open(`/api/albums/${state.currentAlbumId}/download-starred-zip`, '_blank');
  });
});
document.getElementById('deleteMarkedBtn').addEventListener('click', () => {
  const marked = state.videos.filter(v => v.mark === 'delete');
  showConfirm(fill(CONTENT.videos.deleteMarkedConfirm, { count: marked.length }), async () => {
    for (const v of marked) await api(`/videos/${v.id}/delete`, { method: 'POST' });
    state.videos = state.videos.filter(v => v.mark !== 'delete');
    renderGrid();
    showToast(fill(CONTENT.videos.deleteMultipleToast, { count: marked.length }), null);
  });
});

// --- Unified preview / review modal ---
function openPreview(idx) {
  state.previewMode = 'grid'; state.previewIdx = idx; state.modalOpen = true;
  document.getElementById('previewActionsNormal').style.display = 'flex';
  document.getElementById('previewActionsDeleted').style.display = 'none';
  document.getElementById('previewHintRow').style.display = 'block';
  renderPreview();
  document.getElementById('previewModal').style.display = 'flex';
}
function renderPreview() {
  const v = state.previewMode === 'grid' ? state.videos[state.previewIdx] : state.deletedVideos[state.previewIdx];
  document.getElementById('previewCounter').textContent = state.previewMode === 'grid' ? `${state.previewIdx+1}/${state.videos.length}` : '';
  document.getElementById('previewTagger').textContent = `@${v.tagger}`;
  document.getElementById('previewStarBtn').classList.toggle('active', v.mark === 'save');
  document.getElementById('previewCard').className = 'modal-card ' + (v.mark || '');
  const videoEl = document.getElementById('previewVideoEl');
  const imageEl = document.getElementById('previewImageEl');
  const isPhoto = v.type === 'photo';
  videoEl.style.display = isPhoto ? 'none' : '';
  imageEl.style.display = isPhoto ? '' : 'none';
  videoEl.pause();
  api(`/videos/${v.id}/download-url`).then(({ url }) => {
    if (isPhoto) imageEl.src = url; else videoEl.src = url;
  });
}
function navPreview(dir) {
  if (state.previewMode !== 'grid') return;
  state.previewIdx = dir === 'next' ? (state.previewIdx + 1) % state.videos.length : (state.previewIdx - 1 + state.videos.length) % state.videos.length;
  renderPreview();
}
document.getElementById('prevArrow').addEventListener('click', () => navPreview('prev'));
document.getElementById('nextArrow').addEventListener('click', () => navPreview('next'));
document.getElementById('previewStarBtn').addEventListener('click', async () => {
  const v = state.videos[state.previewIdx];
  v.mark = v.mark === 'save' ? null : 'save';
  await api(`/videos/${v.id}/mark`, { method: 'PATCH', body: JSON.stringify({ mark: v.mark }) });
  renderPreview(); renderGrid();
});
document.getElementById('previewTrashBtn').addEventListener('click', () => { const idx = state.previewIdx; closePreview(); deleteSingle(idx); });
document.getElementById('previewRestoreBtn').addEventListener('click', async () => {
  const v = state.deletedVideos[state.previewIdx];
  await api(`/videos/${v.id}/restore`, { method: 'POST' });
  closePreview();
  showDeletedFiles();
});
function closePreview() { document.getElementById('previewModal').style.display = 'none'; state.modalOpen = false; }
document.getElementById('closePreview').addEventListener('click', closePreview);
document.getElementById('previewModal').addEventListener('click', e => { if (e.target.id === 'previewModal') closePreview(); });
document.getElementById('previewCard').addEventListener('click', e => e.stopPropagation());

async function markCurrentAndAdvance(mark) {
  if (state.previewMode !== 'grid') return;
  const v = state.videos[state.previewIdx];
  v.mark = mark;
  await api(`/videos/${v.id}/mark`, { method: 'PATCH', body: JSON.stringify({ mark }) });
  renderGrid();
  if (state.previewIdx < state.videos.length - 1) navPreview('next'); else renderPreview();
}
document.addEventListener('keydown', e => {
  if (!state.modalOpen || state.previewMode !== 'grid') return;
  const video = document.getElementById('previewVideoEl');
  const k = e.key.toLowerCase();
  if (e.key === 'ArrowDown') { e.preventDefault(); navPreview('next'); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); navPreview('prev'); }
  else if (e.key === ' ') { e.preventDefault(); if (video.style.display !== 'none') video.paused ? video.play() : video.pause(); }
  else if (e.key === 'ArrowLeft') { if (video.style.display !== 'none') video.currentTime = Math.max(0, video.currentTime - 5); }
  else if (e.key === 'ArrowRight') { if (video.style.display !== 'none') video.currentTime += 5; }
  else if (k === 's') markCurrentAndAdvance('save');
  else if (k === 'd') markCurrentAndAdvance('delete');
});

// --- Deleted files ---
document.getElementById('deletedFilesBtn').addEventListener('click', showDeletedFiles);
document.getElementById('backFromDeletedBtn').addEventListener('click', () => showScreen('albumsView'));

async function showDeletedFiles() {
  showScreen('deletedView');
  const client = state.clients.find(c => c.id === state.currentClientId);
  document.getElementById('deletedClientTitle').textContent = `${client.name} ${CONTENT.deletedFiles.titleSuffix}`;

  const videos = await api(`/clients/${state.currentClientId}/deleted-videos`);
  const wrap = document.getElementById('deletedGroups');

  if (videos.length === 0) {
    wrap.innerHTML = `<div class="meta-text">${CONTENT.deletedFiles.emptyNote || 'Nothing here yet.'}</div>`;
    return;
  }

  const groups = {};
  videos.forEach(v => {
    if (!groups[v.albumId]) groups[v.albumId] = { name: v.albumName, albumDeleted: v.albumDeleted, videos: [] };
    groups[v.albumId].videos.push(v);
  });

  wrap.innerHTML = Object.entries(groups).map(([albumId, group]) => `
    <div class="deleted-group">
      <div class="deleted-group-header">
        <div class="deleted-group-title">${group.name}</div>
        ${group.albumDeleted ? `<button data-restore-album="${albumId}" class="btn-small">${CONTENT.deletedFiles.restoreCaptureButton}</button>` : ''}
      </div>
      <div class="deleted-grid">
        ${group.videos.map(v => `
          <div class="video-card">
            <div class="thumb" data-preview="${v.id}">
              <i class="icon-play"></i>
              <div class="tag-label">@${v.tagger}</div>
            </div>
            ${group.albumDeleted ? '' : `<button data-restore-video="${v.id}" class="btn-small" style="width:100%;">${CONTENT.deletedFiles.restoreButton}</button>`}
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  wrap.querySelectorAll('[data-restore-album]').forEach(btn => btn.addEventListener('click', async () => {
    await api(`/albums/${btn.dataset.restoreAlbum}/restore`, { method: 'POST' });
    showDeletedFiles();
  }));
  wrap.querySelectorAll('[data-restore-video]').forEach(btn => btn.addEventListener('click', async () => {
    await api(`/videos/${btn.dataset.restoreVideo}/restore`, { method: 'POST' });
    showDeletedFiles();
  }));
  renderIcons(wrap);
}

// --- Toasts & confirm ---
function showToast(label, onUndo) {
  const t = document.createElement('div');
  t.className = 'toast';
  const span = document.createElement('span'); span.textContent = label;
  t.appendChild(span);
  if (onUndo) {
    const undo = document.createElement('button');
    undo.className = 'undo-btn'; undo.textContent = CONTENT.videos.undoLink;
    undo.addEventListener('click', () => { onUndo(); t.remove(); });
    t.appendChild(undo);
  }
  document.getElementById('toastHolder').appendChild(t);
  setTimeout(() => t.remove(), 4000);
}
function showAlert(text) {
  document.getElementById('alertText').textContent = text;
  document.getElementById('alertModal').style.display = 'flex';
}
document.getElementById('alertOkBtn').addEventListener('click', () => document.getElementById('alertModal').style.display = 'none');

function showConfirm(text, onYes) {
  document.getElementById('confirmText').textContent = text;
  document.getElementById('confirmModal').style.display = 'flex';
  const yesBtn = document.getElementById('confirmYesBtn');
  const fresh = yesBtn.cloneNode(true);
  yesBtn.parentNode.replaceChild(fresh, yesBtn);
  fresh.addEventListener('click', () => { document.getElementById('confirmModal').style.display = 'none'; onYes(); });
}
document.getElementById('confirmCancelBtn').addEventListener('click', () => document.getElementById('confirmModal').style.display = 'none');
