/* Only public static assets are cached. Never cache customer pages or requests. */
const CACHE = 'jacques-static-v1';
const OFFLINE = '/app/offline.html';
const CORE = [OFFLINE, '/app/icon-192.png', '/app/icon-512.png', '/logo-mark.svg'];
function isPublicAsset(url) {
    return ['/style.css', '/mobile.css', '/app.js', '/pwa.js', '/logo-mark.svg', '/logo-mark-light.svg',
        '/app/manifest.webmanifest', '/app/icon-192.png', '/app/icon-512.png'].includes(url.pathname)
        || /^\/fonts\/[a-zA-Z0-9._-]+\.(woff2?|ttf)$/.test(url.pathname)
        || /^\/products\/[a-zA-Z0-9._-]+\.(webp|png|jpe?g)$/.test(url.pathname);
}
self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
    event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('jacques-static-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);
    if (request.method !== 'GET' || url.origin !== self.location.origin) return;
    if (request.mode === 'navigate' && (url.pathname === '/app' || url.pathname.startsWith('/app/'))) {
        event.respondWith(fetch(request).catch(() => caches.match(OFFLINE)));
        return;
    }
    if (!isPublicAsset(url)) return;
    // Network first keeps deployments current; only static responses enter this cache.
    event.respondWith(fetch(request).then(response => {
        if (response.ok && !response.redirected && response.type !== 'opaque') {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, copy)));
        }
        return response;
    }).catch(() => caches.match(request).then(response => response || Response.error())));
});
