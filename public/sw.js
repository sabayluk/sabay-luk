// ⭐️ Service Worker for SABAY LUK - Offline POS & Cache First ⭐️
const CACHE_NAME = 'sabay-luk-offline-v4';

const STATIC_ASSETS = [
  '/',
  '/admin/dashboard',
  '/login',
  '/favicon.png',
  '/apple-touch-icon.png',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/manifest.json'
];

// Install: Cache static shell assets safely one by one (Promise.allSettled)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        STATIC_ASSETS.map(async (assetUrl) => {
          try {
            const res = await fetch(assetUrl, { cache: 'no-cache' });
            if (res && res.status === 200) {
              await cache.put(assetUrl, res);
            }
          } catch (err) {
            console.warn('Pre-cache note for', assetUrl, err);
          }
        })
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up old caches & take control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Stale-While-Revalidate for pages & static files; Network-First for API
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Do not intercept non-GET requests or Supabase/external API calls (they are handled via lib/offlinePos)
  if (request.method !== 'GET') return;
  if (url.origin.includes('supabase.co')) return;

  // For HTML navigations: Network first, fall back to cache when offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, copy);
              if (url.pathname.includes('/admin/dashboard')) {
                cache.put('/admin/dashboard', response.clone());
              }
            });
          }
          return response;
        })
        .catch(async () => {
          // Try matching the exact requested URL
          const cached = await caches.match(request);
          if (cached) return cached;

          // Try matching path variations
          const pathnameMatch = await caches.match(url.pathname);
          if (pathnameMatch) return pathnameMatch;

          // Fallback to POS / Admin Dashboard cache
          const dashboardFallback = await caches.match('/admin/dashboard');
          if (dashboardFallback) return dashboardFallback;

          // Fallback to Home
          const rootFallback = await caches.match('/');
          if (rootFallback) return rootFallback;

          // Offline fallback UI
          return new Response(
            '<!DOCTYPE html><html lang="km"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Sabay Luk Offline</title><style>body{font-family:system-ui,-apple-system,sans-serif;background:#0f172a;color:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;text-align:center}.box{background:#1e293b;padding:32px 24px;border-radius:24px;max-width:420px;border:1px solid #334155;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5)}h1{color:#ff6a00;font-size:22px;margin:12px 0 8px 0;font-weight:900}p{color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 16px 0}button{background:linear-gradient(to right,#ff6a00,#ea580c);color:#fff;border:none;padding:12px 28px;border-radius:14px;font-weight:bold;font-size:14px;cursor:pointer;transition:transform 0.1s}button:active{transform:scale(0.96)}</style></head><body><div class="box"><div style="font-size:48px">📡</div><h1>កំពុងប្រើប្រាស់ Offline</h1><p>គ្មានការតភ្ជាប់អ៊ីនធឺណិតទេ ប៉ុន្តែលោកអ្នកអាចបើកប្រព័ន្ធ POS លក់ទំនិញបានធម្មតា។ រាល់ទិន្នន័យលក់នឹងត្រូវ Sync ស្វ័យប្រវត្តិតាមក្រោយពេលមាន Internet។</p><button onclick="window.location.reload()">🔄 ព្យាយាមភ្ជាប់ឡើងវិញ</button></div></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
    return;
  }

  // For static assets (JS, CSS, Images, Fonts): Stale While Revalidate
  if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.json') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        }).catch(() => null);

        return cached || fetchPromise;
      })
    );
  }
});
