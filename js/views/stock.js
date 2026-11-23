// Bestand: Patronenparade, Kaliber mit Sorten, Einkauf, Korrektur, Sorten verwalten
import * as S from '../store.js';
import { esc, fmt, eur, eurShot, today, dateDE, sheet, confirmSheet, toast, ICONS, uniqueList } from '../ui.js';
import { isLow, caliberTotals } from '../model.js';
import { BULLET_LABELS, MAKERS, DEALERS } from '../calibers.js';
import { countUp, blink, flash, paradeIntro } from '../anim.js';

const BACKUP_DAYS = 30;

export function render() {
  const st = S.stock();
  const loads = S.state.loads.filter((l) => !l.archived);
  const head = `<header class="page-head"><h1 class="label">Bestand</h1>
    <span class="head-btns">
      <button class="icon-btn" data-action="scan" aria-label="Packung scannen">${ICONS.scan}</button>
      <button class="icon-btn" data-action="newLoad" aria-label="Neue Munitionssorte">${ICONS.plus}</button>
    </span></header>`;

  if (!loads.length) {
    return `${head}<div class="empty">
      ${S.cart(S.caliber('c-9luger'), { height: 120 })}
      <h2 class="label">Noch keine Munition erfasst</h2>
      <p>Lege deine erste Sorte an, zum Beispiel „Geco FMJ 124 gr“ in 9 mm Luger. Den aktuellen Bestand kannst du gleich mit eintragen.</p>
      <button class="btn-primary" data-action="newLoad">Munitionssorte anlegen</button>
      ${S.state.settings.myCalibers?.length ? '' : '<button class="btn-secondary" data-action="goCalibers">Zuerst meine Kaliber auswählen</button>'}
    </div>`;
  }

  // Kaliber in der Reihenfolge des größten Bestands
  const totals = caliberTotals({ ...S.state, loads });
  const cals = [...new Set(loads.map((l) => l.caliberId))]
    .map((id) => S.caliber(id))
    .filter(Boolean)
    .sort((a, b) => (totals.get(b.id) || 0) - (totals.get(a.id) || 0));

  const lowCal = (c) => loads.some((l) => l.caliberId === c.id && isLow(l, st.get(l.id) || 0));

  const parade = `<div class="parade" aria-label="Kaliber im Größenvergleich">${cals.map((c) => {
    const first = loads.find((l) => l.caliberId === c.id);
    return `<button class="parade-item${lowCal(c) ? ' low' : ''}" data-action="scrollTo" data-id="${c.id}">
      <span class="pi-img">${S.cart(c, { scale: 2.4 }, first)}</span>
      <span class="num" data-count="${totals.get(c.id) || 0}">${fmt(totals.get(c.id) || 0)}</span>
      <span class="cap">${esc(c.name)}</span></button>`;
  }).join('')}</div>`;

  const rows = cals.map((c) => {
    const ls = loads.filter((l) => l.caliberId === c.id);
    const t = totals.get(c.id) || 0;
    const low = lowCal(c);
    return `<section class="stock-row${low ? ' low' : ''}" id="cal-${c.id}">
      <div class="thumb">${S.cart(c, { height: 64 }, ls[0])}</div>
      <div class="label name">${esc(c.name)}${low ? `<span class="badge-low">${ICONS.warn}Mindestbestand</span>` : ''}</div>
      <div class="num total"><span data-cal-total="${c.id}">${fmt(t)}</span><small>Schuss</small></div>
      <div class="loads">${ls.map((l) => {
        const q = st.get(l.id) || 0;
        const p = S.price(l.id);
        return `<button class="load${isLow(l, q) ? ' low' : ''}" data-action="openLoad" data-id="${l.id}">
          <span class="ln">${esc(S.loadLabel(l))}</span>
          <span class="q" data-load-qty="${l.id}">${fmt(q)}</span>
          <span class="p">${p == null ? '' : eurShot(p)}</span></button>`;
      }).join('')}</div>
    </section>`;
  }).join('');

  const lb = S.state.settings.lastBackup;
  const stale = !lb || (Date.now() - new Date(lb).getTime()) / 864e5 > BACKUP_DAYS;
  const banner = stale && S.state.purchases.length + S.state.sessions.length > 0
    ? `<button class="banner" data-action="goBackup">${ICONS.warn}<span>${lb ? `Letzte Sicherung am ${dateDE(lb)}.` : 'Noch keine Sicherung angelegt.'} Deine Daten liegen nur auf diesem Gerät. Jetzt sichern</span></button>`
    : '';

  return `${head}${parade}${banner}<div class="stock-list">${rows}</div>`;
}

