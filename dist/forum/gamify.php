<?php
// Форум DrillHarmony: репутация, уровни, бейджи, уведомления, теги, полнотекстовый поиск, оформление профиля.
if (!defined('FORUM')) { http_response_code(403); exit; }

// ---------- миграция базы до версии 5 ----------
function g_cols($pdo, $t) { return array_column($pdo->query("PRAGMA table_info($t)")->fetchAll(), 'name'); }
function g_migrate($pdo) {
  $add = ['users' => ['avatar TEXT', 'cover TEXT', 'accent TEXT', 'fields TEXT', 'rep INTEGER NOT NULL DEFAULT 0'],
          'topics' => ['solved_post INTEGER', 'solved_at INTEGER'], 'likes' => ['created INTEGER NOT NULL DEFAULT 0']];
  foreach ($add as $t => $cols) { $have = g_cols($pdo, $t); foreach ($cols as $c) if (!in_array(strtok($c, ' '), $have, true)) $pdo->exec("ALTER TABLE $t ADD COLUMN $c"); }
  $pdo->exec(<<<SQL
CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, n INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS topic_tags (topic_id INTEGER NOT NULL, tag_id INTEGER NOT NULL, PRIMARY KEY (topic_id, tag_id));
CREATE INDEX IF NOT EXISTS tt_tag ON topic_tags(tag_id, topic_id);
CREATE TABLE IF NOT EXISTS user_badges (user_id INTEGER NOT NULL, code TEXT NOT NULL, created INTEGER NOT NULL, PRIMARY KEY (user_id, code));
CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, kind TEXT NOT NULL, actor_id INTEGER, topic_id INTEGER, post_id INTEGER,
  extra TEXT, n INTEGER NOT NULL DEFAULT 1, created INTEGER NOT NULL, seen INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS notes_u ON notes(user_id, seen, created);
CREATE INDEX IF NOT EXISTS likes_post ON likes(post_id);
CREATE INDEX IF NOT EXISTS posts_user ON posts(user_id, deleted);
SQL);
  try { $pdo->exec("CREATE VIRTUAL TABLE IF NOT EXISTS post_fts USING fts5(title, body, tokenize='unicode61 remove_diacritics 2')"); } catch (Throwable $e) {}
  if (fts_ok($pdo)) {
    $pdo->exec('DELETE FROM post_fts');
    $pdo->exec('INSERT INTO post_fts (rowid, title, body) SELECT p.id, CASE WHEN p.id=(SELECT MIN(id) FROM posts WHERE topic_id=p.topic_id) THEN t.title ELSE \'\' END, p.body
                FROM posts p JOIN topics t ON t.id=p.topic_id WHERE p.deleted=0 AND t.deleted=0');
  }
  // теги для уже созданных тем: по словарю терминов
  foreach ($pdo->query('SELECT t.id, t.title, (SELECT body FROM posts WHERE topic_id=t.id ORDER BY id LIMIT 1) body FROM topics t WHERE t.deleted=0 AND NOT EXISTS (SELECT 1 FROM topic_tags WHERE topic_id=t.id)')->fetchAll() as $t)
    if ($tg = tags_suggest($t['title'] . "\n" . $t['body'], 4)) tags_set((int)$t['id'], $tg, $pdo);
  foreach ($pdo->query("SELECT id FROM users WHERE role<>'bot'")->fetchAll(PDO::FETCH_COLUMN) as $uid) rep_calc((int)$uid, false);
}

// ---------- полнотекстовый поиск ----------
function fts_ok($pdo = null) {
  static $ok = null; if ($ok !== null) return $ok;
  $pdo = $pdo ?: db();
  return $ok = (bool)$pdo->query("SELECT 1 FROM sqlite_master WHERE name='post_fts'")->fetchColumn();
}
function fts_put($pid) {
  if (!fts_ok()) return;
  $p = one('SELECT p.id, p.body, p.deleted, t.title, t.deleted tdel, (SELECT MIN(id) FROM posts WHERE topic_id=p.topic_id) first FROM posts p JOIN topics t ON t.id=p.topic_id WHERE p.id=?', [$pid]);
  q('DELETE FROM post_fts WHERE rowid=?', [$pid]);
  if ($p && !$p['deleted'] && !$p['tdel']) q('INSERT INTO post_fts (rowid, title, body) VALUES (?,?,?)', [$pid, $p['id'] == $p['first'] ? $p['title'] : '', $p['body']]);
}
function fts_topic($tid) { foreach (q('SELECT id FROM posts WHERE topic_id=?', [$tid])->fetchAll(PDO::FETCH_COLUMN) as $pid) fts_put((int)$pid); }
// грубая основа слова: отрезаем частые окончания, чтобы «замеров» находило «замер», «замеры»
function g_stem($w) {
  if (mb_strlen($w) <= 4 || !preg_match('/\p{Cyrillic}/u', $w)) return $w;
  $s = preg_replace('/(иями|ями|ами|ого|его|ому|ему|ыми|ими|ией|ения|ений|ение|ость|ости|ий|ый|ой|ая|яя|ое|ее|ые|ие|ов|ев|ах|ях|ам|ям|ом|ем|ую|юю|ать|ять|ить|еть|ся|сь|а|я|о|е|ы|и|у|ю|ь)$/u', '', $w);
  return mb_strlen($s) >= 3 ? $s : $w;
}
function g_terms($q) {
  preg_match_all('/[\p{L}\p{N}]{2,}/u', mb_strtolower($q), $m);
  return array_slice(array_values(array_unique($m[0])), 0, 8);
}
function fts_query($q) { return implode(' ', array_map(fn($w) => '"' . str_replace('"', '', g_stem($w)) . '"*', g_terms($q))); }

// ---------- теги ----------
function tag_norm($s) {
  $s = mb_strtolower(trim(preg_replace('/\s+/u', ' ', (string)$s)));
  $s = preg_replace('/[^\p{L}\p{N} +\-.#]/u', '', $s);
  return (mb_strlen($s) >= 2 && mb_strlen($s) <= 30) ? $s : '';
}
function tags_parse($str, $max = 5) {
  $out = [];
  foreach (preg_split('/[,;]+/u', (string)$str) as $t) if (($t = tag_norm($t)) !== '' && !in_array($t, $out, true)) $out[] = $t;
  return array_slice($out, 0, $max);
}
function tags_set($tid, $names, $pdo = null) {
  $pdo = $pdo ?: db();
  $old = $pdo->prepare('SELECT tag_id FROM topic_tags WHERE topic_id=?'); $old->execute([$tid]); $affected = $old->fetchAll(PDO::FETCH_COLUMN);
  $pdo->prepare('DELETE FROM topic_tags WHERE topic_id=?')->execute([$tid]);
  $ins = $pdo->prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)'); $get = $pdo->prepare('SELECT id FROM tags WHERE name=?');
  $link = $pdo->prepare('INSERT OR IGNORE INTO topic_tags (topic_id, tag_id) VALUES (?,?)');
  foreach ($names as $n) { $ins->execute([$n]); $get->execute([$n]); $id = $get->fetchColumn(); $link->execute([$tid, $id]); $affected[] = $id; }
  $cnt = $pdo->prepare('UPDATE tags SET n=(SELECT COUNT(*) FROM topic_tags tt JOIN topics t ON t.id=tt.topic_id WHERE tt.tag_id=tags.id AND t.deleted=0) WHERE id=?');
  foreach (array_unique($affected) as $id) $cnt->execute([$id]);
}
function tags_recount() { db()->exec('UPDATE tags SET n=(SELECT COUNT(*) FROM topic_tags tt JOIN topics t ON t.id=tt.topic_id WHERE tt.tag_id=tags.id AND t.deleted=0)'); }
function tags_of($tids) {
  $tids = array_values(array_filter(array_map('intval', $tids))); if (!$tids) return [];
  $r = [];
  foreach (q('SELECT tt.topic_id, g.name FROM topic_tags tt JOIN tags g ON g.id=tt.tag_id WHERE tt.topic_id IN (' . implode(',', $tids) . ') ORDER BY g.n DESC, g.name')->fetchAll() as $x) $r[$x['topic_id']][] = $x['name'];
  return $r;
}
function tag_url($name) { return url('tag/' . rawurlencode($name)); }
function tag_chips($names, $cls = '') {
  if (!$names) return '';
  return '<span class="f-tags ' . $cls . '">' . implode('', array_map(fn($n) => '<a class="f-tag" href="' . h(tag_url($n)) . '">' . h($n) . '</a>', $names)) . '</span>';
}
// словарь терминов для подсказки тегов: тег => шаблон по тексту
function tag_rules() {
  return [
    'toolface' => 'тулфейс|toolface|отклонител', 'реактивный момент' => 'реактивн', 'интенсивность' => 'интенсивност|\bdls\b|dogleg|пространственн\w* искривл',
    'минимальная кривизна' => 'минимальн\w* кривизн', 'инклинометрия' => 'инклинометр|замер\w* (зенит|азимут)|качеств\w* замер', 'склонение' => 'склонени',
    'магнитная интерференция' => 'интерференц|нубт|немагнит', 'гироскоп' => 'гироскоп|гироинкл', 'антиколлизия' => 'антиколлиз|сближени\w* ствол|separation',
    'допуски' => 'допуск', 'телесистема' => 'телесистем|\bmwd\b', 'гидроканал' => 'гидроканал|пульсатор|импульс\w* давлен', 'гк' => '\bгк\b|гамма',
    'геонавигация' => 'геонавигац|пласт\w* (вышли|выход)|кровл|подошв', 'угол падения' => 'угол\w* падени|падени\w* пласт', 'взд' => '\bвзд\b|винтов\w* двигател',
    'рус' => '\bрус\b|роторн\w* управляем', 'кнбк' => 'кнбк|компоновк', 'слайд' => 'слайд|скольжени', 'вибрации' => 'вибрац|прихват\w*-проскальз|stick.?slip',
    'mse' => '\bmse\b|механическ\w* удельн', 'механическая скорость' => 'механическ\w* скорост|\brop\b', 'эцп' => '\bэцп\b|эквивалентн\w* циркуляц',
    'очистка ствола' => 'вынос\w* шлам|очистк\w* ствол|шламов\w* подушк', 'раствор' => 'раствор', 'обсадная колонна' => 'обсадн', 'гидравлика долота' => 'гидравлик\w* долот|насадк',
    'witsml' => 'witsml', 'wits' => '\bwits\b|wits ?0', 'las' => '\blas\b', 'excel' => 'excel|эксел', 'датчик веса' => 'датчик\w* веса|вес\w* на крюке',
    'калибровка' => 'калибров', 'газопоказания' => 'газопоказан|газ\w* наращиван|суммарн\w* газ', 'хроматограф' => 'хроматограф', 'время отставания' => 'отставани|lag time',
    'шлам' => 'шлам', 'd-экспонента' => 'd-экспонент|dc ', 'баланс ёмкостей' => 'ёмкост|емкост', 'приток' => 'приток|перелив', 'поглощение' => 'поглощени',
    'сводка' => 'сводк', 'нпв' => '\bнпв\b|непроизводительн', 'собеседование' => 'собеседован', 'вахта' => 'вахт', 'начинающим' => 'начинающ|студент|первый год',
    'slidex' => 'slidex', 'tempo' => '\btempo\b', 'etude' => '\betude\b', 'формулы' => 'формул',
  ];
}
function tags_suggest($text, $max = 5) {
  $t = mb_strtolower($text); $out = [];
  foreach (tag_rules() as $tag => $re) if (preg_match('/' . $re . '/u', $t)) $out[] = $tag;
  // плюс уже существующие теги, которые встречаются в тексте как есть
  foreach (q('SELECT name FROM tags WHERE n>0 ORDER BY n DESC LIMIT 200')->fetchAll(PDO::FETCH_COLUMN) as $n)
    if (!in_array($n, $out, true) && mb_strlen($n) >= 3 && preg_match('/(?<![\p{L}\p{N}])' . preg_quote($n, '/') . '/u', $t)) $out[] = $n;
  return array_slice($out, 0, $max);
}

