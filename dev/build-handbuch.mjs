// Baut das Handbuch im Stil der App:
//   1. Bildschirmfotos der App mit Beispieldaten (iPhone-Größe) nach handbuch/img/
//   2. handbuch/handbuch.html als PDF nach "Ammo Tracker Handbuch.pdf"
// Voraussetzung: lokaler Server läuft (python -m http.server 8765 --bind 127.0.0.1)
// Aufruf: node dev/build-handbuch.mjs          (beides)
//         node dev/build-handbuch.mjs pdf      (nur PDF)
import { writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const BASE = 'http://127.0.0.1:8765/';
const PORT = 9333;
const root = fileURLToPath(new URL('../', import.meta.url));
const imgDir = root + 'handbuch/img/';
const profile = fileURLToPath(new URL('./.handbuch-profile/', import.meta.url));
const only = process.argv[2];

const browsers = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
];
const browser = browsers.find((b) => existsSync(b));
if (!browser) throw new Error('Kein Edge/Chrome gefunden');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- Browser fernsteuern (Chrome DevTools Protocol) -----------------------
rmSync(profile, { recursive: true, force: true });
const proc = spawn(browser, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream',
  '--hide-scrollbars', '--no-first-run', '--lang=de-DE', 'about:blank',
], { stdio: 'ignore' });

let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    target = list.find((t) => t.type === 'page');
  } catch { /* Browser startet noch */ }
}
if (!target) throw new Error('Browser antwortet nicht');

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let seq = 0;
const pending = new Map();
const waiters = [];
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? reject(new Error(m.error.message)) : resolve(m.result);
  } else if (m.method) {
    for (const w of waiters.filter((x) => x.method === m.method)) { waiters.splice(waiters.indexOf(w), 1); w.resolve(m.params); }
  }
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++seq;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
});
const once = (method) => new Promise((resolve) => waiters.push({ method, resolve }));

async function js(expression) {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}
async function goto(url) {
  const loaded = once('Page.loadEventFired');
  await send('Page.navigate', { url });
  await loaded;
  await sleep(600);
}

await send('Page.enable');
await send('Runtime.enable');

// ---- 1. Bildschirmfotos ---------------------------------------------------
async function shot(name) {
  await js('document.activeElement?.blur?.()');
  await sleep(450);
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(imgDir + name + '.png', Buffer.from(data, 'base64'));
  console.log('Foto:', name);
}
const click = (sel) => js(`document.querySelector(${JSON.stringify(sel)}).click()`);
const closeSheet = async () => { await js(`document.querySelector('dialog[open]')?.close()`); await sleep(300); };
const tab = async (id) => { await js(`document.querySelector('[data-tab="${id}"]').click()`); await sleep(500); };
// Feld im offenen Formular setzen, als hätte man getippt
const fill = (name, value) => js(`(() => { const i = document.querySelector('dialog[open] [name="${name}"]'); i.value = ${JSON.stringify(String(value))}; i.dispatchEvent(new Event('input', { bubbles: true })); })()`);

// Gültige EAN-13 aus 12 Ziffern
function ean(d12) {
  let sum = 0;
  [...d12].reverse().forEach((n, i) => { sum += Number(n) * (i % 2 === 0 ? 3 : 1); });
  return d12 + ((10 - (sum % 10)) % 10);
}
const KNOWN = ean('400659212345');
const UNKNOWN = ean('859400112233');