export function mount(root) {
  const parade = root.querySelector('.parade');
  if (parade && !S.state.fx.introDone) {
    S.state.fx.introDone = true;
    paradeIntro(parade);
  }
  // Bestandsänderung sichtbar machen
  const before = S.state.fx.stockBefore;
  if (before) {
    S.state.fx.stockBefore = null;
    const now = S.stock();
    for (const [id, q] of now) {
      const old = before.get(id);
      if (old === undefined || old === q) continue;
      const el = root.querySelector(`[data-load-qty="${id}"]`);
      countUp(el, old, q);
      flash(el?.closest('.load'));
      const l = S.load(id);
      if (l && isLow(l, q)) blink(root.querySelector(`#cal-${CSS.escape(l.caliberId)} .badge-low`));
      // Kaliber-Summe
      if (l) {
        const tEl = root.querySelector(`[data-cal-total="${CSS.escape(l.caliberId)}"]`);
        const sumOld = S.state.loads.filter((x) => x.caliberId === l.caliberId && !x.archived).reduce((a, x) => a + (before.get(x.id) ?? now.get(x.id) ?? 0), 0);
        const sumNew = S.state.loads.filter((x) => x.caliberId === l.caliberId && !x.archived).reduce((a, x) => a + (now.get(x.id) || 0), 0);
        countUp(tEl, sumOld, sumNew);
      }
    }
  }
}

// ---- Formulare -----------------------------------------------------------

const BULLET_OPTS = [{ value: '', label: 'Wie Kaliber' }, ...Object.entries(BULLET_LABELS).filter(([k]) => k !== 'none').map(([value, label]) => ({ value, label }))];
const CASE_OPTS = [
  { value: '', label: 'Wie Kaliber' }, { value: 'brass', label: 'Messing' }, { value: 'nickel', label: 'Vernickelt' },
  { value: 'steel', label: 'Stahl (lackiert)' }, { value: 'black', label: 'Schwarz' },
  { value: 'red', label: 'Rot (Schrot)' }, { value: 'green', label: 'Grün (Schrot)' }, { value: 'blue', label: 'Blau (Schrot)' },
];

function loadFields(l = {}, isNew = false) {
  const f = [
    { name: 'caliberId', label: 'Kaliber', type: 'select', options: S.caliberOptions(l.caliberId), value: l.caliberId || S.defaultCaliber(), required: true },
    { name: 'maker', label: 'Hersteller', value: l.maker, placeholder: 'Name eintippen oder antippen',
      suggestions: uniqueList(S.state.loads.map((x) => x.maker), MAKERS) },
    { name: 'name', label: 'Bezeichnung', value: l.name, placeholder: 'z. B. FMJ, Target, Trap',
      suggestions: uniqueList(S.state.loads.map((x) => x.name), ['FMJ', 'JHP', 'LRN', 'Wadcutter', 'Target', 'Match', 'Trap', 'Skeet', 'Sport']) },
    { name: 'grain', label: 'Geschossgewicht (grain)', type: 'number', inputmode: 'decimal', value: l.grain ?? '', placeholder: 'optional' },
    { name: 'bulletType', label: 'Geschossform für das Bild', type: 'select', options: BULLET_OPTS, value: l.bulletType || '' },
    { name: 'caseColor', label: 'Hülse für das Bild', type: 'select', options: CASE_OPTS, value: l.caseColor || '' },
    { name: 'minStock', label: 'Mindestbestand', type: 'number', value: l.minStock || '', placeholder: 'leer = keine Warnung', hint: 'Fällt der Bestand darunter, wird die Sorte rot markiert.' },
  ];
  if (isNew) {
    f.push(
      { name: 'startQty', label: 'Aktueller Bestand', type: 'number', placeholder: '0', hint: 'Wie viele Patronen dieser Sorte hast du gerade?' },
      { name: 'startPrice', label: 'Bezahlter Preis für diesen Bestand (€)', type: 'number', inputmode: 'decimal', placeholder: 'optional, für Kosten pro Schuss' },
    );
  }
  return f;
}

