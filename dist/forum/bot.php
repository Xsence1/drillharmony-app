<?php
// Бот форума DrillHarmony: отвечает на вопросы по статьям сайта и базе знаний,
// публикует новости продуктов. Модель: GigaChat, YandexGPT или любой API, совместимый с OpenAI.
// Без ключа модели бот всё равно работает: отвечает подборкой ссылок на подходящие материалы.
if (!defined('FORUM')) { http_response_code(403); exit; }

const BOT_NAME = 'Бот DrillHarmony';

function bot_cfg() {
  global $CFG;
  return array_merge([
    'enabled'      => true,
    'provider'     => '',            // gigachat | yandex | openai; пусто — только подборка ссылок
    'key'          => '',            // GigaChat: ключ авторизации (Basic); YandexGPT: API-ключ; OpenAI-совместимый: токен
    'folder'       => '',            // YandexGPT: идентификатор каталога
    'model'        => '',            // GigaChat / yandexgpt-lite / gpt-4o-mini …; пусто — по умолчанию провайдера
    'base_url'     => '',            // для openai-совместимых: https://…/v1
    'scope'        => 'GIGACHAT_API_PERS',
    'ca_file'      => '',            // путь к сертификату НУЦ Минцифры для GigaChat, если хостинг его не знает
    'sections'     => ['drillharmony', 'software', 'career'], // где бот отвечает сразу на новую тему
    'delay_hours'  => 3,             // в остальных разделах — если за это время никто не ответил
    'per_hour'     => 20,            // не больше ответов в час на весь форум
    'per_topic'    => 2,             // не больше ответов в одной теме
  ], $CFG['bot'] ?? []);
}

function bot_user() {
  $id = val('SELECT id FROM users WHERE name=?', [BOT_NAME]);
  if (!$id) {
    q('INSERT INTO users (name, email, pass, role, title, about, created, confirmed) VALUES (?,?,?,?,?,?,?,1)',
      [BOT_NAME, 'bot@drillharmony.com', '!', 'bot', 'Помощник форума', "Отвечает по статьям сайта и базе знаний форума. Ответы бота стоит проверять по ссылкам.\nЧтобы позвать бота в теме, напишите в ответе **@бот** и вопрос.", time()]);
    $id = db()->lastInsertId();
  }
  return (int)$id;
}
function bot_tables() {
  db()->exec('CREATE TABLE IF NOT EXISTS bot_queue (id INTEGER PRIMARY KEY, topic_id INTEGER NOT NULL, post_id INTEGER, due INTEGER NOT NULL, done INTEGER NOT NULL DEFAULT 0, note TEXT)');
}

// ---------- постановка в очередь ----------
function bot_on_topic($tid, $catSlug) {
  $c = bot_cfg(); if (!$c['enabled']) return;
  bot_tables();
  $due = in_array($catSlug, $c['sections'], true) ? time() + 20 : time() + (int)($c['delay_hours'] * 3600);
  q('INSERT INTO bot_queue (topic_id, due, note) VALUES (?,?,?)', [$tid, $due, in_array($catSlug, $c['sections'], true) ? 'section' : 'silence']);
}
function bot_on_reply($tid, $pid, $body) {
  $c = bot_cfg(); if (!$c['enabled']) return;
  if (!preg_match('/(^|\s)@бот\b/iu', $body)) return;
  bot_tables();
  q('INSERT INTO bot_queue (topic_id, post_id, due, note) VALUES (?,?,?,?)', [$tid, $pid, time() + 5, 'mention']);
}

