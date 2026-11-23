// ⭐️ Service Worker for SABAY LUK - Offline POS & Cache First ⭐️
const CACHE_NAME = 'sabay-luk-offline-v3';

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

// Install: Cache static shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('SW Pre-cache notice:', err);
      });
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
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const dashboardFallback = await caches.match('/admin/dashboard');
          if (dashboardFallback) return dashboardFallback;
          const rootFallback = await caches.match('/');
          if (rootFallback) return rootFallback;
          return new Response(
            '<!DOCTYPE html><html lang="km"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Sabay Luk Offline</title><style>body{font-family:system-ui,sans-serif;background:#0f172a;color:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;text-align:center}.box{background:#1e293b;padding:30px;border-radius:24px;max-width:400px;border:1px solid #334155}h1{color:#ff6a00;font-size:22px;margin-bottom:10px}p{color:#94a3b8;font-size:14px;line-height:1.6}button{background:#ff6a00;color:#fff;border:none;padding:12px 24px;border-radius:12px;font-weight:bold;cursor:pointer;margin-top:15px}</style></head><body><div class="box"><div style="font-size:40px;margin-bottom:10px">📡</div><h1>កំពុងប្រើប្រាស់ Offline</h1><p>គ្មានការតភ្ជាប់អ៊ីនធឺណិតទេ ប៉ុន្តែលោកអ្នកអាចបើកប្រព័ន្ធ POS លក់ទំនិញបានធម្មតា។</p><button onclick="window.location.reload()">🔄 ព្យាយាមភ្ជាប់ឡើងវិញ</button></div></body></html>',
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
