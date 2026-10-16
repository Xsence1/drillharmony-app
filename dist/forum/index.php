<?php
// Форум DrillHarmony: маршруты и страницы.
define('FORUM', 1);
require __DIR__ . '/lib.php';
require __DIR__ . '/bot.php';
require __DIR__ . '/pages.php';
try { db(); } catch (Throwable $e) { http_response_code(500); echo 'Форум временно недоступен: не удалось открыть базу (нужен PHP с PDO SQLite и право записи в папку forum/_data).'; exit; }
start_session();
sync_marker();
try { bot_kick(); } catch (Throwable $e) {}

$r = trim((string)($_GET['r'] ?? ''), '/');
$parts = $r === '' ? [] : explode('/', $r);
$route = $parts[0] ?? '';
$arg = isset($parts[1]) ? rawurldecode($parts[1]) : '';
$post = $_SERVER['REQUEST_METHOD'] === 'POST';
if ($post) check_csrf();

switch ($route) {
  case '': home(); break;
  case 'c': category($arg); break;
  case 't': topic((int)$arg); break;
  case 'post': goto_post((int)$arg); break;
  case 'new': $post ? create_topic() : new_topic_form($_GET['c'] ?? ''); break;
  case 'reply': if ($post) reply(); break;
  case 'edit': edit_post((int)$arg, $post); break;
  case 'like': if ($post) like(); break;
  case 'solve': if ($post) solve(); break;
  case 'latest': latest(); break;
  case 'tags': tags_page(); break;
  case 'tag': tag_page($arg); break;
  case 'top': top_page(); break;
  case 'badges': badges_page(); break;
  case 'notes': notes_page(); break;
  case 'suggest': suggest_json(); break;
  case 'tagsuggest': if ($post) tag_suggest_json(); break;
  case 'upload': if ($post) upload(); break;
  case 'preview': if ($post) { header('Content-Type: text/html; charset=utf-8'); echo render(txt('body', 20000)); exit; } break;
  case 'report': if ($post) report(); break;
  case 'api': api_route($arg); break;
  case 'sso': sso_route($arg); break;
  case 'mod': mod_page(); break;
  case 'bot': bot_page($post); break;
  case 'modact': if ($post) mod_action(); break;
  case 'login': $post ? do_login() : login_form(); break;
  case 'register': $post ? do_register() : register_form(); break;
  case 'logout': if ($post) { session_regenerate_id(true); $_SESSION = []; redirect(url('')); } break;
  case 'confirm': confirm(); break;
  case 'reset': $post ? do_reset() : reset_form(); break;
  case 'setup': setup($post); break;
  case 'u': profile($arg); break;
  case 'me': $post ? save_me() : me_form(); break;
  case 'search': search(); break;
  case 'rules': $t = val("SELECT t.id FROM topics t JOIN cats c ON c.id=t.cat_id WHERE c.slug='about' AND t.title='Правила форума'"); redirect(url('t/' . (int)$t)); break;
}
http_response_code(404);
page('Страница не найдена', '<div class="f-box"><h1>Страница не найдена</h1><p>Возможно, тема удалена или адрес набран с ошибкой. <a href="' . h(url('')) . '">На главную форума</a></p></div>', '', '', true);

// ===================== страницы =====================
function crumbs(...$items) {
  $s = '<a href="/">DrillHarmony</a> / <a href="' . h(url('')) . '">Форум</a>';
  foreach ($items as $it) $s .= ' / ' . (is_array($it) ? '<a href="' . h($it[1]) . '">' . h($it[0]) . '</a>' : h($it));
  return $s;
}



