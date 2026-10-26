import { FOODS, FOOD_BY_ID, inSeason, seasonLabel, foodIcon } from './foods.js';
import { listCaches, addCache, addLog, deleteCache } from './store.js';

const L = window.L;

const ACCESS = {
  public: 'Public land',
  street: 'Sidewalk / roadside',
  permission: 'Shared by the owner',
};

const STATUS = {
  ripe:    { label: 'Ripe now',      cls: 'ripe' },
  unripe:  { label: 'Not ripe yet',  cls: 'warn' },
  picked:  { label: 'Picked over',   cls: 'warn' },
  gone:    { label: 'Gone',          cls: 'gone' },
};

const state = {
  caches: [],
  selectedFoods: new Set(),   // empty = show all
  seasonOnly: false,
  me: null,                   // { lat, lng, accuracy }
  view: 'list',               // list | detail | add
  openId: null,
  firstFix: true,
};

const $ = id => document.getElementById(id);
const sheet = $('sheet');
const sheetBody = $('sheetBody');

// ---------- Map ----------
const map = L.map('map', { zoomControl: false, attributionControl: true })
  .setView([39.5, -98.35], 4);
L.control.zoom({ position: 'topright' }).addTo(map);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

// Center the map on a point so it lands in the part of the map the sheet
// doesn't cover (above it on phones, to its right on wide screens).
function focusOn(lat, lng, zoom = map.getZoom(), sheetOpen = true) {
  const mapRect = map.getContainer().getBoundingClientRect();
  let dx = 0, dy = 0;
  if (sheetOpen) {
    if (window.innerWidth >= 820) {
      dx = -(380 + 16) / 2;
    } else {
      const sheetTop = window.innerHeight * 0.3; // expanded sheet is 70% tall
      const visibleMid = (mapRect.top + sheetTop) / 2;
      dy = (mapRect.top + mapRect.height / 2) - visibleMid;
    }
  }
  const p = map.project([lat, lng], zoom).add([dx, dy]);
  map.setView(map.unproject(p, zoom), zoom);
}

const cacheLayer = L.layerGroup().addTo(map);
let meMarker = null;
let meCircle = null;
let newMarker = null;

function pinIcon(food, extraClass = '') {
  return L.divIcon({
    className: '',
    html: `<div class="food-pin ${extraClass}" style="--pin:${food.color}">${foodIcon(food, 22)}</div>`,
    iconSize: [40, 40],
    iconAnchor: [6, 40],
  });
}

