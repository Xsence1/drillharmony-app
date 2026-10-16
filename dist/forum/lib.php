<?php
// Форум DrillHarmony: общие функции. PHP 7.4+ с PDO SQLite.
if (!defined('FORUM')) { http_response_code(403); exit; }
date_default_timezone_set('Asia/Yekaterinburg');
mb_internal_encoding('UTF-8');
require_once __DIR__ . '/gamify.php';

$CFG = array_merge([
  'base'          => '/forum/',          // адрес форума от корня сайта
  'pretty'        => true,               // красивые адреса через .htaccess (mod_rewrite)
  'site'          => 'https://drillharmony.com',
  'admins'        => ['info@drillharmony.com'],   // кто зарегистрируется с этим e-mail, станет администратором
  'confirm_email' => true,               // подтверждение почты перед первой публикацией
  'mail_from'     => 'info@drillharmony.com',
  'per_page'      => 20,
  'live_url'      => 'https://live.drillharmony.com',   // сервис онлайн-данных WITS/WITSML на VPS
  'live_secret'   => '',                 // общий секрет с сервисом (LIVE_SSO_SECRET); пусто — сервис не подключён
], is_file(__DIR__ . '/forum-config.php') ? (include __DIR__ . '/forum-config.php') : []);

// ---------- база ----------
function db() {
  static $pdo = null;
  if ($pdo) return $pdo;
  $dir = __DIR__ . '/_data';
  if (!is_dir($dir)) @mkdir($dir, 0750);
  if (!file_exists("$dir/.htaccess")) @file_put_contents("$dir/.htaccess", "Require all denied\nDeny from all\n");
  $pdo = new PDO('sqlite:' . $dir . '/forum.sqlite', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
  $pdo->exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  if (!$pdo->query("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")->fetch()) {
    $pdo->beginTransaction();
    try { install($pdo); $pdo->commit(); } catch (Throwable $e) { $pdo->rollBack(); throw $e; }
  }
  $ver = (int)$pdo->query('PRAGMA user_version')->fetchColumn();
  if ($ver < CATS_VERSION) {
    $pdo->beginTransaction();
    try {
      if ($ver < 4) { sync_cats($pdo); seed_gti($pdo); seed_gti($pdo, 'topics.php', 0); }
      if ($ver < 5) g_migrate($pdo);          // репутация, бейджи, теги, уведомления, поиск
      $pdo->commit();
    } catch (Throwable $e) { $pdo->rollBack(); throw $e; }
    $pdo->exec('PRAGMA user_version = ' . CATS_VERSION);
  }
  return $pdo;
}
function q($sql, $a = []) { $s = db()->prepare($sql); $s->execute($a); return $s; }
function one($sql, $a = []) { return q($sql, $a)->fetch(); }
function val($sql, $a = []) { return q($sql, $a)->fetchColumn(); }

function cat_list() {
  return [
    ['База знаний', 'kb', 'Справки по расчётам и практике ННБ: формулы, правила, ссылки на статьи и калькуляторы', 'Наклонно-направленное бурение', 1],
    ['Траектория и замеры', 'trajectory', 'Профили, антиколлизия, инклинометрия, склонение и системы координат', 'Наклонно-направленное бурение', 0],
    ['Ориентирование, слайд и КНБК', 'orientation', 'Toolface, реактивный момент, компоновки, ВЗД и РУС', 'Наклонно-направленное бурение', 0],
    ['Телеметрия и каротаж', 'mwd', 'Телесистемы, гидроканал и сбои, ГК, сопротивление, нейтрон и плотность', 'Наклонно-направленное бурение', 0],
    ['Геонавигация', 'geosteering', 'Посадка в пласт, удержание ствола, корреляция с опорными скважинами', 'Наклонно-направленное бурение', 0],
    ['Режимы бурения и долота', 'drilling', 'Нагрузка, обороты, MSE, вибрации, гидравлика долота', 'Бурение', 0],
    ['Растворы, очистка ствола и колонны', 'hydraulics', 'ЭЦП, очистка, «метла», спуск обсадных колонн', 'Бурение', 0],
    ['Данные и программы', 'software', 'WITS, WITSML, LAS, шаблоны Excel, расчёты и своё ПО', 'Бурение', 0],
    ['Станции ГТИ и датчики', 'gti-station', 'Датчики веса, давления, расхода, уровня и оборотов: монтаж, калибровка, неисправности', 'ГТИ: геолого-технологические исследования', 0],
    ['Газовый каротаж и хроматография', 'gti-gas', 'Суммарный газ, хроматограф, газопоказания, время отставания', 'ГТИ: геолого-технологические исследования', 0],
    ['Шлам, литология и разрез', 'gti-geo', 'Отбор и описание шлама, литология, механический каротаж, отбивки пластов', 'ГТИ: геолого-технологические исследования', 0],
    ['Контроль процесса бурения', 'gti-control', 'Баланс ёмкостей, раннее распознавание осложнений по параметрам, операции и время', 'ГТИ: геолого-технологические исследования', 0],
    ['Отчёты и данные ГТИ', 'gti-reports', 'Сводки, планшеты, передача данных заказчику, программы станций', 'ГТИ: геолого-технологические исследования', 0],
    ['Обучение, работа и карьера', 'career', 'Собеседования, стажировка, аттестация, вахта, переход в ННБ и ГТИ', 'Сообщество', 0],
    ['Курилка', 'offtop', 'Общение на любые темы: вахтовая жизнь, дорога, техника, отдых', 'Сообщество', 0],
    ['Программы DrillHarmony', 'drillharmony', 'SlideX, Tempo, Etude: вопросы, ошибки, пожелания', 'Сообщество', 0],
    ['О форуме', 'about', 'Правила и объявления администрации', 'Сообщество', 1],
  ];
}
// добавляет новые разделы и порядок в уже созданную базу
function sync_cats($pdo) {
  $ins = $pdo->prepare('INSERT OR IGNORE INTO cats (name, slug, descr, grp, admin_only, ord) VALUES (?,?,?,?,?,?)');
  $upd = $pdo->prepare('UPDATE cats SET ord=?, grp=? WHERE slug=?');
  foreach (cat_list() as $i => $c) { $ins->execute([$c[0], $c[1], $c[2], $c[3], $c[4], $i + 1]); $upd->execute([$i + 1, $c[3], $c[1]]); }
}
const CATS_VERSION = 5;
// справки ГТИ от имени владельца, если их ещё нет
function seed_gti($pdo, $file = 'kb_gti.php', $pin = 1) {
  $uid = $pdo->query("SELECT id FROM users WHERE name='DrillHarmony'")->fetchColumn();
  if (!$uid) return;
  $n = 0;
  foreach (include __DIR__ . '/' . $file as [$slug, $title, $body]) {
    $cid = $pdo->query('SELECT id FROM cats WHERE slug=' . $pdo->quote($slug))->fetchColumn();
    if (!$cid) continue;
    $ex = $pdo->prepare('SELECT 1 FROM topics WHERE cat_id=? AND title=?'); $ex->execute([$cid, $title]);
    if ($ex->fetch()) continue;
    $t = time();
    $pdo->prepare('INSERT INTO topics (cat_id, user_id, title, created, last_at, last_user, pinned, locked) VALUES (?,?,?,?,?,?,?,0)')->execute([$cid, $uid, $title, $t, $t, $uid, $pin]);
    $pdo->prepare('INSERT INTO posts (topic_id, user_id, body, created) VALUES (?,?,?,?)')->execute([$pdo->lastInsertId(), $uid, $body, $t]);
    $n++;
  }
  if ($n) $pdo->prepare('UPDATE users SET posts=posts+? WHERE id=?')->execute([$n, $uid]);
}

function install($pdo) {
  $pdo->exec(<<<SQL
CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE COLLATE NOCASE, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  pass TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user', title TEXT DEFAULT '', about TEXT DEFAULT '', created INTEGER NOT NULL,
  confirmed INTEGER NOT NULL DEFAULT 0, token TEXT, token_exp INTEGER, banned INTEGER NOT NULL DEFAULT 0, posts INTEGER NOT NULL DEFAULT 0, last_seen INTEGER);
CREATE TABLE cats (id INTEGER PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, descr TEXT, ord INTEGER, grp TEXT, admin_only INTEGER NOT NULL DEFAULT 0);
CREATE TABLE topics (id INTEGER PRIMARY KEY, cat_id INTEGER NOT NULL REFERENCES cats(id), user_id INTEGER NOT NULL REFERENCES users(id), title TEXT NOT NULL,
  created INTEGER NOT NULL, last_at INTEGER NOT NULL, last_user INTEGER, replies INTEGER NOT NULL DEFAULT 0, views INTEGER NOT NULL DEFAULT 0,
  pinned INTEGER NOT NULL DEFAULT 0, locked INTEGER NOT NULL DEFAULT 0, deleted INTEGER NOT NULL DEFAULT 0);
CREATE TABLE posts (id INTEGER PRIMARY KEY, topic_id INTEGER NOT NULL REFERENCES topics(id), user_id INTEGER NOT NULL REFERENCES users(id), body TEXT NOT NULL,
  created INTEGER NOT NULL, edited INTEGER, deleted INTEGER NOT NULL DEFAULT 0, likes INTEGER NOT NULL DEFAULT 0, ip TEXT);
CREATE TABLE likes (post_id INTEGER NOT NULL, user_id INTEGER NOT NULL, PRIMARY KEY (post_id, user_id));
CREATE TABLE reports (id INTEGER PRIMARY KEY, post_id INTEGER NOT NULL, user_id INTEGER NOT NULL, reason TEXT, created INTEGER NOT NULL, done INTEGER NOT NULL DEFAULT 0);
CREATE TABLE hits (k TEXT NOT NULL, t INTEGER NOT NULL);
CREATE INDEX t_cat ON topics(cat_id, deleted, pinned, last_at);
CREATE INDEX p_topic ON posts(topic_id, id);
CREATE INDEX hits_k ON hits(k, t);
SQL);
  $cats = cat_list();
  $s = $pdo->prepare('INSERT INTO cats (name, slug, descr, grp, admin_only, ord) VALUES (?,?,?,?,?,?)');
  foreach ($cats as $i => $c) $s->execute([$c[0], $c[1], $c[2], $c[3], $c[4], $i + 1]);
  // учётная запись владельца форума: пароль задаётся через «Забыли пароль» на info@drillharmony.com или через setup_key
  $pdo->prepare('INSERT INTO users (name, email, pass, role, title, about, created, confirmed) VALUES (?,?,?,?,?,?,?,1)')
      ->execute(['DrillHarmony', 'info@drillharmony.com', '!', 'admin', 'Владелец форума', 'Программы для наклонно-направленного бурения: SlideX, Tempo, Etude. https://drillharmony.com', time()]);
  $uid = $pdo->lastInsertId();
  $now = time(); $n = 0;
  $add = function ($slug, $title, $body, $pinned, $locked) use ($pdo, $uid, &$now, &$n) {
    $cid = $pdo->query("SELECT id FROM cats WHERE slug=" . $pdo->quote($slug))->fetchColumn();
    $t = $now - 100 + $n++;
    $pdo->prepare('INSERT INTO topics (cat_id, user_id, title, created, last_at, last_user, pinned, locked) VALUES (?,?,?,?,?,?,?,?)')
        ->execute([$cid, $uid, $title, $t, $t, $uid, $pinned, $locked]);
    $pdo->prepare('INSERT INTO posts (topic_id, user_id, body, created) VALUES (?,?,?,?)')->execute([$pdo->lastInsertId(), $uid, $body, $t]);
  };
  $add('about', 'Правила форума', RULES_TEXT, 1, 1);
  $kb = include __DIR__ . '/kb.php';
  foreach (array_reverse($kb) as $i => [$title, $body]) $add('kb', $title, $body, $i === count($kb) - 1 ? 1 : 0, 0);
  $pdo->prepare('UPDATE users SET posts=? WHERE id=?')->execute([$n, $uid]);
}