function cat_icon($slug) {
  $p = [
    'kb' => '<path d="M4 4.5h7a3 3 0 0 1 3 3V20a2.5 2.5 0 0 0-2.5-2.5H4zM20 4.5h-3"/><path d="M4 17.5V4.5"/>',
    'trajectory' => '<path d="M5 3v6c0 6 6 10 14 12"/><circle cx="19" cy="21" r="1.5"/>',
    'orientation' => '<circle cx="12" cy="12" r="8"/><path d="M12 12l4-5"/><path d="M12 4v2M20 12h-2M12 20v-2M4 12h2"/>',
    'mwd' => '<path d="M3 12h3l2-5 3 10 3-8 2 3h5"/>',
    'geosteering' => '<path d="M2 9c5-2 15-2 20 0M2 15c5 2 15 2 20 0"/><path d="M4 12h16" stroke-dasharray="2 2.5"/>',
    'drilling' => '<path d="M12 3v11M8 14h8l-4 7z"/>',
    'hydraulics' => '<path d="M12 3c3 4.5 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-6.5 6-11z"/>',
    'software' => '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M9 9l-2 2 2 2M15 9l2 2-2 2"/>',
    'career' => '<path d="M4 9l8-4 8 4-8 4z"/><path d="M8 11v4c2.5 2 5.5 2 8 0v-4"/>',
    'offtop' => '<path d="M4 5h16v10H9l-5 4z"/>',
    'drillharmony' => '<path d="M5 4c0 9 4 13 14 16"/><path d="M9 8h8M11 12h6"/>',
    'gti-station' => '<rect x="4" y="4" width="16" height="12" rx="2"/><path d="M8 20h8M12 16v4M7 12l3-3 2 2 4-4"/>',
    'gti-gas' => '<path d="M8 20c-2.5-1.5-3-4-2-6.5 1-2.5 3.5-3.5 3.5-7 2.5 1.5 4 3.5 4 6 1-1 1.5-2 1.5-3.5 2 2 3 4.5 2.5 7-.5 2.5-2.5 3.5-4 4"/>',
    'gti-geo' => '<path d="M3 7h18M3 12h18M3 17h18"/><circle cx="8" cy="9.5" r=".6"/><circle cx="15" cy="14.5" r=".6"/>',
    'gti-control' => '<circle cx="12" cy="13" r="7"/><path d="M12 13l3-3M9 3h6"/>',
    'gti-reports' => '<path d="M6 3h9l3 3v15H6z"/><path d="M9 11h6M9 15h6M9 7h3"/>',
    'about' => '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  ][$slug] ?? '<circle cx="12" cy="12" r="8"/>';
  return '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' . $p . '</svg>';
}

function pager($total, $page, $base, $extra = []) {
  global $CFG; $pages = max(1, (int)ceil($total / $CFG['per_page']));
  if ($pages < 2) return '';
  $s = '<nav class="f-pager" aria-label="Страницы">';
  for ($i = 1; $i <= $pages; $i++) {
    if ($pages > 9 && $i > 2 && $i < $pages - 1 && abs($i - $page) > 2) { if (abs($i - $page) == 3) $s .= '<span>…</span>'; continue; }
    $s .= $i == $page ? '<b>' . $i . '</b>' : '<a href="' . h(url($base, array_merge($extra, $i > 1 ? ['p' => $i] : []))) . '">' . $i . '</a>';
  }
  return $s . '</nav>';
}


function role_badge($u) {
  if ($u['role'] === 'admin') return '<i class="f-role own">' . ($u['name'] === 'DrillHarmony' ? 'Владелец' : 'Администратор') . '</i>';
  if ($u['role'] === 'moderator') return '<i class="f-role">Модератор</i>';
  if ($u['role'] === 'bot') return '<i class="f-role bot">Бот</i>';
  return '';
}


function editor($name, $value, $rows = 8, $required = true) {
  $ic = fn($d) => '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' . $d . '</svg>';
  $btn = fn($act, $title, $icon) => '<button type="button" data-act="' . $act . '" title="' . h($title) . '" aria-label="' . h($title) . '">' . $icon . '</button>';
  $tools = $btn('h', 'Заголовок', $ic('<path d="M6 4v16M18 4v16M6 12h12"/>'))
    . $btn('b', 'Жирный (Ctrl+B)', $ic('<path d="M7 4h6a4 4 0 0 1 0 8H7zM7 12h7a4 4 0 0 1 0 8H7z"/>'))
    . $btn('i', 'Курсив (Ctrl+I)', $ic('<path d="M14 4h-4M14 20h-4M15 4 9 20"/>'))
    . $btn('s', 'Зачёркнутый', $ic('<path d="M5 12h14M16 6.5C15 5 13.6 4.5 12 4.5c-2.5 0-4 1.3-4 3.2M8 17.5c1 1.5 2.4 2 4 2 2.6 0 4-1.4 4-3.2"/>'))
    . '<span class="f-sep"></span>'
    . $btn('ul', 'Маркированный список', $ic('<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>'))
    . $btn('ol', 'Нумерованный список', $ic('<path d="M10 6h10M10 12h10M10 18h10M4 5l1.5-1v5M3.5 14h3l-3 4h3"/>'))
    . $btn('quote', 'Цитата', $ic('<path d="M7 7h4v4H8a1 1 0 0 0-1 1v5M15 7h4v4h-3a1 1 0 0 0-1 1v5"/>'))
    . '<span class="f-sep"></span>'
    . $btn('code', 'Код в строке', $ic('<path d="m8 8-4 4 4 4M16 8l4 4-4 4"/>'))
    . $btn('pre', 'Формула или блок кода', $ic('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m8 10 2 2-2 2M12 15h4"/>'))
    . $btn('table', 'Таблица', $ic('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M10 4v16"/>'))
    . $btn('hr', 'Разделитель', $ic('<path d="M4 12h16"/>'))
    . '<span class="f-sep"></span>'
    . $btn('link', 'Ссылка (Ctrl+K)', $ic('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'))
    . (me() && !can_post() ? $btn('img', 'Картинка: файл, вставка из буфера или перетаскивание', $ic('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>')) . '<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden class="f-file">' : '');
  return '<div class="f-ed" data-preview="' . h(url('preview')) . '" data-upload="' . h(url('upload')) . '">'
    . '<div class="f-ed-top"><div class="f-tabs" role="tablist"><button type="button" class="on" data-tab="write" role="tab">Текст</button><button type="button" data-tab="view" role="tab">Просмотр</button></div>'
    . '<div class="f-tools" role="toolbar" aria-label="Форматирование">' . $tools . '</div></div>'
    . '<div class="f-ed-area"><textarea name="' . h($name) . '" rows="' . (int)$rows . '"' . ($required ? ' required minlength="2"' : '') . ' maxlength="20000" placeholder="' . ($required ? 'Текст сообщения. Картинку можно вставить из буфера обмена или перетащить сюда.' : 'Расскажите о себе') . '">' . h($value) . '</textarea>'
    . '<div class="f-view f-body" hidden></div><div class="f-drop" hidden>Отпустите, чтобы загрузить картинку</div></div>'
    . '<div class="f-ed-foot"><small class="f-hint">**жирный** · *курсив* · `код` · ``` формула ``` · > цитата · ## заголовок</small><small class="f-count"></small></div></div>';
}

function goto_post($pid) {
  global $CFG;
  $p = one('SELECT topic_id FROM posts WHERE id=?', [$pid]); if (!$p) return;
  $n = (int)val('SELECT COUNT(*) FROM posts WHERE topic_id=? AND id<=? AND deleted=0', [$p['topic_id'], $pid]);
  $pg = max(1, (int)ceil($n / $CFG['per_page']));
  redirect(url('t/' . $p['topic_id'], $pg > 1 ? ['p' => $pg] : []) . '#p' . $pid);
}





function upload() {
  header('Content-Type: application/json; charset=utf-8');
  $fail = function ($m, $code = 400) { http_response_code($code); echo json_encode(['error' => $m], JSON_UNESCAPED_UNICODE); exit; };
  $me = me(); if (!$me) $fail('Войдите, чтобы загружать картинки.', 403);
  if (can_post()) $fail('Подтвердите e-mail, чтобы загружать картинки.', 403);
  if (!is_mod() && !rate('up:' . $me['id'], 30, 3600)) $fail('Не больше 30 картинок в час.', 429);
  $f = $_FILES['file'] ?? null;
  if (!$f || $f['error'] !== UPLOAD_ERR_OK) $fail('Файл не загрузился. Картинка не больше 8 МБ.');
  if ($f['size'] > 8 * 1024 * 1024) $fail('Картинка больше 8 МБ.');
  $info = @getimagesize($f['tmp_name']);
  $types = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_WEBP => 'webp', IMAGETYPE_GIF => 'gif'];
  if (!$info || !isset($types[$info[2]])) $fail('Подходят JPG, PNG, WebP и GIF.');
  if ($info[0] * $info[1] > 40e6) $fail('Слишком большое разрешение.');
  $ext = $types[$info[2]];
  $dir = __DIR__ . '/uploads/' . date('Ym');
  if (!is_dir($dir)) @mkdir($dir, 0755, true);
  $ht = __DIR__ . '/uploads/.htaccess';
  if (!is_file($ht)) @file_put_contents($ht, "Options -Indexes\n<FilesMatch \"\\.(php|phtml|phar|pl|py|cgi|sh|html?|svg)$\">\n  Require all denied\n</FilesMatch>\nRemoveHandler .php .phtml .phar\n<IfModule mod_php.c>\n  php_flag engine off\n</IfModule>\n<IfModule mod_headers.c>\n  Header set X-Content-Type-Options nosniff\n  Header set Content-Disposition inline\n</IfModule>\n");
  $name = bin2hex(random_bytes(10)) . '.' . $ext;
  $dest = "$dir/$name";
  // перекодируем через GD: убирает EXIF с координатами и всё лишнее из файла, уменьшает до 1800 px
  $ok = false;
  if ($ext !== 'gif' && function_exists('imagecreatefromstring')) {
    $im = @imagecreatefromstring(file_get_contents($f['tmp_name']));
    if ($im) {
      if ($ext === 'jpg' && function_exists('exif_read_data')) {
        $o = (int)(@exif_read_data($f['tmp_name'])['Orientation'] ?? 1);
        if ($o === 3) $im = imagerotate($im, 180, 0); elseif ($o === 6) $im = imagerotate($im, -90, 0); elseif ($o === 8) $im = imagerotate($im, 90, 0);
      }
      $w = imagesx($im); $hh = imagesy($im); $max = 1800;
      if ($w > $max || $hh > $max) { $k = $max / max($w, $hh); $im = imagescale($im, (int)round($w * $k), (int)round($hh * $k), IMG_BICUBIC); }
      if ($ext === 'png') { imagesavealpha($im, true); $ok = imagepng($im, $dest, 7); }
      elseif ($ext === 'webp') $ok = imagewebp($im, $dest, 85);
      else $ok = imagejpeg($im, $dest, 85);
      imagedestroy($im);
    }
  } else $ok = move_uploaded_file($f['tmp_name'], $dest) || copy($f['tmp_name'], $dest);
  if (!$ok) $fail('Не удалось сохранить картинку.', 500);
  global $CFG;
  $url = $CFG['base'] . 'uploads/' . date('Ym') . '/' . $name;
  echo json_encode(['url' => $url, 'md' => '![](' . $url . ')'], JSON_UNESCAPED_UNICODE); exit;
}


