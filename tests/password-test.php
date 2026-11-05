<?php
declare(strict_types=1);

require dirname(__DIR__) . '/lib/password.php';
$binary = getenv('SCRYPT_PYTHON_BINARY') ?: '';
if ($binary === '') { fwrite(STDERR, "Set SCRYPT_PYTHON_BINARY to test the optional Python adapter.\n"); exit(1); }
$checks = 0;
function checkPasswordAdapter(bool $condition): void {
    global $checks;
    $checks++;
    if (!$condition) throw new RuntimeException('Password adapter check failed.');
}
function rejectPasswordAdapter(callable $work): void {
    try { $work(); } catch (RuntimeException $error) {
        checkPasswordAdapter($error->getMessage() === 'Не удалось обработать пароль.');
        return;
    }
    throw new RuntimeException('Password adapter did not fail closed.');
}
$salt = '00112233445566778899aabbccddeeff';
// Independent Node crypto/Better Auth vectors; normalization remains in auth.php.
$vectors = [
    ['test-password-123', '48cca5d039aab5fab3f4ff0f92f631c47ac03e64d5623a9de371cfca112c44cfaea6687f56c9d3cf1be62b624ab1db671893a23cb88cc18cd93a337e5266cd60'],
    ['пароль-тест-123', '62b9c9620e89c0b07811459a372be4f74f9cad98db849a06f54e22c3b344f244590296401266bef87b93c549d08c33911f4e46321db22bdbd2fc867693315e3c'],
    ['Café-ABC-123', '9a0a958110d8d3d93ded0381da55178dbedbf396957265fce79101b06e2e62443c713ba151e9eebe3b6e365b6fa3f6d4bbba087cd320fee686a94898e767f622'],
];
foreach ($vectors as [$password, $expected]) {
    checkPasswordAdapter(bakeryPythonScrypt($password, $salt, $binary) === $expected);
    checkPasswordAdapter(bakeryScrypt($password, $salt) === $expected);
}
// Quotes, line breaks, null bytes and shell metacharacters are data in stdin JSON.
if (function_exists('scrypt')) {
    $password = "quote'\"\n\0`$(do-not-run); &";
    checkPasswordAdapter(bakeryPythonScrypt($password, $salt, $binary) === scrypt($password, $salt, 16384, 16, 1, 64, false));
    putenv('SCRYPT_PYTHON_BINARY=/nonexistent/python');
    checkPasswordAdapter(bakeryScrypt($vectors[0][0], $salt) === $vectors[0][1]); // Native wins.
    putenv('SCRYPT_PYTHON_BINARY=' . $binary);
}
rejectPasswordAdapter(fn() => bakeryPythonScrypt('password', $salt, ''));
rejectPasswordAdapter(fn() => bakeryPythonScrypt('password', $salt, 'python3'));
rejectPasswordAdapter(fn() => bakeryPythonScrypt('password', $salt, '/nonexistent/python'));
rejectPasswordAdapter(fn() => bakeryPythonScrypt('password', $salt, PHP_BINARY)); // Wrong executable fails, no hash.
rejectPasswordAdapter(fn() => bakeryPythonScrypt(str_repeat('a', 65536), $salt, $binary));
echo "Password adapter: $checks checks passed.\n";
