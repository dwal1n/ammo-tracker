// Zeichnet eine Patrone als SVG aus ihren Maßen (mm). Keine externen Ressourcen.
//
// cartridgeSVG(caliber, opts)
//   caliber: { family, dims, bullet, caseColor }
//   opts.scale   Pixel pro mm (echte Größenverhältnisse zwischen Kalibern)
//   opts.height  Pixel-Höhe (passt die Patrone ein, wenn scale fehlt)
//   opts.bullet / opts.caseColor überschreiben die Kaliber-Vorgabe
//   opts.shadow  Bodenschatten zeichnen
//   opts.title   Text für Screenreader

const MATERIALS = {
  brass:  ['#5e4116', '#a87b30', '#f3d68a', '#d9ac55', '#9c7128', '#4d3410'],
  nickel: ['#464b51', '#979ea5', '#eef1f3', '#c0c6cb', '#7e858c', '#3b3f44'],
  steel:  ['#36352a', '#6c6952', '#b0ab8b', '#8a8566', '#5a5743', '#2b2a21'],
  copper: ['#4f220f', '#a4552d', '#f2a57a', '#c97348', '#8a3f1d', '#3f1a0b'],
  lead:   ['#2f3135', '#6b6f76', '#c4c7cc', '#8f939a', '#5d6066', '#2a2c30'],
  red:    ['#45090d', '#981b24', '#e2545a', '#b5222c', '#771219', '#360609'],
  green:  ['#0e2a18', '#1f5a35', '#5fae7a', '#2f7a49', '#1a4a2b', '#0a2112'],
  blue:   ['#0c1b36', '#1d3f7a', '#5b8be0', '#2c5bb0', '#173468', '#09152b'],
  black:  ['#0d0e10', '#2c2f33', '#6a6f75', '#41454a', '#25282b', '#0b0c0d'],
};
const STOPS = [0, 0.17, 0.36, 0.52, 0.78, 1];
const OUTLINE = 'rgba(0,0,0,0.45)';

let uid = 0;

function gradient(id, material) {
  const cols = MATERIALS[material] || MATERIALS.brass;
  const stops = cols.map((c, i) => `<stop offset="${STOPS[i]}" stop-color="${c}"/>`).join('');
  return `<linearGradient id="${id}" x1="0" x2="1" y1="0" y2="0">${stops}</linearGradient>`;
}

const f = (n) => Math.round(n * 1000) / 1000;

// Rechte Hälfte der Hülse als Punkte [x, h] (h = Höhe über dem Boden), unten nach oben.
function caseProfile(family, d) {
  const R = d.rim / 2;
  const B = d.base / 2;
  const M = d.mouth / 2;
  const rimT = Math.max(0.9, d.rim * 0.1);
  const ch = rimT * 0.3; // Fase am Rand
  const pts = [[R - ch, 0], [R, ch], [R, rimT - ch * 0.5], [R - ch * 0.6, rimT]];

  const rimless = family === 'pistol' || family === 'rifle';
  let bodyStart;
  if (rimless) {
    const grooveH = d.rim * 0.085;
    const gx = R * 0.8;
    pts.push([gx, rimT], [gx, rimT + grooveH]);
    bodyStart = rimT + grooveH + d.rim * 0.07;
    pts.push([B, bodyStart]);
  } else {
    pts.push([B, rimT]);
    bodyStart = rimT;
  }

  if (d.shoulderAt && d.neckAt) {
    pts.push([d.shoulder / 2, d.shoulderAt], [M, d.neckAt]);
  }
  pts.push([M, d.caseLen]);
  return pts;
}

function mirrorPath(right, oal) {
  // right: Punkte [x, h]; spiegelt an der Mittelachse und baut einen geschlossenen Pfad
  const toY = (h) => f(oal - h);
  const left = right.slice().reverse().map(([x, h]) => [-x, h]);
  const all = right.concat(left);
  return 'M' + all.map(([x, h]) => `${f(x)} ${toY(h)}`).join(' L') + ' Z';
}

function bulletShape(type, family, d) {
  const oal = d.oal;
  const Y = (h) => f(oal - h);
  const br = d.bullet / 2;
  const start = d.caseLen - Math.min(1.5, d.caseLen * 0.1);
  const len = oal - d.caseLen;
  const extras = [];
  let path;
  let material = 'copper';

  if (type === 'wc') {
    material = 'lead';
    const top = Math.max(oal, d.caseLen + 0.5);
    path = `M${f(br)} ${Y(start)} L${f(br)} ${Y(top - 0.2)} Q${f(br)} ${Y(top)} ${f(br - 0.2)} ${Y(top)} `
      + `L${f(-br + 0.2)} ${Y(top)} Q${f(-br)} ${Y(top)} ${f(-br)} ${Y(top - 0.2)} L${f(-br)} ${Y(start)} Z`;
    return { path, material, extras };
  }

  let body, tipR, c1, c2;
  if (type === 'spitzer') {
    body = Math.min(len * 0.28, d.bullet * 0.9);
    tipR = br * 0.1;
    c1 = 0.5; c2 = 0.18;
  } else if (type === 'hp') {
    body = len * 0.25;
    tipR = br * 0.58;
    c1 = 0.55; c2 = 0.55;
  } else {
    // fmj / lead (Rundkopf)
    body = len * (family === 'rimfire' ? 0.32 : 0.28);
    tipR = br * 0.3;
    c1 = 0.62; c2 = 0.5;
    if (type === 'lead') material = 'lead';
  }

  const yb = d.caseLen + body;
  const ogL = oal - yb;
  const cx2 = tipR + (br - tipR) * c2;
  path = `M${f(br)} ${Y(start)} L${f(br)} ${Y(yb)} `
    + `C${f(br)} ${Y(yb + ogL * c1)} ${f(cx2)} ${Y(oal)} ${f(tipR)} ${Y(oal)} `
    + `L${f(-tipR)} ${Y(oal)} `
    + `C${f(-cx2)} ${Y(oal)} ${f(-br)} ${Y(yb + ogL * c1)} ${f(-br)} ${Y(yb)} `
    + `L${f(-br)} ${Y(start)} Z`;

  if (type === 'hp') {
    extras.push(`<ellipse cx="0" cy="0.28" rx="${f(tipR * 0.72)}" ry="0.32" fill="#1c1d20"/>`);
  }
  return { path, material, extras };
}

