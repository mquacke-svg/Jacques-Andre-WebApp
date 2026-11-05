<?php
declare(strict_types=1);
// Credentials arrive on stdin, never as process arguments or tracked files.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require dirname(__DIR__) . '/lib/bootstrap.php';
try {
    $input = json_decode(stream_get_contents(STDIN), true, 512, JSON_THROW_ON_ERROR);
    $login = strtolower(trim((string)($input['login'] ?? '')));
    $password = $input['password'] ?? null;
    if (!preg_match('/^[a-z0-9_.]{3,30}$/D', $login) || $login === 'admin') throw new RuntimeException('Укажите уникальный логин 3–30 символов; логин admin зарезервирован.');
    if (!is_string($password) || !mb_check_encoding($password, 'UTF-8') || mb_strlen($password) < 12 || mb_strlen($password) > 128) throw new RuntimeException('Пароль должен содержать от 12 до 128 символов.');
    $hash = hashUserPassword($password);
    transaction(function () use ($login, $hash): void {
        if (sqlOne('SELECT id FROM user WHERE lower(username) = ?', [$login])) throw new RuntimeException('Логин уже существует. Существующий аккаунт не изменён.');
        $id = uuid(); $now = nowMs();
        sqlRun('INSERT INTO user (id,name,username,email,email_verified,role,created_at,updated_at) VALUES (?,?,?,?,0,?,?,?)', [$id,$login,$login,bin2hex($login).'@username.bakery.invalid','admin',$now,$now]);
        sqlRun('INSERT INTO account (id,account_id,provider_id,user_id,password,created_at,updated_at) VALUES (?,?,?,?,?,?,?)', [uuid(),$id,'credential',$id,$hash,$now,$now]);
    });
    echo "Администратор создан. Вход: /login?admin=1\n";
} catch (Throwable $error) {
    fwrite(STDERR, $error instanceof PDOException ? "Не удалось создать администратора; проверьте базу.\n" : $error->getMessage()."\n");
    exit(1);
}
