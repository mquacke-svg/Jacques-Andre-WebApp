# Жак-Андрэ — веб-приложение

Мобильное PWA для заказа продукции пекарни: каталог, поиск, варианты товаров, корзина, регистрация и вход, самовывоз и доставка, история заказов и админка. Оплата при получении, без онлайн-списаний.

## Стек

PHP 8.3+, PDO SQLite, HTML/CSS и обычный JavaScript. Без фреймворков и сборки. Обычный сайт и приложение /app/ используют одну базу и систему аккаунтов.

## Быстрый запуск

1. Установить PHP 8.3 с intl, pdo_sqlite, sqlite3, gd (WebP), mbstring, fileinfo, session и scrypt.
2. Выполнить php scripts/check-env.php и php scripts/setup.php.
3. Запустить php -S 127.0.0.1:3083 -t public router.php.
4. Открыть http://127.0.0.1:3083/app/.

Если PECL scrypt отсутствует, можно явно настроить SCRYPT_PYTHON_BINARY на абсолютный путь к Python 3 с hashlib.scrypt. Формат прежних паролей Better Auth сохраняется.

## Данные и размещение

В репозитории находится только обезличенный каталог data/catalog.sqlite: 95 товаров, 8 категорий, 24 варианта и 4 точки самовывоза. Аккаунтов, заказов и сессий в нём нет. setup.php создаёт закрытую рабочую копию .local/bakery.sqlite только при её отсутствии.

Веб-корень — public/. Рабочие SQLite, uploads, sessions, backups и config.php должны находиться вне него и не попадать в Git. Настройки: APP_URL, DATABASE_PATH, UPLOADS_PATH, SESSION_PATH, BACKUP_PATH; окружение имеет приоритет над .local/config.php.

Для установки PWA нужен HTTPS; localhost также подходит для разработки. Технический адрес по HTTP позволяет проверить интерфейс, но не установить полноценное PWA. Service worker кэширует только публичные ресурсы, без аккаунтов, форм и заказов. Офлайн-заказы не отправляются.

Создание сотрудника: php scripts/create-admin.php читает JSON с login и password через stdin, без стандартного пароля. Подробности — [инструкция PWA](docs/PWA.md).

## Проверки

- php tests/auth-test.php
- php tests/shop-test.php
- php tests/backup-test.php
- node tests/pwa-worker.cjs
- node tests/admin-cli.cjs (задать PHP_BINARY)
- php tests/password-test.php (задать SCRYPT_PYTHON_BINARY)
- npm ci --ignore-scripts, затем npm run test:e2e
- node tests/mobile.cjs

Браузерным проверкам нужны Node.js, Microsoft Edge и PHP_BINARY. Все тесты выполняются на отдельных базах; браузерные наборы запускать последовательно.

Фотографии, шрифты и иконки сопровождаются файлами источников и лицензий в public/.