// ---------- обработка очереди: после ответа посетителю или по cron ----------
function bot_tick($max = 1) {
  $c = bot_cfg(); if (!$c['enabled']) return 0;
  bot_tables();
  $lock = __DIR__ . '/_data/bot.lock';
  $fh = @fopen($lock, 'c'); if (!$fh || !flock($fh, LOCK_EX | LOCK_NB)) return 0;
  $done = 0;
  try {
    $jobs = q('SELECT * FROM bot_queue WHERE done=0 AND due<=? ORDER BY due LIMIT ?', [time(), $max])->fetchAll();
    foreach ($jobs as $j) {
      q('UPDATE bot_queue SET done=1 WHERE id=?', [$j['id']]);
      if (bot_answer($j)) $done++;
    }
  } finally { flock($fh, LOCK_UN); fclose($fh); }
  return $done;
}

function bot_answer($job) {
  $c = bot_cfg();
  $bot = bot_user();
  $t = one('SELECT t.*, c.slug cslug FROM topics t JOIN cats c ON c.id=t.cat_id WHERE t.id=?', [$job['topic_id']]);
  if (!$t || $t['deleted'] || $t['locked']) return false;
  if ($job['note'] === 'silence' && (int)val('SELECT COUNT(*) FROM posts WHERE topic_id=? AND deleted=0 AND user_id<>?', [$t['id'], $t['user_id']]) > 0) return false; // люди уже ответили
  if ((int)val('SELECT COUNT(*) FROM posts WHERE topic_id=? AND user_id=? AND deleted=0', [$t['id'], $bot]) >= $c['per_topic']) return false;
  if ((int)val('SELECT COUNT(*) FROM posts WHERE user_id=? AND created>?', [$bot, time() - 3600]) >= $c['per_hour']) {
    q('UPDATE bot_queue SET done=0, due=? WHERE id=?', [time() + 900, $job['id']]); return false;
  }
  // вопрос: первое сообщение темы или сообщение с @бот
  $first = one('SELECT body FROM posts WHERE topic_id=? ORDER BY id LIMIT 1', [$t['id']]);
  $ask = $job['post_id'] ? (string)val('SELECT body FROM posts WHERE id=?', [$job['post_id']]) : $first['body'];
  $ask = trim(preg_replace('/(^|\s)@бот\b/iu', ' ', $ask));
  $query = $t['title'] . "\n" . $ask;
  $hits = bot_search($query, 6);
  $text = '';
  if ($c['provider'] && $c['key']) {
    $ctx = '';
    foreach ($hits as $i => $h) $ctx .= "[" . ($i + 1) . "] " . $h['title'] . "\nСсылка: " . $h['url'] . "\n" . $h['text'] . "\n\n";
    $thread = '';
    if ($job['post_id']) {
      foreach (array_reverse(q('SELECT p.body, p.user_id FROM posts p WHERE p.topic_id=? AND p.id<? AND p.deleted=0 ORDER BY p.id DESC LIMIT 4', [$t['id'], $job['post_id']])->fetchAll()) as $p)   // имена участников в модель не уходят
        $thread .= ((int)$p['user_id'] === (int)$bot ? 'Бот' : ((int)$p['user_id'] === (int)$t['user_id'] ? 'Автор темы' : 'Участник')) . ': ' . mb_substr($p['body'], 0, 800) . "\n\n";
    }
    $system = bot_system_prompt();
    $user = "Тема: {$t['title']}\n\n" . ($thread ? "Предыдущие сообщения:\n$thread\n" : '') . "Вопрос участника:\n" . mb_substr($ask, 0, 3000) . "\n\nМатериалы DrillHarmony:\n" . ($ctx ?: "(подходящих материалов не найдено)\n");
    $text = llm_chat($system, $user, $err);
    if ($text === '') @file_put_contents(__DIR__ . '/_data/bot.log', date('Y-m-d H:i:s') . " ошибка модели: $err\n", FILE_APPEND);
  }
  $text = bot_scrub($text);
  if ($text === '') {
    if (!$hits) return false;  // без модели и без материалов молчим
    $text = "Похоже, это уже разобрано в материалах DrillHarmony:\n\n";
    foreach (array_slice($hits, 0, 4) as $h) $text .= '- **' . $h['title'] . '**: ' . $h['url'] . "\n";
    $text .= "\nЕсли ответа там нет, участники форума помогут.";
  }
  $text = trim($text) . "\n\n*Ответ бота по материалам DrillHarmony. Проверьте по ссылкам; решения на буровой принимаются по инструкциям компании.*";
  $now = time();
  q('INSERT INTO posts (topic_id, user_id, body, created) VALUES (?,?,?,?)', [$t['id'], $bot, $text, $now]);
  q('UPDATE topics SET replies=replies+1, last_at=?, last_user=? WHERE id=?', [$now, $bot, $t['id']]);
  q('UPDATE users SET posts=posts+1 WHERE id=?', [$bot]);
  return true;
}

