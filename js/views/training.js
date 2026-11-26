// Training: starten, Durchgänge eintragen, beenden
import * as S from '../store.js';
import { esc, fmt, eur, nowLocal, timeDE, dateDE, sheet, confirmSheet, toast, ICONS } from '../ui.js';
import { sessionSummary, newId, fitsFirearm } from '../model.js';
import { countUp, ejectCasings } from '../anim.js';

const QUICK = [5, 10, 15, 20, 25, 50];

const sessionShots = (s) => (s.strings || []).reduce((a, x) => a + (Number(x.qty) || 0), 0);

function remaining(s, loadId) {
  const base = S.stock().get(loadId) || 0;
  const used = (s.strings || []).filter((x) => x.loadId === loadId).reduce((a, x) => a + x.qty, 0);
  return base - used;
}

export function render() {
  const s = S.activeSession();
  const loads = S.state.loads.filter((l) => !l.archived);

  if (!s) {
    const last = S.state.sessions.filter((x) => x.status === 'done').sort((a, b) => b.start.localeCompare(a.start))[0];
    return `<header class="page-head"><h1 class="label">Training</h1></header>
    <div class="start-card">
      ${S.cart(S.caliber(S.load(S.state.settings.lastLoad)?.caliberId || 'c-9luger'), { height: 110 }, S.load(S.state.settings.lastLoad))}
      ${loads.length
        ? `<button class="btn-primary btn-big" data-action="start">Training starten</button>
           <p class="muted">Nach jedem Durchgang trägst du die Anzahl ein. Vom Bestand abgezogen wird erst, wenn du das Training beendest.</p>`
        : `<p>Bevor du ein Training startest, lege unter „Bestand“ mindestens eine Munitionssorte an.</p>
           <button class="btn-primary" data-action="toStock">Zum Bestand</button>`}
    </div>
    ${last ? `<div class="last-card"><span class="muted">Letztes Training</span>
      <b>${dateDE(last.start)}${last.range ? `, ${esc(last.range)}` : ''}</b>
      <span>${fmt(sessionShots(last))} Schuss, ${eur(sessionSummary(last, S.state.purchases).cost)}</span></div>` : ''}`;
  }

  const ld = S.load(s.currentLoad);
  const fa = S.firearm(s.currentFirearm);
  const cal = S.caliber(ld?.caliberId);
  const total = sessionShots(s);
  const sum = sessionSummary(s, S.state.purchases);
  const rest = ld ? remaining(s, ld.id) : 0;
  const strings = (s.strings || []).slice().reverse();

  return `<header class="page-head"><h1 class="label">Training</h1>
    <span class="head-meta">seit ${timeDE(s.start)} Uhr${s.range ? `<br>${esc(s.range)}` : ''}</span></header>
  <div class="counter">
    <div class="num" data-counter>${fmt(total)}</div>
    <div class="sub">Schuss in diesem Training${sum.cost ? `, ${eur(sum.cost)}` : ''}</div>
  </div>
  <div class="chip-row">
    <button class="chip" data-action="choose">
      ${cal ? S.cart(cal, { height: 40 }, ld) : ''}
      <span><b>${fa ? esc(fa.name) : 'Ohne Waffe'}</b>${ld ? esc(S.loadLabel(ld)) : 'Sorte wählen'}</span>
      <span class="rest${rest < 0 ? ' neg' : ''}">${ld ? `noch ${fmt(rest)}` : ''}</span>
      <span class="chev">${ICONS.chevron}</span>
    </button>
  </div>
  <div class="quick" role="group" aria-label="Durchgang eintragen">
    ${QUICK.map((n) => `<button data-action="add" data-n="${n}" ${ld ? '' : 'disabled'} aria-label="${n} Schuss eintragen">${n}</button>`).join('')}
    <button class="other" data-action="addOther" data-n="other" ${ld ? '' : 'disabled'}>Andere Anzahl</button>
  </div>
  ${strings.length ? `<ol class="strings" reversed>${strings.map((x, i) => {
    const l = S.load(x.loadId);
    const f = S.firearm(x.firearmId);
    return `<li class="string">
      <span class="n">${strings.length - i}.</span>
      <span class="what">${esc(f?.name || S.caliber(l?.caliberId)?.name || '')}<small>${esc(S.loadLabel(l))}, ${timeDE(x.time)}</small></span>
      <span class="num">${fmt(x.qty)}</span>
      <button class="icon-btn ghost" data-action="delString" data-id="${x.id}" aria-label="Durchgang löschen">${ICONS.trash}</button>
    </li>`;
  }).join('')}</ol>` : '<p class="hint-center muted">Noch kein Durchgang. Tipp nach dem Schießen auf die Anzahl.</p>'}
  <div class="finish-row">
    <button class="btn-secondary" data-action="discard">Verwerfen</button>
    <button class="btn-primary" data-action="finish">Training beenden</button>
  </div>`;
}

