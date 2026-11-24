// Mehr: Patronenbilder, Design, Datensicherung, eigene Kaliber, Datenschutz
import * as S from '../store.js';
import { esc, fmt, dateDE, today, nowLocal, sheet, confirmSheet, toast } from '../ui.js';
import { validateBackup } from '../model.js';
import { FAMILY_LABELS, guessDims } from '../calibers.js';
import { cartridgeSVG } from '../cartridge-svg.js';
import { APP_VERSION } from '../version.js';

export function render() {
  const st = S.state.settings;
  const demo = ['c-9luger', 'c-308'].map((id) => S.caliber(id));
  const styleBtn = (v, label) => `<button class="style-opt${st.cartridgeStyle === v ? ' on' : ''}" data-action="setStyle" data-v="${v}" aria-pressed="${st.cartridgeStyle === v}">
      <span class="style-img">${demo.map((c) => cartridgeSVG(c, { style: v, height: 74, dims: false })).join('')}</span><span>${label}</span></button>`;
  const themeBtn = (v, label) => `<button class="seg${st.theme === v ? ' on' : ''}" data-action="setTheme" data-v="${v}" aria-pressed="${st.theme === v}">${label}</button>`;
  const custom = S.state.calibers.filter((c) => c.custom);
  const counts = `${fmt(S.state.loads.length)} Sorten, ${fmt(S.state.purchases.length)} Einkäufe, ${fmt(S.state.sessions.filter((s) => s.status === 'done').length)} Trainings, ${fmt(S.state.firearms.length)} Waffen`;

  const mine = (st.myCalibers || []).map((id) => S.caliber(id)).filter(Boolean);

  return `<header class="page-head"><h1 class="label">Mehr</h1></header>
  <section class="set">
    <h2 class="sub-head">Meine Kaliber</h2>
    ${mine.length
      ? `<div class="my-cals">${mine.map((c) => `<span class="my-cal">${S.cart(c, { height: 46 })}<span>${esc(c.name)}</span></span>`).join('')}</div>
         <p class="muted">Nur diese Kaliber erscheinen in den Auswahllisten.</p>`
      : '<p class="muted">Wähle die Kaliber aus, die du schießt. Dann erscheinen nur diese in den Auswahllisten, statt aller 24.</p>'}
    <button class="btn-secondary" data-action="pickCalibers">${mine.length ? 'Auswahl ändern' : 'Kaliber auswählen'}</button>
  </section>
  <section class="set">
    <h2 class="sub-head">Patronenbilder</h2>
    <div class="style-pick">${styleBtn('real', 'Realistisch')}${styleBtn('line', 'Technische Zeichnung')}</div>
  </section>
  <section class="set">
    <h2 class="sub-head">Erscheinungsbild</h2>
    <div class="seg-row">${themeBtn('dark', 'Dunkel')}${themeBtn('light', 'Hell')}${themeBtn('auto', 'Wie iPhone')}</div>
  </section>
  <section class="set" id="backup">
    <h2 class="sub-head">Sicherung und Abgleich</h2>
    <p class="muted">Alle Daten liegen nur auf diesem Gerät: ${counts}. Sichere sie regelmäßig als Datei. Dieselbe Datei gleicht auch iPhone und iPad ab.</p>
    <p>${st.lastBackup ? `Letzte Sicherung: <b>${dateDE(st.lastBackup)}</b>` : '<b>Noch keine Sicherung angelegt.</b>'}</p>
    <div class="btn-row">
      <button class="btn-primary" data-action="exportData">Sicherung erstellen</button>
      <button class="btn-secondary" data-action="importData">Datei laden</button>
    </div>
    <details class="howto">
      <summary>So gleichst du iPhone und iPad ab</summary>
      <ol>
        <li>Auf dem iPhone <b>Sicherung erstellen</b> und per <b>AirDrop</b> ans iPad schicken.</li>
        <li>Auf dem iPad <b>Datei laden</b> und <b>Zusammenführen</b> wählen.</li>
        <li>Auf dem iPad gleich <b>Zurückschicken</b> antippen und die Datei aufs iPhone schicken. Dort ebenfalls zusammenführen.</li>
      </ol>
      <p class="muted">Danach haben beide Geräte denselben Stand. Was du auf einem Gerät gelöscht hast, verschwindet dabei auch auf dem anderen.</p>
    </details>
    <input type="file" id="importFile" accept="application/json,.json" hidden>
  </section>
  <section class="set">
    <h2 class="sub-head">Gelernte Packungen</h2>
    ${S.state.packs.length ? `<div class="cal-list">${S.state.packs.map((p) => {
      const l = S.load(p.loadId);
      return `<button class="cal-row" data-action="editPack" data-id="${esc(p.id)}">${S.cart(S.caliber(l?.caliberId), { height: 40 }, l)}<span>${esc(l ? S.loadLabel(l) : 'Sorte gelöscht')}<small>${p.ambiguous ? 'nicht eindeutig, wird ignoriert' : `${fmt(p.perPack)} pro Packung`}, ${p.kind === 'qr' ? 'QR' : 'EAN'} ${esc(p.code)}</small></span></button>`;
    }).join('')}</div>` : '<p class="muted">Noch keine. Scanne im Bestand eine Packung über das Strichcode-Symbol, dann merkt sich die App sie hier.</p>'}
  </section>
  <section class="set">
    <h2 class="sub-head">Eigene Kaliber</h2>
    <p class="muted">${S.state.calibers.length - custom.length} Kaliber sind vorinstalliert. Fehlt deins, leg es hier an. Das Bild wird aus den Maßen gezeichnet.</p>
    ${custom.length ? `<div class="cal-list">${custom.map((c) => `<button class="cal-row" data-action="editCaliber" data-id="${c.id}">${S.cart(c, { height: 44 })}<span>${esc(c.name)}<small>${FAMILY_LABELS[c.family]}</small></span></button>`).join('')}</div>` : ''}
    <button class="btn-secondary" data-action="newCaliber">Eigenes Kaliber anlegen</button>
  </section>
  <section class="set">
    <h2 class="sub-head">Handbuch</h2>
    <p class="muted">Alle Funktionen Schritt für Schritt mit Bildern, dazu eine Kurzübersicht für den Stand. Funktioniert auch ohne Empfang.</p>
    <a class="btn-secondary btn-link" href="./handbuch/handbuch.html">Handbuch öffnen</a>
  </section>
  <section class="set">
    <h2 class="sub-head">Datenschutz</h2>
    <p class="muted">Die App hat kein Konto, keine Cloud, keine Werbung und keine Statistik-Dienste. Sie lädt nach der Installation nichts mehr aus dem Internet und darf technisch auch keine Verbindung nach außen aufbauen. Deine Daten verlassen das Gerät nur, wenn du selbst eine Sicherung erstellst und weitergibst.</p>
  </section>
  <section class="set">
    <button class="btn-danger" data-action="wipe">Alle Daten löschen</button>
  </section>
  <p class="version muted">Ammo Tracker, Version ${APP_VERSION.number} vom ${APP_VERSION.date}</p>`;
}

