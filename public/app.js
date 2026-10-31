const grid = document.querySelector('#notesGrid');
const backdrop = document.querySelector('#editorBackdrop');
const titleInput = document.querySelector('#noteTitle');
const contentInput = document.querySelector('#noteContent');
const searchInput = document.querySelector('#search');
let notes = [];
let current = null;
let filter = 'all';
let timer;
let dirty = false;
let saving = null;
let editRevision = 0;
const colors = ['cream', 'sage', 'rose', 'sky', 'lavender'];
const cacheKey = 'little-notes-cache-v1';
const noteKey = note => note._id || note.localId;

async function request(url, options) {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.error || 'Request failed'); }
  return response.status === 204 ? null : response.json();
}
function setConnection(on) {
  document.querySelector('#connectionDot').parentElement.className = `connection ${on ? 'online' : 'offline'}`;
  document.querySelector('#connectionText').textContent = on ? 'Synced to Atlas' : 'Database unavailable';
}
async function loadNotes() {
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || '[]');
    for (const note of cached.filter(n => n._pending)) {
      const data = { title: note.title, content: note.content, color: note.color, pinned: !!note.pinned };
      const saved = note._localOnly
        ? await request('/api/notes', { method: 'POST', body: JSON.stringify(data) })
        : await request(`/api/notes/${note._id}`, { method: 'PATCH', body: JSON.stringify(data) });
      Object.assign(note, saved); delete note._pending; delete note._localOnly;
      delete note.localId;
    }
    notes = await request('/api/notes');
    saveCache(); setConnection(true); document.querySelector('#saveHint').textContent = 'Autosaves to MongoDB Atlas'; render();
  } catch {
    notes = JSON.parse(localStorage.getItem(cacheKey) || '[]');
    setConnection(false); document.querySelector('#saveHint').textContent = 'Saved on this device; syncs when online'; render();
  }
}
function saveCache() { try { localStorage.setItem(cacheKey, JSON.stringify(notes)); } catch { document.querySelector('#saveStatus').textContent = 'Device storage is full'; } }
function escapeHtml(value = '') { return value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function formatDate(date) { return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(date)); }
function render() {
  const query = searchInput.value.trim().toLowerCase();
  const visible = notes.filter(n => (filter !== 'pinned' || n.pinned) && (!query || `${n.title} ${n.content}`.toLowerCase().includes(query)));
  document.querySelector('#noteCount').textContent = notes.length;
  document.querySelector('#currentView').textContent = filter === 'pinned' ? 'Pinned' : 'All notes';
  document.querySelector('#pageTitle').innerHTML = `${filter === 'pinned' ? 'Pinned' : 'All notes'}<span class="period">.</span>`;
  grid.innerHTML = visible.map(n => `<article class="note-card ${colors.includes(n.color) ? n.color : 'cream'}" data-id="${noteKey(n)}">${n.pinned ? '<span class="card-pin">⌑</span>' : ''}<h3 class="note-title">${escapeHtml(n.title || 'Untitled note')}</h3><div class="note-excerpt">${escapeHtml(n.content || 'No additional text')}</div><div class="note-meta"><span>${formatDate(n.updatedAt)}</span><span>${n.content.trim() ? n.content.trim().split(/\s+/).length + ' words' : 'Just started'}</span></div></article>`).join('');
  grid.querySelectorAll('.note-card').forEach(card => card.addEventListener('click', () => openEditor(notes.find(n => String(noteKey(n)) === card.dataset.id))));
  const empty = document.querySelector('#emptyState');
  empty.hidden = visible.length > 0;
  if (!visible.length) {
    document.querySelector('#emptyTitle').textContent = query ? 'No notes found.' : filter === 'pinned' ? 'Nothing pinned yet.' : 'A fresh page.';
    document.querySelector('#emptyMessage').textContent = query ? 'Try another search.' : filter === 'pinned' ? 'Pin a note to keep it close by.' : 'Start with a thought, a plan, or a little reminder.';
    document.querySelector('#emptyNew').hidden = !!query || filter === 'pinned';
  }
}
function setColor(color) {
  current.color = color;
  applyEditorColor(color);
  document.querySelectorAll('.swatch').forEach(b => b.classList.toggle('selected', b.dataset.color === color));
  scheduleSave();
}
function applyEditorColor(color) {
  const editor = document.querySelector('.editor');
  editor.classList.remove(...colors);
  editor.classList.add(colors.includes(color) ? color : 'cream');
}
function openEditor(note) {
  current = note ? { ...note } : { title: '', content: '', color: 'cream', pinned: false, _isNew: true };
  titleInput.value = current.title || '';
  contentInput.value = current.content || '';
  document.querySelector('#pinNote').classList.toggle('pinned', !!current.pinned);
  document.querySelector('#deleteNote').hidden = !!current._isNew;
  document.querySelectorAll('.swatch').forEach(b => b.classList.toggle('selected', b.dataset.color === current.color));
  applyEditorColor(current.color);
  backdrop.hidden = false;
  document.querySelector('#saveStatus').textContent = current._isNew ? 'New note' : 'All changes saved';
  updateWordCount();
  titleInput.focus();
}
async function closeEditor() {
  while (current && dirty) { clearTimeout(timer); await saveCurrent(); }
  backdrop.hidden = true; current = null; dirty = false;
}
function updateWordCount() { const words = contentInput.value.trim().split(/\s+/).filter(Boolean).length; document.querySelector('#wordCount').textContent = `${words} ${words === 1 ? 'word' : 'words'}`; }
function scheduleSave() {
  if (!current) return;
  dirty = true;
  editRevision++;
  current.title = titleInput.value.trim(); current.content = contentInput.value; current.updatedAt = new Date().toISOString();
  updateWordCount();
  document.querySelector('#saveStatus').textContent = 'Saving…';
  clearTimeout(timer);
  timer = setTimeout(saveCurrent, 550);
}
async function saveCurrent() {
  if (!current) return;
  if (saving) await saving;
  if (!current || !dirty) return;
  const edited = current;
  const saveRevision = editRevision;
  const data = { title: edited.title || 'Untitled note', content: edited.content, color: edited.color, pinned: !!edited.pinned };
  const saveOffline = () => {
    edited.title = data.title; edited.content = data.content; edited.color = data.color; edited.pinned = data.pinned;
    edited.updatedAt = new Date().toISOString(); edited._pending = true;
    if (!edited._id) { edited._localOnly = true; edited.localId ||= crypto.randomUUID(); }
    edited._isNew = false;
    notes = [edited, ...notes.filter(n => noteKey(n) !== noteKey(edited))];
    saveCache(); document.querySelector('#deleteNote').hidden = false;
    document.querySelector('#saveStatus').textContent = 'Saved on this device'; setConnection(false); render();
    if (editRevision === saveRevision) dirty = false;
  };
  const operation = (async () => { try {
    if (edited._localOnly) { saveOffline(); return; }
    const data = { title: current.title || 'Untitled note', content: current.content, color: current.color, pinned: !!current.pinned };
    const saved = edited._isNew ? await request('/api/notes', { method: 'POST', body: JSON.stringify(data) }) : await request(`/api/notes/${edited._id}`, { method: 'PATCH', body: JSON.stringify(data) });
    current = saved; notes = [saved, ...notes.filter(n => n._id !== saved._id)];
    document.querySelector('#deleteNote').hidden = false;
    document.querySelector('#saveStatus').textContent = 'All changes saved';
    setConnection(true); saveCache(); render();
    if (editRevision === saveRevision) dirty = false;
  } catch { saveOffline(); } })();
  saving = operation;
  try { await operation; } finally { saving = null; }
}
function makeNote() { openEditor(null); }
document.querySelector('#newNote').addEventListener('click', makeNote);
document.querySelector('#newNoteTop').addEventListener('click', makeNote);
document.querySelector('#emptyNew').addEventListener('click', makeNote);
document.querySelector('#closeEditor').addEventListener('click', closeEditor);
document.querySelector('#saveNote').addEventListener('click', saveCurrent);
backdrop.addEventListener('click', e => { if (e.target === backdrop) closeEditor(); });
titleInput.addEventListener('input', scheduleSave);
contentInput.addEventListener('input', scheduleSave);
searchInput.addEventListener('input', render);
document.querySelectorAll('.nav-item').forEach(button => button.addEventListener('click', () => {
  filter = button.dataset.filter;
  document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item === button));
  render();
}));
document.querySelectorAll('.swatch').forEach(button => button.addEventListener('click', () => setColor(button.dataset.color)));
document.querySelector('#pinNote').addEventListener('click', () => { if (!current) return; current.pinned = !current.pinned; document.querySelector('#pinNote').classList.toggle('pinned', current.pinned); scheduleSave(); });
document.querySelector('#deleteNote').addEventListener('click', async () => {
  if (!current || current._isNew) return;
  if (current._localOnly || !navigator.onLine) { notes = notes.filter(n => noteKey(n) !== noteKey(current)); saveCache(); closeEditor(); render(); return; }
  try { await request(`/api/notes/${current._id}`, { method: 'DELETE' }); notes = notes.filter(n => n._id !== current._id); closeEditor(); render(); }
  catch (error) { document.querySelector('#saveStatus').textContent = error.message; }
});
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); makeNote(); }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') { e.preventDefault(); searchInput.focus(); }
  if (e.key === 'Escape' && !backdrop.hidden) closeEditor();
});
window.addEventListener('online', loadNotes);
window.setInterval(async () => {
  try {
    const health = await request('/api/health');
    const wasOffline = !document.querySelector('#connectionDot').parentElement.classList.contains('online');
    if (health.connected && wasOffline) loadNotes();
  } catch { /* Keep the cached notes available when the server is offline. */ }
}, 15000);
loadNotes();
