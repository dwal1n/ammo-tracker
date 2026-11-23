// Zentraler Zustand der App: alle Daten im Speicher, jede Änderung sofort in IndexedDB.
import * as db from './db.js';
import { DEFAULT_CALIBERS, FAMILY_LABELS } from './calibers.js';
import { cartridgeSVG } from './cartridge-svg.js';
import { stockByLoad, avgPrice, STORES, newId } from './model.js';
import { nowLocal } from './ui.js';

const DEFAULT_SETTINGS = {
  cartridgeStyle: 'real',
  theme: 'dark',
  lastRange: '',
  lastFirearm: '',
  lastLoad: '',
  lastLoadByFirearm: {},
  lastBackup: null,
  myCalibers: [],
};

export const state = {
  calibers: [], loads: [], purchases: [], adjustments: [], firearms: [], sessions: [],
  settings: { ...DEFAULT_SETTINGS },
  tab: 'stock',
  // Einmal-Effekte für Animationen: { introDone, stockBefore: Map }
  fx: { introDone: false, stockBefore: null },
};

let renderFn = () => {};
export const onRender = (fn) => { renderFn = fn; };
export const render = () => renderFn();

export async function init() {
  await db.open();
  Object.assign(state, await db.loadAll());
  state.settings = { ...DEFAULT_SETTINGS, ...((await db.getMeta('settings')) || {}) };
  // Vorgabe-Kaliber beim ersten Start anlegen, später fehlende ergänzen
  const have = new Set(state.calibers.map((c) => c.id));
  for (const c of DEFAULT_CALIBERS) {
    if (!have.has(c.id)) {
      const row = { ...c, custom: false };
      state.calibers.push(row);
      await db.put('calibers', row);
    }
  }
}

// ---- Lesen ---------------------------------------------------------------

const byId = (arr, id) => arr.find((x) => x.id === id);
export const caliber = (id) => byId(state.calibers, id);
export const load = (id) => byId(state.loads, id);
export const firearm = (id) => byId(state.firearms, id);
export const activeSession = () => state.sessions.find((s) => s.status === 'active');
export const stock = () => stockByLoad(state);
export const price = (loadId) => avgPrice(loadId, state.purchases);

export function loadLabel(l) {
  if (!l) return 'Unbekannte Sorte';
  const parts = [l.maker, l.name].filter(Boolean).join(' ');
  return [parts || 'Ohne Namen', l.grain ? `${String(l.grain).replace('.', ',')} gr` : ''].filter(Boolean).join(' ');
}

// „Meine Kaliber“: ausgewählte, plus alle, die schon benutzt werden (und das gerade gewählte)
export function visibleCalibers(keepId) {
  const mine = state.settings.myCalibers || [];
  if (!mine.length) return state.calibers;
  const keep = new Set([...mine, keepId,
    ...state.loads.map((l) => l.caliberId), ...state.firearms.map((f) => f.caliberId)]);
  return state.calibers.filter((c) => keep.has(c.id));
}

export function defaultCaliber() {
  const vis = visibleCalibers();
  const last = state.settings.lastCaliber;
  if (vis.some((c) => c.id === last)) return last;
  return (vis.find((c) => c.id === 'c-9luger') || vis[0])?.id;
}

export function caliberOptions(keepId) {
  const order = Object.keys(FAMILY_LABELS);
  return visibleCalibers(keepId)
    .slice()
    .sort((a, b) => order.indexOf(a.family) - order.indexOf(b.family) || a.name.localeCompare(b.name, 'de'))
    .map((c) => ({ value: c.id, label: c.name, group: c.custom ? 'Eigene Kaliber' : FAMILY_LABELS[c.family] }));
}

// Patronenbild im gewählten Stil; Sorte kann Geschossform und Hülsenfarbe überschreiben
export function cart(cal, opts = {}, ld = null) {
  if (!cal) return '';
  return cartridgeSVG(cal, {
    style: state.settings.cartridgeStyle,
    bullet: ld?.bulletType || undefined,
    caseColor: ld?.caseColor || undefined,
    dims: opts.dims ?? false,
    ...opts,
  });
}

// ---- Schreiben -----------------------------------------------------------

export async function save(store, obj) {
  if (!obj.id) obj.id = newId();
  await db.put(store, obj);
  const arr = state[store];
  const i = arr.findIndex((x) => x.id === obj.id);
  if (i >= 0) arr[i] = obj; else arr.push(obj);
  return obj;
}

export async function remove(store, id) {
  await db.remove(store, id);
  state[store] = state[store].filter((x) => x.id !== id);
}

export async function setSetting(key, value) {
  state.settings[key] = value;
  await db.setMeta('settings', state.settings);
}

// Merkt sich den Bestand vor einer Änderung, damit die Ansicht danach hochzählen kann
export function markStockChange() {
  state.fx.stockBefore = stock();
}

export async function replaceAll(data, settings) {
  await db.replaceAll(data);
  for (const s of STORES) state[s] = data[s] || [];
  if (settings) {
    state.settings = { ...DEFAULT_SETTINGS, ...settings };
    await db.setMeta('settings', state.settings);
  }
  await init();
}

export function exportData() {
  const data = {};
  for (const s of STORES) data[s] = state[s];
  return { app: 'ammo-tracker', schemaVersion: 1, exported: nowLocal(), settings: state.settings, data };
}