const RULES_TEXT = <<<TXT
Форум сделан для инженеров ННБ, телеметристов, геонавигаторов и всех, кто работает с наклонно-направленным бурением. Здесь делятся опытом, задают вопросы и разбирают задачи.

**Что можно**
- Спрашивать, даже если вопрос кажется простым.
- Делиться приёмами, расчётами, шаблонами и разбором задач.
- Спорить по существу и с цифрами.

**Чего нельзя**
- Публиковать коммерческую тайну заказчиков и подрядчиков: названия скважин и месторождений, данные с буровой, программы на бурение, если у вас нет разрешения.
- Публиковать персональные данные других людей.
- Обвинять конкретные компании и людей в авариях и осложнениях. Осложнения обсуждаем технически и обезличенно.
- Рекламировать, оскорблять, обсуждать политику.

**Важно**
Ответы на форуме — мнение участников. На буровой решения принимаются по инструкциям вашей компании и программе на бурение.

Нарушения можно отправить модератору кнопкой «Пожаловаться» под сообщением. Сообщения с нарушениями удаляются, за повторные нарушения доступ закрывается.
TXT;

// ---------- адреса и вывод ----------
function url($r = '', $qs = []) {
  global $CFG;
  if ($CFG['pretty']) { $u = $CFG['base'] . $r; return $qs ? $u . '?' . http_build_query($qs) : $u; }
  $qs = $r === '' ? $qs : array_merge(['r' => $r], $qs);
  return $CFG['base'] . ($qs ? '?' . http_build_query($qs) : '');
}
function h($s) { return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function redirect($u) { header('Location: ' . $u, true, 303); exit; }
function flash($msg = null, $kind = 'ok') {
  if ($msg !== null) { $_SESSION['flash'] = [$msg, $kind]; return ''; }
  if (empty($_SESSION['flash'])) return '';
  [$m, $k] = $_SESSION['flash']; unset($_SESSION['flash']);
  return '<div class="f-flash ' . h($k) . '" role="status">' . h($m) . '</div>';
}
function ago($t) {
  $d = time() - $t;
  if ($d < 60) return 'только что';
  if ($d < 3600) return floor($d / 60) . ' мин назад';
  if ($d < 86400 && date('Ymd', $t) === date('Ymd')) return 'сегодня в ' . date('H:i', $t);
  if (date('Ymd', $t) === date('Ymd', time() - 86400)) return 'вчера в ' . date('H:i', $t);
  return date('d.m.Y H:i', $t);
}
function plural($n, $a, $b, $c) { $n = abs($n) % 100; $m = $n % 10; return ($n > 10 && $n < 20) ? $c : ($m == 1 ? $a : ($m >= 2 && $m <= 4 ? $b : $c)); }

// ---------- шаблон страницы ----------
function page($title, $main, $desc = 'Форум DrillHarmony: траектория, слайд, телеметрия, геонавигация, режимы бурения, данные и карьера.', $crumb = '', $noindex = false) {
  global $CFG;
  $tpl = @file_get_contents(__DIR__ . '/layout.html');
  if (!$tpl) { echo "<h1>" . h($title) . "</h1>$main"; exit; }
  $tpl = str_replace(['href="../', 'src="../', "content=\"https://drillharmony.com/forum/"], ['href="/', 'src="/', "content=\"https://drillharmony.com/forum/"], $tpl);
  if (strpos($title, 'DrillHarmony') !== false) $tpl = str_replace('<title>{{TITLE}} | DrillHarmony</title>', '<title>{{TITLE}}</title>', $tpl);
  $path = ltrim(parse_url($_SERVER['REQUEST_URI'] ?? '/forum/', PHP_URL_PATH), '/');
  $rep = [
    '{{TITLE}}' => h($title), '{{DESC}}' => h($desc), '{{PATH}}' => h(preg_replace('~^forum/?~', '', $path)),
    '{{CRUMB}}' => $crumb, '{{MAIN}}' => $main, '{{USERBAR}}' => userbar(),
  ];
  $html = strtr($tpl, $rep);
  if ($noindex) $html = str_replace('<head>', '<head><meta name="robots" content="noindex">', $html);
  header('Content-Type: text/html; charset=utf-8');
  header('X-Content-Type-Options: nosniff');
  header('Referrer-Policy: same-origin');
  echo $html; exit;
}
function userbar() {
  $u = me();
  $s = '<form class="f-search" action="' . h(url('search')) . '" method="get" role="search" data-suggest="' . h(url('suggest')) . '">' . (url('search') === url('') . '?r=search' ? '<input type="hidden" name="r" value="search">' : '')
     . '<input type="search" name="q" placeholder="Поиск: темы, теги, формулы" aria-label="Поиск по форуму" autocomplete="off" value="' . h($_GET['q'] ?? '') . '"><div class="f-sugg" hidden></div></form>';
  if ($u) {
    $n = notes_unseen($u['id']);
    $s .= '<a class="f-bell' . ($n ? ' on' : '') . '" href="' . h(url('notes')) . '" title="Уведомления" aria-label="Уведомления' . ($n ? ": $n новых" : '') . '"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/></svg>' . ($n ? '<b>' . ($n > 99 ? '99+' : $n) . '</b>' : '') . '</a>';
    $s .= '<a class="f-me" href="' . h(url('u/' . rawurlencode($u['name']))) . '">' . avatar($u, 26) . '<span>' . h($u['name']) . '<small>' . (int)$u['rep'] . ' реп.</small></span></a>';
    global $CFG;
    if (!empty($CFG['live_secret'])) $s .= '<a class="f-modlink" href="' . h(url('sso/live')) . '" title="Приборы, планшет и отклонитель по WITS и WITSML">Онлайн-данные</a>';
    if (is_mod()) {
      $m = (int)val('SELECT COUNT(*) FROM reports WHERE done=0');
      $s .= '<a class="f-modlink" href="' . h(url('mod')) . '">Модерация' . ($m ? " <b>$m</b>" : '') . '</a>';
    }
    $s .= '<form method="post" action="' . h(url('logout')) . '" class="f-inline">' . csrf_field() . '<button type="submit" class="f-link">Выйти</button></form>';
  } else {
    $s .= '<a class="btn" href="' . h(url('login', ['next' => $_SERVER['REQUEST_URI'] ?? ''])) . '">Войти</a><a class="btn pri" href="' . h(url('register')) . '">Регистрация</a>';
  }
  $r = trim((string)($_GET['r'] ?? ''), '/'); $r0 = explode('/', $r)[0];
  $nav = ['' => 'Разделы', 'latest' => 'Лента', 'latest?f=open' => 'Ждут ответа', 'tags' => 'Теги', 'top' => 'Рейтинг', 'badges' => 'Бейджи'];
  $cur = $r0 === 'latest' && ($_GET['f'] ?? '') === 'open' ? 'latest?f=open' : $r0;
  $sub = '<nav class="f-subnav" aria-label="Разделы форума">';
  foreach ($nav as $k => $t) {
    $href = strpos($k, '?') !== false ? url(strtok($k, '?'), ['f' => 'open']) : url($k);
    $sub .= '<a href="' . h($href) . '"' . ($k === $cur || ($k === 'tags' && $r0 === 'tag') ? ' aria-current="page"' : '') . '>' . $t . '</a>';
  }
  $sub .= '</nav>';
  return '<div class="f-bar">' . $s . '</div>' . $sub;
}
function avatar($u, $size = 40) {
  if ($img = avatar_html($u, $size)) return $img;
  $n = $u['name'] ?? '?'; $hue = hexdec(substr(md5(mb_strtolower($n)), 0, 2)) / 255 * 360;
  $ch = mb_strtoupper(mb_substr($n, 0, 1));
  return '<span class="f-ava" style="--s:' . (int)$size . 'px;--h:' . round($hue) . '" aria-hidden="true">' . h($ch) . '</span>';
}

// ---------- сессия, вход, права ----------
function start_session() {
  $secure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
  session_name('dhforum');
  session_set_cookie_params(['lifetime' => 60 * 60 * 24 * 30, 'path' => '/forum/', 'secure' => $secure, 'httponly' => true, 'samesite' => 'Lax']);
  session_start();
}
// метка входа для шапки сайта: статичные страницы спрашивают /forum/api/me, только если метка есть
function sync_marker() {
  $on = (bool)me(); $has = ($_COOKIE['dh_u'] ?? '') === '1';
  if ($on === $has || headers_sent()) return;
  $secure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
  setcookie('dh_u', $on ? '1' : '', ['expires' => $on ? time() + 60 * 60 * 24 * 30 : time() - 3600, 'path' => '/', 'secure' => $secure, 'httponly' => false, 'samesite' => 'Lax']);
}
// единый вход: подписанный пропуск для сервиса онлайн-данных (live.drillharmony.com), живёт 2 минуты
function b64u($s) { return rtrim(strtr(base64_encode($s), '+/', '-_'), '='); }
function sso_ticket($u, $aud) {
  global $CFG;
  $p = b64u(json_encode(['uid' => (int)$u['id'], 'name' => $u['name'], 'role' => $u['role'], 'aud' => $aud, 'exp' => time() + 120, 'n' => bin2hex(random_bytes(12))], JSON_UNESCAPED_UNICODE));
  return $p . '.' . b64u(hash_hmac('sha256', $p, (string)$CFG['live_secret'], true));
}
function me() {
  static $u = false;
  if ($u !== false) return $u;
  $u = null;
  if (!empty($_SESSION['uid'])) {
    $u = one('SELECT * FROM users WHERE id=?', [$_SESSION['uid']]) ?: null;
    if ($u && $u['banned']) { $u = null; unset($_SESSION['uid']); }
    if ($u && (time() - (int)$u['last_seen']) > 300) q('UPDATE users SET last_seen=? WHERE id=?', [time(), $u['id']]);
  }
  return $u;
}
function is_mod($u = null) { $u = $u ?: me(); return $u && in_array($u['role'], ['admin', 'moderator'], true); }
function is_admin($u = null) { $u = $u ?: me(); return $u && $u['role'] === 'admin'; }
function need_login() { if (!me()) { flash('Войдите, чтобы продолжить.', 'warn'); redirect(url('login', ['next' => $_SERVER['REQUEST_URI'] ?? ''])); } }
function can_post() {
  global $CFG; $u = me();
  if (!$u) return 'Войдите, чтобы писать на форуме.';
  if ($CFG['confirm_email'] && !$u['confirmed']) return 'Подтвердите e-mail: ссылка пришла в письме после регистрации. <a href="' . h(url('confirm', ['resend' => 1])) . '">Отправить письмо ещё раз</a>.';
  return '';
}
function csrf() { if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16)); return $_SESSION['csrf']; }
function csrf_field() { return '<input type="hidden" name="csrf" value="' . csrf() . '">'; }
function check_csrf() { if (!hash_equals(csrf(), (string)($_POST['csrf'] ?? ''))) { http_response_code(400); page('Ошибка', '<h1>Форма устарела</h1><p>Обновите страницу и попробуйте ещё раз.</p>', '', '', true); } }

