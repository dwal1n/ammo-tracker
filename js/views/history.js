// Verlauf: Statistik und alle Trainings, Einkäufe, Korrekturen
import * as S from '../store.js';
import { esc, fmt, eur, dateDE, timeDE, monthShort, sheet, confirmSheet, toast, uniqueList } from '../ui.js';
import { DEALERS } from '../calibers.js';
import { monthlyStats, sessionSummary } from '../model.js';

function chart(rows) {
  const max = Math.max(1, ...rows.map((r) => r.shots));
  const W = 340, H = 140, gap = 6, bw = (W - gap * (rows.length - 1)) / rows.length;
  const bars = rows.map((r, i) => {
    const h = Math.round((r.shots / max) * (H - 26));
    const x = i * (bw + gap);
    return `<g><title>${monthShort(r.month)}: ${fmt(r.shots)} Schuss</title>
      <rect x="${x.toFixed(1)}" y="${H - 16 - h}" width="${bw.toFixed(1)}" height="${Math.max(h, r.shots ? 2 : 0)}" rx="2" class="bar${i === rows.length - 1 ? ' cur' : ''}"/>
      <text x="${(x + bw / 2).toFixed(1)}" y="${H - 2}" text-anchor="middle" class="axis">${monthShort(r.month)}</text></g>`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Schuss pro Monat, letzte 12 Monate">${bars}</svg>`;
}

export function render() {
  const now = new Date();
  const rows = monthlyStats(S.state, 12, now);
  const year = String(now.getFullYear());
  const done = S.state.sessions.filter((s) => s.status === 'done');
  const yearSessions = done.filter((s) => s.start.startsWith(year));
  const yShots = yearSessions.reduce((a, s) => a + sessionSummary(s, S.state.purchases).shots, 0);
  const yCost = yearSessions.reduce((a, s) => a + sessionSummary(s, S.state.purchases).cost, 0);
  const ySpent = S.state.purchases.filter((p) => String(p.date).startsWith(year) && p.dealer !== 'Anfangsbestand').reduce((a, p) => a + (Number(p.totalPrice) || 0), 0);

  // Meistgeschossene Kaliber im Jahr
  const perCal = new Map();
  for (const s of yearSessions) for (const x of s.strings || []) {
    const c = S.load(x.loadId)?.caliberId;
    if (c) perCal.set(c, (perCal.get(c) || 0) + x.qty);
  }
  const top = [...perCal].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const topMax = top[0]?.[1] || 1;

  // Chronik
  const items = [
    ...done.map((s) => ({ kind: 'session', date: s.start, s })),
    ...S.state.purchases.map((p) => ({ kind: 'purchase', date: p.date, p })),
    ...S.state.adjustments.map((a) => ({ kind: 'adjust', date: a.date, a })),
  ].sort((a, b) => String(b.date).localeCompare(String(a.date)));

  const item = (it) => {
    if (it.kind === 'session') {
      const sum = sessionSummary(it.s, S.state.purchases);
      const cals = [...new Set((it.s.strings || []).map((x) => S.caliber(S.load(x.loadId)?.caliberId)?.name).filter(Boolean))].join(', ');
      return `<button class="hist-item" data-action="openSession" data-id="${it.s.id}">
        <span class="kind k-session">Training</span>
        <span class="what"><b>${dateDE(it.s.start)}${it.s.range ? `, ${esc(it.s.range)}` : ''}</b><small>${esc(cals)}</small></span>
        <span class="amt"><span class="num">−${fmt(sum.shots)}</span><small>${sum.cost ? eur(sum.cost) : ''}</small></span></button>`;
    }
    if (it.kind === 'purchase') {
      const l = S.load(it.p.loadId);
      return `<button class="hist-item" data-action="openPurchase" data-id="${it.p.id}">
        <span class="kind k-buy">${it.p.dealer === 'Anfangsbestand' ? 'Start' : 'Einkauf'}</span>
        <span class="what"><b>${dateDE(it.p.date)}${it.p.dealer && it.p.dealer !== 'Anfangsbestand' ? `, ${esc(it.p.dealer)}` : ''}</b><small>${esc(S.caliber(l?.caliberId)?.name || '')}: ${esc(S.loadLabel(l))}</small></span>
        <span class="amt"><span class="num pos">+${fmt(it.p.qty)}</span><small>${it.p.totalPrice ? eur(it.p.totalPrice) : ''}</small></span></button>`;
    }
    const l = S.load(it.a.loadId);
    return `<button class="hist-item" data-action="openAdjust" data-id="${it.a.id}">
      <span class="kind k-adj">Korrektur</span>
      <span class="what"><b>${dateDE(it.a.date)}${it.a.note ? `, ${esc(it.a.note)}` : ''}</b><small>${esc(S.caliber(l?.caliberId)?.name || '')}: ${esc(S.loadLabel(l))}</small></span>
      <span class="amt"><span class="num${it.a.delta > 0 ? ' pos' : ''}">${it.a.delta > 0 ? '+' : '−'}${fmt(Math.abs(it.a.delta))}</span></span></button>`;
  };

  return `<header class="page-head"><h1 class="label">Verlauf</h1></header>
  <section class="stats">
    <div class="kpis">
      <div><span class="num">${fmt(yShots)}</span><span class="muted">Schuss ${year}</span></div>
      <div><span class="num">${fmt(yearSessions.length)}</span><span class="muted">Trainings</span></div>
      <div><span class="num sm">${eur(yCost)}</span><span class="muted">verschossen</span></div>
      <div><span class="num sm">${eur(ySpent)}</span><span class="muted">eingekauft</span></div>
    </div>
    <h2 class="sub-head">Schuss pro Monat</h2>
    ${chart(rows)}
    ${top.length ? `<h2 class="sub-head">Meistgeschossen ${year}</h2><ul class="top-list">${top.map(([cid, n]) =>
      `<li><span>${esc(S.caliber(cid)?.name || cid)}</span><span class="track"><span style="width:${Math.round((n / topMax) * 100)}%"></span></span><span class="num">${fmt(n)}</span></li>`).join('')}</ul>` : ''}
  </section>
  <h2 class="sub-head pad">Chronik</h2>
  ${items.length ? `<div class="hist">${items.map(item).join('')}</div>` : '<p class="hint-center muted">Hier erscheinen deine Trainings, Einkäufe und Korrekturen.</p>'}`;
}

async function openSession(s) {
  const sum = sessionSummary(s, S.state.purchases);
  const intro = `<div class="summary">
    <div class="summary-total"><span class="num">${fmt(sum.shots)}</span><span>Schuss${sum.cost ? `, ${eur(sum.cost)}` : ''}</span></div>
    <p class="muted">${dateDE(s.start)}, ${timeDE(s.start)} bis ${timeDE(s.end)} Uhr${s.range ? `, ${esc(s.range)}` : ''}</p>
    <ol class="mini-list">${(s.strings || []).map((x, i) => {
      const l = S.load(x.loadId);
      const f = S.firearm(x.firearmId);
      return `<li><span>${i + 1}. ${esc(f?.name || '')}${f ? ', ' : ''}${esc(S.loadLabel(l))}</span><span>${fmt(x.qty)}</span></li>`;
    }).join('')}</ol></div>`;
  const r = await sheet({ title: 'Training', submit: null, intro, extra: [{ label: 'Training löschen', action: 'del', danger: true }] });
  if (r?.action !== 'del') return;
  if (!await confirmSheet('Training löschen?', `Die ${fmt(sum.shots)} Schuss werden dem Bestand wieder gutgeschrieben.`, 'Löschen', true)) return;
  S.markStockChange();
  await S.remove('sessions', s.id);
  toast('Training gelöscht');
  S.render();
}

async function openPurchase(p) {
  const r = await sheet({
    title: 'Einkauf bearbeiten',
    fields: [
      { name: 'qty', label: 'Menge (Patronen)', type: 'number', value: p.qty, required: true },
      { name: 'totalPrice', label: 'Gesamtpreis (€)', type: 'number', inputmode: 'decimal', value: p.totalPrice != null ? String(p.totalPrice).replace('.', ',') : '' },
      { name: 'dealer', label: 'Händler', value: p.dealer,
        suggestions: uniqueList(S.state.purchases.map((x) => x.dealer).filter((d) => d !== 'Anfangsbestand'), DEALERS) },
      { name: 'date', label: 'Datum', type: 'date', value: p.date, required: true },
    ],
    extra: [{ label: 'Einkauf löschen', action: 'del', danger: true }],
  });
  if (!r) return;
  S.markStockChange();
  if (r.action === 'del') {
    if (!await confirmSheet('Einkauf löschen?', `${fmt(p.qty)} Patronen werden vom Bestand abgezogen.`, 'Löschen', true)) return;
    await S.remove('purchases', p.id);
  } else {
    await S.save('purchases', { ...p, ...r.values });
  }
  S.render();
}

async function openAdjust(a) {
  const r = await sheet({
    title: 'Korrektur',
    intro: `<p class="sheet-text">${a.delta > 0 ? '+' : '−'}${fmt(Math.abs(a.delta))} Patronen am ${dateDE(a.date)}${a.note ? ` (${esc(a.note)})` : ''}.</p>`,
    submit: null,
    extra: [{ label: 'Korrektur löschen', action: 'del', danger: true }],
  });
  if (r?.action !== 'del') return;
  S.markStockChange();
  await S.remove('adjustments', a.id);
  S.render();
}

export const actions = {
  openSession: (el) => openSession(S.state.sessions.find((s) => s.id === el.dataset.id)),
  openPurchase: (el) => openPurchase(S.state.purchases.find((s) => s.id === el.dataset.id)),
  openAdjust: (el) => openAdjust(S.state.adjustments.find((s) => s.id === el.dataset.id)),
};
