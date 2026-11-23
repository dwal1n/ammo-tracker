// Packungen scannen: Kamera, Erkennen, Verknüpfen mit einer Sorte, Packungen buchen.
// Bilder werden nur auf dem Gerät ausgewertet und nirgends gespeichert.
import * as S from './store.js';
import { esc, fmt, eur, today, sheet, toast, uniqueList, ICONS } from './ui.js';
import { decodeImage, loadZXing } from './scan.js';
import { isGenericCode, normalizeTyped } from './model.js';
import { DEALERS } from './calibers.js';
import { motionOK } from './anim.js';

const PER_PACK = ['20', '25', '50', '100', '250'];
const COUNT_CHIPS = ['1', '5', '10', '20'];

// ---------------------------------------------------------------------------
// Kamera bleibt während eines Scan-Durchgangs offen. iOS fragt bei Web-Apps
// sonst bei jedem neuen Kamerazugriff erneut nach der Erlaubnis.
// ---------------------------------------------------------------------------
let shared = null;

async function getStream() {
  const live = shared?.getVideoTracks().some((t) => t.readyState === 'live');
  if (live) {
    shared.getVideoTracks().forEach((t) => { t.enabled = true; });
    return shared;
  }
  shared = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
  });
  return shared;
}

// Zwischen zwei Scans nur pausieren (kein Bild, Erlaubnis bleibt bestehen)
function pauseStream() {
  shared?.getVideoTracks().forEach((t) => { t.enabled = false; });
}

// Am Ende des Durchgangs Kamera wirklich ausschalten
function releaseStream() {
  shared?.getTracks().forEach((t) => t.stop());
  shared = null;
}

// ---------------------------------------------------------------------------
// Kamera-Ansicht. Gibt { id, text, kind } zurück oder null bei Abbruch.
// ---------------------------------------------------------------------------
function cameraDialog() {
  return new Promise((resolve) => {
    const dlg = document.createElement('dialog');
    dlg.className = 'scanner';
    dlg.innerHTML = `
      <div class="scan-view">
        <video playsinline muted autoplay></video>
        <div class="scan-frame" aria-hidden="true"><span></span></div>
        <p class="scan-status" role="status">Kamera wird gestartet …</p>
      </div>
      <div class="scan-actions">
        <button type="button" class="btn-secondary" data-act="photo">Foto aufnehmen</button>
        <button type="button" class="btn-secondary" data-act="type">Nummer eintippen</button>
        <button type="button" class="btn-primary" data-act="close">Abbrechen</button>
      </div>
      <input type="file" accept="image/*" capture="environment" hidden>`;
    document.body.append(dlg);
    const video = dlg.querySelector('video');
    const status = dlg.querySelector('.scan-status');
    const fileIn = dlg.querySelector('input[type=file]');
    let stream = null;
    let running = true;
    let result = null;
    let lastGeneric = '';

    const stop = () => {
      running = false;
      if (stream) pauseStream();
      video.srcObject = null;
      stream = null;
    };
    const finish = (r) => { result = r; stop(); dlg.close(); };
    const say = (t) => { status.textContent = t; };

    const accept = (r) => {
      if (!r) return false;
      if (r.kind === 'qr' && isGenericCode(r.text)) {
        if (lastGeneric !== r.text) say('Dieser QR-Code ist auf allen Packungen des Herstellers gleich. Bitte den Strichcode scannen.');
        lastGeneric = r.text;
        return false;
      }
      const pack = S.state.packs.find((p) => p.id === r.id);
      if (pack?.ambiguous) {
        say('Dieser Code steht auf mehreren Sorten. Bitte den Strichcode scannen.');
        return false;
      }
      navigator.vibrate?.(30);
      dlg.querySelector('.scan-frame').classList.add('hit');
      setTimeout(() => finish(r), motionOK() ? 250 : 0);
      return true;
    };

    async function loop() {
      while (running) {
        if (video.readyState >= 2) {
          try { if (accept(await decodeImage(video, { quick: true }))) return; } catch { /* weiter */ }
        }
        await new Promise((r) => setTimeout(r, 120));
      }
    }

    async function start() {
      try {
        await loadZXing();
        stream = await getStream();
        if (!running) return stop();
        video.srcObject = stream;
        // Nicht auf play() warten: die Erkennungsschleife prüft selbst, ob schon Bilder da sind
        video.play().catch(() => {});
        say('Strichcode oder QR-Code in den Rahmen halten');
        loop();
      } catch (e) {
        say(e?.name === 'NotAllowedError'
          ? 'Kein Zugriff auf die Kamera. Erlaube ihn beim nächsten Mal oder nutze „Foto aufnehmen“ oder „Nummer eintippen“.'
          : 'Die Kamera ist nicht verfügbar. Nutze „Foto aufnehmen“ oder „Nummer eintippen“.');
      }
    }

    dlg.addEventListener('click', async (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'close') finish(null);
      if (act === 'photo') fileIn.click();
      if (act === 'type') {
        stop();
        dlg.close();
        result = await typeCode();
        if (result === 'camera') { resolve(await cameraDialog()); return; }
        resolve(result);
      }
    });
    fileIn.addEventListener('change', async () => {
      const f = fileIn.files?.[0];
      if (!f) return;
      say('Foto wird ausgewertet …');
      const url = URL.createObjectURL(f);
      try {
        const img = new Image();
        img.src = url;
        await img.decode();
        const r = await decodeImage(img);
        if (!accept(r) && !r) say('Auf dem Foto wurde kein Code gefunden. Halte den Strichcode größer und scharf ins Bild.');
      } catch {
        say('Das Foto konnte nicht gelesen werden.');
      } finally {
        URL.revokeObjectURL(url);
        fileIn.value = '';
      }
    });
    dlg.addEventListener('cancel', () => finish(null));
    dlg.addEventListener('close', () => {
      stop();
      dlg.remove();
      if (!dlg.dataset.typed) resolve(result);
    }, { once: true });
    // Beim Eintippen übernimmt typeCode das Auflösen
    dlg.querySelector('[data-act="type"]').addEventListener('click', () => { dlg.dataset.typed = '1'; });

    dlg.showModal();
    start();
  });
}

