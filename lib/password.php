<?php
declare(strict_types=1);

// Better Auth parameters and salt encoding must remain compatible with existing accounts.
function bakeryScrypt(string $password, string $salt): string
{
    if (function_exists('scrypt')) {
        $key = scrypt($password, $salt, 16384, 16, 1, 64, false);
        if (is_string($key) && preg_match('/^[a-f0-9]{128}$/D', $key)) return $key;
        throw new RuntimeException('Не удалось обработать пароль.');
    }
    $binary = getenv('SCRYPT_PYTHON_BINARY');
    if ($binary === false || $binary === '') $binary = (string) ($GLOBALS['config']['SCRYPT_PYTHON_BINARY'] ?? '');
    return bakeryPythonScrypt($password, $salt, $binary);
}

function bakeryPythonScrypt(string $password, string $salt, string $binary): string
{
    $failure = 'Не удалось обработать пароль.';
    // This is an explicit administrator-selected executable, never a request parameter.
    if ($binary === '' || !preg_match('~^(?:/|[A-Za-z]:[\\\\/])~', $binary)
        || str_contains($binary, "\0") || !is_file($binary) || !function_exists('proc_open')) {
        throw new RuntimeException($failure);
    }
    $payload = json_encode(['password' => base64_encode($password), 'salt' => base64_encode($salt)], JSON_THROW_ON_ERROR) . "\n";
    if (strlen($payload) > 65536) throw new RuntimeException($failure);
    $pipes = [];
    $process = @proc_open([$binary, '-I', __DIR__ . '/scrypt-helper.py'],
        [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes, __DIR__, null, ['bypass_shell' => true]);
    if (!is_resource($process)) throw new RuntimeException($failure);
    $deadline = microtime(true) + 5;
    $output = '';
    $errors = '';
    $offset = 0;
    $exitCode = -1;
    try {
        foreach ($pipes as $pipe) stream_set_blocking($pipe, false);
        while (true) {
            if (microtime(true) > $deadline) throw new RuntimeException($failure);
            if (isset($pipes[0])) {
                $written = @fwrite($pipes[0], substr($payload, $offset, 4096));
                if ($written === false) throw new RuntimeException($failure);
                $offset += $written;
                if ($offset === strlen($payload)) { fclose($pipes[0]); unset($pipes[0]); }
            }
            $output .= stream_get_contents($pipes[1]);
            $errors .= stream_get_contents($pipes[2]);
            if (strlen($output) > 130 || strlen($errors) > 4096) throw new RuntimeException($failure);
            $status = proc_get_status($process);
            if (!$status['running']) {
                $exitCode = $status['exitcode'];
                $output .= stream_get_contents($pipes[1]);
                $errors .= stream_get_contents($pipes[2]);
                break;
            }
            usleep(10000);
        }
        if ($exitCode !== 0 || $errors !== '' || !preg_match('/^[a-f0-9]{128}(?:\r?\n)?$/D', $output)) {
            throw new RuntimeException($failure);
        }
        return rtrim($output, "\r\n");
    } finally {
        $status = proc_get_status($process);
        if ($status['running']) proc_terminate($process, 9);
        foreach ($pipes as $pipe) if (is_resource($pipe)) fclose($pipe);
        proc_close($process);
    }
}