// ограничение частоты: не больше $max событий $key за $sec секунд
function rate($key, $max, $sec) {
  q('DELETE FROM hits WHERE t < ?', [time() - 86400]);
  $n = (int)val('SELECT COUNT(*) FROM hits WHERE k=? AND t>?', [$key, time() - $sec]);
  if ($n >= $max) return false;
  q('INSERT INTO hits (k, t) VALUES (?,?)', [$key, time()]);
  return true;
}
function ip() { return $_SERVER['REMOTE_ADDR'] ?? ''; }
function txt($k, $max) {
  $v = isset($_POST[$k]) && is_scalar($_POST[$k]) ? (string)$_POST[$k] : '';
  $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $v);
  $v = str_replace("\r\n", "\n", $v);
  return mb_substr(trim($v), 0, $max);
}

// ---------- разметка сообщений ----------
// Хранится текст с простой разметкой, HTML экранируется целиком:
// **жирный**, *курсив*, ~~зачёркнутый~~, `код`, ```блок кода```, ## заголовок, > цитата, - и 1. списки,
// [текст](https://…), ![подпись](/forum/uploads/…), таблицы | a | b |, голые ссылки.
// текст без разметки: для фрагментов в поиске, профиле и списках
function plain_text($md) {
  $t = preg_replace('/!\[[^\]]*\]\([^)]*\)/u', ' [картинка] ', (string)$md);
  $t = preg_replace('/\[([^\]]+)\]\((https?:[^)\s]+)\)/u', '$1', $t);
  $t = preg_replace('/^\s*```.*$/mu', ' ', $t);
  $t = preg_replace('/^\s*\|?\s*:?-{2,}.*$/mu', ' ', $t);
  $t = preg_replace('/^\s{0,3}(#{1,6}|>+|[-*•]|\d+[.)])\s+/mu', '', $t);
  $t = preg_replace('/^\s*-{3,}\s*$/mu', ' ', $t);
  $t = str_replace(['**', '~~', '`'], '', $t);
  $t = preg_replace('/(?<![\p{L}\p{N}*])\*(?=\S)([^*\n]+?)\*(?![\p{L}\p{N}])/u', '$1', $t);
  $t = preg_replace('/\s*\|\s*/u', ' · ', $t);
  $t = preg_replace('/(\s·\s)+/u', ' · ', $t);
  return trim(preg_replace('/\s+/u', ' ', $t), " ·");
}
function render($src) {
  $src = str_replace("\r", '', $src);
  $blocks = []; $i = 0;
  $src = preg_replace_callback('/```(?:[a-z0-9]+)?\n?(.*?)```/s', function ($m) use (&$blocks, &$i) {
    $k = "\x01" . ($i++) . "\x01"; $blocks[$k] = '<pre><code>' . h(rtrim($m[1], "\n")) . '</code></pre>'; return "\n$k\n";
  }, $src);
  $out = []; $para = []; $list = []; $ltype = ''; $quote = []; $table = [];
  $flushP = function () use (&$para, &$out) { if ($para) { $out[] = '<p>' . implode('<br>', array_map('inline', $para)) . '</p>'; $para = []; } };
  $flushL = function () use (&$list, &$out, &$ltype) { if ($list) { $out[] = "<$ltype>" . implode('', array_map(fn($l) => '<li>' . inline($l) . '</li>', $list)) . "</$ltype>"; $list = []; } };
  $flushQ = function () use (&$quote, &$out) { if ($quote) { $out[] = '<blockquote>' . render(implode("\n", $quote)) . '</blockquote>'; $quote = []; } };
  $flushT = function () use (&$table, &$out) {
    if (!$table) return;
    $rows = array_values(array_filter($table, fn($r) => !preg_match('/^\s*\|?\s*:?-{2,}/', $r)));
    $cells = fn($r) => array_map('trim', explode('|', trim(trim($r), '|')));
    $html = '<div class="f-table"><table><thead><tr>' . implode('', array_map(fn($c) => '<th>' . inline($c) . '</th>', $cells($rows[0]))) . '</tr></thead><tbody>';
    foreach (array_slice($rows, 1) as $r) $html .= '<tr>' . implode('', array_map(fn($c) => '<td>' . inline($c) . '</td>', $cells($r))) . '</tr>';
    $out[] = $html . '</tbody></table></div>'; $table = [];
  };
  $flushAll = function () use ($flushP, $flushL, $flushQ, $flushT) { $flushP(); $flushL(); $flushQ(); $flushT(); };
  foreach (explode("\n", $src) as $line) {
    if (isset($blocks[trim($line)])) { $flushAll(); $out[] = $blocks[trim($line)]; continue; }
    if (preg_match('/^>\s?(.*)$/', $line, $m)) { $flushP(); $flushL(); $flushT(); $quote[] = $m[1]; continue; }
    $flushQ();
    if (preg_match('/^\s*\|.*\|\s*$/', $line)) { $flushP(); $flushL(); $table[] = $line; continue; }
    $flushT();
    if (preg_match('/^(#{1,3})\s+(.+)$/', $line, $m)) { $flushP(); $flushL(); $lv = strlen($m[1]) + 2; $out[] = "<h$lv>" . inline($m[2]) . "</h$lv>"; continue; }
    if (preg_match('/^\s*[-•*]\s+(.+)$/', $line, $m)) { $flushP(); if ($ltype !== 'ul') $flushL(); $ltype = 'ul'; $list[] = $m[1]; continue; }
    if (preg_match('/^\s*\d+[.)]\s+(.+)$/', $line, $m)) { $flushP(); if ($ltype !== 'ol') $flushL(); $ltype = 'ol'; $list[] = $m[1]; continue; }
    $flushL();
    if (preg_match('/^\s*(-{3,}|\*{3,})\s*$/', $line)) { $flushP(); $out[] = '<hr>'; continue; }
    if (trim($line) === '') { $flushP(); continue; }
    $para[] = $line;
  }
  $flushAll();
  return implode("\n", $out);
}
function inline($s) {
  global $CFG;
  $keep = []; $i = 0;
  $put = function ($html) use (&$keep, &$i) { $k = "\x02" . ($i++) . "\x02"; $keep[$k] = $html; return $k; };
  $s = preg_replace_callback('/`([^`\n]+)`/', fn($m) => $put('<code>' . h($m[1]) . '</code>'), $s);
  // картинки — только загруженные на форум
  $s = preg_replace_callback('~!\[([^\]\n]{0,200})\]\((' . preg_quote($CFG['base'], '~') . 'uploads/[0-9]{6}/[a-f0-9]{20}\.(?:jpg|png|webp|gif))\)~',
    fn($m) => $put('<a class="f-img" href="' . h($m[2]) . '" target="_blank"><img src="' . h($m[2]) . '" alt="' . h($m[1]) . '" loading="lazy"></a>'), $s);
  $s = preg_replace_callback('~\[([^\]\n]{1,200})\]\((https?://[^\s)]+)\)~u', fn($m) => $put('<a href="' . h($m[2]) . '" rel="nofollow ugc noopener" target="_blank">' . h($m[1]) . '</a>'), $s);
  $s = h($s);
  $s = preg_replace('~(https?://[^\s<>&"]+(?:&amp;[^\s<>&"]+)*)~u', '<a href="$1" rel="nofollow ugc noopener" target="_blank">$1</a>', $s);
  $s = preg_replace('/\*\*(.+?)\*\*/u', '<b>$1</b>', $s);
  $s = preg_replace('/~~(.+?)~~/u', '<s>$1</s>', $s);
  $s = preg_replace('/(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])/u', '<i>$1</i>', $s);
  return strtr($s, $keep);
}

