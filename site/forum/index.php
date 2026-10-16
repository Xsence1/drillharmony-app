<?php
// Форум DrillHarmony: маршруты и страницы.
define('FORUM', 1);
require __DIR__ . '/lib.php';
require __DIR__ . '/bot.php';
try { db(); } catch (Throwable $e) { http_response_code(500); echo 'Форум временно недоступен: не удалось открыть базу (нужен PHP с PDO SQLite и право записи в папку forum/_data).'; exit; }
start_session();
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
  case 'upload': if ($post) upload(); break;
  case 'preview': if ($post) { header('Content-Type: text/html; charset=utf-8'); echo render(txt('body', 20000)); exit; } break;
  case 'report': if ($post) report(); break;
  case 'mod': mod_page(); break;
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

function home() {
  $cats = q("SELECT c.*, (SELECT COUNT(*) FROM topics t WHERE t.cat_id=c.id AND t.deleted=0) topics,
                    (SELECT COUNT(*) FROM posts p JOIN topics t ON t.id=p.topic_id WHERE t.cat_id=c.id AND p.deleted=0 AND t.deleted=0) posts,
                    (SELECT t.id FROM topics t WHERE t.cat_id=c.id AND t.deleted=0 ORDER BY t.last_at DESC LIMIT 1) last_tid
             FROM cats c ORDER BY c.ord")->fetchAll();
  $groups = [];
  foreach ($cats as $c) $groups[$c['grp']][] = $c;
  $m = '<div class="f-head"><div><h1>Форум DrillHarmony</h1><p class="f-sub">Вопросы, опыт и разборы задач: траектория, слайд, телеметрия, геонавигация, режимы бурения, данные и карьера.</p></div>'
     . (me() ? '<a class="btn pri" href="' . h(url('new')) . '">Новая тема</a>' : '') . '</div>' . flash();
  $m .= '<div class="f-grid"><div>';
  foreach ($groups as $g => $list) {
    $m .= '<section class="f-group"><h2>' . h($g) . '</h2><div class="f-cats">';
    foreach ($list as $c) {
      $last = $c['last_tid'] ? one('SELECT t.id, t.title, t.last_at, u.name FROM topics t LEFT JOIN users u ON u.id=t.last_user WHERE t.id=?', [$c['last_tid']]) : null;
      $m .= '<a class="f-cat' . ($c['slug'] === 'kb' ? ' kb' : '') . '" href="' . h(url('c/' . $c['slug'])) . '"><span class="f-cat-i" aria-hidden="true">' . cat_icon($c['slug']) . '</span>'
          . '<span class="f-cat-t"><b>' . h($c['name']) . '</b><small>' . h($c['descr']) . '</small></span>'
          . '<span class="f-cat-n"><b>' . (int)$c['topics'] . '</b> ' . plural($c['topics'], 'тема', 'темы', 'тем') . '<br><b>' . (int)$c['posts'] . '</b> ' . plural($c['posts'], 'сообщение', 'сообщения', 'сообщений') . '</span>'
          . '<span class="f-cat-l">' . ($last ? h(mb_strimwidth($last['title'], 0, 48, '…')) . '<small>' . h($last['name']) . ', ' . ago($last['last_at']) . '</small>' : '<small>Пока нет тем</small>') . '</span></a>';
    }
    $m .= '</div></section>';
  }
  $m .= '</div><aside class="f-side">' . side_box() . '</aside></div>';
  page('Форум DrillHarmony', $m, 'Форум DrillHarmony о наклонно-направленном бурении: траектория, слайд и КНБК, телеметрия, геонавигация, режимы бурения, данные, обучение и карьера.', crumbs());
}

function side_box() {
  $s = '';
  if (!me()) $s .= '<div class="f-box f-join"><h3>Присоединяйтесь</h3><p>Задавайте вопросы и делитесь опытом с инженерами ННБ, телеметристами и геонавигаторами.</p><a class="btn pri" href="' . h(url('register')) . '">Зарегистрироваться</a></div>';
  $new = q("SELECT t.id, t.title, t.last_at, c.name cname FROM topics t JOIN cats c ON c.id=t.cat_id WHERE t.deleted=0 ORDER BY t.last_at DESC LIMIT 7")->fetchAll();
  $s .= '<div class="f-box"><h3>Последние обсуждения</h3><ul class="f-recent">';
  foreach ($new as $t) $s .= '<li><a href="' . h(url('t/' . $t['id'])) . '">' . h($t['title']) . '</a><small>' . h($t['cname']) . ' · ' . ago($t['last_at']) . '</small></li>';
  $s .= '</ul></div>';
  $st = one("SELECT (SELECT COUNT(*) FROM users WHERE pass<>'!') u, (SELECT COUNT(*) FROM topics WHERE deleted=0) t, (SELECT COUNT(*) FROM posts WHERE deleted=0) p");
  $s .= '<div class="f-box f-stats"><div><b>' . (int)$st['t'] . '</b>' . plural($st['t'], 'тема', 'темы', 'тем') . '</div><div><b>' . (int)$st['p'] . '</b>' . plural($st['p'], 'сообщение', 'сообщения', 'сообщений') . '</div><div><b>' . (int)$st['u'] . '</b>' . plural($st['u'], 'участник', 'участника', 'участников') . '</div></div>';
  $s .= '<div class="f-box"><h3>Перед тем как писать</h3><p>Не публикуйте данные заказчиков и названия скважин без разрешения, обсуждайте осложнения обезличенно. <a href="' . h(url('rules')) . '">Правила форума</a></p></div>';
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

function category($slug) {
  global $CFG;
  $c = one('SELECT * FROM cats WHERE slug=?', [$slug]);
  if (!$c) return;
  $page = max(1, (int)($_GET['p'] ?? 1));
  $total = (int)val('SELECT COUNT(*) FROM topics WHERE cat_id=? AND deleted=0', [$c['id']]);
  $ts = q('SELECT t.*, u.name author, lu.name lname FROM topics t JOIN users u ON u.id=t.user_id LEFT JOIN users lu ON lu.id=t.last_user
           WHERE t.cat_id=? AND t.deleted=0 ORDER BY t.pinned DESC, t.last_at DESC LIMIT ? OFFSET ?', [$c['id'], $CFG['per_page'], ($page - 1) * $CFG['per_page']])->fetchAll();
  $canNew = me() && (!$c['admin_only'] || is_mod());
  $m = '<div class="f-head"><div><h1>' . h($c['name']) . '</h1><p class="f-sub">' . h($c['descr']) . '</p></div>'
     . ($canNew ? '<a class="btn pri" href="' . h(url('new', ['c' => $c['slug']])) . '">Новая тема</a>' : (!me() && !$c['admin_only'] ? '<a class="btn" href="' . h(url('login', ['next' => url('new', ['c' => $c['slug']])])) . '">Войдите, чтобы создать тему</a>' : '')) . '</div>' . flash();
  if (!$ts) $m .= '<div class="f-box f-empty"><p>В этом разделе пока нет тем.' . ($canNew ? ' Начните первую.' : '') . '</p></div>';
  else {
    $m .= '<div class="f-topics" role="list">';
    foreach ($ts as $t) {
      $m .= '<div class="f-topic" role="listitem"><div class="f-topic-t"><a href="' . h(url('t/' . $t['id'])) . '">' . ($t['pinned'] ? '<i class="f-pin">Закреплено</i>' : '') . ($t['locked'] ? '<i class="f-lock">Закрыто</i>' : '') . h($t['title']) . '</a>'
          . '<small>' . h($t['author']) . ' · ' . ago($t['created']) . '</small></div>'
          . '<div class="f-topic-n"><b>' . (int)$t['replies'] . '</b> ' . plural($t['replies'], 'ответ', 'ответа', 'ответов') . '<small>' . (int)$t['views'] . ' ' . plural($t['views'], 'просмотр', 'просмотра', 'просмотров') . '</small></div>'
          . '<div class="f-topic-l">' . h($t['lname']) . '<small>' . ago($t['last_at']) . '</small></div></div>';
    }
    $m .= '</div>' . pager($total, $page, 'c/' . $c['slug']);
  }
  page($c['name'] . ' | Форум', $m, $c['descr'], crumbs($c['name']));
}

function role_badge($u) {
  if ($u['role'] === 'admin') return '<i class="f-role own">' . ($u['name'] === 'DrillHarmony' ? 'Владелец' : 'Администратор') . '</i>';
  if ($u['role'] === 'moderator') return '<i class="f-role">Модератор</i>';
  if ($u['role'] === 'bot') return '<i class="f-role bot">Бот</i>';
  return '';
}

function topic($id) {
  global $CFG;
  $t = one('SELECT t.*, c.name cname, c.slug cslug FROM topics t JOIN cats c ON c.id=t.cat_id WHERE t.id=?', [$id]);
  if (!$t || ($t['deleted'] && !is_mod())) return;
  if (empty($_SESSION['seen'][$id])) { q('UPDATE topics SET views=views+1 WHERE id=?', [$id]); $_SESSION['seen'][$id] = 1; }
  $total = (int)val('SELECT COUNT(*) FROM posts WHERE topic_id=? AND deleted=0', [$id]);
  $pages = max(1, (int)ceil($total / $CFG['per_page']));
  $page = isset($_GET['p']) && $_GET['p'] === 'last' ? $pages : max(1, min($pages, (int)($_GET['p'] ?? 1)));
  $ps = q('SELECT p.*, u.name, u.title utitle, u.role, u.posts uposts, u.created ucreated FROM posts p JOIN users u ON u.id=p.user_id
           WHERE p.topic_id=? AND (p.deleted=0 OR ?) ORDER BY p.id LIMIT ? OFFSET ?', [$id, is_mod() ? 1 : 0, $CFG['per_page'], ($page - 1) * $CFG['per_page']])->fetchAll();
  $me = me();
  $liked = $me ? array_column(q('SELECT post_id FROM likes WHERE user_id=?', [$me['id']])->fetchAll(), 'post_id') : [];
  $m = '<div class="f-head"><div><h1>' . h($t['title']) . '</h1><p class="f-sub"><a href="' . h(url('c/' . $t['cslug'])) . '">' . h($t['cname']) . '</a> · ' . (int)$t['replies'] . ' ' . plural($t['replies'], 'ответ', 'ответа', 'ответов') . ' · ' . (int)$t['views'] . ' ' . plural($t['views'], 'просмотр', 'просмотра', 'просмотров') . '</p></div>';
  if (is_mod()) {
    $m .= '<form method="post" action="' . h(url('modact')) . '" class="f-modbar">' . csrf_field() . '<input type="hidden" name="tid" value="' . $id . '">'
        . '<button name="a" value="pin">' . ($t['pinned'] ? 'Открепить' : 'Закрепить') . '</button><button name="a" value="lock">' . ($t['locked'] ? 'Открыть' : 'Закрыть') . '</button>'
        . '<button name="a" value="deltopic" class="danger" data-confirm="Удалить тему целиком?">Удалить тему</button></form>';
  }
  $m .= '</div>' . flash() . pager($total, $page, 't/' . $id);
  $first = (int)val('SELECT MIN(id) FROM posts WHERE topic_id=?', [$id]);
  foreach ($ps as $p) {
    $own = $me && $me['id'] == $p['user_id'];
    $m .= '<article class="f-post' . ($p['deleted'] ? ' del' : '') . ($p['id'] == $first ? ' first' : '') . '" id="p' . $p['id'] . '">'
        . '<div class="f-post-h">' . avatar($p, 40) . '<div><a class="f-name" href="' . h(url('u/' . rawurlencode($p['name']))) . '">' . h($p['name']) . '</a>' . role_badge($p)
        . '<small>' . h($p['utitle'] ?: 'Участник') . ' · ' . (int)$p['uposts'] . ' ' . plural($p['uposts'], 'сообщение', 'сообщения', 'сообщений') . '</small></div>'
        . '<a class="f-date" href="#p' . $p['id'] . '">' . ago($p['created']) . ($p['edited'] ? ' · изменено' : '') . '</a></div>'
        . '<div class="f-body">' . ($p['deleted'] ? '<p class="f-muted">Сообщение удалено модератором.</p>' : render($p['body'])) . '</div>';
    if (!$p['deleted']) {
      $m .= '<div class="f-post-f">';
      if ($me && !$own) $m .= '<form method="post" action="' . h(url('like')) . '" class="f-inline">' . csrf_field() . '<input type="hidden" name="pid" value="' . $p['id'] . '"><button class="f-like' . (in_array($p['id'], $liked) ? ' on' : '') . '" type="submit">Спасибо' . ($p['likes'] ? ' · ' . (int)$p['likes'] : '') . '</button></form>';
      elseif ($p['likes']) $m .= '<span class="f-like-n">Спасибо · ' . (int)$p['likes'] . '</span>';
      if ($me && !$t['locked']) $m .= '<button type="button" class="f-link" data-quote="' . h($p['name']) . '" data-body="' . h(mb_substr($p['body'], 0, 600)) . '">Цитировать</button>';
      if (($own && time() - $p['created'] < 86400) || is_mod()) $m .= '<a class="f-link" href="' . h(url('edit/' . $p['id'])) . '">Изменить</a>';
      if ($me && !$own) $m .= '<details class="f-rep"><summary class="f-link">Пожаловаться</summary><form method="post" action="' . h(url('report')) . '">' . csrf_field() . '<input type="hidden" name="pid" value="' . $p['id'] . '"><input name="reason" maxlength="300" placeholder="Что не так с сообщением" required><button type="submit" class="btn">Отправить</button></form></details>';
      if (is_mod()) $m .= '<form method="post" action="' . h(url('modact')) . '" class="f-inline">' . csrf_field() . '<input type="hidden" name="pid" value="' . $p['id'] . '"><button class="f-link danger" name="a" value="delpost" data-confirm="Удалить сообщение?">Удалить</button></form>';
      $m .= '</div>';
    }
    $m .= '</article>';
  }
  $m .= pager($total, $page, 't/' . $id);
  if ($t['locked']) $m .= '<div class="f-box f-muted">Тема закрыта для ответов.</div>';
  elseif (!$me) $m .= '<div class="f-box f-cta"><p>Чтобы ответить, <a href="' . h(url('login', ['next' => url('t/' . $id, ['p' => 'last'])])) . '">войдите</a> или <a href="' . h(url('register')) . '">зарегистрируйтесь</a>.</p></div>';
  elseif ($why = can_post()) $m .= '<div class="f-box f-warn">' . $why . '</div>';
  else $m .= '<form class="f-box f-form" method="post" action="' . h(url('reply')) . '" id="reply">' . csrf_field() . '<input type="hidden" name="tid" value="' . $id . '"><h2>Ваш ответ</h2>' . editor('body', '') . '<div class="f-actions"><button class="btn pri" type="submit">Ответить</button></div></form>';
  $m .= '<p class="f-note">Ответы на форуме — мнение участников. Решения на буровой принимаются по инструкциям компании и программе на бурение.</p>';
  $first = one('SELECT body FROM posts WHERE topic_id=? ORDER BY id LIMIT 1', [$id]);
  page($t['title'] . ' | Форум', $m, mb_strimwidth(preg_replace('/\s+/u', ' ', strip_tags(render($first['body'] ?? ''))), 0, 180, '…'), crumbs([$t['cname'], url('c/' . $t['cslug'])], $t['title']), (bool)$t['deleted']);
}

function editor($name, $value, $rows = 8) {
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
    . '<div class="f-ed-area"><textarea name="' . h($name) . '" rows="' . (int)$rows . '" required minlength="2" maxlength="20000" placeholder="Текст сообщения. Картинку можно вставить из буфера обмена или перетащить сюда.">' . h($value) . '</textarea>'
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

function new_topic_form($slug, $err = '', $title = '', $body = '') {
  need_login();
  if ($why = can_post()) { page('Новая тема', '<div class="f-box f-warn">' . $why . '</div>', '', crumbs('Новая тема'), true); }
  $cats = q('SELECT * FROM cats ' . (is_mod() ? '' : 'WHERE admin_only=0') . ' ORDER BY ord')->fetchAll();
  $opt = ''; foreach ($cats as $c) $opt .= '<option value="' . h($c['slug']) . '"' . ($c['slug'] === $slug ? ' selected' : '') . '>' . h($c['name']) . '</option>';
  $m = '<div class="f-head"><h1>Новая тема</h1></div>' . ($err ? '<div class="f-flash warn">' . h($err) . '</div>' : '')
     . '<form class="f-box f-form" method="post" action="' . h(url('new')) . '">' . csrf_field()
     . '<label>Раздел<select name="c" required>' . $opt . '</select></label>'
     . '<label>Заголовок<input name="title" required minlength="5" maxlength="140" value="' . h($title) . '" placeholder="Коротко о сути вопроса"></label>'
     . '<label>Сообщение</label>' . editor('body', $body, 12)
     . '<p class="f-hint">Без названий скважин, месторождений и данных заказчика без разрешения. <a href="' . h(url('rules')) . '" target="_blank">Правила</a></p>'
     . '<div class="f-actions"><button class="btn pri" type="submit">Создать тему</button></div></form>';
  page('Новая тема | Форум', $m, '', crumbs('Новая тема'), true);
}

function create_topic() {
  need_login(); if (can_post()) redirect(url('new'));
  $me = me();
  $c = one('SELECT * FROM cats WHERE slug=?', [$_POST['c'] ?? '']);
  $title = txt('title', 140); $body = txt('body', 20000);
  if (!$c || ($c['admin_only'] && !is_mod())) new_topic_form('', 'Выберите раздел.', $title, $body);
  if (mb_strlen($title) < 5) new_topic_form($c['slug'], 'Заголовок слишком короткий.', $title, $body);
  if (mb_strlen($body) < 10) new_topic_form($c['slug'], 'Сообщение слишком короткое.', $title, $body);
  if (!is_mod() && !rate('topic:' . $me['id'], 5, 3600)) new_topic_form($c['slug'], 'Не больше пяти тем в час. Попробуйте позже.', $title, $body);
  $now = time();
  q('INSERT INTO topics (cat_id, user_id, title, created, last_at, last_user) VALUES (?,?,?,?,?,?)', [$c['id'], $me['id'], $title, $now, $now, $me['id']]);
  $tid = db()->lastInsertId();
  q('INSERT INTO posts (topic_id, user_id, body, created, ip) VALUES (?,?,?,?,?)', [$tid, $me['id'], $body, $now, ip()]);
  q('UPDATE users SET posts=posts+1 WHERE id=?', [$me['id']]);
  if ($c['slug'] !== 'kb' && $c['slug'] !== 'about') bot_on_topic($tid, $c['slug']);
  redirect(url('t/' . $tid));
}

function reply() {
  need_login(); $me = me();
  $tid = (int)($_POST['tid'] ?? 0);
  $t = one('SELECT * FROM topics WHERE id=? AND deleted=0', [$tid]);
  if (!$t) redirect(url(''));
  if ($why = can_post()) { flash(strip_tags($why), 'warn'); redirect(url('t/' . $tid)); }
  if ($t['locked'] && !is_mod()) { flash('Тема закрыта.', 'warn'); redirect(url('t/' . $tid)); }
  $body = txt('body', 20000);
  if (mb_strlen($body) < 2) { flash('Пустое сообщение.', 'warn'); redirect(url('t/' . $tid)); }
  if (!is_mod() && !rate('post:' . $me['id'], 1, 15)) { flash('Слишком часто. Подождите несколько секунд.', 'warn'); redirect(url('t/' . $tid, ['p' => 'last'])); }
  if (!is_mod() && !rate('posth:' . $me['id'], 60, 3600)) { flash('Не больше 60 сообщений в час.', 'warn'); redirect(url('t/' . $tid, ['p' => 'last'])); }
  $now = time();
  q('INSERT INTO posts (topic_id, user_id, body, created, ip) VALUES (?,?,?,?,?)', [$tid, $me['id'], $body, $now, ip()]);
  $pid = db()->lastInsertId();
  q('UPDATE topics SET replies=replies+1, last_at=?, last_user=? WHERE id=?', [$now, $me['id'], $tid]);
  q('UPDATE users SET posts=posts+1 WHERE id=?', [$me['id']]);
  bot_on_reply($tid, $pid, $body);
  goto_post($pid);
}

function edit_post($pid, $post) {
  need_login(); $me = me();
  $p = one('SELECT p.*, t.title, t.id tid FROM posts p JOIN topics t ON t.id=p.topic_id WHERE p.id=? AND p.deleted=0', [$pid]);
  if (!$p) return;
  $first = (int)val('SELECT MIN(id) FROM posts WHERE topic_id=?', [$p['tid']]) === $pid;
  if (!is_mod() && !($p['user_id'] == $me['id'] && time() - $p['created'] < 86400)) { flash('Изменять сообщение можно в течение суток.', 'warn'); goto_post($pid); }
  if ($post) {
    $body = txt('body', 20000);
    if (mb_strlen($body) >= 2) {
      q('UPDATE posts SET body=?, edited=? WHERE id=?', [$body, time(), $pid]);
      if ($first && mb_strlen($nt = txt('title', 140)) >= 5) q('UPDATE topics SET title=? WHERE id=?', [$nt, $p['tid']]);
    }
    goto_post($pid);
  }
  $m = '<div class="f-head"><h1>Изменить сообщение</h1></div><form class="f-box f-form" method="post" action="' . h(url('edit/' . $pid)) . '">' . csrf_field()
     . ($first ? '<label>Заголовок темы<input name="title" required minlength="5" maxlength="140" value="' . h($p['title']) . '"></label>' : '')
     . editor('body', $p['body'], 12) . '<div class="f-actions"><button class="btn pri" type="submit">Сохранить</button><a class="btn" href="' . h(url('post/' . $pid)) . '">Отмена</a></div></form>';
  page('Изменить сообщение', $m, '', crumbs([$p['title'], url('t/' . $p['tid'])], 'Изменить'), true);
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

function like() {
  need_login(); $me = me(); $pid = (int)($_POST['pid'] ?? 0);
  $p = one('SELECT * FROM posts WHERE id=? AND deleted=0', [$pid]);
  if ($p && $p['user_id'] != $me['id']) {
    if (one('SELECT 1 FROM likes WHERE post_id=? AND user_id=?', [$pid, $me['id']])) { q('DELETE FROM likes WHERE post_id=? AND user_id=?', [$pid, $me['id']]); q('UPDATE posts SET likes=likes-1 WHERE id=?', [$pid]); }
    else { q('INSERT INTO likes (post_id, user_id) VALUES (?,?)', [$pid, $me['id']]); q('UPDATE posts SET likes=likes+1 WHERE id=?', [$pid]); }
  }
  goto_post($pid);
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
  if (is_admin()) {
    $bc = bot_cfg(); bot_tables();
    $qn = (int)val('SELECT COUNT(*) FROM bot_queue WHERE done=0');
    $log = @file(__DIR__ . '/_data/bot.log') ?: [];
    $m .= '<section class="f-box"><h2>Бот форума</h2><p class="f-muted">Видно только администратору. ' . ($bc['enabled'] ? 'Бот включён' : 'Бот выключен') . '. Модель: <b>' . h($bc['provider'] && $bc['key'] ? $bc['provider'] . ($bc['model'] ? ' · ' . $bc['model'] : '') : 'не подключена, бот отвечает подборкой ссылок') . '</b>. В очереди: ' . $qn . '.</p>'
        . ($log ? '<p class="f-muted">Последняя ошибка: ' . h(trim(end($log))) . '</p>' : '')
        . '<h3>Новость продукта от имени бота</h3><form class="f-form" method="post" action="' . h(url('modact')) . '">' . csrf_field()
        . '<label>Заголовок<input name="title" required minlength="5" maxlength="140" placeholder="Например: SlideX — новые билеты по геонавигации"></label>'
        . editor('body', '', 6) . '<label class="f-check"><input type="checkbox" name="pin" value="1"> Закрепить</label>'
        . '<div class="f-actions"><button class="btn pri" name="a" value="news" type="submit">Опубликовать в «Программы DrillHarmony»</button></div></form></section>';
  }
  $users = q("SELECT * FROM users WHERE pass<>'!' ORDER BY id DESC LIMIT 100")->fetchAll();
  $m .= '</section><section class="f-box"><h2>Участники</h2><div class="f-users">';
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
      flash($first ? 'Тема удалена.' : 'Сообщение удалено.');
      if ($first) redirect(url(''));
      if (!empty($_POST['rid'])) redirect(url('mod'));
      redirect(url('t/' . $p['topic_id']));
    }
  }
  if ($tid && in_array($a, ['pin', 'lock', 'deltopic'], true)) {
    if ($a === 'pin') q('UPDATE topics SET pinned=1-pinned WHERE id=?', [$tid]);
    if ($a === 'lock') q('UPDATE topics SET locked=1-locked WHERE id=?', [$tid]);
    if ($a === 'deltopic') { q('UPDATE topics SET deleted=1 WHERE id=?', [$tid]); flash('Тема удалена.'); redirect(url('')); }
    redirect(url('t/' . $tid));
  }
  if ($uid && $a === 'ban') { q("UPDATE users SET banned=1-banned WHERE id=? AND role<>'admin'", [$uid]); redirect(url('mod')); }
  if ($uid && $a === 'mod' && is_admin()) { q("UPDATE users SET role=CASE role WHEN 'moderator' THEN 'user' ELSE 'moderator' END WHERE id=? AND role<>'admin'", [$uid]); redirect(url('mod')); }
  redirect(url('mod'));
}

// ===================== вход и регистрация =====================
function form_page($title, $inner, $crumb) {
  page($title . ' | Форум', '<div class="f-auth"><div class="f-box f-form"><h1>' . h($title) . '</h1>' . flash() . $inner . '</div></div>', '', crumbs($crumb), true);
}
function safe_next() { $n = (string)($_POST['next'] ?? $_GET['next'] ?? ''); global $CFG; return (strpos($n, $CFG['base']) === 0 && strpos($n, '//') === false) ? $n : url(''); }

function login_form($err = '', $login = '') {
  if (me()) redirect(url(''));
  form_page('Вход', ($err ? '<div class="f-flash warn">' . h($err) . '</div>' : '') . '<form method="post" action="' . h(url('login')) . '">' . csrf_field()
    . '<input type="hidden" name="next" value="' . h(safe_next()) . '">'
    . '<label>Имя или e-mail<input name="login" required autocomplete="username" value="' . h($login) . '"></label>'
    . '<label>Пароль<input name="pass" type="password" required autocomplete="current-password"></label>'
    . '<div class="f-actions"><button class="btn pri" type="submit">Войти</button><a href="' . h(url('reset')) . '">Забыли пароль?</a></div></form>'
    . '<p class="f-alt">Нет аккаунта? <a href="' . h(url('register')) . '">Зарегистрируйтесь</a></p>', 'Вход');
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
  if (me()) redirect(url(''));
  $_SESSION['reg_t'] = time();
  form_page('Регистрация', ($err ? '<div class="f-flash warn">' . h($err) . '</div>' : '') . '<form method="post" action="' . h(url('register')) . '" autocomplete="on">' . csrf_field()
    . '<label>Имя на форуме<input name="name" required minlength="3" maxlength="24" pattern="[A-Za-zА-Яа-яЁё0-9 _.\-]{3,24}" value="' . h($v['name'] ?? '') . '" autocomplete="nickname"><small>3–24 символа: буквы, цифры, пробел, точка, дефис</small></label>'
    . '<label>E-mail<input name="email" type="email" required maxlength="120" value="' . h($v['email'] ?? '') . '" autocomplete="email"><small>На него придёт письмо для подтверждения. Другим участникам не показывается</small></label>'
    . '<label>Пароль<input name="pass" type="password" required minlength="8" autocomplete="new-password"><small>Не меньше 8 символов</small></label>'
    . '<label>Должность, необязательно<input name="title" maxlength="60" value="' . h($v['title'] ?? '') . '" placeholder="Например: инженер ННБ, телеметрист, студент"></label>'
    . '<label class="f-hp" aria-hidden="true">Сайт<input name="website" tabindex="-1" autocomplete="off"></label>'
    . '<label class="f-check"><input type="checkbox" name="consent" value="1" required> Принимаю <a href="' . h(url('rules')) . '" target="_blank">правила форума</a> и даю согласие ИП Шайсламовой А. В. на обработку моих персональных данных (имя на форуме, e-mail, сведения профиля, сообщения, IP-адрес) для участия в форуме на условиях <a href="/privacy.html" target="_blank">политики обработки персональных данных</a>. Согласие можно отозвать письмом на info@drillharmony.com</label>'
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
  } else flash('Готово! Добро пожаловать на форум.');
  redirect(url(''));
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
function profile($name) {
  $u = one('SELECT * FROM users WHERE name=?', [$name]);
  if (!$u) return;
  $ps = q('SELECT p.id, p.body, p.created, t.title FROM posts p JOIN topics t ON t.id=p.topic_id WHERE p.user_id=? AND p.deleted=0 AND t.deleted=0 ORDER BY p.id DESC LIMIT 15', [$u['id']])->fetchAll();
  $likes = (int)val('SELECT COALESCE(SUM(likes),0) FROM posts WHERE user_id=? AND deleted=0', [$u['id']]);
  $self = me() && me()['id'] == $u['id'];
  $m = '<div class="f-profile f-box">' . avatar($u, 72) . '<div><h1>' . h($u['name']) . ' ' . role_badge($u) . '</h1><p class="f-sub">' . h($u['title'] ?: 'Участник') . '</p>'
     . '<p class="f-pstats"><span><b>' . (int)$u['posts'] . '</b> ' . plural($u['posts'], 'сообщение', 'сообщения', 'сообщений') . '</span><span><b>' . $likes . '</b> «спасибо»</span><span>на форуме с ' . date('d.m.Y', $u['created']) . '</span></p>'
     . ($u['about'] ? '<div class="f-body">' . render($u['about']) . '</div>' : '') . ($self ? '<a class="btn" href="' . h(url('me')) . '">Изменить профиль</a>' : '') . '</div></div>';
  $m .= '<section class="f-box"><h2>Последние сообщения</h2>';
  if (!$ps) $m .= '<p class="f-muted">Пока нет сообщений.</p>';
  foreach ($ps as $p) $m .= '<div class="f-hit"><a href="' . h(url('post/' . $p['id'])) . '">' . h($p['title']) . '</a><p>' . h(mb_strimwidth(preg_replace('/\s+/u', ' ', $p['body']), 0, 200, '…')) . '</p><small>' . ago($p['created']) . '</small></div>';
  $m .= '</section>';
  page($u['name'] . ' | Участник форума', $m, '', crumbs($u['name']), $u['posts'] == 0);
}
function me_form($msg = '') {
  need_login(); $u = me();
  $m = '<div class="f-auth"><div class="f-box f-form"><h1>Профиль</h1>' . flash() . ($msg ? '<div class="f-flash warn">' . h($msg) . '</div>' : '')
     . '<form method="post" action="' . h(url('me')) . '">' . csrf_field()
     . '<label>Должность<input name="title" maxlength="60" value="' . h($u['title']) . '"></label>'
     . '<label>О себе<textarea name="about" rows="5" maxlength="1500">' . h($u['about']) . '</textarea><small>Опыт, регион, интересы. Без телефонов и личных данных</small></label>'
     . '<h2>Смена пароля</h2><label>Текущий пароль<input name="old" type="password" autocomplete="current-password"></label><label>Новый пароль<input name="new" type="password" minlength="8" autocomplete="new-password"></label>'
     . '<div class="f-actions"><button class="btn pri" type="submit">Сохранить</button><a class="btn" href="' . h(url('u/' . rawurlencode($u['name']))) . '">Мой профиль</a></div></form></div></div>';
  page('Профиль', $m, '', crumbs('Профиль'), true);
}
function save_me() {
  need_login(); $u = me();
  q('UPDATE users SET title=?, about=? WHERE id=?', [txt('title', 60), txt('about', 1500), $u['id']]);
  $new = (string)($_POST['new'] ?? '');
  if ($new !== '') {
    if (!password_verify((string)($_POST['old'] ?? ''), $u['pass'])) me_form('Текущий пароль указан неверно, пароль не изменён.');
    if (mb_strlen($new) < 8) me_form('Новый пароль должен быть не короче 8 символов.');
    q('UPDATE users SET pass=? WHERE id=?', [password_hash($new, PASSWORD_DEFAULT), $u['id']]);
  }
  flash('Профиль сохранён.');
  redirect(url('me'));
}

function search() {
  $q = trim(mb_substr((string)($_GET['q'] ?? ''), 0, 80));
  $m = '<div class="f-head"><h1>Поиск по форуму</h1></div><form class="f-box f-searchbig" method="get" action="' . h(url('search')) . '">' . (strpos(url('search'), '?r=') !== false ? '<input type="hidden" name="r" value="search">' : '')
     . '<input type="search" name="q" value="' . h($q) . '" placeholder="Например: реактивный момент" autofocus><button class="btn pri" type="submit">Найти</button></form>';
  if (mb_strlen($q) >= 3) {
    $like = '%' . str_replace(['%', '_'], ['\%', '\_'], $q) . '%';
    $rows = q("SELECT p.id, p.body, p.created, t.title, u.name FROM posts p JOIN topics t ON t.id=p.topic_id JOIN users u ON u.id=p.user_id
               WHERE p.deleted=0 AND t.deleted=0 AND (t.title LIKE ? ESCAPE '\\' OR p.body LIKE ? ESCAPE '\\') ORDER BY p.id DESC LIMIT 50", [$like, $like])->fetchAll();
    // SQLite LIKE без учёта регистра работает только для латиницы — досеиваем кириллицу вручную
    $ql = mb_strtolower($q);
    if (!$rows) {
      $rows = array_values(array_filter(q('SELECT p.id, p.body, p.created, t.title, u.name FROM posts p JOIN topics t ON t.id=p.topic_id JOIN users u ON u.id=p.user_id WHERE p.deleted=0 AND t.deleted=0 ORDER BY p.id DESC LIMIT 3000')->fetchAll(),
        fn($r) => mb_strpos(mb_strtolower($r['title'] . ' ' . $r['body']), $ql) !== false));
      $rows = array_slice($rows, 0, 50);
    }
    $m .= '<section class="f-box"><h2>' . ($rows ? 'Найдено: ' . count($rows) : 'Ничего не нашлось') . '</h2>';
    foreach ($rows as $r) {
      $plain = preg_replace('/\s+/u', ' ', $r['body']); $pos = mb_stripos($plain, $q); $start = max(0, ($pos === false ? 0 : $pos) - 60);
      $snip = h(($start ? '…' : '') . mb_substr($plain, $start, 220) . '…');
      $snip = preg_replace('/(' . preg_quote(h($q), '/') . ')/iu', '<mark>$1</mark>', $snip);
      $m .= '<div class="f-hit"><a href="' . h(url('post/' . $r['id'])) . '">' . h($r['title']) . '</a><p>' . $snip . '</p><small>' . h($r['name']) . ' · ' . ago($r['created']) . '</small></div>';
    }
    $m .= '</section>';
  } elseif ($q !== '') $m .= '<p class="f-muted">Введите хотя бы три символа.</p>';
  page('Поиск по форуму', $m, '', crumbs('Поиск'), true);
}