// ---------- репутация и уровни ----------
const REP_LIKE = 2, REP_SOLVED = 15;
function levels() { return [[0, 'Новичок'], [10, 'Участник'], [50, 'Знающий'], [150, 'Опытный'], [400, 'Эксперт'], [1000, 'Наставник']]; }
function level($rep) {
  $L = levels(); $i = 0;
  foreach ($L as $k => $l) if ($rep >= $l[0]) $i = $k;
  $next = $L[$i + 1][0] ?? null;
  return ['i' => $i, 'name' => $L[$i][1], 'next' => $next, 'from' => $L[$i][0], 'pct' => $next ? (int)round(($rep - $L[$i][0]) * 100 / ($next - $L[$i][0])) : 100];
}
function level_chip($u) {
  if (($u['role'] ?? '') === 'bot') return '';
  $l = level((int)($u['rep'] ?? 0));
  return '<i class="f-lvl l' . $l['i'] . '" title="Репутация ' . (int)($u['rep'] ?? 0) . '">' . h($l['name']) . '</i>';
}
function rep_stats($uid) {
  return one('SELECT
      (SELECT COUNT(*) FROM likes l JOIN posts p ON p.id=l.post_id JOIN topics t ON t.id=p.topic_id WHERE p.user_id=:u AND p.deleted=0 AND t.deleted=0) likes,
      (SELECT COUNT(*) FROM topics t JOIN posts p ON p.id=t.solved_post WHERE p.user_id=:u AND t.user_id<>:u AND t.deleted=0 AND p.deleted=0) solved', [':u' => $uid]);
}
function rep_calc($uid, $notify = true) {
  if (!$uid) return;
  $s = rep_stats($uid);
  $rep = (int)$s['likes'] * REP_LIKE + (int)$s['solved'] * REP_SOLVED;
  $old = (int)val('SELECT rep FROM users WHERE id=?', [$uid]);
  q('UPDATE users SET rep=? WHERE id=?', [$rep, $uid]);
  if ($notify && level($rep)['i'] > level($old)['i']) note($uid, 'level', null, null, null, level($rep)['name']);
  badges_check($uid, $notify);
}
function leaders($since = 0, $limit = 10, $cat = 0) {
  $catj = $cat ? ' AND t.cat_id=' . (int)$cat : '';
  if (!$since && !$cat) return q("SELECT id, name, avatar, rep, role, title, (SELECT COUNT(*) FROM topics t JOIN posts p ON p.id=t.solved_post WHERE p.user_id=users.id AND t.user_id<>users.id AND t.deleted=0) solved
                         FROM users WHERE role<>'bot' AND banned=0 AND rep>0 ORDER BY rep DESC, id LIMIT ?", [$limit])->fetchAll();
  return q("SELECT u.id, u.name, u.avatar, u.role, u.title, u.rep total,
      COALESCE((SELECT COUNT(*) FROM likes l JOIN posts p ON p.id=l.post_id JOIN topics t ON t.id=p.topic_id WHERE p.user_id=u.id AND p.deleted=0 AND t.deleted=0 AND l.created>=:s$catj),0) * " . REP_LIKE . "
    + COALESCE((SELECT COUNT(*) FROM topics t JOIN posts p ON p.id=t.solved_post WHERE p.user_id=u.id AND t.user_id<>u.id AND t.deleted=0 AND t.solved_at>=:s$catj),0) * " . REP_SOLVED . " rep,
      (SELECT COUNT(*) FROM topics t JOIN posts p ON p.id=t.solved_post WHERE p.user_id=u.id AND t.user_id<>u.id AND t.deleted=0 AND t.solved_at>=:s$catj) solved
    FROM users u WHERE u.role<>'bot' AND u.banned=0 ORDER BY rep DESC, u.id LIMIT :l", [':s' => $since, ':l' => $limit])->fetchAll();
}

// ---------- бейджи ----------
// код => [название, условие, ступень 1–3, значок]
function badge_defs() {
  return [
    'first_post' => ['Первое сообщение', 'Написать первое сообщение на форуме', 1, 'msg'],
    'asker' => ['Автор вопроса', 'Создать первую тему', 1, 'q'],
    'helper' => ['Первый ответ', 'Ответить в чужой теме', 1, 'reply'],
    'solver' => ['Решение', 'Ваш ответ отмечен как решение', 1, 'check'],
    'thankful' => ['Благодарный', 'Сказать «Спасибо» 10 раз', 1, 'heart'],
    'illustrator' => ['Иллюстратор', '5 сообщений с картинками или схемами', 1, 'img'],
    'profile' => ['Анкета заполнена', 'Аватар, должность и ещё три поля анкеты', 1, 'user'],
    'useful' => ['Полезный ответ', 'Сообщение с 5 «Спасибо»', 2, 'star'],
    'solver10' => ['Мастер решений', '10 ответов отмечены как решение', 2, 'check2'],
    'active' => ['Активный участник', '50 сообщений', 2, 'msg2'],
    'first100' => ['Из первой сотни', 'Один из первых 100 зарегистрированных участников', 2, 'flag'],
    'year' => ['Старожил', 'Год на форуме', 2, 'clock'],
    'great' => ['Отличный ответ', 'Сообщение с 15 «Спасибо»', 3, 'star3'],
    'solver50' => ['Опора форума', '50 ответов отмечены как решение', 3, 'crown'],
    'writer' => ['Летописец', '250 сообщений', 3, 'book'],
    'expert' => ['Знаток раздела', '5 решений или 30 «Спасибо» в одном разделе', 3, 'medal'],
  ];
}
function badge_info($code) {
  $d = badge_defs();
  if (isset($d[$code])) return $d[$code] + [4 => $code];
  if (strpos($code, 'expert:') === 0) {
    $c = one('SELECT name FROM cats WHERE slug=?', [substr($code, 7)]);
    return ['Знаток: ' . ($c['name'] ?? substr($code, 7)), '5 решений или 30 «Спасибо» в разделе «' . ($c['name'] ?? '') . '»', 3, 'medal', $code];
  }
  return null;
}
function badges_check($uid, $notify = true) {
  $u = one('SELECT * FROM users WHERE id=?', [$uid]); if (!$u || $u['role'] === 'bot') return;
  $s = one('SELECT
      (SELECT COUNT(*) FROM posts WHERE user_id=:u AND deleted=0) posts,
      (SELECT COUNT(*) FROM topics WHERE user_id=:u AND deleted=0) topics,
      (SELECT COUNT(*) FROM posts p JOIN topics t ON t.id=p.topic_id WHERE p.user_id=:u AND t.user_id<>:u AND p.deleted=0) helped,
      (SELECT COALESCE(MAX(likes),0) FROM posts WHERE user_id=:u AND deleted=0) maxlikes,
      (SELECT COUNT(*) FROM likes WHERE user_id=:u) gave,
      (SELECT COUNT(*) FROM posts WHERE user_id=:u AND deleted=0 AND body LIKE \'%](/forum/uploads/%\') imgs,
      (SELECT COUNT(*) FROM users WHERE id<=:u AND role<>\'bot\' AND pass<>\'!\') rank', [':u' => $uid]);
  $r = rep_stats($uid);
  $f = json_decode($u['fields'] ?? '', true) ?: [];
  unset($f['vis'], $f['cover']);
  $filled = count(array_filter($f, fn($v) => is_array($v) ? (bool)$v : trim((string)$v) !== ''));
  $got = [
    'first_post' => $s['posts'] >= 1, 'asker' => $s['topics'] >= 1, 'helper' => $s['helped'] >= 1, 'solver' => $r['solved'] >= 1,
    'thankful' => $s['gave'] >= 10, 'illustrator' => $s['imgs'] >= 5, 'profile' => $u['avatar'] && trim((string)$u['title']) !== '' && $filled >= 3,
    'useful' => $s['maxlikes'] >= 5, 'solver10' => $r['solved'] >= 10, 'active' => $s['posts'] >= 50, 'first100' => $u['pass'] !== '!' && $s['rank'] <= 100 && $u['role'] !== 'admin',
    'year' => time() - $u['created'] >= 365 * 86400, 'great' => $s['maxlikes'] >= 15, 'solver50' => $r['solved'] >= 50, 'writer' => $s['posts'] >= 250,
  ];
  foreach (q("SELECT c.slug,
      (SELECT COUNT(*) FROM topics t JOIN posts p ON p.id=t.solved_post WHERE t.cat_id=c.id AND p.user_id=:u AND t.user_id<>:u AND t.deleted=0) sol,
      (SELECT COUNT(*) FROM likes l JOIN posts p ON p.id=l.post_id JOIN topics t ON t.id=p.topic_id WHERE t.cat_id=c.id AND p.user_id=:u AND p.deleted=0) lk
      FROM cats c WHERE c.slug NOT IN ('kb','about','offtop')", [':u' => $uid])->fetchAll() as $c)
    if ($c['sol'] >= 5 || $c['lk'] >= 30) $got['expert:' . $c['slug']] = true;
  $have = q('SELECT code FROM user_badges WHERE user_id=?', [$uid])->fetchAll(PDO::FETCH_COLUMN);
  foreach ($got as $code => $ok) if ($ok && !in_array($code, $have, true)) {
    q('INSERT OR IGNORE INTO user_badges (user_id, code, created) VALUES (?,?,?)', [$uid, $code, time()]);
    if ($notify) note($uid, 'badge', null, null, null, $code);
  }
}
function badge_icon($key) {
  $p = [
    'msg' => '<path d="M5 6h14v9H10l-4 3v-3H5z"/>', 'msg2' => '<path d="M4 5h12v8H9l-3 3v-3H4z"/><path d="M18 9h2v8h-1v2.5L16 17h-5"/>',
    'q' => '<path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14"/><path d="M12 17.5v.01"/>', 'reply' => '<path d="M10 8 5 12l5 4"/><path d="M5 12h9a5 5 0 0 1 5 5"/>',
    'check' => '<path d="m7 12.5 3.2 3L17 9"/>', 'check2' => '<path d="m4 12.5 3 3 6-6.5M11 15l1 1 7-7.5"/>', 'heart' => '<path d="M12 18s-6-3.6-6-8a3.2 3.2 0 0 1 6-1.6A3.2 3.2 0 0 1 18 10c0 4.4-6 8-6 8z"/>',
    'img' => '<rect x="5" y="6" width="14" height="12" rx="1.5"/><path d="m5 15 4-4 4 4 2-2 4 4"/>', 'user' => '<circle cx="12" cy="9" r="3"/><path d="M6.5 18a5.5 5.5 0 0 1 11 0"/>',
    'star' => '<path d="m12 5 2.1 4.3 4.7.7-3.4 3.3.8 4.7-4.2-2.2L7.8 18l.8-4.7L5.2 10l4.7-.7z"/>', 'star3' => '<path d="m12 4 2.3 4.7 5.2.8-3.8 3.6.9 5.2L12 15.9l-4.6 2.4.9-5.2-3.8-3.6 5.2-.8z"/><path d="M12 9.5v3"/>',
    'flag' => '<path d="M7 19V5M7 5h9l-2 3.5L16 12H7"/>', 'clock' => '<circle cx="12" cy="12" r="6.5"/><path d="M12 8.5V12l2.5 1.5"/>',
    'crown' => '<path d="M5 16h14l1-8-4.5 3L12 6l-3.5 5L4 8z"/><path d="M6 19h12"/>', 'book' => '<path d="M6 5h9a3 3 0 0 1 3 3v11H9a3 3 0 0 1-3-3z"/><path d="M6 16a3 3 0 0 1 3-3h9"/>',
    'medal' => '<circle cx="12" cy="14" r="4.5"/><path d="M9 4l3 5.5L15 4M12 12v4"/>',
  ][$key] ?? '<circle cx="12" cy="12" r="5"/>';
  return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' . $p . '</svg>';
}
function badge_html($code, $date = 0, $big = false) {
  $b = badge_info($code); if (!$b) return '';
  return '<span class="f-badge t' . $b[2] . ($big ? ' big' : '') . '" title="' . h($b[1]) . ($date ? ' · получен ' . date('d.m.Y', $date) : '') . '"><span class="f-badge-i">' . badge_icon($b[3]) . '</span><span class="f-badge-t">' . h($b[0]) . ($big ? '<small>' . h($b[1]) . '</small>' : '') . '</span></span>';
}
function user_badges($uid) { return q('SELECT code, created FROM user_badges WHERE user_id=? ORDER BY created DESC', [$uid])->fetchAll(); }

// ---------- уведомления ----------
function note($uid, $kind, $actor = null, $tid = null, $pid = null, $extra = null) {
  if (!$uid || ($actor && $actor == $uid)) return;
  if (val('SELECT role FROM users WHERE id=?', [$uid]) === 'bot') return;
  if ($kind === 'like' && $pid && ($n = one('SELECT id FROM notes WHERE user_id=? AND kind=? AND post_id=? AND seen=0', [$uid, 'like', $pid]))) {
    q('UPDATE notes SET n=n+1, actor_id=?, created=? WHERE id=?', [$actor, time(), $n['id']]); return;
  }
  q('INSERT INTO notes (user_id, kind, actor_id, topic_id, post_id, extra, created) VALUES (?,?,?,?,?,?,?)', [$uid, $kind, $actor, $tid, $pid, $extra, time()]);
  q('DELETE FROM notes WHERE user_id=? AND id NOT IN (SELECT id FROM notes WHERE user_id=? ORDER BY id DESC LIMIT 200)', [$uid, $uid]);
}
function notes_unseen($uid) { return (int)val('SELECT COUNT(*) FROM notes WHERE user_id=? AND seen=0', [$uid]); }

// ---------- анкета и оформление профиля ----------
function profile_specs() { return ['ННБ', 'Телеметрия', 'Геонавигация', 'ГТИ', 'Бурение', 'Растворы', 'Каротаж', 'Супервайзинг', 'Данные и ПО', 'Обучение', 'Студент']; }
function profile_accents() { return ['amber' => ['Янтарный', '#f5a524'], 'teal' => ['Бирюзовый', '#2bb3a3'], 'blue' => ['Синий', '#4c8dff'], 'violet' => ['Фиолетовый', '#9b7bff'], 'red' => ['Красный', '#ef5b5b'], 'green' => ['Зелёный', '#4cbf6a']]; }
function profile_covers() { return ['strata' => 'Пласты', 'trajectory' => 'Траектория', 'log' => 'Каротаж', 'grid' => 'Сетка', 'plain' => 'Без рисунка']; }
function user_fields($u) {
  $f = json_decode($u['fields'] ?? '', true) ?: [];
  return $f + ['fio' => '', 'company' => '', 'city' => '', 'exp' => '', 'spec' => [], 'skills' => '', 'edu' => '', 'status' => '', 'tg' => '', 'site' => '', 'vis' => 'users', 'cover' => 'strata'];
}
// аватар: картинка, если загружена, иначе буква на цветном круге
function avatar_html($u, $size = 40) {
  if (!empty($u['avatar']) && preg_match('~^/forum/uploads/avatars/[0-9a-f-]+\.(jpg|png)$~', $u['avatar']))
    return '<img class="f-ava img" src="' . h($u['avatar']) . '" alt="" width="' . (int)$size . '" height="' . (int)$size . '" style="--s:' . (int)$size . 'px" loading="lazy">';
  return null;
}
// сохранить картинку профиля: квадрат для аватара или полоса 4:1 для обложки
function save_profile_image($file, $kind, $uid) {
  if (!$file || ($file['error'] ?? 4) === UPLOAD_ERR_NO_FILE) return [null, ''];
  if ($file['error'] !== UPLOAD_ERR_OK || $file['size'] > 8 * 1024 * 1024) return [null, 'Картинка не загрузилась: файл должен быть не больше 8 МБ.'];
  $info = @getimagesize($file['tmp_name']);
  if (!$info || !in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP, IMAGETYPE_GIF], true) || $info[0] * $info[1] > 40e6) return [null, 'Подходят JPG, PNG, WebP и GIF.'];
  if (!function_exists('imagecreatefromstring')) return [null, 'На сервере нет модуля GD для обработки картинок.'];
  $im = @imagecreatefromstring(file_get_contents($file['tmp_name'])); if (!$im) return [null, 'Не удалось прочитать картинку.'];
  if ($info[2] === IMAGETYPE_JPEG && function_exists('exif_read_data')) {
    $o = (int)(@exif_read_data($file['tmp_name'])['Orientation'] ?? 1);
    if ($o === 3) $im = imagerotate($im, 180, 0); elseif ($o === 6) $im = imagerotate($im, -90, 0); elseif ($o === 8) $im = imagerotate($im, 90, 0);
  }
  [$W, $H] = $kind === 'avatar' ? [256, 256] : [1600, 400];
  $w = imagesx($im); $h = imagesy($im); $k = max($W / $w, $H / $h);
  $cw = (int)round($W / $k); $ch = (int)round($H / $k); $cx = (int)(($w - $cw) / 2); $cy = (int)(($h - $ch) / 2);
  $out = imagecreatetruecolor($W, $H); imagefill($out, 0, 0, imagecolorallocate($out, 20, 28, 33));
  imagecopyresampled($out, $im, 0, 0, $cx, $cy, $W, $H, $cw, $ch);
  $dir = __DIR__ . '/uploads/avatars'; if (!is_dir($dir)) @mkdir($dir, 0755, true);
  if (!is_file(__DIR__ . '/uploads/.htaccess')) upload_guard();
  $name = $uid . '-' . ($kind === 'avatar' ? 'a' : 'c') . bin2hex(random_bytes(5)) . '.jpg';
  $ok = imagejpeg($out, "$dir/$name", 86); imagedestroy($im); imagedestroy($out);
  return $ok ? ['/forum/uploads/avatars/' . $name, ''] : [null, 'Не удалось сохранить картинку.'];
}
function drop_profile_image($url) {
  if ($url && preg_match('~^/forum/uploads/avatars/([0-9a-f-]+\.jpg)$~', $url, $m)) @unlink(__DIR__ . '/uploads/avatars/' . $m[1]);
}
function upload_guard() {
  @mkdir(__DIR__ . '/uploads', 0755, true);
  @file_put_contents(__DIR__ . '/uploads/.htaccess', "Options -Indexes\n<FilesMatch \"\\.(php|phtml|phar|pl|py|cgi|sh|html?|svg)$\">\n  Require all denied\n</FilesMatch>\nRemoveHandler .php .phtml .phar\n<IfModule mod_php.c>\n  php_flag engine off\n</IfModule>\n<IfModule mod_headers.c>\n  Header set X-Content-Type-Options nosniff\n  Header set Content-Disposition inline\n</IfModule>\n");
}
