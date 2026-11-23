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
    return { path, material, extras, yb: top, tipR: br, br };
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
  return { path, material, extras, yb, tipR, br };
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
  if (opts.style === 'real') return realSVG(caliber, opts);
  if (opts.style === 'line') return lineSVG(caliber, opts);
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

// ---------------------------------------------------------------------------
// Stil „real“: Metalloptik mit Glanzlichtern, Rillen- und Mundschatten
// ---------------------------------------------------------------------------

const REAL = {
  brass:  [[0, '#2e1f08'], [0.07, '#5a3f14'], [0.18, '#a57a2e'], [0.28, '#f0d48a'], [0.33, '#fff3c8'], [0.4, '#e2bb63'], [0.58, '#a8792c'], [0.72, '#cfa552'], [0.82, '#8c6420'], [0.94, '#4a3210'], [1, '#22170a']],
  nickel: [[0, '#25282c'], [0.07, '#4b5057'], [0.18, '#8e959c'], [0.28, '#e3e7ea'], [0.33, '#ffffff'], [0.4, '#cfd4d8'], [0.58, '#8a9097'], [0.72, '#b9bfc4'], [0.82, '#6f757c'], [0.94, '#3a3e43'], [1, '#1b1d20']],
  steel:  [[0, '#1f1f17'], [0.07, '#3d3c2e'], [0.18, '#66634d'], [0.28, '#9d9878'], [0.33, '#bdb897'], [0.4, '#8c876a'], [0.58, '#605d48'], [0.72, '#78745a'], [0.82, '#4f4c3b'], [0.94, '#2e2d22'], [1, '#191912']],
  black:  [[0, '#060607'], [0.18, '#1d1f22'], [0.3, '#5b6066'], [0.34, '#8d9399'], [0.42, '#33373b'], [0.72, '#26292c'], [1, '#050506']],
  copper: [[0, '#2a1006'], [0.07, '#55230f'], [0.18, '#9a4a26'], [0.28, '#e59a6c'], [0.33, '#ffd2b4'], [0.4, '#d6845a'], [0.58, '#94451f'], [0.72, '#b8643a'], [0.82, '#7a3517'], [0.94, '#40190a'], [1, '#200b04']],
  lead:   [[0, '#1f2124'], [0.1, '#3f4247'], [0.25, '#7c8087'], [0.36, '#a9adb3'], [0.5, '#858990'], [0.75, '#5d6167'], [0.92, '#35383c'], [1, '#1c1e21']],
  red:    [[0, '#2a0306'], [0.08, '#5e0a10'], [0.2, '#a3141f'], [0.29, '#e6505a'], [0.32, '#ffc2c5'], [0.36, '#d83440'], [0.6, '#9c1420'], [0.8, '#6a0c14'], [1, '#25030a']],
  green:  [[0, '#03170b'], [0.08, '#0b3519'], [0.2, '#1b6534'], [0.29, '#4fae6f'], [0.32, '#c4f0d2'], [0.36, '#2f8a4e'], [0.6, '#185a2e'], [0.8, '#0f3d1f'], [1, '#03140a']],
  blue:   [[0, '#030b1f'], [0.08, '#0a1d45'], [0.2, '#18398a'], [0.29, '#4f7fe0'], [0.32, '#cbdcff'], [0.36, '#2d5cc0'], [0.6, '#173a85'], [0.8, '#0e2659'], [1, '#030a1c']],
};

function realGrad(id, mat) {
  const stops = (REAL[mat] || REAL.brass).map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('');
  return `<linearGradient id="${id}" x1="0" x2="1" y1="0" y2="0">${stops}</linearGradient>`;
}

// Vertikaler Verlauf: Liste [offset, farbe, deckkraft]; oben = 0
function vGrad(id, stops) {
  return `<linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1">${stops
    .map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</linearGradient>`;
}

function svgWrap(caliber, opts, vb, w, h, defs, body, cls = '') {
  const title = opts.title ?? caliber.name ?? '';
  const label = title ? ` role="img" aria-label="${escapeAttr(title)}"` : ' aria-hidden="true"';
  return `<svg xmlns="http://www.w3.org/2000/svg" class="cartridge${cls}" viewBox="${vb}" width="${f(w)}" height="${f(h)}"${label}>`
    + `<defs>${defs}</defs>${body}</svg>`;
}