// ---------- Helpers ----------
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function distanceMeters(a, b) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function formatDistance(m) {
  const miles = m / 1609.34;
  if (miles < 0.1) return `${Math.round(m * 3.281)} ft`;
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

function timeAgo(iso) {
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  const d = Math.floor(s / 86400);
  if (d < 30) return `${d} day${d === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString();
}

let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

function reference() {
  return state.me || map.getCenter();
}

function visibleCaches() {
  return state.caches.filter(c => {
    const food = FOOD_BY_ID[c.food] || FOOD_BY_ID.other;
    if (state.selectedFoods.size && !state.selectedFoods.has(food.id)) return false;
    if (state.seasonOnly && !inSeason(food)) return false;
    return true;
  });
}

function setSheet(expanded) {
  sheet.classList.toggle('expanded', expanded);
}

// ---------- Chips ----------
function renderChips() {
  const all = `<button class="chip" data-food="" aria-pressed="${state.selectedFoods.size === 0}">All foods</button>`;
  const chips = FOODS.map(f => {
    const on = state.selectedFoods.has(f.id);
    const off = !inSeason(f) ? ' off-season' : '';
    return `<button class="chip${off}" data-food="${f.id}" aria-pressed="${on}" title="${esc(f.name)} · ${seasonLabel(f)}">${foodIcon(f, 18)}${esc(f.name)}</button>`;
  }).join('');
  $('chips').innerHTML = all + chips;
}

$('chips').addEventListener('click', e => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  const id = chip.dataset.food;
  if (!id) state.selectedFoods.clear();
  else if (state.selectedFoods.has(id)) state.selectedFoods.delete(id);
  else state.selectedFoods.add(id);
  renderChips();
  renderMarkers();
  if (state.view === 'list') renderList();
});

$('seasonOnly').addEventListener('change', e => {
  state.seasonOnly = e.target.checked;
  renderMarkers();
  if (state.view === 'list') renderList();
});

// ---------- Markers ----------
function renderMarkers() {
  cacheLayer.clearLayers();
  for (const c of visibleCaches()) {
    const food = FOOD_BY_ID[c.food] || FOOD_BY_ID.other;
    L.marker([c.lat, c.lng], { icon: pinIcon(food), title: c.title || food.name })
      .on('click', () => openDetail(c.id))
      .addTo(cacheLayer);
  }
}

// ---------- List view ----------
function renderList() {
  state.view = 'list';
  state.openId = null;
  const ref = reference();
  const items = visibleCaches()
    .map(c => ({ c, d: distanceMeters(ref, c) }))
    .sort((a, b) => a.d - b.d);

  const where = state.me ? 'from you' : 'from the map center';
  let html = `<h2>Nearby caches</h2>
    <p class="sub">${items.length} ${items.length === 1 ? 'cache' : 'caches'}${items.length ? `, closest first (distance ${where})` : ''}</p>`;

  if (!items.length) {
    const filtered = state.caches.length > 0;
    html += `<div class="empty"><span class="big">🌱</span>
      ${filtered
        ? 'No caches match these filters.'
        : 'No caches yet. Know a wild blackberry patch or an apple tree on public land? Tap <b>Add a cache</b> to share it.'}
    </div>`;
  } else {
    html += '<ul class="cache-list">' + items.map(({ c, d }) => {
      const food = FOOD_BY_ID[c.food] || FOOD_BY_ID.other;
      const last = c.logs[0];
      const status = last
        ? `<span class="badge ${STATUS[last.status].cls}">${STATUS[last.status].label}</span> ${timeAgo(last.at)}`
        : (inSeason(food) ? '<span class="badge ripe">In season</span>' : `Season: ${seasonLabel(food)}`);
      return `<li><button class="cache-item" data-id="${c.id}">
        <span class="icon">${foodIcon(food, 26)}</span>
        <span class="text">
          <span class="title">${esc(c.title || food.name)}</span>
          <span class="meta">${esc(food.name)} · ${status}</span>
        </span>
        <span class="dist">${formatDistance(d)}</span>
      </button></li>`;
    }).join('') + '</ul>';
  }
  sheetBody.innerHTML = html;
}

sheetBody.addEventListener('click', e => {
  const item = e.target.closest('.cache-item');
  if (item) openDetail(item.dataset.id);
});

// ---------- Detail view ----------
function openDetail(id) {
  const c = state.caches.find(x => x.id === id);
  if (!c) return renderList();
  state.view = 'detail';
  state.openId = id;
  const food = FOOD_BY_ID[c.food] || FOOD_BY_ID.other;
  const dist = state.me ? `${formatDistance(distanceMeters(state.me, c))} away` : '';
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}&travelmode=walking`;

  const logs = c.logs.length
    ? '<ul class="logs">' + c.logs.map(l => `<li>
        <span class="badge ${STATUS[l.status].cls}">${STATUS[l.status].label}</span>
        <span class="when">${timeAgo(l.at)}</span>
        ${l.note ? `<span class="lognote">${esc(l.note)}</span>` : ''}
      </li>`).join('') + '</ul>'
    : '<p class="sub">No visits logged yet. Be the first to check on it.</p>';

  sheetBody.innerHTML = `
    <button class="back-btn" id="backBtn">← All caches</button>
    <div class="detail-head">
      <span class="icon">${foodIcon(food, 34)}</span>
      <div>
        <h2>${esc(c.title || food.name)}</h2>
        <p class="sub" style="margin:0">${esc(food.name)}${dist ? ' · ' + dist : ''}</p>
      </div>
    </div>
    <div class="facts">
      <span class="badge ${inSeason(food) ? 'ripe' : ''}">${inSeason(food) ? 'In season' : 'Out of season'} · ${seasonLabel(food)}</span>
      ${c.access ? `<span class="badge">${esc(ACCESS[c.access] || c.access)}</span>` : ''}
      <span class="badge">Added ${timeAgo(c.createdAt)}</span>
    </div>
    ${food.warning ? `<div class="warning-box">⚠️ ${esc(food.warning)}</div>` : ''}
    ${c.notes ? `<p class="notes">${esc(c.notes)}</p>` : ''}
    <div class="actions">
      <a class="btn primary" href="${directions}" target="_blank" rel="noopener">🧭 Directions</a>
      <button class="btn" id="logBtn">✅ Log a visit</button>
      ${c.mine ? '<button class="btn danger" id="deleteBtn">Delete</button>' : ''}
    </div>
    <div id="logFormSlot"></div>
    <h3 style="margin:16px 0 4px;font-size:16px">Visits</h3>
    ${logs}`;

  $('backBtn').onclick = () => { renderList(); };
  $('logBtn').onclick = () => showLogForm(c.id);
  if (c.mine) $('deleteBtn').onclick = async () => {
    if (!confirm('Delete this cache? This cannot be undone.')) return;
    await deleteCache(c.id);
    await reload();
    renderList();
    toast('Cache deleted');
  };

  setSheet(true);
  focusOn(c.lat, c.lng);
}

function showLogForm(id) {
  const slot = $('logFormSlot');
  if (slot.innerHTML) { slot.innerHTML = ''; return; }
  slot.innerHTML = `<form class="form" id="logForm">
    <div class="status-pick" role="radiogroup" aria-label="How was it?">
      ${Object.entries(STATUS).map(([k, s], i) =>
        `<label><input type="radio" name="status" value="${k}" ${i === 0 ? 'checked' : ''}><span>${s.label}</span></label>`).join('')}
    </div>
    <label>Note <span class="hint">Optional. e.g. "Best ones are on the north side."</span>
      <textarea name="note" maxlength="500"></textarea>
    </label>
    <button class="btn primary" type="submit">Save visit</button>
  </form>`;
  $('logForm').onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await addLog(id, { status: fd.get('status'), note: fd.get('note').trim() });
    await reload();
    openDetail(id);
    toast('Visit logged. Thanks for checking!');
  };
}

