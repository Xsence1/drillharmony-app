<?php
// Заявка с сайта DrillHarmony: письмо на LEAD_TO и копия в _leads/leads.csv (папка закрыта от просмотра).
// Работает на обычном хостинге с PHP (REG.RU Host-0 и т. п.). Адрес отправителя — ящик на домене сайта.
const LEAD_TO   = 'info@drillharmony.com';
const LEAD_FROM = 'info@drillharmony.com';

date_default_timezone_set('Asia/Yekaterinburg');
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
function out($code, $data) { http_response_code($code); echo json_encode($data, JSON_UNESCAPED_UNICODE); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') out(405, ['error' => 'Только POST']);

$raw = file_get_contents('php://input', false, null, 0, 20000);
$b = json_decode($raw, true);
if (!is_array($b)) $b = $_POST;
if (!empty($b['website'])) out(200, ['ok' => true]);                       // ловушка для ботов

$clean = function ($k, $n) use ($b) {
  $v = isset($b[$k]) && is_scalar($b[$k]) ? trim((string)$b[$k]) : '';
  $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $v);
  return mb_substr($v, 0, $n, 'UTF-8');
};
$f = ['name' => $clean('name', 120), 'company' => $clean('company', 200), 'email' => $clean('email', 120), 'phone' => $clean('phone', 40),
      'product' => $clean('product', 80), 'message' => $clean('message', 3000), 'source' => $clean('source', 120)];
foreach (['name', 'company', 'email', 'phone', 'product', 'source'] as $k) $f[$k] = str_replace(["\r", "\n"], ' ', $f[$k]);
$emailOk = (bool)filter_var($f['email'], FILTER_VALIDATE_EMAIL);
if (mb_strlen($f['name']) < 2 || !($emailOk || strlen(preg_replace('/\D/', '', $f['phone'])) >= 10)) out(400, ['error' => 'Укажите имя и e-mail или телефон.']);
if (empty($b['consent'])) out(400, ['error' => 'Нужно согласие на обработку персональных данных.']);

// не больше 5 заявок с одного адреса за 10 минут
$dir = __DIR__ . '/_leads';
if (!is_dir($dir)) { @mkdir($dir, 0750); }
if (!file_exists("$dir/.htaccess")) @file_put_contents("$dir/.htaccess", "Require all denied\nDeny from all\n");
$ip = $_SERVER['REMOTE_ADDR'] ?? '';
$rl = "$dir/rate-" . md5($ip) . '.txt';
$hits = array_filter(explode(',', (string)@file_get_contents($rl)), fn($t) => $t && $t > time() - 600);
if (count($hits) >= 5) out(429, ['error' => 'Слишком много заявок. Повторите позже или напишите на ' . LEAD_TO . '.']);
$hits[] = time(); @file_put_contents($rl, implode(',', $hits));

// копия заявки в CSV — на случай, если почта не дойдёт
$fh = @fopen("$dir/leads.csv", 'a');
if ($fh) { fputcsv($fh, [date('Y-m-d H:i:s'), $f['name'], $f['company'], $f['email'], $f['phone'], $f['product'], $f['message'], $f['source'], $ip]); fclose($fh); }

$lines = [];
foreach (['Имя' => 'name', 'Компания' => 'company', 'E-mail' => 'email', 'Телефон' => 'phone', 'Интересует' => 'product', 'Сообщение' => 'message', 'Страница' => 'source'] as $t => $k)
  if ($f[$k] !== '') $lines[] = "$t: " . $f[$k];
$lines[] = 'IP: ' . $ip;
$subject = 'Заявка DrillHarmony: ' . ($f['product'] ?: 'сайт') . ' — ' . ($f['company'] ?: $f['name']);
$body = implode("\r\n", $lines);
$encSubj = '=?UTF-8?B?' . base64_encode($subject) . '?=';