function realSVG(caliber, opts) {
  const d = caliber.dims;
  const family = caliber.family;
  const bulletType = opts.bullet || caliber.bullet || 'fmj';
  const caseColor = opts.caseColor || caliber.caseColor || 'brass';
  const pad = 0.5;
  const shadowH = opts.shadow ? 1.6 : 0;
  const vbW = d.rim + pad * 2;
  const vbH = d.oal + pad * 2 + shadowH;
  const scale = opts.scale || (opts.height ? opts.height / vbH : 4);
  const id = `cr${++uid}`;
  const oal = d.oal;
  const Y = (h) => f(oal - h);
  const R = d.rim / 2;
  const OUT = 'rgba(0,0,0,0.55)';
  let defs = '';
  let body = '';

  defs += vGrad(`${id}hl`, [[0, '#fff', 0.55], [0.7, '#fff', 0.18], [1, '#fff', 0]]);
  defs += vGrad(`${id}ms`, [[0, '#000', 0], [1, '#000', 0.5]]);
  defs += vGrad(`${id}up`, [[0, '#000', 0.45], [1, '#000', 0]]);
  defs += vGrad(`${id}gr`, [[0, '#000', 0.6], [1, '#000', 0.1]]);
  defs += vGrad(`${id}tip`, [[0, '#000', 0.28], [1, '#000', 0]]);
  defs += vGrad(`${id}base`, [[0, '#000', 0], [1, '#000', 0.22]]);

  if (opts.shadow) {
    defs += `<filter id="${id}bl" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="0.55"/></filter>`;
    body += `<ellipse cx="0" cy="${f(oal + 0.2)}" rx="${f(d.rim * 0.66)}" ry="0.75" fill="rgba(0,0,0,0.7)" filter="url(#${id}bl)"/>`;
  }

  if (family === 'shotgun') {
    body += realShotgun(d, caseColor, id, Y, R);
  } else {
    // Geschoss
    if (bulletType !== 'none' && d.bullet) {
      const b = bulletShape(bulletType, family, d);
      defs += realGrad(`${id}b`, b.material);
      defs += `<clipPath id="${id}bc"><path d="${b.path}"/></clipPath>`;
      body += `<path d="${b.path}" fill="url(#${id}b)"/>`;
      body += `<g clip-path="url(#${id}bc)">`;
      // Abdunkeln zur Spitze hin (Ogive neigt sich vom Licht weg)
      body += `<rect x="${f(-b.br)}" y="${Y(oal)}" width="${f(b.br * 2)}" height="${f(Math.max(0.1, oal - d.caseLen))}" fill="url(#${id}tip)"/>`;
      // Glanzlicht, folgt der Geschosskontur
      body += `<path d="${b.path}" transform="translate(${f(-b.br * 0.3)} 0) scale(0.2 1)" fill="url(#${id}hl)" opacity="${b.material === 'lead' ? 0.45 : 0.9}"/>`;
      // Schatten über dem Hülsenmund
      body += `<rect x="${f(-b.br)}" y="${Y(d.caseLen + 1.1)}" width="${f(b.br * 2)}" height="1.1" fill="url(#${id}ms)"/>`;
      body += '</g>';
      if (bulletType === 'hp') {
        const r = b.tipR;
        body += `<ellipse cx="0" cy="0.3" rx="${f(r * 0.8)}" ry="0.36" fill="#120a06"/>`;
        body += `<ellipse cx="0" cy="0.22" rx="${f(r * 0.8)}" ry="0.2" fill="none" stroke="rgba(255,210,180,0.35)" stroke-width="0.08"/>`;
        for (const x of [-0.5, 0, 0.5]) {
          body += `<path d="M${f(x * r)} 0.3 L${f(x * r * 1.15)} 1.6" stroke="rgba(0,0,0,0.45)" stroke-width="0.09"/>`;
        }
      }
      if (b.material === 'lead' && bulletType !== 'wc') {
        // Crimprille knapp über dem Mund
        const yc = d.caseLen + 0.9;
        body += `<path d="M${f(-b.br)} ${Y(yc)} L${f(b.br)} ${Y(yc)}" stroke="rgba(0,0,0,0.35)" stroke-width="0.18"/>`;
      }
      body += `<path d="${b.path}" fill="none" stroke="${OUT}" stroke-width="0.08"/>`;
    }

    // Hülse
    const caseMat = ['brass', 'nickel', 'steel', 'black'].includes(caseColor) ? caseColor : 'brass';
    const cp = mirrorPath(caseProfile(family, d), oal);
    defs += realGrad(`${id}c`, caseMat);
    defs += `<clipPath id="${id}cc"><path d="${cp}"/></clipPath>`;
    body += `<path d="${cp}" fill="url(#${id}c)"/>`;
    body += `<g clip-path="url(#${id}cc)">`;

    const rimT = Math.max(0.9, d.rim * 0.1);
    const rimless = family === 'pistol' || family === 'rifle';
    if (rimless) {
      const bodyStart = rimT + d.rim * 0.085 + d.rim * 0.07;
      body += `<rect x="${f(-R)}" y="${Y(bodyStart)}" width="${f(d.rim)}" height="${f(bodyStart - rimT)}" fill="url(#${id}gr)"/>`;
    } else {
      // Schatten auf dem Körper direkt über dem Rand
      body += `<rect x="${f(-R)}" y="${Y(rimT + 0.9)}" width="${f(d.rim)}" height="0.9" fill="url(#${id}ms)"/>`;
    }
    // Lichtkante auf der Randoberseite
    body += `<path d="M${f(-R)} ${f(Y(rimT) - 0.06)} L${f(R)} ${f(Y(rimT) - 0.06)}" stroke="rgba(255,255,255,0.22)" stroke-width="0.1"/>`;
    // Schulter fängt Licht
    if (d.shoulderAt && d.neckAt) {
      const sh = d.shoulder / 2, m = d.mouth / 2;
      body += `<path d="M${f(-sh)} ${Y(d.shoulderAt)} L${f(sh)} ${Y(d.shoulderAt)} L${f(m)} ${Y(d.neckAt)} L${f(-m)} ${Y(d.neckAt)} Z" fill="rgba(255,236,190,0.2)"/>`;
    }
    // Hülsenmund
    body += `<path d="M${f(-R)} ${f(Y(d.caseLen) + 0.08)} L${f(R)} ${f(Y(d.caseLen) + 0.08)}" stroke="rgba(255,255,255,0.4)" stroke-width="0.1"/>`;
    // leichte Abdunkelung zum Boden
    body += `<rect x="${f(-R)}" y="${Y(d.caseLen)}" width="${f(d.rim)}" height="${f(d.caseLen)}" fill="url(#${id}base)"/>`;
    body += '</g>';
    body += `<path d="${cp}" fill="none" stroke="${OUT}" stroke-width="0.08"/>`;
  }

  const vb = `${f(-vbW / 2)} ${f(-pad)} ${f(vbW)} ${f(vbH)}`;
  return svgWrap(caliber, opts, vb, vbW * scale, vbH * scale, defs, body);
}

