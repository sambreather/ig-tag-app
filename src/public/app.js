// app.js — the real frontend, talking to the actual API routes built in
// src/routes/. Structure mirrors the interactive mockups we designed.

const state = {
  password: localStorage.getItem('teamPassword') || null,
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
  document.getElementById('loginPassword').placeholder = CONTENT.login.passwordPlaceholder;
  document.getElementById('loginBtn').textContent = CONTENT.login.loginButton;

  document.getElementById('deletedFilesBtn').innerHTML = `<i class="icon-trash"></i> ${CONTENT.topbar.deletedButton}`;
  document.getElementById('newAlbumBtn').innerHTML = `<i class="icon-plus"></i> ${CONTENT.topbar.newAlbumButton}`;

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
}
applyContent();

// --- API helper ---
async function api(path, opts = {}) {
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.password}`,
      ...(opts.headers || {}),
    },
  });
  if (res.status === 401) { showLogin(); throw new Error('Not authenticated'); }
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.status === 204 ? null : res.json();
}

// --- Login ---
function showLogin() {
  document.getElementById('screenLogin').style.display = 'flex';
  document.getElementById('screenApp').style.display = 'none';
}
document.getElementById('loginBtn').addEventListener('click', doLogin);
document.getElementById('loginPassword').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
async function doLogin() {
  state.password = document.getElementById('loginPassword').value;
  try {
    await api('/clients');
    localStorage.setItem('teamPassword', state.password);
    startApp();
  } catch {
    document.getElementById('loginError').textContent = CONTENT.login.errorIncorrect;
  }
}

async function startApp() {
  document.getElementById('screenLogin').style.display = 'none';
  document.getElementById('screenApp').style.display = 'block';
  state.clients = await api('/clients');
  const sel = document.getElementById('clientSelect');
  sel.innerHTML = state.clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  sel.addEventListener('change', () => showAlbums(sel.value));
  if (state.clients.length) showAlbums(state.clients[0].id);
}

if (state.password) startApp().catch(showLogin); else showLogin();

// --- Screens ---
function showScreen(id) {
  ['albumsView', 'albumFormView', 'videosView', 'deletedView'].forEach(s => {
    document.getElementById(s).style.display = (s === id) ? 'block' : 'none';
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
}

function fmtShort(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

async function deleteAlbum(albumId) {
  await api(`/albums/${albumId}`, { method: 'DELETE' });
  showToast(CONTENT.videos.albumDeletedToast, null); // undo would need a restore endpoint - noted for later
  showAlbums(state.currentClientId);
}

// --- New album / settings form (shared) ---
document.getElementById('newAlbumBtn').addEventListener('click', () => openAlbumForm(null));
document.getElementById('backFromFormBtn').addEventListener('click', () => showAlbums(state.currentClientId));

function openAlbumForm(albumId) {
  const album = albumId ? state.albums.find(a => a.id === albumId) : null;
  state.formTarget = { clientId: state.currentClientId, albumId };
  document.getElementById('formTitle').textContent = album ? CONTENT.albumForm.titleEdit : CONTENT.albumForm.titleNew;
  document.getElementById('formName').value = album ? album.name : '';
  state.formStartVal = album ? fmtShort(album.start) : '';
  state.formEndVal = album ? fmtShort(album.end) : '';
  state.formStartDate = album ? new Date(album.start) : null;
  state.formEndDate = album ? new Date(album.end) : null;
  state.formStartIsNow = false;

  const startLocked = album && album.status === 'capturing';
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
  const doSave = async () => {
    const { clientId, albumId } = state.formTarget;
    const body = { name: document.getElementById('formName').value };
    if (state.formStartIsNow) body.startNow = true;
    else if (state.formStartDate) body.start = state.formStartDate.toISOString();
    if (state.formEndDate) body.end = state.formEndDate.toISOString();

    if (albumId) await api(`/albums/${albumId}`, { method: 'PATCH', body: JSON.stringify(body) });
    else await api(`/clients/${clientId}/albums`, { method: 'POST', body: JSON.stringify(body) });
    showAlbums(clientId);
  };

  if (state.formStartDate && state.formEndDate) {
    const diffDays = (state.formEndDate - state.formStartDate) / (1000 * 60 * 60 * 24);
    if (diffDays > 3) {
      showConfirm(CONTENT.albumForm.longCaptureWarning(Math.round(diffDays)), doSave);
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
  const base = existing || new Date();
  state.calMonth = base.getMonth(); state.calYear = base.getFullYear();
  renderCalendar(existing);
  document.getElementById('timeSelect').innerHTML = Array.from({ length: 24 }, (_, h) =>
    `<option value="${h}">${String(h).padStart(2, '0')}:00</option>`).join('');
  document.getElementById('timeSelect').value = existing ? existing.getHours() : new Date().getHours();
  document.getElementById('pickerModal').style.display = 'flex';
}
function renderCalendar(selectedDate) {
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  document.getElementById('calMonthLabel').textContent = `${monthNames[state.calMonth]} ${state.calYear}`;
  const first = new Date(state.calYear, state.calMonth, 1);
  const daysInMonth = new Date(state.calYear, state.calMonth + 1, 0).getDate();
  const today = new Date(); today.setHours(0,0,0,0);
  const grid = document.getElementById('calGrid');
  let html = ['S','M','T','W','T','F','S'].map(d => `<div class="cal-day-label">${d}</div>`).join('');
  for (let i = 0; i < first.getDay(); i++) html += '<div></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const thisDate = new Date(state.calYear, state.calMonth, d);
    const isPast = thisDate < today;
    const isToday = thisDate.getTime() === today.getTime();
    const isSelected = selectedDate && selectedDate.getFullYear() === state.calYear && selectedDate.getMonth() === state.calMonth && selectedDate.getDate() === d;
    html += `<button data-day="${d}" ${isPast ? 'disabled' : ''} class="${isSelected ? 'selected' : (isToday ? 'today' : '')}">${d}</button>`;
  }
  grid.innerHTML = html;
  if (selectedDate && selectedDate.getFullYear() === state.calYear && selectedDate.getMonth() === state.calMonth) {
    grid.dataset.selectedDay = selectedDate.getDate();
  } else {
    delete grid.dataset.selectedDay;
  }
  grid.querySelectorAll('button:not(:disabled)').forEach(btn => btn.addEventListener('click', () => {
    grid.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
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
  renderGrid();
});

function sortVideos(mode) {
  if (mode === 'newest') state.videos.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  else if (mode === 'oldest') state.videos.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  else state.videos.sort((a, b) => a.tagger.localeCompare(b.tagger));
}

function renderGrid() {
  const grid = document.getElementById('videoGrid');
  grid.className = 'video-grid' + (state.gridSize === 'large' ? ' large' : '');
  grid.innerHTML = state.videos.map((v, idx) => `
    <div class="video-card ${v.mark || ''}">
      <div class="thumb" data-idx="${idx}">
        <i class="icon-play"></i>
        <div class="tag-label">@${v.tagger}</div>
      </div>
      <div class="card-footer">
        <div class="card-time">${new Date(v.timestamp).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})}</div>
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
  showConfirm(CONTENT.videos.downloadStarredConfirm(count), () => {
    window.open(`/api/albums/${state.currentAlbumId}/download-starred-zip`, '_blank');
  });
});
document.getElementById('deleteMarkedBtn').addEventListener('click', () => {
  const marked = state.videos.filter(v => v.mark === 'delete');
  showConfirm(CONTENT.videos.deleteMarkedConfirm(marked.length), async () => {
    for (const v of marked) await api(`/videos/${v.id}/delete`, { method: 'POST' });
    state.videos = state.videos.filter(v => v.mark !== 'delete');
    renderGrid();
    showToast(CONTENT.videos.deleteMultipleToast(marked.length), null);
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
  api(`/videos/${v.id}/download-url`).then(({ url }) => { document.getElementById('previewVideoEl').src = url; });
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
  else if (e.key === ' ') { e.preventDefault(); video.paused ? video.play() : video.pause(); }
  else if (e.key === 'ArrowLeft') { video.currentTime = Math.max(0, video.currentTime - 5); }
  else if (e.key === 'ArrowRight') { video.currentTime += 5; }
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
  // NOTE: needs a dedicated GET /api/clients/:id/deleted-videos endpoint,
  // grouped by album, to fully back this screen — not yet added to videos.js.
  document.getElementById('deletedGroups').innerHTML = `<div class="meta-text">${CONTENT.deletedFiles.notBuiltYetNote}</div>`;
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
function showConfirm(text, onYes) {
  document.getElementById('confirmText').textContent = text;
  document.getElementById('confirmModal').style.display = 'flex';
  const yesBtn = document.getElementById('confirmYesBtn');
  const fresh = yesBtn.cloneNode(true);
  yesBtn.parentNode.replaceChild(fresh, yesBtn);
  fresh.addEventListener('click', () => { document.getElementById('confirmModal').style.display = 'none'; onYes(); });
}
document.getElementById('confirmCancelBtn').addEventListener('click', () => document.getElementById('confirmModal').style.display = 'none');
