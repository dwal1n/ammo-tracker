import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeData } from '../js/model.js';

const side = (data, tombstones = {}) => ({ data, tombstones });
const ids = (rows) => rows.map((r) => r.id).sort();

test('Getrennte Einträge beider Geräte werden vereint', () => {
  const a = side({ loads: [{ id: 'l1', name: 'A', updated: '2026-11-01T10:00:00' }] });
  const b = side({ loads: [{ id: 'l2', name: 'B', updated: '2026-11-02T10:00:00' }] });
  const r = mergeData(a, b);
  assert.deepEqual(ids(r.data.loads), ['l1', 'l2']);
  assert.equal(r.stats.added, 1);
  assert.equal(r.stats.updated, 0);
  assert.equal(r.stats.removed, 0);
});

test('Bei gleichem Eintrag gewinnt die neuere Fassung', () => {
  const a = side({ loads: [{ id: 'l1', name: 'alt', updated: '2026-11-01T10:00:00' }] });
  const b = side({ loads: [{ id: 'l1', name: 'neu', updated: '2026-11-05T10:00:00' }] });
  assert.equal(mergeData(a, b).data.loads[0].name, 'neu');
  assert.equal(mergeData(a, b).stats.updated, 1);
  // umgekehrt: ältere Fassung von außen ändert nichts
  const r = mergeData(b, a);
  assert.equal(r.data.loads[0].name, 'neu');
  assert.equal(r.stats.updated, 0);
});

test('Einträge ohne Zeitstempel gelten als älter', () => {
  const a = side({ loads: [{ id: 'l1', name: 'ohne' }] });
  const b = side({ loads: [{ id: 'l1', name: 'mit', updated: '2026-11-05T10:00:00' }] });
  assert.equal(mergeData(a, b).data.loads[0].name, 'mit');
});

test('Hier gelöschter Eintrag kommt vom anderen Gerät nicht zurück', () => {
  const a = side({ sessions: [] }, { s1: '2026-11-10T12:00:00' });
  const b = side({ sessions: [{ id: 's1', status: 'done', updated: '2026-11-09T19:00:00' }] });
  const r = mergeData(a, b);
  assert.equal(r.data.sessions.length, 0);
  assert.equal(r.stats.added, 0);
});

test('Auf dem anderen Gerät gelöschter Eintrag wird hier entfernt', () => {
  const a = side({ purchases: [{ id: 'p1', qty: 50, updated: '2026-11-01T10:00:00' }] });
  const b = side({ purchases: [] }, { p1: '2026-11-03T10:00:00' });
  const r = mergeData(a, b);
  assert.equal(r.data.purchases.length, 0);
  assert.equal(r.stats.removed, 1);
  assert.equal(r.tombstones.p1, '2026-11-03T10:00:00');
});

test('Nach dem Löschen erneut geänderter Eintrag bleibt erhalten', () => {
  const a = side({ loads: [{ id: 'l1', name: 'geändert', updated: '2026-11-04T10:00:00' }] });
  const b = side({ loads: [] }, { l1: '2026-11-03T10:00:00' });
  assert.equal(mergeData(a, b).data.loads.length, 1);
});

test('Löschvermerke beider Seiten werden vereint, der spätere zählt', () => {
  const a = side({}, { x: '2026-11-01T10:00:00', y: '2026-11-02T10:00:00' });
  const b = side({}, { x: '2026-11-05T10:00:00', z: '2026-11-03T10:00:00' });
  assert.deepEqual(mergeData(a, b).tombstones, { x: '2026-11-05T10:00:00', y: '2026-11-02T10:00:00', z: '2026-11-03T10:00:00' });
});

test('Identische Stände ergeben keine Änderung', () => {
  const data = { calibers: [{ id: 'c-9luger', name: '9 mm Luger' }], loads: [{ id: 'l1', updated: '2026-11-01T10:00:00' }] };
  const r = mergeData(side(structuredClone(data)), side(structuredClone(data)));
  assert.deepEqual(r.stats, { added: 0, updated: 0, removed: 0 });
});

test('Fehlende Bereiche auf einer Seite stören nicht', () => {
  const r = mergeData(side({ loads: [{ id: 'l1' }] }), side({ firearms: [{ id: 'f1' }] }));
  assert.deepEqual(ids(r.data.loads), ['l1']);
  assert.deepEqual(ids(r.data.firearms), ['f1']);
  assert.deepEqual(r.data.sessions, []);
});
