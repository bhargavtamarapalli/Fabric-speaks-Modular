importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

if (workbox) {
  const { routing, strategies, expiration, cacheableResponse } = workbox;

  routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    new strategies.NetworkFirst({
      cacheName: 'pages-cache',
    })
  );

  routing.registerRoute(
    ({ request }) =>
      request.destination === 'style' ||
      request.destination === 'script' ||
      request.destination === 'worker',
    new strategies.StaleWhileRevalidate({
      cacheName: 'assets-cache',
    })
  );

  routing.registerRoute(
    ({ request }) => request.destination === 'image',
    new strategies.CacheFirst({
      cacheName: 'image-cache',
      plugins: [
        new expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        }),
      ],
    })
  );

  routing.registerRoute(
    ({ url }) => url.pathname.includes('/api/v1/products') || url.pathname.includes('/api/v1/categories') || url.pathname.includes('/api/v1/collections'),
    new strategies.NetworkFirst({
      cacheName: 'catalog-api-cache',
      plugins: [
        new cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    })
  );
}
