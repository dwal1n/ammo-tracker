// Erzeugt die Inhalte der Stilvorschau als HTML-Strings (läuft im Browser und in Node).
import { DEFAULT_CALIBERS, FAMILY_LABELS, BULLET_LABELS } from '../js/calibers.js';
import { cartridgeSVG } from '../js/cartridge-svg.js';

const byId = Object.fromEntries(DEFAULT_CALIBERS.map((c) => [c.id, c]));
const fmt = (n) => n.toLocaleString('de-DE');
const eur = (n) => n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
const tabbar = (on) => `<nav class="tabbar">${[['▤', 'Bestand'], ['◎', 'Training'], ['▥', 'Verlauf'], ['⌖', 'Waffen'], ['⚙', 'Mehr']]
  .map(([i, t]) => `<span class="${t === on ? 'on' : ''}"><i>${i}</i>${t}</span>`).join('')}</nav>`;

export function renderSections() {
  // Kalibertafel
  const board = Object.keys(FAMILY_LABELS).map((fam) => `<div class="group">${DEFAULT_CALIBERS
    .filter((c) => c.family === fam)
    .map((c) => `<figure>${cartridgeSVG(c, { scale: 3.2, shadow: true })}<figcaption>${c.name}</figcaption></figure>`)
    .join('')}</div>`).join('');

  // Geschossformen
  const demo = [['c-9luger', 'fmj'], ['c-9luger', 'hp'], ['c-38spl', 'lead'], ['c-32swl', 'wc'], ['c-308', 'spitzer']];
  const types = demo.map(([id, b]) =>
    `<figure>${cartridgeSVG(byId[id], { scale: 5, bullet: b, shadow: true })}<figcaption>${BULLET_LABELS[b]}</figcaption></figure>`).join('');

  // Bestand
  const stock = [
    { id: 'c-9luger', loads: [['Geco FMJ 124 gr', 1000, 0.27], ['S&B FMJ 115 gr', 240, 0.31]], min: 300 },
    { id: 'c-22lr', loads: [['RWS Target Rifle', 350, 0.12]], min: 500 },
    { id: 'c-38spl', loads: [['Geco LRN 158 gr', 150, 0.42]], min: 100 },
    { id: 'c-223', loads: [['PPU FMJ 55 gr', 180, 0.55]], min: 100 },
    { id: 'c-12-70', loads: [['Rottweil Trap 24 g', 75, 0.39]], min: 50 },
  ];
  const total = (s) => s.loads.reduce((a, l) => a + l[1], 0);
  const phoneStock = `
  <div class="status"></div>
  <header><span class="label">Bestand</span><button aria-label="Hinzufügen">+</button></header>
  <div class="parade">${stock.map((s) => {
    const low = total(s) < s.min;
    return `<div class="parade-item ${low ? 'low' : ''}">${cartridgeSVG(byId[s.id], { scale: 2.4 })}<span class="num">${fmt(total(s))}</span></div>`;
  }).join('')}</div>
  ${stock.slice(0, 4).map((s) => {
    const c = byId[s.id], t = total(s), low = t < s.min;
    return `<div class="stock-row ${low ? 'low' : ''}">
      <div class="thumb">${cartridgeSVG(c, { height: 60 })}</div>
      <div class="label name">${c.name}${low ? '<span class="badge-low">unter ' + fmt(s.min) + '</span>' : ''}</div>
      <div class="num total">${fmt(t)}<small>Schuss</small></div>
      <div class="loads">${s.loads.map((l) => `<div class="load"><span>${l[0]}</span><span class="q">${fmt(l[1])}</span><span class="p">${eur(l[2])}</span></div>`).join('')}</div>
    </div>`;
  }).join('')}
  ${tabbar('Bestand')}`;

  // Training
  const strings = [[25, '18:42'], [25, '18:51'], [15, '19:03']];
  const phoneTrain = `
  <div class="status"></div>
  <header><span class="label">Training</span><span class="muted" style="font-size:14px">seit 18:35, SV Musterstadt</span></header>
  <div class="counter"><div class="num">65</div><div class="sub">Schuss heute, ${eur(65 * 0.27)}</div></div>
  <div class="chip-row">
    <button class="chip">${cartridgeSVG(byId['c-9luger'], { height: 34 })}<span><b>Glock 17</b>Geco FMJ 124 gr</span></button>
  </div>
  <div class="quick">${[5, 10, 15, 20, 25, 50].map((n) => `<button>${n}</button>`).join('')}</div>
  <div class="strings">${strings.slice().reverse().map((s, i) =>
    `<div class="string"><span class="n">${strings.length - i}.</span><span>Glock 17 um ${s[1]}</span><span class="num">${s[0]}</span></div>`).join('')}</div>
  <button class="finish">Training beenden</button>
  ${tabbar('Training')}`;

  return { board, types, 'p-stock': phoneStock, 'p-train': phoneTrain };
}