// ---------- почта ----------
function send_mail($to, $subject, $body) {
  global $CFG;
  $smtp = is_file(dirname(__DIR__) . '/lead-config.php') ? (include dirname(__DIR__) . '/lead-config.php') : [];
  $encSubj = '=?UTF-8?B?' . base64_encode($subject) . '?=';
  $from = $CFG['mail_from']; $err = '';
  if (!empty($smtp['smtp_pass'])) $ok = forum_smtp($smtp, $from, $to, $encSubj, $body, $err);
  else {
    $hd = ['From: DrillHarmony <' . $from . '>', 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: 8bit'];
    $ok = @mail($to, $encSubj, $body, implode("\r\n", $hd), '-f' . $from);
    if (!$ok) $err = 'mail() вернула false';
  }
  @file_put_contents(__DIR__ . '/_data/mail.log', date('Y-m-d H:i:s') . " $to " . ($ok ? 'OK' : 'ОШИБКА ' . $err) . "\n", FILE_APPEND);
  return $ok;
}
function forum_smtp($c, $from, $to, $subj, $body, &$err) {
  $host = $c['smtp_host'] ?? 'mail.hosting.reg.ru'; $port = (int)($c['smtp_port'] ?? 465);
  $user = $c['smtp_user'] ?? $from; $pass = $c['smtp_pass']; $sec = $c['smtp_secure'] ?? ($port == 465 ? 'ssl' : 'tls');
  $ctx = stream_context_create(['ssl' => ['verify_peer' => true, 'verify_peer_name' => true]]);
  $s = @stream_socket_client(($sec === 'ssl' ? 'ssl://' : 'tcp://') . "$host:$port", $no, $str, 15, STREAM_CLIENT_CONNECT, $ctx);
  if (!$s) { $err = "нет соединения ($str)"; return false; }
  stream_set_timeout($s, 15);
  $rd = function () use ($s) { $r = ''; while (($l = fgets($s, 1024)) !== false) { $r .= $l; if (strlen($l) < 4 || $l[3] === ' ') break; } return $r; };
  $cmd = function ($c, $want) use ($s, $rd, &$err) { if ($c !== null) fwrite($s, $c . "\r\n"); $r = $rd(); if ((int)substr($r, 0, 3) !== $want) { $err = trim($r) ?: 'нет ответа'; return false; } return true; };
  $me = $_SERVER['SERVER_NAME'] ?? 'localhost';
  $ok = $cmd(null, 220) && $cmd("EHLO $me", 250);
  if ($ok && $sec === 'tls') $ok = $cmd('STARTTLS', 220) && stream_socket_enable_crypto($s, true, STREAM_CRYPTO_METHOD_TLS_CLIENT) && $cmd("EHLO $me", 250);
  $ok = $ok && $cmd('AUTH LOGIN', 334) && $cmd(base64_encode($user), 334) && $cmd(base64_encode($pass), 235)
      && $cmd("MAIL FROM:<$from>", 250) && $cmd("RCPT TO:<$to>", 250) && $cmd('DATA', 354);
  if ($ok) {
    $h = ['Date: ' . date('r'), "From: DrillHarmony <$from>", "To: <$to>", "Subject: $subj", 'Message-ID: <' . bin2hex(random_bytes(8)) . '@drillharmony.com>',
          'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64'];
    $ok = $cmd(implode("\r\n", $h) . "\r\n\r\n" . chunk_split(base64_encode($body)) . "\r\n.", 250);
  }
  @fwrite($s, "QUIT\r\n"); fclose($s);
  return $ok;
}
function abs_url($r, $qs = []) { global $CFG; return rtrim($CFG['site'], '/') . url($r, $qs); }
