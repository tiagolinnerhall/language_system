const CACHE_NAME = 'lang5k-static-v3';

const CORE_ASSETS = [
  'index.html',
  'app.html',
  'pricing.html',
  'attribution.html',
  'terms.html',
  'privacy.html',
  'refund.html',
  'contact.html',
  'robots.txt',
  'sitemap.xml',
  'favicon.svg',
  'manifest.webmanifest',
  'audio-manifest-ru.json',
  'attribution-ru.json',
  'languages/config.js',
  'languages/russian/data1.js',
  'languages/russian/data2.js',
  'languages/russian/data3.js',
  'languages/russian/data4.js',
  'languages/russian/data5.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.pathname.endsWith('audio-manifest-ru.json')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
