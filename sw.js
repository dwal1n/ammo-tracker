// Service Worker: hält alle App-Dateien auf dem Gerät, damit die App offline startet.
// Er lädt ausschließlich Dateien der App selbst, nie etwas von fremden Servern.
// Bei jeder Änderung an App-Dateien VERSION erhöhen.
const VERSION = 'ammo-v2';
const FILES = [
  './', './index.html', './manifest.webmanifest', './css/app.css',
  './js/app.js', './js/store.js', './js/db.js', './js/model.js', './js/ui.js', './js/anim.js',
  './js/calibers.js', './js/cartridge-svg.js',
  './js/views/stock.js', './js/views/training.js', './js/views/history.js', './js/views/firearms.js', './js/views/settings.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Erst aus dem Speicher antworten (schnell, offline), im Hintergrund aktualisieren
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const hit = await cache.match(e.request, { ignoreSearch: true });
      const net = fetch(e.request).then((res) => {
        if (res.ok) cache.put(e.request, res.clone());
        return res;
      }).catch(() => hit);
      return hit || net;
    }),
  );
});