// Способ отправки: если рядом лежит lead-config.php с паролем ящика — через SMTP почты REG.RU (надёжно),
// иначе — функцией mail() хостинга. Результат пишется в _leads/mail.log (без пароля).
$cfg = is_file(__DIR__ . '/lead-config.php') ? (include __DIR__ . '/lead-config.php') : [];
$how = 'mail()'; $err = '';
if (!empty($cfg['smtp_pass'])) {
  $how = 'smtp ' . ($cfg['smtp_host'] ?? '');
  $sent = smtp_send($cfg, LEAD_FROM, LEAD_TO, $encSubj, $body, $emailOk ? $f['email'] : '', $err);
} else {
  $headers = ['From: DrillHarmony <' . LEAD_FROM . '>', 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: 8bit'];
  if ($emailOk) $headers[] = 'Reply-To: ' . $f['email'];
  $sent = @mail(LEAD_TO, $encSubj, $body, implode("\r\n", $headers), '-f' . LEAD_FROM);
  if (!$sent) $err = 'mail() вернула false';
}
@file_put_contents("$dir/mail.log", date('Y-m-d H:i:s') . " $how " . ($sent ? 'OK' : 'ОШИБКА: ' . $err) . "\n", FILE_APPEND);

out(200, ['ok' => true, 'mail' => $sent]);

// Минимальный SMTP-клиент: SSL (порт 465) или STARTTLS (587), AUTH LOGIN.
function smtp_send($c, $from, $to, $subj, $body, $replyTo, &$err) {
  $host = $c['smtp_host'] ?? 'mail.hosting.reg.ru'; $port = (int)($c['smtp_port'] ?? 465);
  $user = $c['smtp_user'] ?? $from; $pass = $c['smtp_pass'];
  $sec = $c['smtp_secure'] ?? ($port == 465 ? 'ssl' : 'tls');   // ssl | tls | none (none — только для проверки)
  $ctx = stream_context_create(['ssl' => ['verify_peer' => true, 'verify_peer_name' => true]]);
  $s = @stream_socket_client(($sec === 'ssl' ? 'ssl://' : 'tcp://') . "$host:$port", $no, $str, 15, STREAM_CLIENT_CONNECT, $ctx);
  if (!$s) { $err = "нет соединения с $host:$port ($str)"; return false; }
  stream_set_timeout($s, 15);
  $rd = function () use ($s) { $r = ''; while (($l = fgets($s, 1024)) !== false) { $r .= $l; if (strlen($l) < 4 || $l[3] === ' ') break; } return $r; };
  $cmd = function ($c, $want) use ($s, $rd, &$err) { if ($c !== null) fwrite($s, $c . "\r\n"); $r = $rd(); if ((int)substr($r, 0, 3) !== $want) { $err = trim($r) ?: 'нет ответа'; return false; } return true; };
  $me = $_SERVER['SERVER_NAME'] ?? 'localhost';
  $ok = $cmd(null, 220) && $cmd("EHLO $me", 250);
  if ($ok && $sec === 'tls') {
    $ok = $cmd('STARTTLS', 220) && stream_socket_enable_crypto($s, true, STREAM_CRYPTO_METHOD_TLS_CLIENT) && $cmd("EHLO $me", 250);
  }
  $ok = $ok && $cmd('AUTH LOGIN', 334) && $cmd(base64_encode($user), 334) && $cmd(base64_encode($pass), 235)
      && $cmd("MAIL FROM:<$from>", 250) && $cmd("RCPT TO:<$to>", 250) && $cmd('DATA', 354);
  if ($ok) {
    $h = ['Date: ' . date('r'), "From: DrillHarmony <$from>", "To: <$to>", "Subject: $subj", 'Message-ID: <' . bin2hex(random_bytes(8)) . '@drillharmony.com>',
          'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64'];
    if ($replyTo) $h[] = "Reply-To: <$replyTo>";
    $msg = implode("\r\n", $h) . "\r\n\r\n" . chunk_split(base64_encode($body));
    $ok = $cmd($msg . "\r\n.", 250);
  }
  @fwrite($s, "QUIT\r\n"); fclose($s);
  return $ok;
}
