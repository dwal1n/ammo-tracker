import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { APP_VERSION } from '../js/version.js';

test('Angezeigte Version und Offline-Speicher-Version stimmen überein', () => {
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  const m = sw.match(/const VERSION = 'ammo-v(\d+)'/);
  assert.ok(m, 'VERSION in sw.js nicht gefunden');
  assert.equal(Number(m[1]), APP_VERSION.number);
  assert.match(sw, /'\.\/js\/version\.js'/, 'version.js fehlt im Offline-Speicher');
});

test('Handbuch und alle seine Bilder liegen im Offline-Speicher', () => {
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.match(sw, /'\.\/handbuch\/handbuch\.html'/, 'handbuch.html fehlt im Offline-Speicher');
  for (const f of readdirSync(new URL('../handbuch/img/', import.meta.url))) {
    assert.ok(sw.includes(`'./handbuch/img/${f}'`), `handbuch/img/${f} fehlt im Offline-Speicher`);
  }
});
