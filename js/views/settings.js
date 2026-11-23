// Mehr: Patronenbilder, Design, Datensicherung, eigene Kaliber, Datenschutz
import * as S from '../store.js';
import { esc, fmt, dateDE, today, nowLocal, sheet, confirmSheet, toast } from '../ui.js';
import { validateBackup } from '../model.js';
import { FAMILY_LABELS, guessDims } from '../calibers.js';
import { cartridgeSVG } from '../cartridge-svg.js';

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
    <h2 class="sub-head">Datensicherung</h2>
    <p class="muted">Alle Daten liegen nur auf diesem Gerät: ${counts}. Sichere sie regelmäßig als Datei, zum Beispiel in der Dateien-App. Damit kannst du sie auch auf ein anderes Gerät übertragen.</p>
    <p>${st.lastBackup ? `Letzte Sicherung: <b>${dateDE(st.lastBackup)}</b>` : '<b>Noch keine Sicherung angelegt.</b>'}</p>
    <div class="btn-row">
      <button class="btn-primary" data-action="exportData">Sicherung erstellen</button>
      <button class="btn-secondary" data-action="importData">Sicherung laden</button>
    </div>
    <input type="file" id="importFile" accept="application/json,.json" hidden>
  </section>
  <section class="set">
    <h2 class="sub-head">Eigene Kaliber</h2>
    <p class="muted">${S.state.calibers.length - custom.length} Kaliber sind vorinstalliert. Fehlt deins, leg es hier an. Das Bild wird aus den Maßen gezeichnet.</p>
    ${custom.length ? `<div class="cal-list">${custom.map((c) => `<button class="cal-row" data-action="editCaliber" data-id="${c.id}">${S.cart(c, { height: 44 })}<span>${esc(c.name)}<small>${FAMILY_LABELS[c.family]}</small></span></button>`).join('')}</div>` : ''}
    <button class="btn-secondary" data-action="newCaliber">Eigenes Kaliber anlegen</button>
  </section>
  <section class="set">
    <h2 class="sub-head">Datenschutz</h2>
    <p class="muted">Die App hat kein Konto, keine Cloud, keine Werbung und keine Statistik-Dienste. Sie lädt nach der Installation nichts mehr aus dem Internet und darf technisch auch keine Verbindung nach außen aufbauen. Deine Daten verlassen das Gerät nur, wenn du selbst eine Sicherung erstellst und weitergibst.</p>
  </section>
  <section class="set">
    <button class="btn-danger" data-action="wipe">Alle Daten löschen</button>
  </section>
  <p class="version muted">Ammo Tracker, Version 1.0</p>`;
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
    const ok = await confirmSheet('Sicherung laden?',
      `Die Sicherung vom ${dateDE(obj.exported)} enthält ${n('loads')} Sorten, ${n('purchases')} Einkäufe, ${n('sessions')} Trainings und ${n('firearms')} Waffen. Sie ersetzt alle Daten, die jetzt auf diesem Gerät sind.`,
      'Ersetzen und laden', true);
    if (!ok) return;
    await S.replaceAll(d, { ...obj.settings, lastBackup: S.state.settings.lastBackup });
    S.state.fx.introDone = false;
    toast('Sicherung geladen');
    S.render();
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

export const actions = {
  pickCalibers,
  setStyle: async (el) => { await S.setSetting('cartridgeStyle', el.dataset.v); S.render(); },
  setTheme: async (el) => { await S.setSetting('theme', el.dataset.v); S.render(); },
  exportData,
  importData,
  wipe,
  newCaliber: () => editCaliber(null),
  editCaliber: (el) => editCaliber(S.caliber(el.dataset.id)),
};
