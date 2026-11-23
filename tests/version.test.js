import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APP_VERSION } from '../js/version.js';

test('Angezeigte Version und Offline-Speicher-Version stimmen überein', () => {
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  const m = sw.match(/const VERSION = 'ammo-v(\d+)'/);
  assert.ok(m, 'VERSION in sw.js nicht gefunden');
  assert.equal(Number(m[1]), APP_VERSION.number);
  assert.match(sw, /'\.\/js\/version\.js'/, 'version.js fehlt im Offline-Speicher');
});