function report() {
  need_login(); $me = me(); $pid = (int)($_POST['pid'] ?? 0);
  if (one('SELECT 1 FROM posts WHERE id=?', [$pid]) && rate('rep:' . $me['id'], 10, 3600)) {
    q('INSERT INTO reports (post_id, user_id, reason, created) VALUES (?,?,?,?)', [$pid, $me['id'], txt('reason', 300), time()]);
    flash('Жалоба отправлена модератору. Спасибо.');
  }
  goto_post($pid);
}

function mod_page() {
  if (!is_mod()) return;
  $reps = q('SELECT r.*, u.name reporter, p.body, pu.name author FROM reports r JOIN users u ON u.id=r.user_id JOIN posts p ON p.id=r.post_id JOIN users pu ON pu.id=p.user_id WHERE r.done=0 ORDER BY r.id DESC LIMIT 100')->fetchAll();
  $m = '<div class="f-head"><h1>Модерация</h1></div>' . flash() . '<section class="f-box"><h2>Жалобы</h2>';
  if (!$reps) $m .= '<p class="f-muted">Новых жалоб нет.</p>';
  foreach ($reps as $r) {
    $m .= '<div class="f-modrow"><div><a href="' . h(url('post/' . $r['post_id'])) . '">Сообщение ' . h($r['author']) . '</a>: «' . h(mb_strimwidth($r['body'], 0, 160, '…')) . '»<small>Жалоба от ' . h($r['reporter']) . ', ' . ago($r['created']) . ': ' . h($r['reason']) . '</small></div>'
        . '<form method="post" action="' . h(url('modact')) . '">' . csrf_field() . '<input type="hidden" name="rid" value="' . $r['id'] . '"><input type="hidden" name="pid" value="' . $r['post_id'] . '">'
        . '<button name="a" value="resolve">Оставить</button><button name="a" value="delpost" class="danger">Удалить сообщение</button></form></div>';
  }
  $m .= '</section>';
  if (is_admin()) {
    $bc = bot_cfg(); bot_tables();
    $qn = (int)val('SELECT COUNT(*) FROM bot_queue WHERE done=0');
    $log = @file(__DIR__ . '/_data/bot.log') ?: [];
    $m .= '<section class="f-box"><h2>Бот форума</h2><p class="f-muted">Видно только администратору. ' . ($bc['enabled'] ? 'Бот включён' : 'Бот выключен') . '. Модель: <b>' . h($bc['provider'] && $bc['key'] ? (bot_providers()[$bc['provider']][0] ?? $bc['provider']) . ($bc['model'] ? ' · ' . $bc['model'] : '') : 'не подключена, бот отвечает подборкой ссылок') . '</b>. В очереди: ' . $qn . '.</p>'
        . '<p><a class="btn pri" href="' . h(url('bot')) . '">Подключение модели</a></p>'
        . ($log ? '<p class="f-muted">Последняя ошибка: ' . h(trim(end($log))) . '</p>' : '')
        . '<h3>Новость продукта от имени бота</h3><form class="f-form" method="post" action="' . h(url('modact')) . '">' . csrf_field()
        . '<label>Заголовок<input name="title" required minlength="5" maxlength="140" placeholder="Например: SlideX — новые билеты по геонавигации"></label>'
        . editor('body', '', 6) . '<label class="f-check"><input type="checkbox" name="pin" value="1"> Закрепить</label>'
        . '<div class="f-actions"><button class="btn pri" name="a" value="news" type="submit">Опубликовать в «Программы DrillHarmony»</button></div></form></section>';
  }
  $users = q("SELECT * FROM users WHERE pass<>'!' ORDER BY id DESC LIMIT 100")->fetchAll();
  $m .= '<section class="f-box"><h2>Участники</h2><div class="f-users">';
  foreach ($users as $u) {
    $m .= '<div class="f-modrow"><div><a href="' . h(url('u/' . rawurlencode($u['name']))) . '">' . h($u['name']) . '</a> ' . role_badge($u) . ($u['banned'] ? ' <i class="f-role ban">заблокирован</i>' : '')
        . '<small>' . h($u['email']) . ' · с ' . date('d.m.Y', $u['created']) . ' · ' . (int)$u['posts'] . ' сообщ.' . ($u['confirmed'] ? '' : ' · почта не подтверждена') . '</small></div>';
    if ($u['role'] !== 'admin') {
      $m .= '<form method="post" action="' . h(url('modact')) . '">' . csrf_field() . '<input type="hidden" name="uid" value="' . $u['id'] . '">'
          . '<button name="a" value="ban" class="' . ($u['banned'] ? '' : 'danger') . '">' . ($u['banned'] ? 'Разблокировать' : 'Заблокировать') . '</button>'
          . (is_admin() ? '<button name="a" value="mod">' . ($u['role'] === 'moderator' ? 'Снять модератора' : 'Сделать модератором') . '</button>' : '') . '</form>';
    }
    $m .= '</div>';
  }
  $m .= '</div></section>';
  page('Модерация', $m, '', crumbs('Модерация'), true);
}