// ---------- Add a cache ----------
function startAdd() {
  state.view = 'add';
  document.body.classList.add('adding');
  const start = state.me || map.getCenter();
  const foodId = state.selectedFoods.size === 1 ? [...state.selectedFoods][0] : 'blackberry';

  if (newMarker) newMarker.remove();
  newMarker = L.marker([start.lat, start.lng], { draggable: true, icon: pinIcon(FOOD_BY_ID[foodId], 'new'), zIndexOffset: 1000 })
    .addTo(map);
  focusOn(start.lat, start.lng, Math.max(map.getZoom(), 17));

  sheetBody.innerHTML = `
    <button class="back-btn" id="cancelAdd">← Cancel</button>
    <h2>Add a cache</h2>
    <p class="sub">${state.me ? 'The pin is on your location.' : 'The pin is at the map center.'} Drag it, or tap the map, to put it right on the plant.</p>
    <form class="form" id="addForm">
      <label>What's growing?
        <select name="food" id="foodSelect">
          ${FOODS.map(f => `<option value="${f.id}" ${f.id === foodId ? 'selected' : ''}>${f.icon === 'berry' ? '🫐' : f.icon} ${esc(f.name)}</option>`).join('')}
        </select>
      </label>
      <label>Name <span class="hint">Optional. e.g. "Blackberry wall behind the library"</span>
        <input name="title" maxlength="80" autocomplete="off">
      </label>
      <label>Where is it?
        <select name="access">
          ${Object.entries(ACCESS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
        </select>
      </label>
      <label>Tips for finders <span class="hint">How to spot it, best side to pick from, anything to watch out for.</span>
        <textarea name="notes" maxlength="1000"></textarea>
      </label>
      <button class="btn primary" type="submit">Save cache</button>
      <p class="etiquette">Only share spots on public land or where the owner has said yes. Leave plenty for others and for wildlife, and never eat anything you can't identify.</p>
    </form>`;

  $('foodSelect').onchange = e => newMarker.setIcon(pinIcon(FOOD_BY_ID[e.target.value], 'new'));
  $('cancelAdd').onclick = endAdd;
  $('addForm').onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const pos = newMarker.getLatLng();
    const cache = await addCache({
      food: fd.get('food'),
      title: fd.get('title').trim(),
      notes: fd.get('notes').trim(),
      access: fd.get('access'),
      lat: pos.lat,
      lng: pos.lng,
    });
    endAdd();
    await reload();
    openDetail(cache.id);
    toast('Cache saved!');
  };
  setSheet(true);
}

function endAdd() {
  document.body.classList.remove('adding');
  if (newMarker) { newMarker.remove(); newMarker = null; }
  renderList();
  setSheet(false);
}

map.on('click', e => {
  if (state.view === 'add' && newMarker) newMarker.setLatLng(e.latlng);
});

$('addBtn').onclick = startAdd;
$('sheetHandle').onclick = () => setSheet(!sheet.classList.contains('expanded'));

// ---------- GPS ----------
function onPosition(pos) {
  const { latitude: lat, longitude: lng, accuracy } = pos.coords;
  state.me = { lat, lng, accuracy };
  if (!meMarker) {
    meMarker = L.marker([lat, lng], {
      icon: L.divIcon({ className: '', html: '<div class="me-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }),
      interactive: false, zIndexOffset: 500,
    }).addTo(map);
    meCircle = L.circle([lat, lng], { radius: accuracy, color: '#1a73e8', weight: 1, fillOpacity: .08, interactive: false }).addTo(map);
  } else {
    meMarker.setLatLng([lat, lng]);
    meCircle.setLatLng([lat, lng]).setRadius(accuracy);
  }
  $('locateBtn').classList.add('tracking');
  if (state.firstFix) {
    state.firstFix = false;
    map.setView([lat, lng], 15);
  }
  if (state.view === 'list') renderList();
}

function onPositionError(err) {
  $('locateBtn').classList.remove('tracking');
  const msg = err.code === 1
    ? 'Location is blocked. Allow it in your browser to see caches near you.'
    : 'Couldn\'t find your location yet.';
  toast(msg);
}

function startGps() {
  if (!('geolocation' in navigator)) {
    toast('This browser can\'t share your location.');
    return;
  }
  navigator.geolocation.watchPosition(onPosition, onPositionError, {
    enableHighAccuracy: true, maximumAge: 10000, timeout: 20000,
  });
}

$('locateBtn').onclick = () => {
  if (state.me) map.setView([state.me.lat, state.me.lng], Math.max(map.getZoom(), 16));
  else { state.firstFix = true; startGps(); }
};

map.on('moveend', () => {
  if (state.view === 'list' && !state.me) renderList();
});

// ---------- Start ----------
async function reload() {
  state.caches = await listCaches();
  renderMarkers();
}

renderChips();
await reload();
renderList();
startGps();
