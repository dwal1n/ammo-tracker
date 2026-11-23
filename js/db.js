// Kleiner Wrapper um IndexedDB. Alle Daten bleiben im Browser-Speicher des Geräts.
import { STORES, SCHEMA_VERSION } from './model.js';

const DB_NAME = 'ammo-tracker';
let dbp = null;

function req(r) {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, SCHEMA_VERSION);
    r.onupgradeneeded = () => {
      const db = r.result;
      for (const s of STORES) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' });
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  return dbp;
}

async function tx(stores, mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(stores, mode);
    let out;
    Promise.resolve(fn(t)).then((v) => { out = v; });
    t.oncomplete = () => resolve(out);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export async function getAll(store) {
  const db = await open();
  return req(db.transaction(store).objectStore(store).getAll());
}

export function put(store, obj) {
  return tx([store], 'readwrite', (t) => { t.objectStore(store).put(obj); });
}

export function remove(store, id) {
  return tx([store], 'readwrite', (t) => { t.objectStore(store).delete(id); });
}

export async function getMeta(key) {
  const db = await open();
  const row = await req(db.transaction('meta').objectStore('meta').get(key));
  return row ? row.value : undefined;
}

export function setMeta(key, value) {
  return tx(['meta'], 'readwrite', (t) => { t.objectStore('meta').put({ key, value }); });
}

export async function loadAll() {
  const out = {};
  for (const s of STORES) out[s] = await getAll(s);
  return out;
}

// Ersetzt alle Daten in einem Schritt (Import oder „Alles löschen“)
export function replaceAll(data) {
  return tx([...STORES], 'readwrite', (t) => {
    for (const s of STORES) {
      const os = t.objectStore(s);
      os.clear();
      for (const row of data[s] || []) os.put(row);
    }
  });
}
