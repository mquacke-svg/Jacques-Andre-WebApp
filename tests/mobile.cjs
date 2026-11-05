// Local mobile/PWA acceptance checks. All mutations use the isolated e2e fixture.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { spawn, execFileSync } = require('node:child_process');
const { chromium, expect } = require('@playwright/test');
const root = path.resolve(__dirname, '..');
const php = process.env.PHP_BINARY;
if (!php) throw new Error('Set PHP_BINARY to PHP 8.3+');
const baseURL = 'http://127.0.0.1:3085';
const results = path.join(root, '.local/mobile-results');
const password = crypto.randomBytes(20).toString('hex');
let server, browser;
function fixture(command, data = {}) {
    return JSON.parse(execFileSync(php, [path.join(__dirname, 'e2e-fixture.php'), command], { cwd: root, input: JSON.stringify(data), encoding: 'utf8', windowsHide: true }));
}
async function navigate(page, action) { await Promise.all([page.waitForNavigation(), action()]); }
async function add(page) {
    await page.goto('/app');
    await navigate(page, () => page.getByRole('button', { name: 'Добавить в корзину: Проверочный круассан', exact: true }).click());
    assert.equal(new URL(page.url()).pathname, '/app/');
}
async function context() {
    const ctx = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto('/app');
    if (await page.getByRole('button', { name: 'Понятно', exact: true }).count()) await navigate(page, () => page.getByRole('button', { name: 'Понятно', exact: true }).click());
    assert.equal(new URL(page.url()).pathname, '/app/');
    return { ctx, page };
}
(async () => {
    const seeded = fixture('init', { adminPassword: password });
    fs.mkdirSync(results, { recursive: true });
    server = spawn(php, ['-S', '127.0.0.1:3085', '-t', 'public', 'router.php'], { cwd: root, windowsHide: true, env: { ...process.env, APP_URL: baseURL, DATABASE_PATH: seeded.database, UPLOADS_PATH: path.join(root, '.local/e2e-uploads'), SESSION_PATH: path.join(root, '.local/e2e-sessions') }, stdio: 'ignore' });
    for (let i = 0; i < 60; i++) { try { if ((await fetch(baseURL + '/app')).ok) break; } catch {} await new Promise(r => setTimeout(r, 100)); }
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const { ctx, page } = await context();
    for (const width of [360, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto('/app');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'catalog overflow ' + width);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('body')).toHaveClass(/mobile-app/);
    await page.locator('[data-filter="e2e-category"]').click();
    await navigate(page, () => page.getByRole('button', { name: 'Добавить в корзину: Проверочный круассан', exact: true }).click());
    assert.equal(new URL(page.url()).pathname, '/app/');
    assert.equal(new URL(page.url()).hash, '#e2e-category');
    await page.goto('/app/cart');
    await navigate(page, () => page.getByRole('button', { name: 'Очистить корзину', exact: true }).click());
    await page.goto('/app/');
    assert.doesNotMatch(await page.locator('body').innerText(), /Тестовая версия|Заказы не передаются|О пекарне/);
    await page.screenshot({ path: path.join(results, 'catalog-390.png'), fullPage: true });
    await page.screenshot({ path: path.join(results, 'catalog-preview.png'), fullPage: false });
    const unpriced = page.locator('.product-entry').filter({ has: page.locator('.product-name', { hasText: 'Пасхальный кулич' }) });
    await expect(unpriced.locator('.product-bottom')).toContainText('Цена уточняется');
    await expect(unpriced.getByRole('button', { name: 'Добавить в корзину: Пасхальный кулич', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Подробнее: Проверочный круассан', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    console.log('PASS responsive catalog, unpriced product and keyboard dialog');
    await add(page);
    await page.goto('/app/cart');
    await expect(page.locator('.cart-list')).toContainText('Проверочный круассан');
    await page.goto('/app/checkout');
    await page.locator('[name="name"]').fill('Мобильный покупатель');
    await page.locator('[name="phone"]').fill('+79181234567');
    await page.locator('[name="consent"]').check();
    const body = await page.locator('[data-checkout-form]').evaluate(form => Object.fromEntries(new FormData(form)));
    assert.doesNotMatch(await page.locator('body').innerText(), /тестовый заказ/i);
    await page.screenshot({ path: path.join(results, 'checkout-390.png'), fullPage: true });
    await navigate(page, () => page.locator('[data-checkout-form] button[type="submit"]').last().click());
    const orderPath = new URL(page.url()).pathname;
    assert.match(orderPath, /^\/app\/orders\//);
    await expect(page.locator('main')).toContainText('Ожидает подтверждения');
    const replay = await ctx.request.post('/action', { form: body, maxRedirects: 0, headers: { Origin: baseURL } });
    assert.equal(replay.headers().location, orderPath);
    assert.equal(fixture('state').orders, 1);
    const outsider = await browser.newContext({ baseURL });
    assert.equal((await outsider.request.get(orderPath)).status(), 404);
    await outsider.close();
    console.log('PASS guest checkout, mobile redirect, duplicate protection and order ownership');
    await add(page);
    await page.goto('/app/login?register=1');
    const login = 'mobile.' + crypto.randomBytes(4).toString('hex');
    await page.locator('[name="login"]').fill(login);
    await page.locator('[name="password"]').fill(password);
    await navigate(page, () => page.getByRole('button', { name: 'Зарегистрироваться', exact: true }).click());
    assert.equal(new URL(page.url()).pathname, '/app/account');
    await page.goto('/app/cart');
    await expect(page.locator('.cart-list')).toContainText('Проверочный круассан');
    await page.goto('/app/account');
    await navigate(page, () => page.getByRole('button', { name: /Сохранить гостевые заказы/ }).click());
    await expect(page.locator('main')).toContainText('Ожидает подтверждения');
    for (const route of ['/app/terms', '/app/privacy', '/app/cookies']) {
        assert.equal((await page.goto(route)).status(), 200);
        assert.doesNotMatch(await page.locator('body').innerText(), /тестовый заказ|Тестовая версия/i);
    }
    console.log('PASS registration preserves mobile context, cart merge and guest history claim');
    await page.goto('/app/');
    await page.waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration('/app/'))?.active, { timeout: 15000 });
    await page.reload();
    const manifest = await ctx.request.get('/app/manifest.webmanifest');
    const config = await manifest.json();
    assert.match(config.start_url, /^\/app/);
    assert.equal(config.scope, '/app/');
    for (const icon of config.icons) assert.equal((await ctx.request.get(icon.src)).status(), 200);
    const cached = await page.evaluate(async () => (await Promise.all((await caches.keys()).map(async key => (await (await caches.open(key)).keys()).map(r => new URL(r.url).pathname)))).flat());
    assert.equal(cached.some(p => /checkout|account|orders|login/.test(p)), false);
    await ctx.setOffline(true);
    await page.goto('/app/account');
    await expect(page.locator('body')).toContainText(/сети|соединение|интернет/i);
    await ctx.setOffline(false);
    console.log('PASS manifest, icons, service worker and neutral offline fallback without personal cache');
    await ctx.close();
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await browser?.close(); server?.kill(); });