function shotgunShape(d, hullColor, gHead, gHull) {
  const oal = d.oal;
  const Y = (h) => f(oal - h);
  const R = d.rim / 2;
  const B = d.base / 2;
  const rimT = 1.6;
  const head = d.head || 12;
  const top = d.caseLen;
  const parts = [];

  // Hülsenkörper (Kunststoff) mit gefalzter, leicht gewölbter Oberseite
  const hull = `M${f(B)} ${Y(head - 0.5)} L${f(B)} ${Y(top - 2.2)} `
    + `Q${f(B)} ${Y(top - 0.2)} ${f(B * 0.72)} ${Y(top)} `
    + `L${f(-B * 0.72)} ${Y(top)} Q${f(-B)} ${Y(top - 0.2)} ${f(-B)} ${Y(top - 2.2)} `
    + `L${f(-B)} ${Y(head - 0.5)} Z`;
  parts.push(`<path d="${hull}" fill="url(#${gHull})" stroke="${OUTLINE}" stroke-width="0.15"/>`);

  // Faltsterne andeuten
  for (const x of [-0.5, 0, 0.5]) {
    const xx = x * B * 0.9;
    parts.push(`<path d="M${f(xx)} ${Y(top - 0.15)} L${f(xx * 0.92)} ${Y(top - 2.6)}" stroke="rgba(0,0,0,0.35)" stroke-width="0.25"/>`);
  }

  // Messingkopf
  const headPts = [[R - 0.4, 0], [R, 0.4], [R, rimT], [B + 0.15, rimT + 0.4], [B + 0.15, head]];
  parts.push(`<path d="${mirrorPath(headPts, oal)}" fill="url(#${gHead})" stroke="${OUTLINE}" stroke-width="0.15"/>`);
  // Rillen im Messingkopf
  for (const h of [head * 0.62, head * 0.7]) {
    parts.push(`<path d="M${f(-B - 0.1)} ${Y(h)} L${f(B + 0.1)} ${Y(h)}" stroke="rgba(0,0,0,0.3)" stroke-width="0.3"/>`);
  }
  return parts.join('');
}

export function cartridgeSVG(caliber, opts = {}) {
  const d = caliber.dims;
  const family = caliber.family;
  const bulletType = opts.bullet || caliber.bullet || 'fmj';
  const caseColor = opts.caseColor || caliber.caseColor || 'brass';
  const pad = 0.4;
  const shadowH = opts.shadow ? 1.4 : 0;
  const vbW = d.rim + pad * 2;
  const vbH = d.oal + pad * 2 + shadowH;
  const scale = opts.scale || (opts.height ? opts.height / vbH : 4);
  const w = f(vbW * scale);
  const h = f(vbH * scale);
  const id = `cg${++uid}`;
  const title = opts.title ?? caliber.name ?? '';

  let defs = '';
  let body = '';

  if (opts.shadow) {
    body += `<ellipse cx="0" cy="${f(d.oal + 0.3)}" rx="${f(d.rim * 0.62)}" ry="${f(0.9)}" fill="rgba(0,0,0,0.45)"/>`;
  }

  if (family === 'shotgun') {
    const gHead = `${id}h`, gHull = `${id}s`;
    defs += gradient(gHead, 'brass') + gradient(gHull, MATERIALS[caseColor] && caseColor !== 'brass' ? caseColor : 'red');
    body += shotgunShape(d, caseColor, gHead, gHull);
  } else {
    const caseMat = ['brass', 'nickel', 'steel', 'black'].includes(caseColor) ? caseColor : 'brass';
    const gCase = `${id}c`;
    defs += gradient(gCase, caseMat);
    if (bulletType !== 'none' && d.bullet) {
      const b = bulletShape(bulletType, family, d);
      const gBul = `${id}b`;
      defs += gradient(gBul, b.material);
      body += `<path d="${b.path}" fill="url(#${gBul})" stroke="${OUTLINE}" stroke-width="0.12"/>`;
      body += b.extras.join('');
    }
    body += `<path d="${mirrorPath(caseProfile(family, d), d.oal)}" fill="url(#${gCase})" stroke="${OUTLINE}" stroke-width="0.12"/>`;
    // Lichtkante am Hülsenmund
    const M = d.mouth / 2;
    body += `<path d="M${f(-M + 0.1)} ${f(0.12)} L${f(M - 0.1)} ${f(0.12)}" transform="translate(0 ${f(d.oal - d.caseLen)})" stroke="rgba(255,255,255,0.25)" stroke-width="0.15"/>`;
  }

  const vb = `${f(-vbW / 2)} ${f(-pad)} ${f(vbW)} ${f(vbH)}`;
  const label = title ? ` role="img" aria-label="${escapeAttr(title)}"` : ' aria-hidden="true"';
  return `<svg xmlns="http://www.w3.org/2000/svg" class="cartridge" viewBox="${vb}" width="${w}" height="${h}"${label}>`
    + `<defs>${defs}</defs>${body}</svg>`;
}

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