function mod_action() {
  if (!is_mod()) redirect(url(''));
  $a = $_POST['a'] ?? '';
  $pid = (int)($_POST['pid'] ?? 0); $tid = (int)($_POST['tid'] ?? 0); $uid = (int)($_POST['uid'] ?? 0);
  if ($a === 'news' && is_admin()) { $tt = txt('title', 140); $bb = txt('body', 20000); if (mb_strlen($tt) >= 5 && mb_strlen($bb) >= 10) { $tid = bot_news($tt, $bb, !empty($_POST['pin'])); redirect(url('t/' . $tid)); } flash('Заполните заголовок и текст новости.', 'warn'); redirect(url('mod')); }
  if ($a === 'resolve') { q('UPDATE reports SET done=1 WHERE id=?', [(int)$_POST['rid']]); redirect(url('mod')); }
  if ($a === 'delpost' && $pid) {
    $p = one('SELECT * FROM posts WHERE id=?', [$pid]);
    if ($p) {
      $first = (int)val('SELECT MIN(id) FROM posts WHERE topic_id=?', [$p['topic_id']]) === $pid;
      if ($first) { q('UPDATE topics SET deleted=1 WHERE id=?', [$p['topic_id']]); }
      else {
        q('UPDATE posts SET deleted=1 WHERE id=?', [$pid]);
        $last = one('SELECT created, user_id FROM posts WHERE topic_id=? AND deleted=0 ORDER BY id DESC LIMIT 1', [$p['topic_id']]);
        q('UPDATE topics SET replies=MAX(0, replies-1), last_at=?, last_user=? WHERE id=?', [$last['created'], $last['user_id'], $p['topic_id']]);
      }
      q('UPDATE users SET posts=MAX(0, posts-1) WHERE id=?', [$p['user_id']]);
      q('UPDATE reports SET done=1 WHERE post_id=?', [$pid]);
      if ($first) { fts_topic((int)$p['topic_id']); tags_recount(); } else { fts_put($pid); q('UPDATE topics SET solved_post=NULL, solved_at=NULL WHERE solved_post=?', [$pid]); }
      rep_calc((int)$p['user_id'], false);
      flash($first ? 'Тема удалена.' : 'Сообщение удалено.');
      if ($first) redirect(url(''));
      if (!empty($_POST['rid'])) redirect(url('mod'));
      redirect(url('t/' . $p['topic_id']));
    }
  }
  if ($tid && in_array($a, ['pin', 'lock', 'deltopic'], true)) {
    if ($a === 'pin') q('UPDATE topics SET pinned=1-pinned WHERE id=?', [$tid]);
    if ($a === 'lock') q('UPDATE topics SET locked=1-locked WHERE id=?', [$tid]);
    if ($a === 'deltopic') {
      q('UPDATE topics SET deleted=1 WHERE id=?', [$tid]); fts_topic($tid); tags_recount();
      foreach (q('SELECT DISTINCT user_id FROM posts WHERE topic_id=?', [$tid])->fetchAll(PDO::FETCH_COLUMN) as $x) rep_calc((int)$x, false);
      flash('Тема удалена.'); redirect(url(''));
    }
    redirect(url('t/' . $tid));
  }
  if ($uid && $a === 'ban') { q("UPDATE users SET banned=1-banned WHERE id=? AND role<>'admin'", [$uid]); redirect(url('mod')); }
  if ($uid && $a === 'mod' && is_admin()) { q("UPDATE users SET role=CASE role WHEN 'moderator' THEN 'user' ELSE 'moderator' END WHERE id=? AND role<>'admin'", [$uid]); redirect(url('mod')); }
  redirect(url('mod'));
}

