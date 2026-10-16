<?php
// Фоновая обработка ответов бота. Вызывается сайтом сам; можно добавить и в cron хостинга раз в 5 минут:
// https://drillharmony.com/forum/cron.php?key=КЛЮЧ (ключ — содержимое forum/_data/secret.key)
define('FORUM', 1);
require __DIR__ . '/lib.php';
require __DIR__ . '/bot.php';
ignore_user_abort(true); @set_time_limit(180);
header('Content-Type: text/plain; charset=utf-8');
if (!hash_equals(bot_secret(), (string)($_GET['key'] ?? ''))) { http_response_code(403); exit('нет доступа'); }
echo 'ответов: ', bot_tick(3), "\n";