export function mount(root) {
  const fx = S.state.fx.add;
  if (!fx) return;
  S.state.fx.add = null;
  countUp(root.querySelector('[data-counter]'), fx.from, fx.to, 450);
  ejectCasings(root.querySelector(`[data-n="${fx.n}"]`), fx.qty);
}

// ---- Aktionen ------------------------------------------------------------

function firearmOptions() {
  return [{ value: '', label: 'Ohne Waffe' }, ...S.state.firearms.map((f) => ({ value: f.id, label: f.name, group: 'Waffen' }))];
}
function loadOptions() {
  return [{ value: '', label: 'Passend zur Waffe (zuletzt benutzt)' }, ...S.state.loads.filter((l) => !l.archived).map((l) => ({
    value: l.id, label: `${S.loadLabel(l)} (${fmt(S.stock().get(l.id) || 0)})`, group: S.caliber(l.caliberId)?.name || 'Sonstige',
  }))];
}

// Sorte zur Waffe finden: zuletzt benutzte, sonst die mit dem größten Bestand im eigenen Kaliber,
// erst danach eine verträgliche (z. B. 12/70 für eine 12/76-Flinte)
function guessLoad(firearmId) {
  const st = S.state.settings;
  if (firearmId) {
    const last = st.lastLoadByFirearm?.[firearmId];
    if (S.load(last) && !S.load(last).archived) return last;
    const fa = S.firearm(firearmId);
    const stock = S.stock();
    const best = (ok) => S.state.loads.filter((l) => !l.archived && ok(l))
      .sort((a, b) => (stock.get(b.id) || 0) - (stock.get(a.id) || 0))[0];
    const match = fa && (best((l) => l.caliberId === fa.caliberId) || best((l) => fitsFirearm(l.caliberId, fa.caliberId)));
    if (match) return match.id;
  }
  if (S.load(st.lastLoad) && !S.load(st.lastLoad).archived) return st.lastLoad;
  return S.state.loads.find((l) => !l.archived)?.id || '';
}

async function choose(s, intro = '') {
  const r = await sheet({
    title: 'Waffe und Munition',
    intro,
    fields: [
      { name: 'firearm', label: 'Waffe', type: 'select', options: firearmOptions(), value: s.currentFirearm || '' },
      { name: 'load', label: 'Munitionssorte', type: 'select', options: loadOptions(), value: s.currentLoad && intro === '' ? s.currentLoad : '' },
    ],
    submit: 'Übernehmen',
    validate: (v) => {
      const lid = v.load || guessLoad(v.firearm);
      if (!lid) return 'Bitte eine Munitionssorte wählen.';
      const fa = S.firearm(v.firearm);
      if (fa?.caliberId && v.load && !fitsFirearm(S.load(v.load)?.caliberId, fa.caliberId)) {
        return `Diese Sorte passt nicht zum Kaliber der Waffe (${S.caliber(fa.caliberId)?.name}).`;
      }
      return '';
    },
  });
  if (!r) return false;
  s.currentFirearm = r.values.firearm;
  s.currentLoad = r.values.load || guessLoad(r.values.firearm);
  await S.save('sessions', s);
  return true;
}

async function start() {
  const r = await sheet({
    title: 'Training starten',
    fields: [{ name: 'range', label: 'Stand oder Verein', value: S.state.settings.lastRange, placeholder: 'optional' }],
    submit: 'Starten',
  });
  if (!r) return;
  const st = S.state.settings;
  const s = {
    id: newId(), start: nowLocal(), end: null, range: r.values.range, status: 'active', strings: [],
    currentFirearm: S.firearm(st.lastFirearm) ? st.lastFirearm : '',
  };
  s.currentLoad = guessLoad(s.currentFirearm);
  await S.save('sessions', s);
  await S.setSetting('lastRange', r.values.range);
  S.render();
  // Ohne bekannte Auswahl gleich fragen, womit geschossen wird
  if (!st.lastLoad || S.state.firearms.length) {
    if (await choose(s, '<p class="sheet-text">Womit schießt du zuerst? Wechseln kannst du jederzeit.</p>')) S.render();
  }
}