async function typeCode() {
  const r = await sheet({
    title: 'Nummer eintippen',
    intro: '<p class="sheet-text">Tippe die Ziffern unter dem Strichcode ein, meist 13 Stück.</p>',
    fields: [{ name: 'code', label: 'Nummer', inputmode: 'numeric', required: true, autofocus: true, placeholder: 'z. B. 7891798042852' }],
    submit: 'Weiter',
    extra: [{ label: 'Doch mit der Kamera scannen', action: 'camera' }],
    validate: (v) => (normalizeTyped(v.code).ok ? '' : 'Diese Nummer ist ungültig. Bitte noch einmal prüfen, die letzte Ziffer ist eine Prüfziffer.'),
  });
  if (!r) return null;
  if (r.action === 'camera') return 'camera';
  const n = normalizeTyped(r.values.code);
  return n.ok ? { id: n.id, text: n.text, kind: 'ean' } : null;
}

// ---------------------------------------------------------------------------
// Packung mit Sorte verknüpfen (beim ersten Scan einer Packungsart)
// ---------------------------------------------------------------------------
async function linkPack(code, current) {
  const loads = S.state.loads.filter((l) => !l.archived);
  const options = [
    ...(current ? [] : [{ value: '', label: 'Bitte wählen' }]),
    ...loads.map((l) => ({ value: l.id, label: S.loadLabel(l), group: S.caliber(l.caliberId)?.name || 'Sonstige' })),
    { value: '__new', label: 'Neue Sorte anlegen …', group: 'Neu' },
  ];
  const r = await sheet({
    title: current ? 'Andere Sorte' : 'Neue Packung',
    intro: `<p class="sheet-text">${current ? 'Welche Sorte ist in dieser Packung?' : 'Diese Packung kennt die App noch nicht. Ordne sie einmal einer Sorte zu, danach wird sie sofort erkannt.'}</p>
      <p class="code-line"><span class="muted">${code.kind === 'qr' ? 'QR-Code' : 'Strichcode'}</span> <code>${esc(code.text)}</code></p>`,
    fields: [
      { name: 'loadId', label: 'Sorte', type: 'select', options, value: current?.loadId || (loads.length ? '' : '__new'), required: true },
      { name: 'perPack', label: 'Patronen pro Packung', type: 'number', value: current?.perPack || 50, required: true, suggestions: PER_PACK, chips: true },
    ],
    submit: 'Weiter',
    validate: (v) => (v.perPack > 0 && Number.isInteger(v.perPack) ? '' : 'Bitte die Anzahl Patronen pro Packung angeben.'),
  });
  if (!r) return null;
  let loadId = r.values.loadId;
  if (loadId === '__new') {
    const { editLoad } = await import('./views/stock.js');
    const created = await editLoad(null);
    if (!created) return null;
    loadId = created.id;
  }
  // Ein QR-Code, der plötzlich für eine andere Sorte steht, ist nicht eindeutig
  if (current && code.kind === 'qr' && current.loadId && current.loadId !== loadId) {
    await S.save('packs', { ...current, ambiguous: true });
    toast('Dieser QR-Code steht auf mehreren Sorten. Bitte künftig den Strichcode scannen.');
    return null;
  }
  return S.save('packs', { ...(current || {}), id: code.id, code: code.text, kind: code.kind, loadId, perPack: r.values.perPack, ambiguous: false });
}