function realShotgun(d, caseColor, id, Y, R) {
  const B = d.base / 2;
  const head = d.head || 12;
  const top = d.caseLen;
  const hullMat = REAL[caseColor] && !['brass', 'nickel', 'steel'].includes(caseColor) ? caseColor : 'red';
  let defs = realGrad(`${id}s`, hullMat) + realGrad(`${id}h`, 'brass');
  let s = '';
  const hull = `M${f(B)} ${Y(head - 0.5)} L${f(B)} ${Y(top - 2.4)} `
    + `Q${f(B)} ${Y(top - 0.1)} ${f(B * 0.7)} ${Y(top)} `
    + `L${f(-B * 0.7)} ${Y(top)} Q${f(-B)} ${Y(top - 0.1)} ${f(-B)} ${Y(top - 2.4)} `
    + `L${f(-B)} ${Y(head - 0.5)} Z`;
  defs += `<clipPath id="${id}hc"><path d="${hull}"/></clipPath>`;
  s += `<path d="${hull}" fill="url(#${id}s)"/>`;
  s += `<g clip-path="url(#${id}hc)">`;
  // Faltkrimp: abwechselnd helle und dunkle Falten
  for (let i = -3; i <= 3; i++) {
    const x = (i / 3.5) * B * 0.92;
    const dark = i % 2 === 0;
    s += `<path d="M${f(x)} ${Y(top)} Q${f(x * 1.02)} ${Y(top - 1.6)} ${f(x * 1.04)} ${Y(top - 3.2)}" stroke="${dark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.18)'}" stroke-width="${dark ? 0.35 : 0.25}" fill="none"/>`;
  }
  s += `<rect x="${f(-B)}" y="${Y(top)}" width="${f(B * 2)}" height="3.4" fill="url(#${id}tip)"/>`;
  s += `<rect x="${f(-B)}" y="${Y(head + 1.2)}" width="${f(B * 2)}" height="1.2" fill="url(#${id}ms)"/>`;
  s += '</g>';
  s += `<path d="${hull}" fill="none" stroke="rgba(0,0,0,0.55)" stroke-width="0.1"/>`;

  // Messingkopf
  const headPts = [[R - 0.4, 0], [R, 0.4], [R, 1.6], [B + 0.15, 2.0], [B + 0.15, head]];
  const hp = mirrorPath(headPts, d.oal);
  defs += `<clipPath id="${id}kc"><path d="${hp}"/></clipPath>`;
  s += `<path d="${hp}" fill="url(#${id}h)"/>`;
  s += `<g clip-path="url(#${id}kc)">`;
  for (const h of [head * 0.6, head * 0.68]) {
    s += `<path d="M${f(-R)} ${Y(h)} L${f(R)} ${Y(h)}" stroke="rgba(0,0,0,0.35)" stroke-width="0.25"/>`;
    s += `<path d="M${f(-R)} ${f(Y(h) + 0.22)} L${f(R)} ${f(Y(h) + 0.22)}" stroke="rgba(255,255,255,0.25)" stroke-width="0.12"/>`;
  }
  s += `<path d="M${f(-R)} ${f(Y(1.6) - 0.05)} L${f(R)} ${f(Y(1.6) - 0.05)}" stroke="rgba(255,255,255,0.25)" stroke-width="0.1"/>`;
  s += `<rect x="${f(-R)}" y="${Y(head)}" width="${f(R * 2)}" height="${f(head)}" fill="url(#${id}base)"/>`;
  s += '</g>';
  s += `<path d="${hp}" fill="none" stroke="rgba(0,0,0,0.55)" stroke-width="0.08"/>`;
  return `<defs>${defs}</defs>${s}`;
}

