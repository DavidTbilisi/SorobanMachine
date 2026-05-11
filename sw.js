/**
 * Soroban Machine service worker.
 *
 * Strategy: stale-while-revalidate for same-origin GETs.
 * - First paint comes from cache → fast load.
 * - Each request fetches a fresh copy in the background → updates land on next visit.
 *
 * Bump CACHE_VERSION to force a clean reinstall (e.g. when the asset list changes).
 */

const CACHE_VERSION = 'soroban-v1';

const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './css/style.css',
  './js/app.js',
  './js/state.js',
  './js/storage.js',
  './js/config.js',
  './js/engine/operations.js',
  './js/engine/multicolumn.js',
  './js/engine/rules.js',
  './js/engine/soroban.js',
  './js/keyboard/shortcuts.js',
  './js/trainer/skills.js',
  './js/trainer/exercises.js',
  './js/trainer/scoring.js',
  './js/trainer/progress.js',
  './js/trainer/gates.js',
  './js/trainer/flashAnzan.js',
  './js/trainer/daily.js',
  './js/trainer/shareCard.js',
  './js/trainer/achievements.js',
  './js/ui/render.js',
  './js/ui/events.js',
  './js/ui/views.js',
  './js/ui/flashAnzan.js',
  './js/ui/daily.js',
  './js/ui/achievements.js',
  './js/ui/clipboard.js',
  './js/ui/charts.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;  // pass-through for fonts.googleapis etc.

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_VERSION);
    const cached = await cache.match(req);
    const networkFetch = fetch(req)
      .then(res => {
        if (res && res.status === 200) cache.put(req, res.clone());
        return res;
      })
      .catch(() => cached);
    return cached || networkFetch;
  })());
});