// ---- Sicherung -----------------------------------------------------------

async function exportData() {
  const json = JSON.stringify(S.exportData(), null, 1);
  const name = `ammo-tracker-${today()}.json`;
  const file = new File([json], name, { type: 'application/json' });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Ammo-Tracker-Sicherung' });
    } else {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
  } catch (e) {
    if (e?.name === 'AbortError') return; // Teilen abgebrochen
    if (e?.name === 'NotAllowedError') { toast('Bitte jetzt auf „Sicherung erstellen“ tippen.'); return; }
    toast('Sicherung konnte nicht erstellt werden.');
    return;
  }
  await S.setSetting('lastBackup', nowLocal());
  toast('Sicherung erstellt');
  S.render();
}

function importData() {
  const input = document.getElementById('importFile');
  input.value = '';
  input.onchange = async () => {
    const f = input.files?.[0];
    if (!f) return;
    let obj;
    try { obj = JSON.parse(await f.text()); } catch { return toast('Die Datei ist keine gültige Sicherung.'); }
    const v = validateBackup(obj);
    if (!v.ok) return toast(v.errors[0]);
    const d = obj.data;
    const n = (k) => (d[k] || []).length;
    const r = await sheet({
      title: 'Datei laden',
      submit: null,
      intro: `<p class="sheet-text">Die Datei vom ${dateDE(obj.exported)} enthält ${n('loads')} Sorten, ${n('purchases')} Einkäufe, ${n('sessions')} Trainings und ${n('firearms')} Waffen.</p>
        <p class="sheet-text muted"><b>Zusammenführen</b> behält alles von diesem Gerät und ergänzt, was neu ist. <b>Ersetzen</b> löscht die Daten auf diesem Gerät und übernimmt nur die Datei.</p>`,
      extra: [
        { label: 'Zusammenführen', action: 'merge', primary: true },
        { label: 'Alles ersetzen', action: 'replace', danger: true },
      ],
    });
    if (!r) return;
    S.markStockChange();
    S.state.fx.introDone = false;
    if (r.action === 'replace') {
      if (!await confirmSheet('Alles ersetzen?', 'Alle Daten auf diesem Gerät werden durch die Datei ersetzt. Was nur hier eingetragen war, geht verloren.', 'Ersetzen', true)) return;
      await S.replaceAll(d, { ...obj.settings, lastBackup: S.state.settings.lastBackup }, obj.tombstones || {});
      toast('Datei geladen');
      return S.render();
    }
    const stats = await S.mergeIn(obj);
    S.render();
    const parts = [
      stats.added ? `${fmt(stats.added)} neu` : '',
      stats.updated ? `${fmt(stats.updated)} aktualisiert` : '',
      stats.removed ? `${fmt(stats.removed)} entfernt` : '',
    ].filter(Boolean);
    const back = await sheet({
      title: 'Zusammengeführt',
      submit: null,
      intro: `<p class="sheet-text">${parts.length ? `Einträge: ${parts.join(', ')}.` : 'Beide Stände waren schon gleich.'}</p>
        <p class="sheet-text muted">Damit das andere Gerät auch auf diesem Stand ist, schick ihm jetzt eine Sicherung zurück und führe sie dort ebenfalls zusammen.</p>`,
      extra: [{ label: 'Zurückschicken', action: 'send', primary: true }, { label: 'Später', action: 'later' }],
    });
    if (back?.action === 'send') await exportData();
  };
  input.click();
}

