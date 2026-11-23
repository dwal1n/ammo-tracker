import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  stockByLoad, caliberTotals, avgPrice, isLow, firearmCount, serviceDue,
  sessionSummary, monthlyStats, validateBackup, newId,
} from '../js/model.js';

const loads = [
  { id: 'l1', caliberId: 'c-9luger', maker: 'Geco', name: 'FMJ', grain: 124, minStock: 300 },
  { id: 'l2', caliberId: 'c-9luger', maker: 'S&B', name: 'FMJ', grain: 115, minStock: 0 },
  { id: 'l3', caliberId: 'c-22lr', maker: 'RWS', name: 'Target', minStock: 500 },
];
const purchases = [
  { id: 'p1', loadId: 'l1', date: '2026-09-01', qty: 1000, totalPrice: 250 },
  { id: 'p2', loadId: 'l1', date: '2026-10-15', qty: 500, totalPrice: 150 },
  { id: 'p3', loadId: 'l3', date: '2026-10-20', qty: 500, totalPrice: 60 },
];
const adjustments = [{ id: 'a1', loadId: 'l2', date: '2026-09-01', delta: 240 }];
const sessions = [
  { id: 's1', start: '2026-10-03T18:00', status: 'done', strings: [
    { id: 'x1', loadId: 'l1', firearmId: 'f1', qty: 50 },
    { id: 'x2', loadId: 'l1', firearmId: 'f1', qty: 25 },
  ] },
  { id: 's2', start: '2026-11-10T18:00', status: 'done', strings: [
    { id: 'x3', loadId: 'l3', firearmId: 'f2', qty: 150 },
    { id: 'x4', loadId: 'l1', firearmId: 'f1', qty: 25 },
  ] },
  { id: 's3', start: '2026-11-20T18:00', status: 'active', strings: [
    { id: 'x5', loadId: 'l1', firearmId: 'f1', qty: 999 },
  ] },
];
const data = { loads, purchases, adjustments, sessions };

test('Bestand pro Sorte: Einkäufe + Korrekturen − abgeschlossene Trainings', () => {
  const s = stockByLoad(data);
  assert.equal(s.get('l1'), 1500 - 100);
  assert.equal(s.get('l2'), 240);
  assert.equal(s.get('l3'), 350);
});

test('Laufendes Training zieht noch nichts ab', () => {
  assert.equal(stockByLoad(data).get('l1'), 1400);
});

test('Sorte ohne Buchungen hat Bestand 0', () => {
  const s = stockByLoad({ ...data, loads: [...loads, { id: 'l9', caliberId: 'c-308' }] });
  assert.equal(s.get('l9'), 0);
});

test('Summe pro Kaliber', () => {
  const t = caliberTotals(data);
  assert.equal(t.get('c-9luger'), 1640);
  assert.equal(t.get('c-22lr'), 350);
});

test('Durchschnittspreis ist gewichtet', () => {
  assert.equal(avgPrice('l1', purchases), 400 / 1500);
  assert.equal(avgPrice('l2', purchases), null);
});

test('Mindestbestand-Warnung', () => {
  assert.equal(isLow(loads[0], 299), true);
  assert.equal(isLow(loads[0], 300), false);
  assert.equal(isLow(loads[1], 0), false); // 0 = keine Warnung
});

test('Schusszähler der Waffe: Startwert + abgeschlossene Durchgänge', () => {
  assert.equal(firearmCount({ id: 'f1', startCount: 2000 }, sessions), 2100);
  assert.equal(firearmCount({ id: 'f2' }, sessions), 150);
});

test('Wartung fällig nach Intervall seit letzter Wartung', () => {
  assert.equal(serviceDue({ serviceInterval: 1000, serviceAt: 1500 }, 2100), false);
  assert.equal(serviceDue({ serviceInterval: 500, serviceAt: 1500 }, 2000), true);
  assert.equal(serviceDue({}, 99999), false);
});

test('Zusammenfassung eines Trainings mit Kosten', () => {
  const sum = sessionSummary(sessions[1], purchases);
  assert.equal(sum.shots, 175);
  const l3 = sum.byLoad.find((b) => b.loadId === 'l3');
  assert.equal(l3.qty, 150);
  assert.ok(Math.abs(l3.cost - 18) < 1e-9);
  assert.ok(Math.abs(sum.cost - (18 + 25 * 400 / 1500)) < 1e-9);
});

test('Monatsstatistik: Schuss und Kosten der letzten Monate', () => {
  const m = monthlyStats(data, 3, new Date('2026-11-23T12:00'));
  assert.deepEqual(m.map((x) => x.month), ['2026-09', '2026-10', '2026-11']);
  assert.deepEqual(m.map((x) => x.shots), [0, 75, 175]);
  assert.equal(m[1].spent, 210);
});

test('Backup-Prüfung erkennt gültige und kaputte Dateien', () => {
  const ok = validateBackup({ app: 'ammo-tracker', schemaVersion: 1, data: {
    calibers: [], loads, purchases, adjustments, firearms: [], sessions } });
  assert.equal(ok.ok, true);
  assert.equal(validateBackup({ foo: 1 }).ok, false);
  assert.equal(validateBackup({ app: 'ammo-tracker', schemaVersion: 1, data: { loads: 'x' } }).ok, false);
  assert.equal(validateBackup({ app: 'ammo-tracker', schemaVersion: 99, data: {} }).ok, false);
});

test('IDs sind eindeutig', () => {
  const ids = new Set(Array.from({ length: 1000 }, () => newId()));
  assert.equal(ids.size, 1000);
});