// Beispieldaten: drei Kaliber, drei Waffen, Einkäufe und Trainings der letzten Monate
const SEED = `(async () => {
  const S = await import('/js/store.js');
  const save = (store, o) => S.save(store, o);
  const c308 = S.caliber('c-308');
  await save('calibers', { ...c308, minStock: 500 });
  const L = {};
  const load = async (key, o) => { L[key] = (await save('loads', { archived: false, minStock: 0, ...o })).id; };
  await load('geco9', { caliberId: 'c-9luger', maker: 'Geco', name: 'FMJ', grain: 124 });
  await load('sb9', { caliberId: 'c-9luger', maker: 'S&B', name: 'FMJ', grain: 115 });
  await load('geco308', { caliberId: 'c-308', maker: 'Geco', name: 'Target', grain: 170 });
  await load('norma308', { caliberId: 'c-308', maker: 'Norma', name: 'Match', grain: 168 });
  await load('rws22', { caliberId: 'c-22lr', maker: 'RWS', name: 'Target Rifle', grain: 40 });
  const buy = (k, date, qty, totalPrice, dealer) => save('purchases', { loadId: L[k], date, qty, totalPrice, dealer, note: '' });
  await buy('geco9', '2026-06-02', 1000, 0, 'Anfangsbestand');
  await buy('sb9', '2026-06-02', 500, 140, 'Anfangsbestand');
  await buy('rws22', '2026-06-02', 1500, 195, 'Anfangsbestand');
  await buy('geco308', '2026-06-02', 300, 345, 'Anfangsbestand');
  await buy('norma308', '2026-07-12', 200, 398, 'Frankonia');
  await buy('geco9', '2026-08-20', 1000, 289, 'Waffen Ostertag');
  await buy('rws22', '2026-10-05', 500, 69, 'Frankonia');
  await buy('geco9', '2026-11-08', 500, 149, 'Frankonia');
  const F = {};
  const gun = async (k, o) => { F[k] = (await save('firearms', { startCount: 0, serviceInterval: 0, serviceAt: 0, note: '', ...o })).id; };
  await gun('glock', { name: 'Glock 17', caliberId: 'c-9luger', startCount: 4200, serviceInterval: 2000, serviceAt: 4000 });
  await gun('tikka', { name: 'Tikka T3x', caliberId: 'c-308', startCount: 650 });
  await gun('cz', { name: 'CZ 457', caliberId: 'c-22lr', startCount: 1800, serviceInterval: 1500, serviceAt: 1800 });
  const strings = (list, day) => list.map(([g, l, q], i) => ({ id: 's' + day + i, time: day + 'T19:' + String(10 + i * 4).padStart(2, '0'), firearmId: F[g], loadId: L[l], qty: q }));
  const sess = (day, range, list) => save('sessions', { start: day + 'T19:00', end: day + 'T21:00', range, status: 'done', strings: strings(list, day) });
  await sess('2026-06-14', 'SV Tell', [['glock', 'geco9', 50], ['glock', 'geco9', 50], ['cz', 'rws22', 100]]);
  await sess('2026-07-05', 'SV Tell', [['glock', 'sb9', 50], ['glock', 'geco9', 100], ['tikka', 'geco308', 20]]);
  await sess('2026-07-26', 'Schießstand Nord', [['tikka', 'norma308', 30], ['tikka', 'geco308', 30]]);
  await sess('2026-08-23', 'SV Tell', [['glock', 'geco9', 150], ['cz', 'rws22', 150]]);
  await sess('2026-09-13', 'SV Tell', [['glock', 'geco9', 100], ['glock', 'sb9', 50], ['cz', 'rws22', 100]]);
  await sess('2026-10-11', 'Schießstand Nord', [['tikka', 'geco308', 50], ['tikka', 'norma308', 20], ['glock', 'geco9', 100]]);
  await sess('2026-10-25', 'SV Tell', [['glock', 'geco9', 150], ['cz', 'rws22', 200]]);
  await sess('2026-11-15', 'SV Tell', [['glock', 'geco9', 100], ['glock', 'sb9', 50], ['tikka', 'geco308', 50], ['tikka', 'norma308', 50]]);
  await save('adjustments', { loadId: L.sb9, date: '2026-10-01', delta: -10, note: 'Inventur' });
  await save('packs', { id: 'ean:${KNOWN}', code: '${KNOWN}', kind: 'ean', loadId: L.geco9, perPack: 50, packPrice: 14.9, ambiguous: false });
  await S.setSetting('myCalibers', ['c-9luger', 'c-308', 'c-22lr']);
  await S.setSetting('lastBackup', new Date().toISOString());
  await S.setSetting('lastDealer', 'Frankonia');
  await S.setSetting('lastRange', 'SV Tell');
  await S.setSetting('lastFirearm', F.glock);
  await S.setSetting('lastLoad', L.geco9);
  await S.setSetting('lastLoadByFirearm', { [F.glock]: L.geco9, [F.tikka]: L.geco308, [F.cz]: L.rws22 });
  return { L, F };
})()`;

