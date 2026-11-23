// Erzeugt die App-Icons als PNG über einen lokalen Headless-Browser (Edge oder Chrome).
// Aufruf: node dev/build-icons.mjs
import { writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DEFAULT_CALIBERS } from '../js/calibers.js';
import { cartridgeSVG } from '../js/cartridge-svg.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const tmp = fileURLToPath(new URL('./.icon-tmp/', import.meta.url));
mkdirSync(tmp, { recursive: true });
mkdirSync(root + 'icons', { recursive: true });

const browsers = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
];
const browser = browsers.find((b) => existsSync(b));
if (!browser) throw new Error('Kein Edge/Chrome gefunden');

const cal = (id) => DEFAULT_CALIBERS.find((c) => c.id === id);

function iconHTML(size, maskable) {
  // Maßstab: .308 Win soll gut 60 % der Höhe einnehmen
  const s = (size * (maskable ? 0.5 : 0.6)) / 71.1;
  const carts = ['c-22lr', 'c-9luger', 'c-308'].map((id) => cartridgeSVG(cal(id), { style: 'real', scale: s })).join('');
  const shelf = Math.round(size * (maskable ? 0.74 : 0.79));
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;width:${size}px;height:${size}px;overflow:hidden}
    body{background:radial-gradient(circle at 50% 30%,#34404b 0%,#1f262e 55%,#141a20 100%);position:relative}
    .row{position:absolute;left:0;right:0;bottom:${size - shelf}px;display:flex;justify-content:center;align-items:flex-end;gap:${Math.round(size * 0.045)}px}
    .shelf{position:absolute;left:0;right:0;top:${shelf}px;height:${Math.round(size * 0.012)}px;background:linear-gradient(#d4a64a,#8a6420);opacity:.9}
    .shade{position:absolute;left:0;right:0;top:${shelf + Math.round(size * 0.012)}px;bottom:0;background:linear-gradient(#0d1115,#151b21)}
  </style></head><body><div class="row">${carts}</div><div class="shelf"></div><div class="shade"></div></body></html>`;
}

const out = [
  ['icon-512.png', 512, false],
  ['icon-192.png', 192, false],
  ['apple-touch-icon.png', 180, false],
  ['icon-maskable-512.png', 512, true],
];

for (const [name, size, maskable] of out) {
  const html = tmp + `${name}.html`;
  writeFileSync(html, iconHTML(size, maskable));
  execFileSync(browser, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    `--window-size=${size},${size}`, `--screenshot=${root}icons\\${name}`, pathToFileURL(html).href,
  ], { stdio: 'ignore' });
  console.log('erstellt:', name);
}
rmSync(tmp, { recursive: true, force: true });