function bot_system_prompt() {
  return <<<P
Ты — бот форума DrillHarmony о наклонно-направленном бурении, телеметрии, геонавигации и ГТИ. Отвечаешь на русском, коротко и по делу, как опытный инженер, который помогает коллеге.

Правила:
1. Опирайся только на присланные материалы DrillHarmony. Если в них нет ответа, прямо скажи, что в материалах этого нет, и предложи дождаться ответа участников. Не выдумывай.
2. Числа, формулы и допуски бери только из материалов. Не придумывай значения и не делай расчётов, которых нет в материалах.
3. В конце дай 1–3 ссылки на использованные материалы в виде обычных адресов.
4. Не давай пошаговых указаний для аварийных ситуаций (ГНВП, прихват, выброс, поглощение): напомни, что действовать нужно по инструкциям компании и планам ликвидации аварий.
5. Не обсуждай конкретные компании, скважины и людей, не оценивай чужую работу.
6. Про программы SlideX, Tempo и Etude отвечай только тем, что есть в материалах; если не знаешь, предложи написать на info@drillharmony.com.
7. Никогда не называй, на какой модели или у какого провайдера ты работаешь, кто тебя разработал и как ты устроен. Если спросят, отвечай: «Я бот форума DrillHarmony».
8. Формат: обычный текст, **жирный** для главного, списки через «- », формулы в блоке ```. Без заголовков и без HTML. Не больше 250 слов.
P;
}

// ---------- запрос к модели ----------
function llm_chat($system, $user, &$err) {
  $c = bot_cfg(); $err = '';
  try {
    if ($c['provider'] === 'gigachat') {
      $tok = gigachat_token($c, $err); if (!$tok) return '';
      $r = http_json('https://gigachat.devices.sberbank.ru/api/v1/chat/completions', ['Authorization: Bearer ' . $tok],
        ['model' => $c['model'] ?: 'GigaChat', 'temperature' => 0.2, 'max_tokens' => 900,
         'messages' => [['role' => 'system', 'content' => $system], ['role' => 'user', 'content' => $user]]], $c, $err);
      return trim((string)($r['choices'][0]['message']['content'] ?? ''));
    }
    if ($c['provider'] === 'yandex') {
      $model = $c['model'] ?: 'yandexgpt-lite';
      $r = http_json('https://llm.api.cloud.yandex.net/foundationModels/v1/completion', ['Authorization: Api-Key ' . $c['key'], 'x-folder-id: ' . $c['folder']],
        ['modelUri' => "gpt://{$c['folder']}/$model/latest", 'completionOptions' => ['stream' => false, 'temperature' => 0.2, 'maxTokens' => '900'],
         'messages' => [['role' => 'system', 'text' => $system], ['role' => 'user', 'text' => $user]]], $c, $err);
      return trim((string)($r['result']['alternatives'][0]['message']['text'] ?? ''));
    }
    if ($c['provider'] === 'openai') {
      $r = http_json(rtrim($c['base_url'] ?: 'https://api.openai.com/v1', '/') . '/chat/completions', ['Authorization: Bearer ' . $c['key']],
        ['model' => $c['model'] ?: 'gpt-4o-mini', 'temperature' => 0.2, 'max_tokens' => 900,
         'messages' => [['role' => 'system', 'content' => $system], ['role' => 'user', 'content' => $user]]], $c, $err);
      return trim((string)($r['choices'][0]['message']['content'] ?? ''));
    }
    $err = 'неизвестный provider';
  } catch (Throwable $e) { $err = $e->getMessage(); }
  return '';
}
function gigachat_token($c, &$err) {
  $f = __DIR__ . '/_data/gigachat-token.json';
  $t = @json_decode((string)@file_get_contents($f), true);
  if ($t && ($t['expires_at'] ?? 0) / 1000 > time() + 60) return $t['access_token'];
  $uuid = vsprintf('%s%s-%s-4%s-%s-%s%s%s', str_split(substr(bin2hex(random_bytes(16)), 0, 31) . '0', 4));
  $ch = curl_init('https://ngw.devices.sberbank.ru:9443/api/v2/oauth');
  curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 20,
    CURLOPT_HTTPHEADER => ['Authorization: Basic ' . $c['key'], 'RqUID: ' . $uuid, 'Content-Type: application/x-www-form-urlencoded', 'Accept: application/json'],
    CURLOPT_POSTFIELDS => 'scope=' . rawurlencode($c['scope'])]);
  if ($c['ca_file']) curl_setopt($ch, CURLOPT_CAINFO, $c['ca_file']);
  $out = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); $e = curl_error($ch); curl_close($ch);
  $j = json_decode((string)$out, true);
  if ($code != 200 || empty($j['access_token'])) { $err = "токен GigaChat: HTTP $code $e " . mb_substr((string)$out, 0, 200); return ''; }
  @file_put_contents($f, json_encode($j));
  return $j['access_token'];
}
function http_json($url, $headers, $body, $c, &$err) {
  $ch = curl_init($url);
  curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 60, CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_HTTPHEADER => array_merge($headers, ['Content-Type: application/json', 'Accept: application/json']),
    CURLOPT_POSTFIELDS => json_encode($body, JSON_UNESCAPED_UNICODE)]);
  if (!empty($c['ca_file'])) curl_setopt($ch, CURLOPT_CAINFO, $c['ca_file']);
  $out = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); $e = curl_error($ch); curl_close($ch);
  if ($code != 200) { $err = "HTTP $code $e " . mb_substr((string)$out, 0, 300); return []; }
  return json_decode((string)$out, true) ?: [];
}

// ---------- поиск по материалам: статьи и калькуляторы сайта + база знаний форума ----------
function bot_terms($s) {
  $s = mb_strtolower(str_replace('ё', 'е', $s));
  preg_match_all('/[a-zа-я0-9]{3,}/u', $s, $m);
  $stop = array_flip(['как', 'что', 'это', 'для', 'при', 'или', 'так', 'его', 'она', 'они', 'есть', 'все', 'уже', 'если', 'чем', 'где', 'когда', 'почему', 'можно', 'нужно', 'кто', 'был', 'была', 'было', 'будет', 'только', 'тоже', 'там', 'тут', 'вот', 'the', 'and', 'подскажите', 'вопрос', 'спасибо', 'добрый', 'день', 'всем', 'привет']);
  $out = [];
  foreach ($m[0] as $w) { if (isset($stop[$w])) continue; $out[] = preg_match('/^[а-я]+$/u', $w) && mb_strlen($w) > 5 ? mb_substr($w, 0, 5) : $w; }  // грубая основа слова
  return $out;
}
function bot_index() {
  $site = dirname(__DIR__); $f = __DIR__ . '/_data/bot-index.json';
  $files = array_merge(glob("$site/articles/*/index.html") ?: [], glob("$site/calculators/*/index.html") ?: [], glob("$site/tools/*/index.html") ?: [],
                       array_filter(["$site/slidex/index.html", "$site/tempo/index.html", "$site/etude/index.html", "$site/pilot/index.html", "$site/security/index.html", "$site/buy/index.html"], 'is_file'));
  $stamp = 0; foreach ($files as $x) $stamp = max($stamp, filemtime($x));
  $kbStamp = (int)val("SELECT COALESCE(MAX(COALESCE(p.edited, p.created)),0) FROM posts p JOIN topics t ON t.id=p.topic_id JOIN cats c ON c.id=t.cat_id WHERE c.slug='kb' OR c.slug LIKE 'gti-%'");
  $idx = @json_decode((string)@file_get_contents($f), true);
  if ($idx && $idx['stamp'] == $stamp && $idx['kb'] == $kbStamp) return $idx['docs'];
  $docs = [];
  foreach ($files as $x) {
    $html = file_get_contents($x);
    $rel = trim(str_replace('\\', '/', substr(dirname($x), strlen($site))), '/') . '/';
    $title = preg_match('/<h1[^>]*>(.*?)<\/h1>/su', $html, $m) ? trim(html_entity_decode(strip_tags($m[1]))) : $rel;
    $main = preg_match('/<main[^>]*>(.*)<\/main>/su', $html, $m) ? $m[1] : $html;
    $main = preg_replace('~<(script|style|svg|nav|aside|canvas)\b.*?</\1>~su', ' ', $main);
    $main = preg_replace('~<section class="rel".*?</section>~su', ' ', $main);
    foreach (preg_split('~<h2[^>]*>~u', $main) as $i => $part) {
      $head = $i && preg_match('~^(.*?)</h2>~su', $part, $m) ? trim(html_entity_decode(strip_tags($m[1]))) : '';
      $text = trim(preg_replace('/\s+/u', ' ', html_entity_decode(strip_tags(preg_replace('~</(p|li|div|tr|h3)>~u', "\n", $part)))));
      if (mb_strlen($text) < 80) continue;
      $docs[] = ['title' => $title . ($head ? ': ' . $head : ''), 'url' => 'https://drillharmony.com/' . $rel, 'text' => mb_substr($text, 0, 1600)];
    }
  }
  foreach (q("SELECT t.id, t.title, p.body FROM topics t JOIN cats c ON c.id=t.cat_id JOIN posts p ON p.id=(SELECT MIN(id) FROM posts WHERE topic_id=t.id) WHERE t.deleted=0 AND (c.slug='kb' OR c.slug LIKE 'gti-%') AND p.user_id=(SELECT id FROM users WHERE name='DrillHarmony')")->fetchAll() as $r)
    $docs[] = ['title' => 'База знаний форума: ' . $r['title'], 'url' => abs_url('t/' . $r['id']), 'text' => mb_substr($r['body'], 0, 1600)];
  foreach ($docs as &$d) $d['terms'] = array_count_values(bot_terms($d['title'] . ' ' . $d['title'] . ' ' . $d['text']));
  unset($d);
  @file_put_contents($f, json_encode(['stamp' => $stamp, 'kb' => $kbStamp, 'docs' => $docs], JSON_UNESCAPED_UNICODE));
  return $docs;
}
function bot_search($query, $k = 6) {
  $docs = bot_index(); if (!$docs) return [];
  $q = array_unique(bot_terms($query)); if (!$q) return [];
  $N = count($docs); $df = [];
  foreach ($q as $w) { $df[$w] = 0; foreach ($docs as $d) if (isset($d['terms'][$w])) $df[$w]++; }
  $scored = [];
  foreach ($docs as $i => $d) {
    $s = 0; $len = array_sum($d['terms']) ?: 1;
    foreach ($q as $w) if (isset($d['terms'][$w]) && $df[$w]) { $tf = $d['terms'][$w]; $s += log(1 + $N / $df[$w]) * ($tf * 2.2) / ($tf + 1.2 * (0.25 + 0.75 * $len / 220)); }
    if ($s > 0) $scored[$i] = $s;
  }
  arsort($scored);
  $out = []; $seen = [];
  foreach ($scored as $i => $s) {
    if ($s < 1.5) break;
    $u = $docs[$i]['url']; if (isset($seen[$u]) && count($seen) < 3) continue;  // разнообразие источников
    $seen[$u] = 1; $out[] = $docs[$i];
    if (count($out) >= $k) break;
  }
  return $out;
}

// ---------- новости продуктов от имени бота ----------
function bot_news($title, $body, $pin) {
  $bot = bot_user();
  $cid = val("SELECT id FROM cats WHERE slug='drillharmony'");
  $now = time();
  q('INSERT INTO topics (cat_id, user_id, title, created, last_at, last_user, pinned) VALUES (?,?,?,?,?,?,?)', [$cid, $bot, $title, $now, $now, $bot, $pin ? 1 : 0]);
  $tid = db()->lastInsertId();
  q('INSERT INTO posts (topic_id, user_id, body, created) VALUES (?,?,?,?)', [$tid, $bot, $body . "\n\nВопросы и пожелания пишите ответом в эту тему.", $now]);
  q('UPDATE users SET posts=posts+1 WHERE id=?', [$bot]);
  return $tid;
}

// участникам не показываем, на какой модели работает бот
function bot_scrub($t) {
  if ($t === '') return '';
  // фразы о себе целиком: «Я работаю на GigaChat», «я основан на модели …»
  $t = preg_replace('/\b(я|бот)\s+(—\s+)?(работаю|основан|построен|создан|разработан|использую|являюсь|работает|основан)\w*\s+(на|на базе|на основе|компанией|в)?\s*(модел\w*\s+|нейросет\w*\s+)?("|«)?(GigaChat|ГигаЧат|Гигачат|YandexGPT|Яндекс\s?GPT|YaGPT|ChatGPT|OpenAI|GPT-?\d[\w.-]*|Claude|Anthropic|Llama|Mistral|Qwen|DeepSeek|Gemini|Сбер\w*|Яндекс\w*)[^.!?\n]*/iu', 'Я бот форума DrillHarmony', $t);
  $t = preg_replace('/(?<![\p{L}\p{N}])(GigaChat|ГигаЧат|Гигачат|YandexGPT|Яндекс\s?GPT|YaGPT|ChatGPT|OpenAI|GPT-?\d[\w.-]*|Claude|Anthropic|Llama|Mistral|Qwen|DeepSeek|Gemini)(?![\p{L}\p{N}])/iu', 'бот DrillHarmony', $t);
  $t = preg_replace('/(языков(ая|ой) модел[ьи]|нейросет[ьи])\s+(от|компании)\s+\S+/iu', 'бот DrillHarmony', $t);
  return $t;
}

// фоновый запуск: сразу после ответа посетителю, иначе отдельным запросом к cron.php
function bot_secret() {
  $f = __DIR__ . '/_data/secret.key';
  if (!is_file($f)) @file_put_contents($f, bin2hex(random_bytes(24)));
  return trim((string)@file_get_contents($f));
}
function bot_kick() {
  if (!bot_cfg()['enabled']) return;
  bot_tables();
  if (!val('SELECT 1 FROM bot_queue WHERE done=0 AND due<=? LIMIT 1', [time()])) return;
  if (function_exists('fastcgi_finish_request')) {
    register_shutdown_function(function () { @fastcgi_finish_request(); @set_time_limit(120); ignore_user_abort(true); bot_tick(2); });
    return;
  }
  global $CFG;
  $https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
  $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
  $port = $https ? 443 : (int)($_SERVER['SERVER_PORT'] ?? 80);
  $path = $CFG['base'] . 'cron.php?key=' . bot_secret();
  $fp = @fsockopen(($https ? 'ssl://' : '') . preg_replace('/:\d+$/', '', $host), $port, $no, $str, 2);
  if ($fp) { fwrite($fp, "GET $path HTTP/1.1\r\nHost: $host\r\nConnection: Close\r\n\r\n"); fclose($fp); }
}
