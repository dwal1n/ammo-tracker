// Waffen: Schusszähler und Wartungsintervall
import * as S from '../store.js';
import { esc, fmt, sheet, confirmSheet, toast, ICONS } from '../ui.js';
import { firearmCount, serviceDue } from '../model.js';

export function render() {
  const fs = S.state.firearms.slice().sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const head = `<header class="page-head"><h1 class="label">Waffen</h1>
    <button class="icon-btn" data-action="newFirearm" aria-label="Waffe hinzufügen">${ICONS.plus}</button></header>`;
  if (!fs.length) {
    return `${head}<div class="empty"><h2 class="label">Noch keine Waffe angelegt</h2>
      <p>Mit Waffen zählt die App die Schuss pro Waffe mit und erinnert dich an die Wartung. Beim Training wird dann automatisch die passende Munition vorgeschlagen.</p>
      <button class="btn-primary" data-action="newFirearm">Waffe hinzufügen</button></div>`;
  }
  return `${head}<div class="fa-list">${fs.map((f) => {
    const c = S.caliber(f.caliberId);
    const n = firearmCount(f, S.state.sessions);
    const due = serviceDue(f, n);
    const since = n - (Number(f.serviceAt) || 0);
    return `<button class="fa-row${due ? ' due' : ''}" data-action="editFirearm" data-id="${f.id}">
      <span class="thumb">${S.cart(c, { height: 56 })}</span>
      <span class="what"><b class="label">${esc(f.name)}</b><small>${esc(c?.name || '')}${f.serviceInterval ? `, Wartung alle ${fmt(f.serviceInterval)}` : ''}</small>
        ${due ? `<span class="badge-low">${ICONS.warn}Wartung fällig (${fmt(since)} seit letzter)</span>` : ''}</span>
      <span class="num total">${fmt(n)}<small>Schuss gesamt</small></span></button>`;
  }).join('')}</div>`;
}

async function edit(f) {
  const isNew = !f;
  const n = f ? firearmCount(f, S.state.sessions) : 0;
  const r = await sheet({
    title: isNew ? 'Neue Waffe' : f.name,
    fields: [
      { name: 'name', label: 'Bezeichnung', value: f?.name, required: true, placeholder: 'z. B. Glock 17, CZ Shadow 2' },
      { name: 'caliberId', label: 'Kaliber', type: 'select', options: S.caliberOptions(f?.caliberId), value: f?.caliberId || S.defaultCaliber(), required: true },
      { name: 'startCount', label: 'Schuss vor Nutzung der App', type: 'number', value: f?.startCount || '', placeholder: '0', hint: 'Bisher mit dieser Waffe verschossen, falls bekannt.' },
      { name: 'serviceInterval', label: 'Wartung alle … Schuss', type: 'number', value: f?.serviceInterval || '', placeholder: 'leer = keine Erinnerung' },
      { name: 'note', label: 'Notiz', type: 'textarea', value: f?.note },
    ],
    submit: isNew ? 'Anlegen' : 'Sichern',
    extra: isNew ? [] : [
      ...(f.serviceInterval ? [{ label: `Wartung erledigt (bei ${fmt(n)} Schuss)`, action: 'service', primary: true }] : []),
      { label: 'Waffe löschen', action: 'delete', danger: true },
    ],
  });
  if (!r) return;
  if (r.action === 'service') {
    await S.save('firearms', { ...f, serviceAt: n });
    toast('Wartung eingetragen');
    return S.render();
  }
  if (r.action === 'delete') {
    if (!await confirmSheet('Waffe löschen?', 'Die Waffe verschwindet aus der Liste. Trainings und Bestand bleiben unverändert.', 'Löschen', true)) return;
    await S.remove('firearms', f.id);
    toast('Waffe gelöscht');
    return S.render();
  }
  const v = r.values;
  await S.save('firearms', { ...(f || {}), name: v.name, caliberId: v.caliberId, startCount: v.startCount || 0, serviceInterval: v.serviceInterval || 0, note: v.note, serviceAt: f?.serviceAt || 0 });
  toast(isNew ? 'Waffe angelegt' : 'Gespeichert');
  S.render();
}

export const actions = {
  newFirearm: () => edit(null),
  editFirearm: (el) => edit(S.firearm(el.dataset.id)),
};
