<?php
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/app', PHP_URL_PATH);
$catalogActive = $path === '/app' || $path === '/app/';
$cartActive = in_array($path, ['/app/cart', '/app/checkout'], true);
$profileActive = in_array($path, ['/app/login', '/app/account'], true) || str_starts_with($path, '/app/orders/');
$title = $pageData['title'] ?? 'Жак-Андрэ — заказать из пекарни';
?>
<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#fbf7e9">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Жак-Андрэ">
<meta name="description" content="Свежая выпечка, десерты и кофе. Закажите доставку по Краснодару или заберите в любимой пекарне. Оплата при получении.">
<meta name="robots" content="noindex,nofollow">
<title><?= e($title) ?></title>
<link rel="icon" href="/logo-mark.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/app/icon-192.png">
<link rel="manifest" href="/app/manifest.webmanifest">
<link rel="stylesheet" href="/style.css?v=1">
<link rel="stylesheet" href="/mobile.css?v=1">
<script src="/app.js?v=1" defer></script>
<script src="/pwa.js?v=1" defer></script>
</head>
<body class="mobile-app">
<a href="#main" class="skip-link">Перейти к содержимому</a>
<header class="app-header">
  <div class="container app-header-inner">
    <a class="app-brand" href="/app/" aria-label="Жак-Андрэ — каталог"><img src="/logo-mark.svg" width="42" height="42" alt=""><span>Жак-Андрэ<small>ФРАНЦУЗСКАЯ ПЕКАРНЯ</small></span></a>
    <span class="app-city"><?= uiIcon('pin', 15) ?> <?= e($catalog['settings']['city'] ?? 'Краснодар') ?></span>
  </div>
</header>
<main id="main">
<?php if ($errors): ?><div class="container app-messages" role="alert"><?php foreach ($errors as $error): ?><p class="error"><?= e($error) ?></p><?php endforeach ?></div><?php endif ?>
<?php if (!empty($pageData['notice'])): ?><div class="container app-messages"><p class="success" role="status"><?= e($pageData['notice']) ?></p></div><?php endif ?>
<?= $content ?>
</main>
<footer class="container app-footer">
  <div class="app-install">
    <button type="button" class="button button-outline full-width" data-install-app hidden>Установить приложение</button>
    <details><summary>Пекарня на главном экране</summary><p>На iPhone откройте сайт в Safari, нажмите «Поделиться» и выберите «На экран Домой». На Android откройте меню браузера и выберите «Установить приложение» или «Добавить на главный экран».</p></details>
  </div>
  <p>Оплата при получении · С заботой о вашем дне</p>
  <div class="app-legal"><a href="/app/terms">Условия заказа</a><a href="/app/privacy">Конфиденциальность</a><a href="/app/cookies">Cookies</a></div>
</footer>
<nav class="app-bottom-nav" aria-label="Навигация приложения">
  <a href="/app/" <?= $catalogActive ? 'aria-current="page"' : '' ?>><?= uiIcon('croissant', 23) ?><span>Каталог</span></a>
  <a href="/app/cart" <?= $cartActive ? 'aria-current="page"' : '' ?>><span class="app-bag-icon"><?= uiIcon('bag', 23) ?><?php if ($cart['count'] ?? 0): ?><span class="app-badge"><?= (int)$cart['count'] ?></span><?php endif ?></span><span><?= ($cart['count'] ?? 0) ? money($cart['subtotal']) : 'Корзина' ?></span></a>
  <a href="/app/account" <?= $profileActive ? 'aria-current="page"' : '' ?>><?= uiIcon('user', 23) ?><span>Профиль</span></a>
</nav>
<?php if (empty($_COOKIE['bakery_cookie_notice'])): ?>
<aside class="app-cookie" aria-label="Использование cookies">
  <p>Cookies сохраняют корзину и вход. <a href="/app/cookies">Подробнее</a></p>
  <form method="post" action="/action"><?php formAction('cookies_accept', uiReturnTo()) ?><button class="button button-small">Понятно</button></form>
</aside>
<?php endif ?>
</body>
</html>