async function editLoad(l) {
  const isNew = !l;
  const r = await sheet({
    title: isNew ? 'Neue Munitionssorte' : 'Sorte bearbeiten',
    fields: loadFields(l || {}, isNew),
    submit: isNew ? 'Anlegen' : 'Sichern',
    extra: isNew ? [] : [
      { label: l.archived ? 'Wieder einblenden' : 'Ausblenden (aufgebraucht)', action: 'archive' },
      { label: 'Sorte löschen', action: 'delete', danger: true },
    ],
  });
  if (!r) return;
  if (r.action === 'archive') {
    await S.save('loads', { ...l, archived: !l.archived });
    toast(l.archived ? 'Sorte wieder eingeblendet' : 'Sorte ausgeblendet');
    return S.render();
  }
  if (r.action === 'delete') {
    const used = S.state.sessions.some((s) => s.strings?.some((x) => x.loadId === l.id));
    const ok = await confirmSheet('Sorte löschen?',
      used ? 'Diese Sorte kommt in Trainings vor. Beim Löschen verschwinden auch ihre Einkäufe und Korrekturen. Die Trainings bleiben erhalten, zeigen die Sorte aber als unbekannt. Tipp: Mit „Ausblenden“ bleibt alles erhalten.'
        : 'Die Sorte und alle zugehörigen Einkäufe und Korrekturen werden gelöscht.', 'Endgültig löschen', true);
    if (!ok) return;
    for (const p of S.state.purchases.filter((x) => x.loadId === l.id)) await S.remove('purchases', p.id);
    for (const a of S.state.adjustments.filter((x) => x.loadId === l.id)) await S.remove('adjustments', a.id);
    await S.remove('loads', l.id);
    toast('Sorte gelöscht');
    return S.render();
  }
  const v = r.values;
  const row = {
    ...(l || {}), caliberId: v.caliberId, maker: v.maker, name: v.name, grain: v.grain,
    bulletType: v.bulletType, caseColor: v.caseColor, minStock: v.minStock || 0, archived: l?.archived || false,
  };
  S.markStockChange();
  const saved = await S.save('loads', row);
  await S.setSetting('lastCaliber', v.caliberId);
  if (isNew && v.startQty) {
    if (v.startPrice) {
      await S.save('purchases', { loadId: saved.id, date: today(), qty: v.startQty, totalPrice: v.startPrice, dealer: 'Anfangsbestand', note: '' });
    } else {
      await S.save('adjustments', { loadId: saved.id, date: today(), delta: v.startQty, note: 'Anfangsbestand' });
    }
  }
  toast(isNew ? 'Sorte angelegt' : 'Gespeichert');
  S.render();
  return saved;
}