// ===================== единый вход для сайта и сервисов =====================
function api_route($what) {
  header('Content-Type: application/json; charset=utf-8'); header('Cache-Control: no-store');
  if ($what !== 'me') { http_response_code(404); echo '{}'; exit; }
  $u = me();
  if (!$u) { echo json_encode(['user' => null]); exit; }
  echo json_encode(['user' => ['name' => $u['name'], 'avatar' => $u['avatar'] ?: null, 'rep' => (int)$u['rep'], 'admin' => is_admin($u),
    'notes' => notes_unseen($u['id']), 'profile' => url('u/' . rawurlencode($u['name'])), 'edit' => url('me'), 'notes_url' => url('notes'),
    'live' => url('sso/live'), 'logout' => url('logout'), 'csrf' => csrf()]], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}
function sso_route($aud) {
  global $CFG;
  if ($aud !== 'live') redirect(url(''));
  if (!me()) { flash('Войдите или зарегистрируйтесь: одна учётная запись для сайта, форума и онлайн-данных.', 'warn'); redirect(url('login', ['next' => url('sso/live')])); }
  if ($why = can_post()) page('Онлайн-данные | DrillHarmony', '<div class="f-head"><h1>Онлайн-данные</h1></div><div class="f-box f-warn">' . $why . '</div>', '', crumbs('Онлайн-данные'), true);
  if (empty($CFG['live_secret'])) page('Онлайн-данные | DrillHarmony', '<div class="f-head"><h1>Онлайн-данные</h1></div><div class="f-box"><p>Сервис приёма WITS и WITSML ещё не подключён к сайту. Загляните чуть позже.</p></div>', '', crumbs('Онлайн-данные'), true);
  header('Cache-Control: no-store');
  redirect(rtrim($CFG['live_url'], '/') . '/sso?t=' . rawurlencode(sso_ticket(me(), 'live')));
}

// ===================== подключение модели (только владелец) =====================
function bot_providers() {
  return ['' => ['Не подключать', 'Бот отвечает подборкой ссылок на материалы сайта.'],
    'gigachat' => ['GigaChat (Сбер)', 'Ключ авторизации из личного кабинета developers.sber.ru → проект GigaChat API → «Ключ авторизации». Данные остаются в РФ.'],
    'yandex' => ['YandexGPT (Yandex Cloud)', 'API-ключ сервисного аккаунта с ролью ai.languageModels.user и идентификатор каталога (folder_id). Данные остаются в РФ.'],
    'openai' => ['OpenAI-совместимый API', 'Любой сервис с методом /chat/completions: адрес API и токен. Если сервер за рубежом, это трансграничная передача: нужно изменить политику и уведомить Роскомнадзор.']];
}
function bot_page($post) {
  if (!is_admin()) { http_response_code(404); page('Страница не найдена | Форум', '<h1>Страница не найдена</h1>', '', crumbs('Ошибка'), true); }
  $c = bot_cfg(); $test = '';
  if ($post) {
    $a = $_POST['a'] ?? 'save';
    $prov = (string)($_POST['provider'] ?? '');
    if (!isset(bot_providers()[$prov])) $prov = '';
    $new = ['enabled' => !empty($_POST['enabled']), 'provider' => $prov,
      'model' => mb_substr(trim((string)($_POST['model'] ?? '')), 0, 80), 'folder' => mb_substr(trim((string)($_POST['folder'] ?? '')), 0, 80),
      'base_url' => rtrim(mb_substr(trim((string)($_POST['base_url'] ?? '')), 0, 300), '/'),
      'scope' => in_array($_POST['scope'] ?? '', ['GIGACHAT_API_PERS', 'GIGACHAT_API_B2B', 'GIGACHAT_API_CORP'], true) ? $_POST['scope'] : 'GIGACHAT_API_PERS',
      'sections' => array_values(array_intersect((array)($_POST['sections'] ?? []), array_column(cat_list(), 1))),
      'delay_hours' => max(0, min(72, (int)($_POST['delay_hours'] ?? 3))), 'per_hour' => max(1, min(200, (int)($_POST['per_hour'] ?? 20))),
      'per_topic' => max(1, min(10, (int)($_POST['per_topic'] ?? 2)))];
    if ($new['base_url'] !== '' && !preg_match('~^https?://[^\s/]+~', $new['base_url'])) { flash('Адрес API должен начинаться с https://', 'warn'); redirect(url('bot')); }
    $k = trim((string)($_POST['key'] ?? ''));
    if (!empty($_POST['key_clear'])) $new['key'] = ''; elseif ($k !== '') $new['key'] = $k;
    if (!bot_save($new)) { flash('Не удалось сохранить: нет права записи в папку forum/_data.', 'warn'); redirect(url('bot')); }
    if ($a === 'test') {
      $err = ''; $t0 = microtime(true);
      // перечитать сохранённое: bot_cfg кеширует
      $GLOBALS['CFG']['bot'] = array_merge($GLOBALS['CFG']['bot'] ?? [], $new, isset($new['key']) ? [] : ['key' => $c['key']]);
      $ans = $new['provider'] ? llm_chat('Ты помощник форума. Ответь одним коротким предложением на русском.', 'Проверка связи: сколько будет 2+2?', $err) : '';
      $ms = (int)((microtime(true) - $t0) * 1000);
      $_SESSION['bot_test'] = $new['provider'] === '' ? ['warn', 'Модель не выбрана: бот отвечает подборкой ссылок.']
        : ($ans !== '' ? ['ok', 'Связь есть, ответ за ' . $ms . ' мс: «' . mb_strimwidth($ans, 0, 300, '…') . '»'] : ['warn', 'Ошибка: ' . ($err ?: 'пустой ответ')]);
    } else flash('Настройки сохранены.');
    redirect(url('bot'));
  }
  if (!empty($_SESSION['bot_test'])) { [$kind, $msg] = $_SESSION['bot_test']; unset($_SESSION['bot_test']); $test = '<div class="f-box f-' . ($kind === 'ok' ? 'ok' : 'warn') . '">' . h($msg) . '</div>'; }
  $opt = ''; $help = '';
  foreach (bot_providers() as $k => [$name, $hint]) {
    $opt .= '<label class="f-radio"><input type="radio" name="provider" value="' . h($k) . '"' . ($c['provider'] === $k ? ' checked' : '') . '><span><b>' . h($name) . '</b><small>' . h($hint) . '</small></span></label>';
  }
  $secs = '';
  foreach (cat_list() as $cat) { if (!empty($cat[4])) continue; $secs .= '<label class="f-check"><input type="checkbox" name="sections[]" value="' . h($cat[1]) . '"' . (in_array($cat[1], (array)$c['sections'], true) ? ' checked' : '') . '> ' . h($cat[0]) . '</label>'; }
  $scope = ''; foreach (['GIGACHAT_API_PERS' => 'Физлицо (PERS)', 'GIGACHAT_API_B2B' => 'Юрлицо, пакеты (B2B)', 'GIGACHAT_API_CORP' => 'Юрлицо, оплата по факту (CORP)'] as $k => $n) $scope .= '<option value="' . $k . '"' . ($c['scope'] === $k ? ' selected' : '') . '>' . $n . '</option>';
  $src = is_file(__DIR__ . '/_data/bot-settings.json') ? 'Настройки хранятся в forum/_data/bot-settings.json, ключ зашифрован.' : 'Сейчас действуют настройки из forum-config.php. После сохранения здесь они будут иметь приоритет.';
  $m = '<div class="f-head"><h1>Подключение модели</h1></div>' . flash() . $test
     . '<p class="f-muted">Эту страницу видит только владелец форума. Участники видят только «Бот DrillHarmony», название модели в ответах скрывается. ' . h($src) . '</p>'
     . '<form class="f-box f-form f-botcfg" method="post" action="' . h(url('bot')) . '" autocomplete="off">' . csrf_field()
     . '<label class="f-check"><input type="checkbox" name="enabled" value="1"' . ($c['enabled'] ? ' checked' : '') . '> Бот включён</label>'
     . '<fieldset><legend>Провайдер</legend>' . $opt . '</fieldset>'
     . '<label>Ключ или токен<input type="password" name="key" placeholder="' . h($c['key'] ? 'Сохранён ' . bot_mask($c['key']) . ', оставьте пустым, чтобы не менять' : 'Вставьте ключ') . '" autocomplete="new-password"></label>'
     . ($c['key'] ? '<label class="f-check"><input type="checkbox" name="key_clear" value="1"> Удалить сохранённый ключ</label>' : '')
     . '<div class="f-row2"><label>Модель<input name="model" value="' . h($c['model']) . '" placeholder="GigaChat, yandexgpt-lite, …"><small class="f-hint">Пусто — модель провайдера по умолчанию</small></label>'
     . '<label>Тариф GigaChat (scope)<select name="scope">' . $scope . '</select></label></div>'
     . '<div class="f-row2"><label>Каталог Yandex Cloud (folder_id)<input name="folder" value="' . h($c['folder']) . '"></label>'
     . '<label>Адрес API (для OpenAI-совместимых)<input name="base_url" value="' . h($c['base_url']) . '" placeholder="https://…/v1"></label></div>'
     . '<fieldset><legend>Где бот отвечает на новую тему сразу</legend><div class="f-checks">' . $secs . '</div></fieldset>'
     . '<div class="f-row3"><label>В остальных разделах — если молчат, ч<input type="number" name="delay_hours" min="0" max="72" value="' . (int)$c['delay_hours'] . '"></label>'
     . '<label>Ответов в час, не больше<input type="number" name="per_hour" min="1" max="200" value="' . (int)$c['per_hour'] . '"></label>'
     . '<label>Ответов в одной теме<input type="number" name="per_topic" min="1" max="10" value="' . (int)$c['per_topic'] . '"></label></div>'
     . '<div class="f-actions"><button class="btn pri" type="submit" name="a" value="save">Сохранить</button><button class="btn" type="submit" name="a" value="test">Сохранить и проверить связь</button><a href="' . h(url('mod')) . '">К модерации</a></div></form>';
  page('Подключение модели | Форум', $m, '', crumbs(['Модерация', url('mod')], 'Подключение модели'), true);
}

// ===================== вход и регистрация =====================
function form_page($title, $inner, $crumb) {
  page($title . ' | Форум', '<div class="f-auth"><div class="f-box f-form"><h1>' . h($title) . '</h1>' . flash() . $inner . '</div></div>', '', crumbs($crumb), true);
}
function safe_next() { $n = (string)($_POST['next'] ?? $_GET['next'] ?? ''); global $CFG; return (strpos($n, $CFG['base']) === 0 && strpos($n, '//') === false) ? $n : url(''); }

function login_form($err = '', $login = '') {
  if (me()) redirect(safe_next());
  form_page('Вход', ($err ? '<div class="f-flash warn">' . h($err) . '</div>' : '') . '<form method="post" action="' . h(url('login')) . '">' . csrf_field()
    . '<input type="hidden" name="next" value="' . h(safe_next()) . '">'
    . '<label>Имя или e-mail<input name="login" required autocomplete="username" value="' . h($login) . '"></label>'
    . '<label>Пароль<input name="pass" type="password" required autocomplete="current-password"></label>'
    . '<div class="f-actions"><button class="btn pri" type="submit">Войти</button><a href="' . h(url('reset')) . '">Забыли пароль?</a></div></form>'
    . '<p class="f-alt">Нет аккаунта? <a href="' . h(url('register', isset($_GET['next']) ? ['next' => safe_next()] : [])) . '">Зарегистрируйтесь</a></p>'
    . '<p class="f-alt">Одна учётная запись для сайта DrillHarmony, форума и онлайн-данных WITS/WITSML. Программы SlideX, Tempo и Etude входят по своим логинам.</p>', 'Вход');
}
function do_login() {
  $login = txt('login', 120); $pass = (string)($_POST['pass'] ?? '');
  if (!rate('login:' . ip(), 10, 900)) login_form('Слишком много попыток. Подождите 15 минут.', $login);
  $u = one('SELECT * FROM users WHERE name=? OR email=?', [$login, $login]);
  if (!$u || $u['pass'] === '!' || !password_verify($pass, $u['pass'])) login_form($u && $u['pass'] === '!' ? 'Для этой учётной записи пароль ещё не задан. Воспользуйтесь «Забыли пароль?».' : 'Неверное имя или пароль.', $login);
  if ($u['banned']) login_form('Доступ к форуму закрыт.', $login);
  session_regenerate_id(true);
  $_SESSION['uid'] = $u['id'];
  if (password_needs_rehash($u['pass'], PASSWORD_DEFAULT)) q('UPDATE users SET pass=? WHERE id=?', [password_hash($pass, PASSWORD_DEFAULT), $u['id']]);
  redirect(safe_next());
}

function register_form($err = '', $v = []) {
  if (me()) redirect(safe_next());
  $_SESSION['reg_t'] = time();
  form_page('Регистрация', ($err ? '<div class="f-flash warn">' . h($err) . '</div>' : '') . '<p class="f-alt" style="margin-top:0">Учётная запись DrillHarmony: форум, онлайн-данные WITS/WITSML и профиль участника.</p><form method="post" action="' . h(url('register')) . '" autocomplete="on">' . csrf_field() . '<input type="hidden" name="next" value="' . h(safe_next()) . '">'
    . '<label>Имя на форуме<input name="name" required minlength="3" maxlength="24" pattern="[A-Za-zА-Яа-яЁё0-9 _.\-]{3,24}" value="' . h($v['name'] ?? '') . '" autocomplete="nickname"><small>3–24 символа: буквы, цифры, пробел, точка, дефис</small></label>'
    . '<label>E-mail<input name="email" type="email" required maxlength="120" value="' . h($v['email'] ?? '') . '" autocomplete="email"><small>На него придёт письмо для подтверждения. Другим участникам не показывается</small></label>'
    . '<label>Пароль<input name="pass" type="password" required minlength="8" autocomplete="new-password"><small>Не меньше 8 символов</small></label>'
    . '<label>Должность, необязательно<input name="title" maxlength="60" value="' . h($v['title'] ?? '') . '" placeholder="Например: инженер ННБ, телеметрист, студент"></label>'
    . '<label class="f-hp" aria-hidden="true">Сайт<input name="website" tabindex="-1" autocomplete="off"></label>'
    . '<label class="f-check"><input type="checkbox" name="consent" value="1" required><span>Принимаю <a href="' . h(url('rules')) . '" target="_blank">правила форума</a> и даю согласие ИП Шайсламовой А. В. на обработку моих персональных данных (имя на форуме, e-mail, сведения профиля, сообщения, IP-адрес) для участия в форуме на условиях <a href="/privacy.html" target="_blank">политики обработки персональных данных</a>. Согласие можно отозвать письмом на info@drillharmony.com</span></label>'
    . '<div class="f-actions"><button class="btn pri" type="submit">Зарегистрироваться</button></div></form>'
    . '<p class="f-alt">Уже есть аккаунт? <a href="' . h(url('login')) . '">Войти</a></p>', 'Регистрация');
}
function do_register() {
  global $CFG;
  $v = ['name' => preg_replace('/\s+/u', ' ', txt('name', 24)), 'email' => mb_strtolower(txt('email', 120)), 'title' => txt('title', 60)];
  $pass = (string)($_POST['pass'] ?? '');
  if (!empty($_POST['website']) || time() - (int)($_SESSION['reg_t'] ?? 0) < 3) register_form('Попробуйте ещё раз.', $v);
  if (!preg_match('/^[A-Za-zА-Яа-яЁё0-9 _.\-]{3,24}$/u', $v['name'])) register_form('Имя: 3–24 символа, буквы, цифры, пробел, точка, дефис.', $v);
  if (!filter_var($v['email'], FILTER_VALIDATE_EMAIL)) register_form('Проверьте e-mail.', $v);
  if (mb_strlen($pass) < 8) register_form('Пароль должен быть не короче 8 символов.', $v);
  if (empty($_POST['consent'])) register_form('Нужно принять правила и дать согласие на обработку персональных данных.', $v);
  if (one('SELECT 1 FROM users WHERE name=?', [$v['name']])) register_form('Это имя уже занято.', $v);
  if (one('SELECT 1 FROM users WHERE email=?', [$v['email']])) register_form('С этим e-mail уже есть аккаунт. Войдите или восстановите пароль.', $v);
  if (!rate('reg:' . ip(), 3, 3600)) register_form('Слишком много регистраций с вашего адреса. Попробуйте позже.', $v);
  $role = in_array($v['email'], array_map('mb_strtolower', $CFG['admins']), true) ? 'admin' : 'user';
  $token = bin2hex(random_bytes(16));
  q('INSERT INTO users (name, email, pass, role, title, created, confirmed, token, token_exp, last_seen) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [$v['name'], $v['email'], password_hash($pass, PASSWORD_DEFAULT), $role, $v['title'], time(), $CFG['confirm_email'] ? 0 : 1, $token, time() + 86400 * 3, time()]);
  $uid = db()->lastInsertId();
  session_regenerate_id(true);
  $_SESSION['uid'] = $uid;
  if ($CFG['confirm_email']) {
    $ok = send_mail($v['email'], 'Подтвердите e-mail на форуме DrillHarmony', "Здравствуйте, {$v['name']}!\n\nЧтобы писать на форуме, подтвердите адрес:\n" . abs_url('confirm', ['token' => $token]) . "\n\nСсылка действует 3 дня. Если вы не регистрировались, просто удалите письмо.\n\nФорум DrillHarmony");
    flash($ok ? 'Готово! Мы отправили письмо на ' . $v['email'] . '. Перейдите по ссылке из письма, чтобы писать на форуме.' : 'Аккаунт создан, но письмо отправить не удалось. Попробуйте отправить его ещё раз из любой темы.', $ok ? 'ok' : 'warn');
  } else flash('Готово! Добро пожаловать на DrillHarmony.');
  redirect(safe_next());
}

function confirm() {
  $me = me();
  if (!empty($_GET['resend']) && $me && !$me['confirmed']) {
    if (rate('resend:' . $me['id'], 3, 3600)) {
      $token = bin2hex(random_bytes(16)); q('UPDATE users SET token=?, token_exp=? WHERE id=?', [$token, time() + 86400 * 3, $me['id']]);
      $ok = send_mail($me['email'], 'Подтвердите e-mail на форуме DrillHarmony', "Здравствуйте, {$me['name']}!\n\nСсылка для подтверждения адреса:\n" . abs_url('confirm', ['token' => $token]) . "\n\nФорум DrillHarmony");
      flash($ok ? 'Письмо отправлено на ' . $me['email'] . '.' : 'Не удалось отправить письмо. Попробуйте позже.', $ok ? 'ok' : 'warn');
    } else flash('Письмо уже отправлялось несколько раз. Проверьте папку «Спам».', 'warn');
    redirect(url(''));
  }
  $tok = (string)($_GET['token'] ?? '');
  $u = $tok ? one('SELECT * FROM users WHERE token=? AND token_exp>?', [$tok, time()]) : null;
  if (!$u) { flash('Ссылка устарела или уже использована.', 'warn'); redirect(url('')); }
  q('UPDATE users SET confirmed=1, token=NULL, token_exp=NULL WHERE id=?', [$u['id']]);
  session_regenerate_id(true); $_SESSION['uid'] = $u['id'];
  flash('E-mail подтверждён. Теперь можно писать на форуме.');
  redirect(url(''));
}

function reset_form($err = '') {
  $tok = (string)($_GET['token'] ?? $_POST['token'] ?? '');
  if ($tok) {
    $u = one('SELECT * FROM users WHERE token=? AND token_exp>?', [$tok, time()]);
    if (!$u) { flash('Ссылка устарела. Запросите новую.', 'warn'); redirect(url('reset')); }
    form_page('Новый пароль', ($err ? '<div class="f-flash warn">' . h($err) . '</div>' : '') . '<form method="post" action="' . h(url('reset')) . '">' . csrf_field() . '<input type="hidden" name="token" value="' . h($tok) . '">'
      . '<p>Учётная запись: <b>' . h($u['name']) . '</b></p><label>Новый пароль<input name="pass" type="password" required minlength="8" autocomplete="new-password"></label>'
      . '<div class="f-actions"><button class="btn pri" type="submit">Сохранить пароль</button></div></form>', 'Новый пароль');
  }
  form_page('Восстановление пароля', ($err ? '<div class="f-flash warn">' . h($err) . '</div>' : '') . '<form method="post" action="' . h(url('reset')) . '">' . csrf_field()
    . '<label>E-mail, указанный при регистрации<input name="email" type="email" required></label><div class="f-actions"><button class="btn pri" type="submit">Отправить ссылку</button></div></form>', 'Восстановление пароля');
}
function do_reset() {
  $tok = (string)($_POST['token'] ?? '');
  if ($tok) {
    $u = one('SELECT * FROM users WHERE token=? AND token_exp>?', [$tok, time()]);
    if (!$u) { flash('Ссылка устарела. Запросите новую.', 'warn'); redirect(url('reset')); }
    $pass = (string)($_POST['pass'] ?? '');
    if (mb_strlen($pass) < 8) { $_GET['token'] = $tok; reset_form('Пароль должен быть не короче 8 символов.'); }
    q('UPDATE users SET pass=?, token=NULL, token_exp=NULL, confirmed=1 WHERE id=?', [password_hash($pass, PASSWORD_DEFAULT), $u['id']]);
    session_regenerate_id(true); $_SESSION['uid'] = $u['id'];
    flash('Пароль сохранён, вы вошли на форум.');
    redirect(url(''));
  }
  $email = mb_strtolower(txt('email', 120));
  if (rate('reset:' . ip(), 5, 3600)) {
    $u = one('SELECT * FROM users WHERE email=? AND banned=0', [$email]);
    if ($u) {
      $token = bin2hex(random_bytes(16)); q('UPDATE users SET token=?, token_exp=? WHERE id=?', [$token, time() + 3600 * 2, $u['id']]);
      send_mail($u['email'], 'Восстановление пароля на форуме DrillHarmony', "Здравствуйте, {$u['name']}!\n\nЧтобы задать новый пароль, перейдите по ссылке:\n" . abs_url('reset', ['token' => $token]) . "\n\nСсылка действует 2 часа. Если вы не запрашивали восстановление, просто удалите письмо.\n\nФорум DrillHarmony");
    }
  }
  flash('Если такой e-mail зарегистрирован, мы отправили на него ссылку для нового пароля. Проверьте и папку «Спам».');
  redirect(url('login'));
}

// Первый вход владельца без почты: в forum-config.php задаётся 'setup_key', страница /forum/setup?key=... задаёт пароль учётной записи DrillHarmony.
function setup($post) {
  global $CFG;
  $key = (string)($_GET['key'] ?? $_POST['key'] ?? '');
  if (empty($CFG['setup_key']) || strlen($CFG['setup_key']) < 12 || !hash_equals($CFG['setup_key'], $key)) return;
  $u = one("SELECT * FROM users WHERE name='DrillHarmony'");
  if ($post) {
    $pass = (string)($_POST['pass'] ?? '');
    if (mb_strlen($pass) >= 10) {
      q('UPDATE users SET pass=?, confirmed=1 WHERE id=?', [password_hash($pass, PASSWORD_DEFAULT), $u['id']]);
      session_regenerate_id(true); $_SESSION['uid'] = $u['id'];
      flash('Пароль владельца сохранён. Удалите setup_key из forum-config.php.');
      redirect(url(''));
    }
  }
  form_page('Пароль владельца', '<form method="post" action="' . h(url('setup')) . '">' . csrf_field() . '<input type="hidden" name="key" value="' . h($key) . '"><p>Учётная запись: <b>DrillHarmony</b></p>'
    . '<label>Пароль, не меньше 10 символов<input name="pass" type="password" required minlength="10" autocomplete="new-password"></label><div class="f-actions"><button class="btn pri" type="submit">Сохранить</button></div></form>', 'Настройка');
}

// ===================== профиль и поиск =====================

