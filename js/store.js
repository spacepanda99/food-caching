// Cache storage. For now everything lives in this browser (localStorage).
// The functions are async so a shared online database can replace this
// file later without changing the rest of the app.
const KEY = 'foodcaching.caches.v1';

function read() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function write(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export async function listCaches() {
  return read();
}

export async function addCache({ food, title, notes, access, lat, lng }) {
  const cache = {
    id: newId(),
    food, title, notes, access,
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
    createdAt: new Date().toISOString(),
    mine: true,
    logs: [],
  };
  const list = read();
  list.push(cache);
  write(list);
  return cache;
}

export async function addLog(cacheId, { status, note }) {
  const list = read();
  const cache = list.find(c => c.id === cacheId);
  if (!cache) throw new Error('Cache not found');
  cache.logs.unshift({ status, note, at: new Date().toISOString() });
  write(list);
  return cache;
}

export async function deleteCache(cacheId) {
  write(read().filter(c => c.id !== cacheId));
}
