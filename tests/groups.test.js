import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupOf, fitsFirearm, stockTree, artKey, pickLoad } from '../js/model.js';
import { DEFAULT_CALIBERS } from '../js/calibers.js';

const caliberById = (id) => DEFAULT_CALIBERS.find((c) => c.id === id);

// Sorten mit Bestand über Korrekturen anlegen: [id, caliberId, art, menge]
function data(rows) {
  return {
    loads: rows.map(([id, caliberId, art]) => ({ id, caliberId, maker: 'X', name: id, art })),
    adjustments: rows.map(([id, , , qty]) => ({ id: `a-${id}`, loadId: id, delta: qty })),
    purchases: [],
    sessions: [],
  };
}

test('groupOf fasst 12/70 und 12/76 zusammen, andere Kaliber bleiben für sich', () => {
  assert.equal(groupOf('c-12-70'), 'g-12');
  assert.equal(groupOf('c-12-76'), 'g-12');
  assert.equal(groupOf('c-357'), 'g-357');
  assert.equal(groupOf('c-38spl'), 'g-357');
  assert.equal(groupOf('c-9luger'), 'c-9luger');
});

test('fitsFirearm erlaubt 12/70 in 12/76 und .38 Spl in .357, nicht umgekehrt', () => {
  assert.equal(fitsFirearm('c-12-70', 'c-12-76'), true);
  assert.equal(fitsFirearm('c-12-76', 'c-12-70'), false);
  assert.equal(fitsFirearm('c-38spl', 'c-357'), true);
  assert.equal(fitsFirearm('c-357', 'c-38spl'), false);
  assert.equal(fitsFirearm('c-9luger', 'c-9luger'), true);
  assert.equal(fitsFirearm('c-9luger', 'c-12-76'), false);
});

test('artKey ignoriert Groß-/Kleinschreibung und Leerzeichen am Rand', () => {
  assert.equal(artKey(' Buckshot '), 'buckshot');
  assert.equal(artKey(undefined), '');
  assert.equal(artKey('  '), '');
});

test('Kaliber 12: Gesamtzahl und Zwischensummen je Kaliber und Art', () => {
  const tree = stockTree(data([
    ['l76', 'c-12-76', '', 150],
    ['trap', 'c-12-70', '', 200],
    ['skeet', 'c-12-70', undefined, 50],
    ['buck1', 'c-12-70', 'Buckshot', 50],
    ['buck2', 'c-12-70', ' buckshot ', 30],
  ]), caliberById);
  assert.equal(tree.length, 1);
  const b = tree[0];
  assert.equal(b.id, 'g-12');
  assert.equal(b.name, 'Kaliber 12');
  assert.equal(b.total, 480);
  assert.deepEqual(b.subs.map((s) => s.label), ['12/70', '12/76', '12/70 Buckshot']);
  assert.deepEqual(b.subs.map((s) => s.total), [250, 150, 80]);
  assert.deepEqual(b.caliberIds, ['c-12-70', 'c-12-76']);
  const buck = b.subs[2];
  assert.equal(buck.art, 'Buckshot');
  assert.equal(buck.caliberId, 'c-12-70');
  assert.deepEqual(buck.loads.map((x) => [x.load.id, x.qty]), [['buck1', 50], ['buck2', 30]]);
});

test('Von einer Gruppe nur ein Kaliber vorhanden: Block heißt wie das Kaliber', () => {
  const [b] = stockTree(data([['trap', 'c-12-70', '', 200], ['buck', 'c-12-70', 'Buckshot', 20]]), caliberById);
  assert.equal(b.id, 'g-12');
  assert.equal(b.name, '12/70');
  assert.deepEqual(b.subs.map((s) => s.label), ['12/70', 'Buckshot']);
});

test('.22 lfB: Zwischensummen nach Art', () => {
  const [b] = stockTree(data([
    ['hv', 'c-22lr', 'High Velocity', 500],
    ['std', 'c-22lr', 'Standard', 700],
  ]), caliberById);
  assert.equal(b.name, '.22 lfB');
  assert.equal(b.total, 1200);
  assert.deepEqual(b.subs.map((s) => s.label), ['Standard', 'High Velocity']);
});

test('Sorten ohne Art ergeben genau eine Unterart mit dem Kalibernamen', () => {
  const [b] = stockTree(data([['a', 'c-22lr', '', 100], ['b', 'c-22lr', undefined, 50]]), caliberById);
  assert.equal(b.subs.length, 1);
  assert.equal(b.subs[0].label, '.22 lfB');
  assert.equal(b.subs[0].total, 150);
});

test('Sorte mit gelöschtem Kaliber wird übersprungen', () => {
  const tree = stockTree(data([['x', 'c-geloescht', '', 10], ['a', 'c-9luger', '', 5]]), caliberById);
  assert.deepEqual(tree.map((b) => b.id), ['c-9luger']);
});

test('Blöcke stehen nach Gesamtzahl, der größte zuerst', () => {
  const tree = stockTree(data([['a', 'c-9luger', '', 100], ['t', 'c-12-70', '', 300], ['u', 'c-12-76', '', 180]]), caliberById);
  assert.deepEqual(tree.map((b) => b.id), ['g-12', 'c-9luger']);
});

// ---- Vorschlag der Sorte im Training ---------------------------------------
const pl = [
  { id: 'l70', caliberId: 'c-12-70' },
  { id: 'l70b', caliberId: 'c-12-70' },
  { id: 'l76', caliberId: 'c-12-76' },
  { id: 'l9', caliberId: 'c-9luger' },
  { id: 'old76', caliberId: 'c-12-76', archived: true },
];
const pst = new Map([['l70', 50], ['l70b', 200], ['l76', 10], ['l9', 500], ['old76', 999]]);

test('pickLoad schlägt für eine 12/70-Flinte nie 12/76 vor, auch nicht als Rückfall', () => {
  const only76 = [{ id: 'l76', caliberId: 'c-12-76' }];
  assert.equal(pickLoad(only76, pst, 'c-12-70', []), '');
  assert.equal(pickLoad(pl, pst, 'c-12-70', ['l76']), 'l70b');
});

test('pickLoad nimmt die zuletzt benutzte Sorte nur, wenn sie zur Waffe passt', () => {
  assert.equal(pickLoad(pl, pst, 'c-12-76', ['l70']), 'l70');
  assert.equal(pickLoad(pl, pst, 'c-12-70', ['l9']), 'l70b');
});

test('pickLoad bevorzugt das eigene Kaliber, dann verträgliche, ausgeblendete nie', () => {
  assert.equal(pickLoad(pl, pst, 'c-12-76', []), 'l76');
  assert.equal(pickLoad(pl.filter((l) => l.id !== 'l76'), pst, 'c-12-76', []), 'l70b');
});

test('pickLoad ohne Waffe: zuletzt benutzte, sonst erste aktive Sorte', () => {
  assert.equal(pickLoad(pl, pst, '', ['l9']), 'l9');
  assert.equal(pickLoad(pl, pst, '', ['old76']), 'l70');
  assert.equal(pickLoad([], pst, '', []), '');
});