// ---------------------------------------------------------------------------
// Stil „line“: technische Zeichnung wie im Wiederlade-Handbuch
// ---------------------------------------------------------------------------

const deNum = (n) => n.toFixed(2).replace('.', ',');

function halfWidthAt(profile, h) {
  for (let i = 1; i < profile.length; i++) {
    const [x0, h0] = profile[i - 1];
    const [x1, h1] = profile[i];
    if (h >= h0 && h <= h1 && h1 !== h0) return x0 + (x1 - x0) * ((h - h0) / (h1 - h0));
  }
  return profile[profile.length - 1][0];
}

function lineSVG(caliber, opts) {
  const d = caliber.dims;
  const family = caliber.family;
  const bulletType = opts.bullet || caliber.bullet || 'fmj';
  const pad = 0.8;
  const dimSpace = opts.dims === false ? 0 : 10;
  const R = d.rim / 2;
  const vbW = d.rim + pad * 2 + dimSpace;
  const vbH = d.oal + pad * 2;
  const scale = opts.scale || (opts.height ? opts.height / vbH : 4);
  const id = `cl${++uid}`;
  const oal = d.oal;
  const Y = (h) => f(oal - h);
  // Linien nie dünner als ca. 1 Pixel, damit kleine Bilder nicht verblassen
  const sw = Math.max(0.2, 1.4 / scale);
  const tw = Math.max(0.1, 0.8 / scale);
  const hs = Math.max(1.1, 3.2 / scale);
  const defs = `<pattern id="${id}h" width="${f(hs)}" height="${f(hs)}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0 L0 ${f(hs)}" stroke="currentColor" stroke-width="${f(Math.max(0.14, 0.9 / scale))}" opacity="0.7"/></pattern>`;
  let s = '';

  // Mittellinie
  s += `<path d="M0 -0.6 L0 ${f(oal + 0.6)}" stroke="currentColor" stroke-width="0.08" stroke-dasharray="2 0.6 0.4 0.6" opacity="0.5"/>`;

  if (family === 'shotgun') {
    const B = d.base / 2, head = d.head || 12, top = d.caseLen;
    const hull = `M${f(B)} ${Y(head)} L${f(B)} ${Y(top - 2.4)} Q${f(B)} ${Y(top - 0.1)} ${f(B * 0.7)} ${Y(top)} L${f(-B * 0.7)} ${Y(top)} Q${f(-B)} ${Y(top - 0.1)} ${f(-B)} ${Y(top - 2.4)} L${f(-B)} ${Y(head)}`;
    s += `<path d="${hull}" fill="none" stroke="currentColor" stroke-width="${sw}"/>`;
    for (let i = -2; i <= 2; i++) {
      const x = (i / 2.6) * B * 0.85;
      s += `<path d="M${f(x)} ${Y(top)} L${f(x)} ${Y(top - 2.8)}" stroke="currentColor" stroke-width="${f(tw)}" opacity="0.6"/>`;
    }
    const headPts = [[R - 0.4, 0], [R, 0.4], [R, 1.6], [B + 0.15, 2.0], [B + 0.15, head]];
    s += `<path d="${mirrorPath(headPts, oal)}" fill="url(#${id}h)" stroke="currentColor" stroke-width="${sw}"/>`;
  } else {
    if (bulletType !== 'none' && d.bullet) {
      const b = bulletShape(bulletType, family, d);
      s += `<path d="${b.path}" fill="url(#${id}h)" stroke="currentColor" stroke-width="${sw}"/>`;
      if (bulletType === 'hp') s += `<ellipse cx="0" cy="0.3" rx="${f(b.tipR * 0.8)}" ry="0.3" fill="none" stroke="currentColor" stroke-width="0.12"/>`;
    }
    const prof = caseProfile(family, d);
    const cp = mirrorPath(prof, oal);
    s += `<path d="${cp}" class="bgfill" fill="#1a2027" stroke="currentColor" stroke-width="${sw}"/>`;
    s += `<path d="${cp}" fill="currentColor" opacity="0.08"/>`;
    // Kanten von Rand, Rille und Schulter als Querlinien
    const rimT = Math.max(0.9, d.rim * 0.1);
    const lines = [rimT];
    if (family === 'pistol' || family === 'rifle') lines.push(rimT + d.rim * 0.085);
    if (d.shoulderAt) lines.push(d.shoulderAt, d.neckAt);
    for (const h of lines) {
      const half = halfWidthAt(prof, h + 0.001);
      s += `<path d="M${f(-half)} ${Y(h)} L${f(half)} ${Y(h)}" stroke="currentColor" stroke-width="${f(tw)}" opacity="0.6"/>`;
    }
  }

  // Maßlinien: Hülsenlänge und Gesamtlänge
  if (dimSpace) {
    const dim = (x, h0, h1) => {
      let o = `<path d="M${f(R + 0.6)} ${Y(h1)} L${f(x + 0.8)} ${Y(h1)}" stroke="currentColor" stroke-width="0.07" opacity="0.6"/>`;
      o += `<path d="M${f(x)} ${Y(h0)} L${f(x)} ${Y(h1)}" stroke="currentColor" stroke-width="0.1"/>`;
      o += `<path d="M${f(x - 0.5)} ${f(oal - h0 - 1)} L${f(x)} ${Y(h0)} L${f(x + 0.5)} ${f(oal - h0 - 1)}" fill="none" stroke="currentColor" stroke-width="0.1"/>`;
      o += `<path d="M${f(x - 0.5)} ${f(oal - h1 + 1)} L${f(x)} ${Y(h1)} L${f(x + 0.5)} ${f(oal - h1 + 1)}" fill="none" stroke="currentColor" stroke-width="0.1"/>`;
      const cy = f(oal - (h0 + h1) / 2);
      const tx = f(x + 1.6);
      o += `<text x="${tx}" y="${cy}" font-size="2" fill="currentColor" font-family="DIN Condensed, Bahnschrift, Arial Narrow, sans-serif" text-anchor="middle" transform="rotate(-90 ${tx} ${cy})">${deNum(h1 - h0)}</text>`;
      return o;
    };
    s += `<path d="M${f(R + 0.6)} ${Y(0)} L${f(R + 8.8)} ${Y(0)}" stroke="currentColor" stroke-width="0.07" opacity="0.6"/>`;
    if (family !== 'shotgun') s += dim(R + 3, 0, d.caseLen);
    s += dim(R + 7, 0, oal);
  }

  const vb = `${f(-R - pad)} ${f(-pad)} ${f(vbW)} ${f(vbH)}`;
  return svgWrap(caliber, opts, vb, vbW * scale, vbH * scale, defs, s, ' cartridge-line');
}
