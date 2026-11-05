<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$configFile = dirname(__DIR__) . '/.local/config.php';
$config = is_file($configFile) ? require $configFile : [];
if (!is_array($config)) throw new RuntimeException('Неверная конфигурация');
require_once dirname(__DIR__) . '/lib/password.php';
$failures = [];
if (PHP_VERSION_ID < 80300) $failures[] = 'Нужен PHP 8.3 или новее.';
foreach (['intl', 'pdo_sqlite', 'sqlite3', 'gd', 'mbstring', 'fileinfo', 'session'] as $extension) {
    if (!extension_loaded($extension)) $failures[] = 'Не подключён модуль ' . $extension . '.';
}
if (!$failures) {
    try {
        $key = bakeryScrypt('test-password-123', '00112233445566778899aabbccddeeff');
        if ($key !== '48cca5d039aab5fab3f4ff0f92f631c47ac03e64d5623a9de371cfca112c44cfaea6687f56c9d3cf1be62b624ab1db671893a23cb88cc18cd93a337e5266cd60') {
            $failures[] = 'Проверка совместимого scrypt-вектора не пройдена.';
        }
    } catch (Throwable $error) { $failures[] = 'Нужен модуль scrypt либо настроенный SCRYPT_PYTHON_BINARY с hashlib.scrypt и доступным proc_open.'; }
    if (!function_exists('imagewebp')) $failures[] = 'GD должен поддерживать WebP.';
}
if ($failures) {
    fwrite(STDERR, implode(PHP_EOL, $failures) . PHP_EOL);
    exit(1);
}
echo 'PHP ' . PHP_VERSION . ': все необходимые модули доступны; scrypt и WebP проверены.' . PHP_EOL;
