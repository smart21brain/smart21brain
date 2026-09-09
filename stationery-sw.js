// smart21brain Stationery OS — minimal app-shell service worker.
// Caches only static shell assets; every /api/* call always goes to the
// network (never cached), since order/inventory/finance data must stay
// live and correct. This gives fast repeat loads and a friendly offline
// screen — it is not a full offline-order-taking mode.
const CACHE = 'stn-shell-v1';
const SHELL = [
  '/stationery-app.html',
  '/css/stationery-app.css',
  '/js/stationery/api.js',
  '/js/stationery/app.js',
  '/js/stationery/dashboard.js',
  '/js/stationery/pos.js',
  '/js/stationery/inventory.js',
  '/js/stationery/customers.js',
  '/js/stationery/finance.js',
  '/js/stationery/reports.js',
  '/js/stationery/photostudio.js',
  '/js/stationery/pdftools.js',
  '/js/stationery/onlineservices.js',
  '/js/stationery/machines.js',
  '/js/stationery/academy.js',
  '/js/stationery/chopaai.js',
  '/js/stationery/employees.js',
  '/js/stationery/settings.js',
  '/js/stationery/security.js',
  '/stationery-manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/')) return; // always live
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request).then((res) => {
        if (res.ok) caches.open(CACHE).then((cache) => cache.put(event.request, res.clone()));
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