if (!only) {
  mkdirSync(imgDir, { recursive: true });
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }, { name: 'prefers-color-scheme', value: 'dark' }] });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await goto(BASE);
  const ids = await js(SEED);
  await goto(BASE);

  // Bestand etwas höher, damit alle Sorten zu sehen sind
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 1010, deviceScaleFactor: 2, mobile: true });
  await sleep(300);
  await shot('bestand');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await click('[data-action="editCalMin"][data-id="c-308"]');
  await shot('mindestbestand');
  await closeSheet();
  await click(`[data-action="openLoad"][data-id="${ids.L.geco9}"]`);
  await shot('sorte');
  await closeSheet();

  // Scanner: Kamera (simuliert), dann Nummer eintippen
  await click('[data-action="scan"]');
  await sleep(1500);
  // Statt des Testbilds der simulierten Kamera eine gezeichnete Packung mit Strichcode zeigen
  await js(`(() => {
    const c = document.createElement('canvas'); c.width = 1080; c.height = 1920;
    const g = c.getContext('2d');
    const bg = g.createLinearGradient(0, 0, 0, 1920); bg.addColorStop(0, '#3b3026'); bg.addColorStop(1, '#1f1914');
    g.fillStyle = bg; g.fillRect(0, 0, 1080, 1920);
    g.fillStyle = '#c8a46a'; g.fillRect(90, 380, 900, 1160);
    g.fillStyle = '#7a1f1a'; g.fillRect(90, 380, 900, 220);
    g.fillStyle = '#f3ecdf'; g.font = 'bold 120px Bahnschrift, Arial'; g.fillText('9 mm LUGER', 150, 530);
    g.fillStyle = '#2a2118'; g.font = '64px Bahnschrift, Arial'; g.fillText('FMJ 124 gr  ·  50 Patronen', 150, 1220);
    g.fillStyle = '#fff'; g.fillRect(200, 690, 680, 360);
    g.fillStyle = '#111';
    const code = '${KNOWN}'; let x = 240;
    for (let i = 0; i < 95; i++) { const w = ((i * 7 + Number(code[i % 13])) % 3) + 2; if (i % 2 === 0) g.fillRect(x, 715, w * 2, 250); x += w * 2 + 1; if (x > 840) break; }
    g.font = '44px Consolas, monospace'; g.fillText(code.split('').join(' '), 250, 1020);
    const v = document.querySelector('dialog.scanner video');
    const draw = () => { g.drawImage(c, 0, 0); };
    v.srcObject = c.captureStream(10); v.play(); setInterval(draw, 100);
  })()`);
  await sleep(1200);
  await shot('scanner');
  await js(`document.querySelector('dialog.scanner [data-act="type"]').click()`);
  await sleep(500);
  await fill('code', UNKNOWN);
  await js(`document.querySelector('dialog[open] form').requestSubmit()`);
  await sleep(500);
  await fill('perPack', 50);
  await shot('neue-packung');
  await closeSheet();

  await click('[data-action="scan"]');
  await sleep(800);
  await js(`document.querySelector('dialog.scanner [data-act="type"]').click()`);
  await sleep(500);
  await fill('code', KNOWN);
  await js(`document.querySelector('dialog[open] form').requestSubmit()`);
  await sleep(500);
  await fill('count', 5);
  await shot('buchen');
  await closeSheet();

  await tab('history');
  await shot('verlauf');
  await tab('firearms');
  await shot('waffen');
  await tab('more');
  await shot('mehr');
  await js(`[...document.querySelectorAll('h2, h3')].find((h) => /Sicherung/.test(h.textContent))?.scrollIntoView({ block: 'start' })`);
  await shot('sicherung');

  // Laufendes Training
  await js(`(async () => {
    const S = await import('/js/store.js');
    const L = ${JSON.stringify(ids.L)}, F = ${JSON.stringify(ids.F)};
    const d = '2026-11-24';
    await S.save('sessions', { start: d + 'T18:30', end: null, range: 'SV Tell', status: 'active', currentFirearm: F.glock, currentLoad: L.geco9,
      strings: [25, 25, 50, 25].map((q, i) => ({ id: 'a' + i, time: d + 'T18:' + (35 + i * 6), firearmId: F.glock, loadId: L.geco9, qty: q })) });
  })()`);
  await tab('training');
  await shot('training');
  await js(`[...document.querySelectorAll('[data-action]')].find((b) => /beenden/i.test(b.textContent))?.click()`);
  await sleep(600);
  await shot('training-ende');
  await closeSheet();
}

// ---- Vorschau: jede Seite als Bild (node dev/build-handbuch.mjs vorschau) ----
if (only === 'vorschau') {
  const dir = fileURLToPath(new URL('./.handbuch-vorschau/', import.meta.url));
  mkdirSync(dir, { recursive: true });
  await send('Emulation.setDeviceMetricsOverride', { width: 900, height: 1200, deviceScaleFactor: 1, mobile: false });
  await goto(BASE + 'handbuch/handbuch.html?druck');
  const rects = await js(`[...document.querySelectorAll('.page')].map((p) => { const r = p.getBoundingClientRect(); return { x: r.x, y: r.y + scrollY, width: r.width, height: r.height }; })`);
  for (const [i, r] of rects.entries()) {
    const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { ...r, scale: 0.9 } });
    writeFileSync(`${dir}seite-${String(i + 1).padStart(2, '0')}.png`, Buffer.from(data, 'base64'));
  }
  console.log('Vorschau:', rects.length, 'Seiten');
}

// ---- 2. PDF --------------------------------------------------------------
await send('Emulation.clearDeviceMetricsOverride');
await send('Emulation.setEmulatedMedia', { media: 'print' });
await goto(BASE + 'handbuch/handbuch.html?druck');
await js('document.fonts.ready.then(() => true)');
const { data } = await send('Page.printToPDF', { preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false });
// Ist das PDF gerade in einem Programm geöffnet, unter Ausweichnamen speichern
let pdfName = 'Ammo Tracker Handbuch.pdf';
try {
  writeFileSync(root + pdfName, Buffer.from(data, 'base64'));
} catch (err) {
  if (err.code !== 'EBUSY' && err.code !== 'EPERM') throw err;
  pdfName = 'Ammo Tracker Handbuch (neu).pdf';
  writeFileSync(root + pdfName, Buffer.from(data, 'base64'));
  console.log('Hinweis: Das alte PDF ist geöffnet, das neue heißt deshalb anders.');
}
console.log('PDF:', pdfName);

ws.close();
proc.kill();
await sleep(500);
rmSync(profile, { recursive: true, force: true });