async function purchase(l) {
  const r = await sheet({
    title: 'Einkauf',
    intro: `<p class="sheet-text">${esc(S.caliber(l.caliberId)?.name)}: ${esc(S.loadLabel(l))}</p>`,
    fields: [
      { name: 'qty', label: 'Menge (Patronen)', type: 'number', required: true, autofocus: true },
      { name: 'totalPrice', label: 'Gesamtpreis (€)', type: 'number', inputmode: 'decimal', placeholder: 'optional' },
      { name: 'dealer', label: 'Händler', value: S.state.settings.lastDealer || '', placeholder: 'optional',
        hint: 'Für Munition, die du schon länger hast: „Anfangsbestand“ wählen. Dann zählt sie nicht als Ausgabe in der Statistik.',
        suggestions: S.dealerSuggestions() },
      { name: 'date', label: 'Datum', type: 'date', value: today(), required: true },
    ],
    submit: 'Hinzufügen',
    validate: (v) => (v.qty > 0 ? '' : 'Die Menge muss größer als 0 sein.'),
  });
  if (!r) return;
  S.markStockChange();
  await S.save('purchases', { loadId: l.id, ...r.values });
  if (r.values.dealer && r.values.dealer !== S.START_DEALER) await S.setSetting('lastDealer', r.values.dealer);
  toast(`${fmt(r.values.qty)} Patronen hinzugefügt`);
  S.render();
}

async function correct(l) {
  const cur = S.stock().get(l.id) || 0;
  const r = await sheet({
    title: 'Bestand korrigieren',
    intro: `<p class="sheet-text">Laut App hast du <b>${fmt(cur)}</b> Patronen ${esc(S.loadLabel(l))}. Trag ein, wie viele du tatsächlich gezählt hast.</p>`,
    fields: [
      { name: 'actual', label: 'Tatsächlicher Bestand', type: 'number', value: cur, required: true },
      { name: 'note', label: 'Grund', placeholder: 'z. B. Inventur, verschenkt, Fehlzündung' },
    ],
    submit: 'Übernehmen',
  });
  if (!r) return;
  const delta = r.values.actual - cur;
  if (!delta) return;
  S.markStockChange();
  await S.save('adjustments', { loadId: l.id, date: today(), delta, note: r.values.note || 'Korrektur' });
  toast(`Bestand auf ${fmt(r.values.actual)} gesetzt`);
  S.render();
}

async function openLoad(l) {
  const q = S.stock().get(l.id) || 0;
  const p = S.price(l.id);
  const c = S.caliber(l.caliberId);
  const buys = S.state.purchases.filter((x) => x.loadId === l.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const intro = `<div class="load-detail">
    <div class="ld-img">${S.cart(c, { height: 130, dims: true }, l)}</div>
    <div class="ld-facts">
      <div><span class="muted">Bestand</span><b class="num">${fmt(q)}</b></div>
      <div><span class="muted">Ø pro Schuss</span><b>${p == null ? 'kein Preis' : eurShot(p)}</b></div>
      <div><span class="muted">Wert</span><b>${p == null ? '–' : eur(p * Math.max(0, q))}</b></div>
      <div><span class="muted">Mindestbestand</span><b>${l.minStock ? fmt(l.minStock) : 'keiner'}</b></div>
    </div>
  </div>
  ${buys.length ? `<h3 class="sub-head">Letzte Einkäufe</h3><ul class="mini-list">${buys.map((b) =>
    `<li><span>${dateDE(b.date)}${b.dealer ? `, ${esc(b.dealer)}` : ''}</span><span>${fmt(b.qty)} Stk.${b.totalPrice ? `, ${eur(b.totalPrice)}` : ''}</span></li>`).join('')}</ul>` : ''}`;
  const r = await sheet({
    title: `${c?.name || ''}: ${S.loadLabel(l)}`,
    submit: null,
    intro,
    extra: [
      { label: 'Einkauf eintragen', action: 'buy', primary: true },
      { label: 'Bestand korrigieren', action: 'correct' },
      { label: 'Sorte bearbeiten', action: 'edit' },
    ],
  });
  if (r?.action === 'buy') return purchase(l);
  if (r?.action === 'correct') return correct(l);
  if (r?.action === 'edit') return editLoad(l);
}

export const actions = {
  newLoad: () => editLoad(null),
  openLoad: (el) => openLoad(S.load(el.dataset.id)),
  scrollTo: (el) => document.getElementById(`cal-${el.dataset.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
  goBackup: () => { S.state.tab = 'more'; S.render(); },
  goCalibers: () => { S.state.tab = 'more'; S.render(); },
  scan: async () => (await import('../scanner.js')).scanFlow(),
};

export { editLoad };