// ---------------------------------------------------------------------------
// Anzahl Packungen eingeben und als Einkauf buchen
// ---------------------------------------------------------------------------
async function bookPack(pack, code) {
  let lastMode = 'packs';
  const roundsOf = (v) => (v.mode === 'rounds' ? (Number(v.count) || 0) : (Number(v.count) || 0) * pack.perPack);
  const l = S.load(pack.loadId);
  const c = S.caliber(l?.caliberId);
  const st = S.state.settings;
  const r = await sheet({
    title: 'Packungen buchen',
    intro: `<div class="scan-hit">
        <span class="thumb">${S.cart(c, { height: 64 }, l)}</span>
        <span><b>${esc(S.loadLabel(l))}</b><small>${esc(c?.name || '')}, ${fmt(pack.perPack)} pro Packung</small></span>
      </div>
      <p class="live-sum" aria-live="polite"></p>`,
    fields: [
      { name: 'mode', label: 'Was buchst du?', type: 'segmented', value: 'packs',
        options: [{ value: 'packs', label: 'Ganze Packungen' }, { value: 'rounds', label: 'Einzelne Patronen' }] },
      { name: 'count', label: 'Anzahl Packungen', type: 'number', value: 1, required: true, suggestions: COUNT_CHIPS, chips: true },
      { name: 'packPrice', label: 'Preis pro Packung (€)', type: 'number', inputmode: 'decimal', value: pack.packPrice != null ? Number(pack.packPrice).toFixed(2).replace('.', ',') : '', placeholder: 'optional' },
      { name: 'dealer', label: 'Händler', value: st.lastDealer || '', placeholder: 'optional',
        hint: 'Für Munition, die du schon länger hast: „Anfangsbestand“ wählen. Dann zählt sie nicht als Ausgabe in der Statistik.',
        suggestions: S.dealerSuggestions() },
      { name: 'date', label: 'Datum', type: 'date', value: today(), required: true },
    ],
    submit: 'Buchen',
    extra: [
      { label: 'Buchen und weiter scannen', action: 'more', primary: true },
      { label: 'Andere Sorte zuordnen', action: 'relink' },
    ],
    validate: (v) => (v.count > 0 && Number.isInteger(v.count) ? ''
      : v.mode === 'rounds' ? 'Bitte die Anzahl der Patronen angeben.' : 'Bitte die Anzahl der Packungen angeben.'),
    live: (v, dlg) => {
      const rounds = v.mode === 'rounds';
      // Beim Umschalten Feld leeren und Beschriftung anpassen
      if (lastMode !== v.mode) {
        lastMode = v.mode;
        const input = dlg.querySelector('[name="count"]');
        dlg.querySelector('label[for="f-count"]').textContent = rounds ? 'Anzahl Patronen' : 'Anzahl Packungen';
        dlg.querySelector('.suggest[data-for="count"]').hidden = rounds;
        input.value = rounds ? '' : '1';
        if (rounds) input.focus();
        v.count = rounds ? null : 1;
      }
      const n = roundsOf(v);
      const price = v.packPrice ? (n / pack.perPack) * v.packPrice : null;
      dlg.querySelector('.live-sum').innerHTML = rounds
        ? `<b class="num">${fmt(n)}</b> Patronen aus einer angebrochenen Packung${price ? `, anteilig ${eur(price)}` : ''}`
        : `= <b class="num">${fmt(n)}</b> Patronen${price ? `, ${eur(price)}` : ''}`;
    },
  });
  if (!r) return { done: false };
  if (r.action === 'relink') {
    const re = await linkPack(code, pack);
    return re ? bookPack(re, code) : { done: false };
  }
  const v = r.values;
  const qty = roundsOf(v);
  const partial = v.mode === 'rounds';
  S.markStockChange();
  await S.save('purchases', {
    loadId: pack.loadId, date: v.date, qty,
    totalPrice: v.packPrice ? Math.round((qty / pack.perPack) * v.packPrice * 100) / 100 : null,
    dealer: v.dealer, note: partial ? 'angebrochene Packung (gescannt)' : `${v.count} × ${pack.perPack} (gescannt)`,
  });
  await S.save('packs', { ...pack, packPrice: v.packPrice ?? pack.packPrice ?? null });
  if (v.dealer && v.dealer !== 'Anfangsbestand') await S.setSetting('lastDealer', v.dealer);
  toast(`${fmt(qty)} Patronen ${S.loadLabel(l)} gebucht`);
  S.render();
  return { done: true, more: r.action === 'more' };
}

// ---------------------------------------------------------------------------
// Einstieg: scannen, ggf. verknüpfen, buchen, auf Wunsch weiter scannen
// ---------------------------------------------------------------------------
export async function scanFlow() {
  if (!navigator.mediaDevices?.getUserMedia) {
    toast('Die Kamera ist hier nicht verfügbar. Du kannst die Nummer eintippen.');
  }
  try {
    for (;;) {
      const code = await cameraDialog();
      if (!code) return;
      let pack = S.state.packs.find((p) => p.id === code.id);
      if (pack && !S.load(pack.loadId)) pack = null; // Sorte wurde gelöscht
      if (!pack) pack = await linkPack(code, null);
      if (!pack) return;
      const r = await bookPack(pack, code);
      if (!r.more) return;
    }
  } finally {
    releaseStream();
  }
}

export const SCAN_ICON = ICONS.scan;