async function wipe() {
  if (!await confirmSheet('Alle Daten löschen?', 'Sorten, Einkäufe, Trainings, Waffen und eigene Kaliber werden gelöscht. Das lässt sich nicht rückgängig machen. Erstelle vorher eine Sicherung, wenn du die Daten noch brauchst.', 'Weiter', true)) return;
  if (!await confirmSheet('Wirklich löschen?', 'Letzte Rückfrage: Alles auf diesem Gerät wird gelöscht.', 'Endgültig löschen', true)) return;
  await S.replaceAll({}, {});
  toast('Alle Daten gelöscht');
  S.state.tab = 'stock';
  S.render();
}

// ---- Eigene Kaliber --------------------------------------------------------

async function editCaliber(c) {
  const isNew = !c;
  const used = c && (S.state.loads.some((l) => l.caliberId === c.id) || S.state.firearms.some((f) => f.caliberId === c.id));
  const famOpts = Object.entries(FAMILY_LABELS).map(([value, label]) => ({ value, label }));
  const r = await sheet({
    title: isNew ? 'Eigenes Kaliber' : c.name,
    fields: [
      { name: 'name', label: 'Name', value: c?.name, required: true, placeholder: 'z. B. 9,3 × 62' },
      { name: 'family', label: 'Bauform', type: 'select', options: famOpts, value: c?.family || 'rifle' },
      { name: 'bullet', label: 'Geschossdurchmesser (mm)', type: 'number', inputmode: 'decimal', value: c ? String(c.dims.bullet || c.dims.base).replace('.', ',') : '', required: true },
      { name: 'caseLen', label: 'Hülsenlänge (mm)', type: 'number', inputmode: 'decimal', value: c ? String(c.dims.caseLen).replace('.', ',') : '', required: true },
      { name: 'oal', label: 'Gesamtlänge (mm)', type: 'number', inputmode: 'decimal', value: c ? String(c.dims.oal).replace('.', ',') : '', placeholder: 'optional, sonst geschätzt' },
    ],
    submit: isNew ? 'Anlegen' : 'Sichern',
    extra: isNew ? [] : [{ label: 'Kaliber löschen', action: 'delete', danger: true }],
    validate: (v) => {
      if (!(v.bullet > 2 && v.bullet < 25)) return 'Der Geschossdurchmesser sollte zwischen 2 und 25 mm liegen.';
      if (!(v.caseLen > 5 && v.caseLen < 120)) return 'Die Hülsenlänge sollte zwischen 5 und 120 mm liegen.';
      if (v.oal && v.oal < v.caseLen) return 'Die Gesamtlänge muss größer als die Hülsenlänge sein.';
      return '';
    },
  });
  if (!r) return;
  if (r.action === 'delete') {
    if (used) return toast('Das Kaliber wird noch von einer Sorte oder Waffe benutzt.');
    if (!await confirmSheet('Kaliber löschen?', `„${c.name}“ wird gelöscht.`, 'Löschen', true)) return;
    await S.remove('calibers', c.id);
    return S.render();
  }
  const v = r.values;
  const dims = guessDims(v.family, v.bullet, v.caseLen);
  if (v.oal) {
    const scale = (v.oal - dims.caseLen) / (dims.oal - dims.caseLen || 1);
    dims.oal = v.oal;
    if (scale <= 0) dims.oal = dims.caseLen;
  }
  const bullet = { pistol: 'fmj', revolver: 'lead', rimfire: 'lead', rifle: 'spitzer', shotgun: 'none' }[v.family];
  const caseColor = v.family === 'shotgun' ? 'red' : 'brass';
  await S.save('calibers', { ...(c || {}), name: v.name, family: v.family, dims, bullet, caseColor, custom: true });
  toast(isNew ? 'Kaliber angelegt' : 'Gespeichert');
  S.render();
}

