/* Recovery Plate service worker. __BUILD__ is replaced at build time so every deploy installs a fresh worker. */
const BUILD = '__BUILD__';
const CACHE = 'rp-' + BUILD;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('rp-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function networkFirst(request, timeoutMs) {
  return new Promise((resolve) => {
    let settled = false;
    const fromCache = () => caches.match(request).then((hit) => hit || caches.match('/'));
    const timer = setTimeout(() => {
      if (settled) return;
      fromCache().then((hit) => {
        if (hit && !settled) {
          settled = true;
          resolve(hit);
        }
      });
    }, timeoutMs);
    fetch(request)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
        }
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(res);
        }
      })
      .catch(() => {
        clearTimeout(timer);
        if (settled) return;
        fromCache().then((hit) => {
          settled = true;
          resolve(hit || Response.error());
        });
      });
  });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never touch Supabase or other origins

  // Hashed build assets never change: cache-first.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res && res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Pages and everything else: network-first so new deployments appear immediately.
  event.respondWith(networkFirst(req, req.mode === 'navigate' ? 3500 : 6000));
});
