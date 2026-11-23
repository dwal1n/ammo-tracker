// Reine Rechenlogik ohne Browser-Abhängigkeiten (in Node testbar).

export const SCHEMA_VERSION = 1;
export const STORES = ['calibers', 'loads', 'purchases', 'adjustments', 'firearms', 'sessions'];

export function newId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

const doneStrings = (sessions) =>
  sessions.filter((s) => s.status === 'done').flatMap((s) => s.strings || []);

// Bestand je Sorte = Einkäufe + Korrekturen − Durchgänge abgeschlossener Trainings
export function stockByLoad({ loads = [], purchases = [], adjustments = [], sessions = [] }) {
  const m = new Map(loads.map((l) => [l.id, 0]));
  const add = (id, n) => m.set(id, (m.get(id) || 0) + n);
  for (const p of purchases) add(p.loadId, Number(p.qty) || 0);
  for (const a of adjustments) add(a.loadId, Number(a.delta) || 0);
  for (const s of doneStrings(sessions)) add(s.loadId, -(Number(s.qty) || 0));
  return m;
}

export function caliberTotals(data) {
  const stock = stockByLoad(data);
  const t = new Map();
  for (const l of data.loads || []) {
    t.set(l.caliberId, (t.get(l.caliberId) || 0) + (stock.get(l.id) || 0));
  }
  return t;
}

// Gewichteter Durchschnittspreis pro Schuss, null wenn kein Einkauf mit Preis
export function avgPrice(loadId, purchases = []) {
  let qty = 0, price = 0;
  for (const p of purchases) {
    if (p.loadId !== loadId || !(p.totalPrice > 0) || !(p.qty > 0)) continue;
    qty += Number(p.qty);
    price += Number(p.totalPrice);
  }
  return qty > 0 ? price / qty : null;
}

export function isLow(load, stock) {
  return (load.minStock || 0) > 0 && stock < load.minStock;
}

export function firearmCount(firearm, sessions = []) {
  let n = Number(firearm.startCount) || 0;
  for (const s of doneStrings(sessions)) if (s.firearmId === firearm.id) n += Number(s.qty) || 0;
  return n;
}

export function serviceDue(firearm, count) {
  const iv = Number(firearm.serviceInterval) || 0;
  if (!iv) return false;
  return count - (Number(firearm.serviceAt) || 0) >= iv;
}

export function sessionSummary(session, purchases = []) {
  const per = new Map();
  for (const s of session.strings || []) per.set(s.loadId, (per.get(s.loadId) || 0) + (Number(s.qty) || 0));
  const byLoad = [...per].map(([loadId, qty]) => {
    const price = avgPrice(loadId, purchases);
    return { loadId, qty, cost: price == null ? 0 : price * qty };
  });
  return {
    shots: byLoad.reduce((a, b) => a + b.qty, 0),
    cost: byLoad.reduce((a, b) => a + b.cost, 0),
    byLoad,
  };
}

const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

// Schuss, Schusskosten und Einkaufsausgaben je Monat, älteste zuerst
export function monthlyStats({ purchases = [], sessions = [] }, months = 12, now = new Date()) {
  const keys = [];
  for (let i = months - 1; i >= 0; i--) keys.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  const rows = new Map(keys.map((k) => [k, { month: k, shots: 0, cost: 0, spent: 0 }]));
  for (const s of sessions) {
    if (s.status !== 'done') continue;
    const r = rows.get(String(s.start).slice(0, 7));
    if (!r) continue;
    const sum = sessionSummary(s, purchases);
    r.shots += sum.shots;
    r.cost += sum.cost;
  }
  for (const p of purchases) {
    const r = rows.get(String(p.date).slice(0, 7));
    if (r) r.spent += Number(p.totalPrice) || 0;
  }
  return [...rows.values()];
}

// Zwei Datenstände zusammenführen (z. B. iPhone und iPad).
// a = dieses Gerät, b = eingelesene Datei; jeweils { data: { store: [rows] }, tombstones: { id: zeit } }
// Regeln: Vereinigung nach id; bei gleicher id gewinnt das neuere `updated`;
// ein Löschvermerk entfernt einen Eintrag, wenn er nicht später als der Eintrag ist.
export function mergeData(a, b) {
  const ts = (r) => String(r?.updated || '');
  const tombstones = { ...(a.tombstones || {}) };
  for (const [id, t] of Object.entries(b.tombstones || {})) {
    if (!tombstones[id] || t > tombstones[id]) tombstones[id] = t;
  }
  const stats = { added: 0, updated: 0, removed: 0 };
  const data = {};
  for (const s of STORES) {
    const local = new Map((a.data?.[s] || []).map((r) => [r.id, r]));
    const out = new Map(local);
    for (const r of b.data?.[s] || []) {
      const mine = out.get(r.id);
      if (!mine || ts(r) > ts(mine)) out.set(r.id, r);
    }
    for (const [id, r] of out) {
      const t = tombstones[id];
      if (t && t >= ts(r)) out.delete(id);
    }
    for (const [id, r] of out) {
      if (!local.has(id)) stats.added++;
      else if (local.get(id) !== r) stats.updated++;
    }
    for (const id of local.keys()) if (!out.has(id)) stats.removed++;
    data[s] = [...out.values()];
  }
  return { data, tombstones, stats };
}

export function validateBackup(obj) {
  const errors = [];
  if (!obj || typeof obj !== 'object' || obj.app !== 'ammo-tracker') {
    errors.push('Das ist keine Ammo-Tracker-Sicherung.');
  } else if (typeof obj.schemaVersion !== 'number' || obj.schemaVersion > SCHEMA_VERSION) {
    errors.push('Die Sicherung stammt aus einer neueren App-Version.');
  } else if (!obj.data || typeof obj.data !== 'object') {
    errors.push('Die Sicherung enthält keine Daten.');
  } else {
    for (const k of STORES) {
      if (obj.data[k] !== undefined && !Array.isArray(obj.data[k])) errors.push(`Bereich „${k}“ ist beschädigt.`);
    }
    if (obj.tombstones !== undefined && (typeof obj.tombstones !== 'object' || Array.isArray(obj.tombstones))) {
      errors.push('Die Löschvermerke in der Sicherung sind beschädigt.');
    }
  }
  return { ok: errors.length === 0, errors };
}