async function pickCalibers() {
  const order = Object.keys(FAMILY_LABELS);
  const used = new Set([...S.state.loads.map((l) => l.caliberId), ...S.state.firearms.map((f) => f.caliberId)]);
  const options = S.state.calibers.slice()
    .sort((a, b) => order.indexOf(a.family) - order.indexOf(b.family) || a.name.localeCompare(b.name, 'de'))
    .map((c) => ({ value: c.id, label: c.name, group: c.custom ? 'Eigene Kaliber' : FAMILY_LABELS[c.family] }));
  const current = S.state.settings.myCalibers?.length ? S.state.settings.myCalibers : [...used];
  const r = await sheet({
    title: 'Meine Kaliber',
    intro: '<p class="sheet-text">Tipp alle Kaliber an, die du schießt. Kaliber, die schon zu einer Sorte oder Waffe gehören, bleiben immer auswählbar.</p>',
    fields: [{ name: 'cals', label: 'Kaliber', type: 'checks', options, value: current }],
    submit: 'Fertig',
  });
  if (!r) return;
  await S.setSetting('myCalibers', r.values.cals);
  toast(r.values.cals.length ? `${r.values.cals.length} Kaliber ausgewählt` : 'Alle Kaliber werden angezeigt');
  S.render();
}

async function editPack(p) {
  if (!p) return;
  const l = S.load(p.loadId);
  const r = await sheet({
    title: 'Gelernte Packung',
    intro: `<p class="sheet-text">${esc(l ? S.loadLabel(l) : 'Sorte gelöscht')}</p><p class="code-line"><span class="muted">${p.kind === 'qr' ? 'QR-Code' : 'Strichcode'}</span> <code>${esc(p.code)}</code></p>`,
    fields: [{ name: 'perPack', label: 'Patronen pro Packung', type: 'number', value: p.perPack, required: true }],
    submit: 'Sichern',
    extra: [{ label: 'Verknüpfung löschen', action: 'delete', danger: true }],
  });
  if (!r) return;
  if (r.action === 'delete') {
    await S.remove('packs', p.id);
    toast('Verknüpfung gelöscht. Beim nächsten Scan fragt die App neu.');
  } else {
    await S.save('packs', { ...p, perPack: r.values.perPack || p.perPack });
    toast('Gespeichert');
  }
  S.render();
}

export const actions = {
  editPack: (el) => editPack(S.state.packs.find((p) => p.id === el.dataset.id)),
  pickCalibers,
  setStyle: async (el) => { await S.setSetting('cartridgeStyle', el.dataset.v); S.render(); },
  setTheme: async (el) => { await S.setSetting('theme', el.dataset.v); S.render(); },
  exportData,
  importData,
  wipe,
  newCaliber: () => editCaliber(null),
  editCaliber: (el) => editCaliber(S.caliber(el.dataset.id)),
};
