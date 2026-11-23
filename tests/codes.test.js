import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eanValid, normalizeTyped, isGenericCode, STORES, validateBackup } from '../js/model.js';

test('EAN-Prüfziffer: echte Nummern von den Beispielpackungen', () => {
  assert.equal(eanValid('7891798042852'), true); // Magtech 9 mm
  assert.equal(eanValid('8590690331598'), true); // Sellier & Bellot .308
  assert.equal(eanValid('3303114005723'), true); // Schrot
  assert.equal(eanValid('7891798032259'), true); // Magtech .308
  assert.equal(eanValid('7891798042853'), false); // Tippfehler
  assert.equal(eanValid('12345'), false);
  assert.equal(eanValid('96385074'), true); // EAN-8
});

test('Eingetippte Nummer wird bereinigt', () => {
  assert.deepEqual(normalizeTyped(' 7 891798 042852 '), { ok: true, id: 'ean:7891798042852', text: '7891798042852' });
  // UPC-A (12 Stellen) wird wie beim Scannen zu EAN-13 mit führender 0
  assert.equal(normalizeTyped('036000291452').id, 'ean:0036000291452');
  assert.equal(normalizeTyped('7891798042853').ok, false);
});

test('Sammel-QR-Codes ohne Sorteninfo werden erkannt', () => {
  assert.equal(isGenericCode('www.magtechammunition.com/products/product-search/'), true);
  assert.equal(isGenericCode('https://www.magtechammunition.com/products/product-search/?x=1'), true);
  assert.equal(isGenericCode('http://sbqr.cz/v331592'), false);
  assert.equal(isGenericCode('7891798042852'), false);
});

test('Gelernte Packungen sind Teil der Sicherung', () => {
  assert.ok(STORES.includes('packs'));
  const ok = validateBackup({ app: 'ammo-tracker', schemaVersion: 2, data: { packs: [] } });
  assert.equal(ok.ok, true);
  // ältere Sicherungen (Version 1, ohne packs) bleiben ladbar
  assert.equal(validateBackup({ app: 'ammo-tracker', schemaVersion: 1, data: { loads: [] } }).ok, true);
});
