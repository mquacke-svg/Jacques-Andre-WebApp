const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const listeners = {};
let reads = 0, writes = 0, network = 0, offline = false;
const origin = 'https://bakery.example';
const sandbox = {
    URL, Response,
    self: { location: { origin }, addEventListener: (name, fn) => { listeners[name] = fn; } },
    caches: {
        match: async key => { reads++; return new Response(key === '/app/offline.html' ? 'offline' : 'static'); },
        open: async () => ({ put: async () => { writes++; } })
    },
    fetch: async () => { network++; if (offline) throw new Error('offline'); return new Response('network'); }
};
vm.runInNewContext(fs.readFileSync('public/app/sw.js', 'utf8'), sandbox);
async function request(path, method = 'GET', mode = 'cors') {
    let response;
    const waits = [];
    listeners.fetch({ request: { url: origin + path, method, mode }, respondWith: promise => { response = promise; }, waitUntil: promise => waits.push(promise) });
    const result = response ? await response : undefined;
    await Promise.all(waits);
    return result;
}
(async () => {
    for (const path of ['/app/account', '/app/cart', '/app/checkout', '/app/orders/private', '/action', '/uploads/private.webp']) {
        assert.equal(await request(path), undefined, `${path} must not enter static cache`);
    }
    assert.equal(await request('/action', 'POST'), undefined);
    assert.equal(await request('/app/checkout', 'POST', 'navigate'), undefined);
    assert.equal(reads + writes + network, 0);
    assert.equal(await (await request('/app/account', 'GET', 'navigate')).text(), 'network');
    assert.equal(writes, 0, 'personal navigation must never be cached');
    offline = true;
    assert.equal(await (await request('/app/account', 'GET', 'navigate')).text(), 'offline');
    offline = false;
    assert.equal(await (await request('/products/croissant-1.webp')).text(), 'network');
    assert.equal(writes, 1);
    const manifest = JSON.parse(fs.readFileSync('public/app/manifest.webmanifest', 'utf8').replace(/^\uFEFF/, ''));
    assert.equal(manifest.scope, '/app/');
    for (const icon of manifest.icons) {
        const png = fs.readFileSync('public' + icon.src);
        const size = Number(icon.sizes.split('x')[0]);
        assert.equal(png.readUInt32BE(16), size);
        assert.equal(png.readUInt32BE(20), size);
    }
    console.log('PWA: cache boundaries, offline fallback, manifest and icon dimensions passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