async function addShots(n) {
  const s = S.activeSession();
  if (!s || !s.currentLoad || !(n > 0)) return;
  const from = sessionShots(s);
  s.strings = [...(s.strings || []), { id: newId(), time: nowLocal(), firearmId: s.currentFirearm || '', loadId: s.currentLoad, qty: n }];
  await S.save('sessions', s);
  const st = S.state.settings;
  await S.setSetting('lastLoad', s.currentLoad);
  await S.setSetting('lastFirearm', s.currentFirearm || '');
  if (s.currentFirearm) await S.setSetting('lastLoadByFirearm', { ...st.lastLoadByFirearm, [s.currentFirearm]: s.currentLoad });
  return from;
}

export const actions = {
  start,
  toStock: () => { S.state.tab = 'stock'; S.render(); },
  choose: async () => { if (await choose(S.activeSession())) S.render(); },
  add: async (el) => {
    const n = Number(el.dataset.n);
    const from = await addShots(n);
    if (from === undefined) return;
    S.state.fx.add = { from, to: from + n, n, qty: n };
    navigator.vibrate?.(15);
    S.render();
  },
  addOther: async () => {
    const r = await sheet({
      title: 'Durchgang eintragen',
      fields: [{ name: 'qty', label: 'Anzahl Schuss', type: 'number', required: true, autofocus: true }],
      submit: 'Eintragen',
      validate: (v) => (v.qty > 0 && Number.isInteger(v.qty) ? '' : 'Bitte eine ganze Zahl größer als 0 eingeben.'),
    });
    if (!r) return;
    const from = await addShots(r.values.qty);
    if (from === undefined) return;
    S.state.fx.add = { from, to: from + r.values.qty, n: 'other', qty: r.values.qty };
    S.render();
  },
  delString: async (el) => {
    const s = S.activeSession();
    const idx = s.strings.findIndex((x) => x.id === el.dataset.id);
    if (idx < 0) return;
    const [removed] = s.strings.splice(idx, 1);
    await S.save('sessions', s);
    S.render();
    toast(`Durchgang mit ${removed.qty} Schuss gelöscht`, async () => {
      s.strings.splice(idx, 0, removed);
      await S.save('sessions', s);
      S.render();
    });
  },
  discard: async () => {
    const s = S.activeSession();
    const n = sessionShots(s);
    const ok = await confirmSheet('Training verwerfen?',
      n ? `Die ${fmt(n)} eingetragenen Schuss werden nicht gespeichert und nicht vom Bestand abgezogen.` : 'Das Training wird ohne Einträge geschlossen.',
      'Verwerfen', true);
    if (!ok) return;
    await S.remove('sessions', s.id);
    S.render();
  },
  finish: async () => {
    const s = S.activeSession();
    const sum = sessionSummary(s, S.state.purchases);
    if (!sum.shots) return actions.discard();
    const intro = `<div class="summary">
      <div class="summary-total"><span class="num">${fmt(sum.shots)}</span><span>Schuss${sum.cost ? `, ${eur(sum.cost)}` : ''}</span></div>
      <ul class="mini-list">${sum.byLoad.map((b) => {
        const l = S.load(b.loadId);
        return `<li><span>${esc(S.caliber(l?.caliberId)?.name || '')}: ${esc(S.loadLabel(l))}</span><span>${fmt(b.qty)}${b.cost ? `, ${eur(b.cost)}` : ''}</span></li>`;
      }).join('')}</ul>
      <p class="muted">Diese Mengen werden jetzt vom Bestand abgezogen.</p></div>`;
    const r = await sheet({
      title: 'Training beenden', submit: null, intro,
      extra: [{ label: 'Abschließen und abziehen', action: 'done', primary: true }, { label: 'Weiter schießen', action: 'back' }],
    });
    if (r?.action !== 'done') return;
    S.markStockChange();
    await S.save('sessions', { ...s, status: 'done', end: nowLocal() });
    S.state.tab = 'stock';
    toast(`Training gespeichert: ${fmt(sum.shots)} Schuss`);
    S.render();
  },
};
