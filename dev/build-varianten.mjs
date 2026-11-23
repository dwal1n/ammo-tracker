// Baut Varianten.html: drei Zeichenstile nebeneinander, ohne Skript. node dev/build-varianten.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { DEFAULT_CALIBERS } from '../js/calibers.js';
import { cartridgeSVG } from '../js/cartridge-svg.js';

const css = readFileSync(new URL('../css/app.css', import.meta.url), 'utf8');
const byId = Object.fromEntries(DEFAULT_CALIBERS.map((c) => [c.id, c]));
const pick = [
  ['c-9luger', 'fmj'], ['c-357', 'hp'], ['c-38spl', 'lead'], ['c-22lr', 'lead'],
  ['c-762x39', 'spitzer'], ['c-308', 'spitzer'], ['c-12-70', 'none'],
];

const styles = [
  ['classic', 'A: bisher', 'Flache Verläufe, sehr ruhig, wirkt eher wie ein Symbol.'],
  ['real', 'B: realistisch', 'Metallglanz mit zwei Lichtreflexen, Glanzlicht folgt der Geschossrundung, Schatten in Auszieherrille und am Hülsenmund, weicher Bodenschatten.'],
  ['line', 'C: technische Zeichnung', 'Bewusst nicht realistisch: Maßzeichnung wie im Wiederlade-Handbuch, mit Hülsen- und Gesamtlänge in mm.'],
];

const section = ([style, title, text]) => `
<section>
  <h2>${title}</h2>
  <p class="intro">${text}</p>
  <div class="board">${pick.map(([id, b]) =>
    `<figure>${cartridgeSVG(byId[id], { style, bullet: b, scale: 4.2, shadow: true })}<figcaption>${byId[id].name}</figcaption></figure>`).join('')}</div>
  <div class="mini">
    <span class="muted">In der Bestandsliste:</span>
    ${['c-9luger', 'c-22lr', 'c-308'].map((id) => `<div class="stock-row"><div class="thumb">${cartridgeSVG(byId[id], { style, height: 60, dims: false })}</div><div class="label name">${byId[id].name}</div><div class="num total">1.240<small>Schuss</small></div></div>`).join('')}
  </div>
</section>`;

const big = `
<section>
  <h2>Nahaufnahme</h2>
  <p class="intro">9 mm Luger in groß, links A, Mitte B, rechts C.</p>
  <div class="board">${styles.map(([style]) => `<figure>${cartridgeSVG(byId['c-9luger'], { style, scale: 11, shadow: true })}</figure>`).join('')}</div>
</section>`;

const html = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ammo Tracker – Varianten der Patronenbilder</title>
<style>
${css}
body { padding: 28px; max-width: 1100px; }
h1, h2 { font-family: var(--font-label); font-stretch: condensed; font-weight: 700; line-height: 1; margin: 0 0 6px; }
h1 { font-size: 44px; }
h2 { font-size: 30px; margin-top: 44px; color: var(--brass); }
.intro { color: var(--muted); max-width: 70ch; margin: 0 0 14px; }
.board { display: flex; flex-wrap: wrap; gap: 26px 34px; align-items: flex-end; padding: 24px; background: var(--surface); border-radius: var(--r-l); }
.board figure { margin: 0; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.board figcaption { font-size: 12px; color: var(--muted); white-space: nowrap; }
.mini { margin-top: 14px; max-width: 390px; background: var(--bg); border: 1px solid var(--line); border-radius: var(--r-l); padding: 12px 0 0; }
.mini > .muted { padding: 0 18px; font-size: 13px; }
.mini .stock-row:last-child { border-bottom: 0; }
</style>
</head>
<body>
<h1>Patronenbilder: drei Varianten</h1>
<p class="intro">Gleiche Kaliber, gleiche Maße, drei Zeichenstile. Unter jeder Variante steht, wie sie als kleines Bild in der Bestandsliste wirkt.</p>
${big}
${styles.map(section).join('')}
</body>
</html>`;

writeFileSync(new URL('../Varianten.html', import.meta.url), html, 'utf8');
console.log('Varianten.html geschrieben');
