<?php
// Форум DrillHarmony: главная, списки тем, тема, теги, рейтинг, бейджи, уведомления, профиль, поиск.
if (!defined('FORUM')) { http_response_code(403); exit; }

const NOSOLVE = "'kb','about'";   // разделы, где «решение» не отмечают

// ===================== главная =====================
function home() {
  $cats = q("SELECT c.*, (SELECT COUNT(*) FROM topics t WHERE t.cat_id=c.id AND t.deleted=0) topics,
                    (SELECT COUNT(*) FROM posts p JOIN topics t ON t.id=p.topic_id WHERE t.cat_id=c.id AND p.deleted=0 AND t.deleted=0) posts,
                    (SELECT COUNT(*) FROM topics t WHERE t.cat_id=c.id AND t.deleted=0 AND t.solved_post IS NOT NULL) solved,
                    (SELECT t.id FROM topics t WHERE t.cat_id=c.id AND t.deleted=0 ORDER BY t.last_at DESC LIMIT 1) last_tid
             FROM cats c ORDER BY c.ord")->fetchAll();
  $groups = [];
  foreach ($cats as $c) $groups[$c['grp']][] = $c;
  $m = '<div class="f-head"><div><h1>Форум DrillHarmony</h1><p class="f-sub">Вопросы, опыт и разборы задач: траектория, слайд, телеметрия, геонавигация, режимы бурения, ГТИ, данные и карьера.</p></div>'
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
  page('Форум DrillHarmony', $m, 'Форум DrillHarmony о наклонно-направленном бурении и ГТИ: траектория, слайд и КНБК, телеметрия, геонавигация, режимы бурения, данные, обучение и карьера.', crumbs());
}

function side_box() {
  $s = '';
  if (!me()) $s .= '<div class="f-box f-join"><h3>Присоединяйтесь</h3><p>Задавайте вопросы, отвечайте коллегам и получайте репутацию и бейджи за полезные ответы.</p><a class="btn pri" href="' . h(url('register')) . '">Зарегистрироваться</a></div>';
  $open = q("SELECT t.id, t.title, t.created, c.name cname FROM topics t JOIN cats c ON c.id=t.cat_id WHERE t.deleted=0 AND t.locked=0 AND c.slug NOT IN (" . NOSOLVE . ") AND " . open_sql() . " ORDER BY t.created DESC LIMIT 5")->fetchAll();
  if ($open) {
    $s .= '<div class="f-box f-help"><h3>Помогите ответить</h3><ul class="f-recent">';
    foreach ($open as $t) $s .= '<li><a href="' . h(url('t/' . $t['id'])) . '">' . h($t['title']) . '</a><small>' . h($t['cname']) . ' · ' . ago($t['created']) . '</small></li>';
    $s .= '</ul><a class="f-more" href="' . h(url('latest', ['f' => 'open'])) . '">Все темы без ответа</a></div>';
  }
  $top = leaders(time() - 30 * 86400, 5);
  $top = array_values(array_filter($top, fn($u) => $u['rep'] > 0));
  $s .= '<div class="f-box"><h3>Лучшие за 30 дней</h3>';
  if (!$top) $s .= '<p class="f-muted">Пока никого. Первое «Спасибо» за ответ даёт +' . REP_LIKE . ' к репутации, решение +' . REP_SOLVED . '.</p>';
  else { $s .= '<ol class="f-lead">'; foreach ($top as $u) $s .= '<li>' . avatar($u, 26) . '<a href="' . h(url('u/' . rawurlencode($u['name']))) . '">' . h($u['name']) . '</a><b>+' . (int)$u['rep'] . '</b></li>'; $s .= '</ol>'; }
  $s .= '<a class="f-more" href="' . h(url('top')) . '">Рейтинг участников</a></div>';
  $tags = q('SELECT name, n FROM tags WHERE n>0 ORDER BY n DESC, name LIMIT 24')->fetchAll();
  if ($tags) {
    $s .= '<div class="f-box"><h3>Популярные теги</h3><div class="f-cloud">';
    foreach ($tags as $t) $s .= '<a class="f-tag" href="' . h(tag_url($t['name'])) . '">' . h($t['name']) . '<i>' . (int)$t['n'] . '</i></a>';
    $s .= '</div><a class="f-more" href="' . h(url('tags')) . '">Все теги</a></div>';
  }
  $st = one("SELECT (SELECT COUNT(*) FROM users WHERE pass<>'!') u, (SELECT COUNT(*) FROM topics WHERE deleted=0) t, (SELECT COUNT(*) FROM posts WHERE deleted=0) p, (SELECT COUNT(*) FROM topics WHERE deleted=0 AND solved_post IS NOT NULL) s");
  $s .= '<div class="f-box f-stats"><div><b>' . (int)$st['t'] . '</b>' . plural($st['t'], 'тема', 'темы', 'тем') . '</div><div><b>' . (int)$st['p'] . '</b>' . plural($st['p'], 'сообщение', 'сообщения', 'сообщений') . '</div><div><b>' . (int)$st['s'] . '</b>' . plural($st['s'], 'решение', 'решения', 'решений') . '</div><div><b>' . (int)$st['u'] . '</b>' . plural($st['u'], 'участник', 'участника', 'участников') . '</div></div>';
  $s .= '<div class="f-box"><h3>Перед тем как писать</h3><p>Не публикуйте данные заказчиков и названия скважин без разрешения, обсуждайте осложнения обезличенно. <a href="' . h(url('rules')) . '">Правила форума</a></p></div>';
  return $s;
}

// ===================== списки тем =====================
// «ждёт ответа»: никто, кроме автора и бота, ещё не ответил
function open_sql() { return "NOT EXISTS (SELECT 1 FROM posts p JOIN users pu ON pu.id=p.user_id WHERE p.topic_id=t.id AND p.deleted=0 AND p.user_id<>t.user_id AND pu.role<>'bot')"; }
function list_filters() {
  $f = $_GET['f'] ?? ''; $s = $_GET['s'] ?? '';
  return [in_array($f, ['open', 'unsolved', 'solved'], true) ? $f : '', in_array($s, ['new', 'views', 'likes'], true) ? $s : ''];
}
function list_controls($base, $extra = []) {
  [$f, $s] = list_filters();
  $F = ['' => 'Все', 'open' => 'Ждут ответа', 'unsolved' => 'Без решения', 'solved' => 'Решённые'];
  $S = ['' => 'Последняя активность', 'new' => 'Новые', 'views' => 'Просмотры', 'likes' => '«Спасибо»'];
  $o = '<div class="f-ctrl"><div class="f-chips" role="group" aria-label="Фильтр">';
  foreach ($F as $k => $t) $o .= '<a class="f-chip' . ($k === $f ? ' on' : '') . '" href="' . h(url($base, array_filter($extra + ['f' => $k, 's' => $s]))) . '">' . $t . '</a>';
  $o .= '</div><form class="f-sort" method="get" action="' . h(url($base)) . '">' . (strpos(url($base), '?r=') !== false ? '<input type="hidden" name="r" value="' . h($base) . '">' : '');
  foreach ($extra + ['f' => $f] as $k => $v) if ($v !== '') $o .= '<input type="hidden" name="' . h($k) . '" value="' . h($v) . '">';
  $o .= '<label>Сортировка <select name="s" onchange="this.form.submit()">';
  foreach ($S as $k => $t) $o .= '<option value="' . $k . '"' . ($k === $s ? ' selected' : '') . '>' . $t . '</option>';
  return $o . '</select></label><noscript><button class="btn">OK</button></noscript></form></div>';
}
function topics_block($where, $params, $base, $extra = [], $pinFirst = false, $showCat = true) {
  global $CFG;
  [$f, $s] = list_filters();
  if ($f === 'open') $where .= " AND t.locked=0 AND c.slug NOT IN (" . NOSOLVE . ") AND " . open_sql();
  if ($f === 'unsolved') $where .= " AND t.solved_post IS NULL AND c.slug NOT IN (" . NOSOLVE . ")";
  if ($f === 'solved') $where .= ' AND t.solved_post IS NOT NULL';
  $order = ['' => 't.last_at DESC', 'new' => 't.created DESC', 'views' => 't.views DESC', 'likes' => 'score DESC, t.last_at DESC'][$s];
  if ($pinFirst && $s === '' && $f === '') $order = 't.pinned DESC, ' . $order;
  $page = max(1, (int)($_GET['p'] ?? 1));
  $total = (int)val("SELECT COUNT(*) FROM topics t JOIN cats c ON c.id=t.cat_id WHERE t.deleted=0 AND $where", $params);
  $ts = q("SELECT t.*, c.name cname, c.slug cslug, u.name author, u.avatar aavatar, lu.name lname,
              (SELECT COALESCE(SUM(likes),0) FROM posts WHERE topic_id=t.id AND deleted=0) score
           FROM topics t JOIN cats c ON c.id=t.cat_id JOIN users u ON u.id=t.user_id LEFT JOIN users lu ON lu.id=t.last_user
           WHERE t.deleted=0 AND $where ORDER BY $order LIMIT " . (int)$CFG['per_page'] . ' OFFSET ' . (($page - 1) * (int)$CFG['per_page']), $params)->fetchAll();
  if (!$ts) return ['<div class="f-box f-empty"><p>' . ($f ? 'Под этот фильтр тем нет.' : 'Тем пока нет.') . '</p></div>', 0];
  return [topic_rows($ts, $showCat) . pager($total, $page, $base, array_filter($extra + ['f' => $f, 's' => $s])), $total];
}
function topic_rows($ts, $showCat = true) {
  $tags = tags_of(array_column($ts, 'id'));
  $o = '<div class="f-topics" role="list">';
  foreach ($ts as $t) {
    $o .= '<div class="f-topic' . ($t['solved_post'] ? ' solved' : '') . '" role="listitem"><div class="f-topic-t"><a href="' . h(url('t/' . $t['id'])) . '">'
        . ($t['pinned'] ? '<i class="f-pin">Закреплено</i>' : '') . ($t['locked'] ? '<i class="f-lock">Закрыто</i>' : '') . ($t['solved_post'] ? '<i class="f-solved">Решено</i>' : '') . h($t['title']) . '</a>'
        . '<div class="f-topic-m">' . avatar(['name' => $t['author'], 'avatar' => $t['aavatar']], 20) . '<span>' . h($t['author']) . ' · ' . ago($t['created']) . '</span>'
        . ($showCat ? '<a class="f-topic-c" href="' . h(url('c/' . $t['cslug'])) . '">' . h($t['cname']) . '</a>' : '') . tag_chips($tags[$t['id']] ?? []) . '</div></div>'
        . '<div class="f-topic-n"><b>' . (int)$t['replies'] . '</b> ' . plural($t['replies'], 'ответ', 'ответа', 'ответов') . '<small>' . (int)$t['views'] . ' ' . plural($t['views'], 'просмотр', 'просмотра', 'просмотров') . '</small>' . ($t['score'] ? '<small>' . (int)$t['score'] . ' «спасибо»</small>' : '') . '</div>'
        . '<div class="f-topic-l">' . h($t['lname']) . '<small>' . ago($t['last_at']) . '</small></div></div>';
  }
  return $o . '</div>';
}

function category($slug) {
  $c = one('SELECT * FROM cats WHERE slug=?', [$slug]);
  if (!$c) return;
  $canNew = me() && (!$c['admin_only'] || is_mod());
  $m = '<div class="f-head"><div><h1>' . h($c['name']) . '</h1><p class="f-sub">' . h($c['descr']) . '</p></div>'
     . ($canNew ? '<a class="btn pri" href="' . h(url('new', ['c' => $c['slug']])) . '">Новая тема</a>' : (!me() && !$c['admin_only'] ? '<a class="btn" href="' . h(url('login', ['next' => url('new', ['c' => $c['slug']])])) . '">Войдите, чтобы создать тему</a>' : '')) . '</div>' . flash();
  $tg = q('SELECT g.name, COUNT(*) n FROM topic_tags tt JOIN tags g ON g.id=tt.tag_id JOIN topics t ON t.id=tt.topic_id WHERE t.cat_id=? AND t.deleted=0 GROUP BY g.id ORDER BY n DESC, g.name LIMIT 14', [$c['id']])->fetchAll();
  if ($tg) $m .= '<div class="f-cloud f-cloud-line">' . implode('', array_map(fn($t) => '<a class="f-tag" href="' . h(tag_url($t['name'])) . '">' . h($t['name']) . '<i>' . (int)$t['n'] . '</i></a>', $tg)) . '</div>';
  if (!in_array($slug, ['kb', 'about'], true)) $m .= list_controls('c/' . $c['slug']);
  [$list] = topics_block('t.cat_id=?', [$c['id']], 'c/' . $c['slug'], [], true, false);
  page($c['name'] . ' | Форум', $m . $list, $c['descr'], crumbs($c['name']));
}

function latest() {
  [$f] = list_filters();
  $title = ['' => 'Лента обсуждений', 'open' => 'Ждут ответа', 'unsolved' => 'Вопросы без решения', 'solved' => 'Решённые вопросы'][$f];
  $sub = ['' => 'Все темы форума по последней активности.', 'open' => 'Темы, в которых ещё никто не ответил автору. Хороший ответ здесь быстрее всего приносит «Спасибо» и отметку решения.', 'unsolved' => 'Автор ещё не отметил ответ как решение.', 'solved' => 'Темы с отмеченным решением: удобно искать готовые ответы.'][$f];
  $m = '<div class="f-head"><div><h1>' . $title . '</h1><p class="f-sub">' . $sub . '</p></div>' . (me() ? '<a class="btn pri" href="' . h(url('new')) . '">Новая тема</a>' : '') . '</div>' . flash() . list_controls('latest');
  [$list] = topics_block('1=1', [], 'latest');
  page($title . ' | Форум', $m . $list, $sub, crumbs($title), $f !== '');
}

function tag_page($name) {
  $g = one('SELECT * FROM tags WHERE name=?', [tag_norm($name)]);
  if (!$g) return;
  $rel = q('SELECT g2.name, COUNT(*) n FROM topic_tags a JOIN topic_tags b ON b.topic_id=a.topic_id AND b.tag_id<>a.tag_id JOIN tags g2 ON g2.id=b.tag_id WHERE a.tag_id=? GROUP BY g2.id ORDER BY n DESC LIMIT 10', [$g['id']])->fetchAll();
  $m = '<div class="f-head"><div><h1><span class="f-hash">#</span>' . h($g['name']) . '</h1><p class="f-sub">' . (int)$g['n'] . ' ' . plural($g['n'], 'тема', 'темы', 'тем') . ' с этим тегом.' . ($rel ? ' Рядом: ' . tag_chips(array_column($rel, 'name'), 'inl') : '') . '</p></div>'
     . (me() ? '<a class="btn pri" href="' . h(url('new', ['tags' => $g['name']])) . '">Новая тема с тегом</a>' : '') . '</div>';
  $m .= list_controls('tag/' . rawurlencode($g['name']));
  [$list] = topics_block('t.id IN (SELECT topic_id FROM topic_tags WHERE tag_id=?)', [$g['id']], 'tag/' . rawurlencode($g['name']));
  page('#' . $g['name'] . ' | Форум', $m . $list, 'Темы форума DrillHarmony с тегом «' . $g['name'] . '».', crumbs(['Теги', url('tags')], $g['name']));
}

function tags_page() {
  $all = q('SELECT name, n FROM tags WHERE n>0 ORDER BY name')->fetchAll();
  $m = '<div class="f-head"><div><h1>Теги</h1><p class="f-sub">Теги связывают темы из разных разделов: например, «эцп» встречается и в бурении, и в ГТИ. Нажмите на тег, чтобы увидеть все темы.</p></div></div>';
  $m .= '<div class="f-box"><input class="f-tagfilter" type="search" placeholder="Найти тег" aria-label="Найти тег" data-filter=".f-tagall .f-tag">';
  if (!$all) $m .= '<p class="f-muted">Тегов пока нет.</p>';
  else {
    $max = max(array_column($all, 'n'));
    $m .= '<div class="f-cloud f-tagall">';
    foreach ($all as $t) $m .= '<a class="f-tag sz' . (int)min(4, ceil($t['n'] * 4 / $max)) . '" href="' . h(tag_url($t['name'])) . '">' . h($t['name']) . '<i>' . (int)$t['n'] . '</i></a>';
    $m .= '</div>';
  }
  page('Теги | Форум', $m . '</div>', 'Все теги форума DrillHarmony: toolface, ЭЦП, геонавигация, телесистемы, ГТИ и другие.', crumbs('Теги'));
}

// ===================== тема =====================
function topic($id) {
  global $CFG;
  $t = one('SELECT t.*, c.name cname, c.slug cslug FROM topics t JOIN cats c ON c.id=t.cat_id WHERE t.id=?', [$id]);
  if (!$t || ($t['deleted'] && !is_mod())) return;
  if (empty($_SESSION['seen'][$id])) { q('UPDATE topics SET views=views+1 WHERE id=?', [$id]); $_SESSION['seen'][$id] = 1; }
  $total = (int)val('SELECT COUNT(*) FROM posts WHERE topic_id=? AND deleted=0', [$id]);
  $pages = max(1, (int)ceil($total / $CFG['per_page']));
  $page = isset($_GET['p']) && $_GET['p'] === 'last' ? $pages : max(1, min($pages, (int)($_GET['p'] ?? 1)));
  $ps = q('SELECT p.*, u.name, u.title utitle, u.role, u.posts uposts, u.created ucreated, u.avatar, u.rep FROM posts p JOIN users u ON u.id=p.user_id
           WHERE p.topic_id=? AND (p.deleted=0 OR ?) ORDER BY p.id LIMIT ? OFFSET ?', [$id, is_mod() ? 1 : 0, $CFG['per_page'], ($page - 1) * $CFG['per_page']])->fetchAll();
  $me = me();
  $liked = $me ? array_column(q('SELECT l.post_id FROM likes l JOIN posts p ON p.id=l.post_id WHERE l.user_id=? AND p.topic_id=?', [$me['id'], $id])->fetchAll(), 'post_id') : [];
  $tags = tags_of([$id])[$id] ?? [];
  $canSolve = $me && !in_array($t['cslug'], ['kb', 'about'], true) && ($me['id'] == $t['user_id'] || is_mod());
  $m = '<div class="f-head"><div><h1>' . ($t['solved_post'] ? '<i class="f-solved big">Решено</i>' : '') . h($t['title']) . '</h1><p class="f-sub"><a href="' . h(url('c/' . $t['cslug'])) . '">' . h($t['cname']) . '</a> · ' . (int)$t['replies'] . ' ' . plural($t['replies'], 'ответ', 'ответа', 'ответов') . ' · ' . (int)$t['views'] . ' ' . plural($t['views'], 'просмотр', 'просмотра', 'просмотров') . '</p>' . tag_chips($tags) . '</div>';
  if (is_mod()) {
    $m .= '<form method="post" action="' . h(url('modact')) . '" class="f-modbar">' . csrf_field() . '<input type="hidden" name="tid" value="' . $id . '">'
        . '<button name="a" value="pin">' . ($t['pinned'] ? 'Открепить' : 'Закрепить') . '</button><button name="a" value="lock">' . ($t['locked'] ? 'Открыть' : 'Закрыть') . '</button>'
        . '<button name="a" value="deltopic" class="danger" data-confirm="Удалить тему целиком?">Удалить тему</button></form>';
  }
  $m .= '</div>' . flash();
  if ($t['solved_post'] && $page == 1 && ($sp = one('SELECT p.id, p.body, u.name FROM posts p JOIN users u ON u.id=p.user_id WHERE p.id=? AND p.deleted=0', [$t['solved_post']])))
    $m .= '<a class="f-solution-link" href="' . h(url('post/' . $sp['id'])) . '"><b>Решение от ' . h($sp['name']) . '</b><span>' . h(mb_strimwidth(plain_text($sp['body']), 0, 180, '…')) . '</span></a>';
  elseif ($canSolve && $me['id'] == $t['user_id'] && $t['replies'] > 0 && $page == 1) $m .= '<p class="f-tip">Помог чей-то ответ? Нажмите «Это решение» под ним: автор получит +' . REP_SOLVED . ' к репутации, а тема попадёт в «Решённые».</p>';
  $m .= pager($total, $page, 't/' . $id);
  $first = (int)val('SELECT MIN(id) FROM posts WHERE topic_id=?', [$id]);
  foreach ($ps as $p) {
    $own = $me && $me['id'] == $p['user_id'];
    $isSol = $t['solved_post'] == $p['id'];
    $m .= '<article class="f-post' . ($p['deleted'] ? ' del' : '') . ($p['id'] == $first ? ' first' : '') . ($isSol ? ' sol' : '') . '" id="p' . $p['id'] . '">'
        . ($isSol ? '<div class="f-sol-tag">Решение</div>' : '')
        . '<div class="f-post-h">' . avatar($p, 40) . '<div><a class="f-name" href="' . h(url('u/' . rawurlencode($p['name']))) . '">' . h($p['name']) . '</a>' . role_badge($p) . level_chip($p)
        . '<small>' . h($p['utitle'] ?: 'Участник') . ($p['role'] !== 'bot' ? ' · ' . (int)$p['rep'] . ' реп. · ' . (int)$p['uposts'] . ' ' . plural($p['uposts'], 'сообщение', 'сообщения', 'сообщений') : '') . '</small></div>'
        . '<a class="f-date" href="#p' . $p['id'] . '">' . ago($p['created']) . ($p['edited'] ? ' · изменено' : '') . '</a></div>'
        . '<div class="f-body">' . ($p['deleted'] ? '<p class="f-muted">Сообщение удалено модератором.</p>' : render($p['body'])) . '</div>';
    if (!$p['deleted']) {
      $m .= '<div class="f-post-f">';
      if ($me && !$own) $m .= '<form method="post" action="' . h(url('like')) . '" class="f-inline f-likef">' . csrf_field() . '<input type="hidden" name="pid" value="' . $p['id'] . '"><button class="f-like' . (in_array($p['id'], $liked) ? ' on' : '') . '" type="submit" aria-pressed="' . (in_array($p['id'], $liked) ? 'true' : 'false') . '">' . like_icon() . '<span>Спасибо</span><b>' . ($p['likes'] ? (int)$p['likes'] : '') . '</b></button></form>';
      elseif ($p['likes']) $m .= '<span class="f-like-n">' . like_icon() . 'Спасибо · ' . (int)$p['likes'] . '</span>';
      if ($canSolve && $p['id'] != $first && $p['user_id'] != $t['user_id'])
        $m .= '<form method="post" action="' . h(url('solve')) . '" class="f-inline">' . csrf_field() . '<input type="hidden" name="pid" value="' . $p['id'] . '"><button class="f-solve' . ($isSol ? ' on' : '') . '" type="submit">' . ($isSol ? 'Снять отметку решения' : 'Это решение') . '</button></form>';
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
  elseif (!$me) $m .= '<div class="f-box f-cta"><p>Чтобы ответить, <a href="' . h(url('login', ['next' => url('t/' . $id, ['p' => 'last'])])) . '">войдите</a> или <a href="' . h(url('register')) . '">зарегистрируйтесь</a>. За полезные ответы участники получают репутацию и бейджи.</p></div>';
  elseif ($why = can_post()) $m .= '<div class="f-box f-warn">' . $why . '</div>';
  else $m .= '<form class="f-box f-form" method="post" action="' . h(url('reply')) . '" id="reply">' . csrf_field() . '<input type="hidden" name="tid" value="' . $id . '"><h2>Ваш ответ</h2>' . editor('body', '') . '<div class="f-actions"><button class="btn pri" type="submit">Ответить</button><small class="f-hint">«Спасибо» за ответ: +' . REP_LIKE . ' к репутации, отметка решения: +' . REP_SOLVED . '</small></div></form>';
  if ($sim = similar_topics($t, $tags)) {
    $m .= '<section class="f-box f-similar"><h2>Похожие темы</h2><ul class="f-recent">';
    foreach ($sim as $s) $m .= '<li><a href="' . h(url('t/' . $s['id'])) . '">' . ($s['solved_post'] ? '<i class="f-solved">Решено</i>' : '') . h($s['title']) . '</a><small>' . h($s['cname']) . ' · ' . (int)$s['replies'] . ' ' . plural($s['replies'], 'ответ', 'ответа', 'ответов') . '</small></li>';
    $m .= '</ul></section>';
  }
  $m .= '<p class="f-note">Ответы на форуме — мнение участников. Решения на буровой принимаются по инструкциям компании и программе на бурение.</p>';
  $fb = one('SELECT body FROM posts WHERE topic_id=? ORDER BY id LIMIT 1', [$id]);
  page($t['title'] . ' | Форум', $m, mb_strimwidth(preg_replace('/\s+/u', ' ', strip_tags(render($fb['body'] ?? ''))), 0, 180, '…'), crumbs([$t['cname'], url('c/' . $t['cslug'])], $t['title']), (bool)$t['deleted']);
}
function like_icon() { return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 11v8H4v-8zM7 11l4-7a2 2 0 0 1 2.5 2.4L13 10h5.5a2 2 0 0 1 2 2.3l-1 6A2 2 0 0 1 17.5 20H7"/></svg>'; }

function similar_topics($t, $tags) {
  $ids = [];
  if ($tags) {
    $in = implode(',', array_fill(0, count($tags), '?'));
    $ids = q("SELECT tt.topic_id FROM topic_tags tt JOIN tags g ON g.id=tt.tag_id JOIN topics t ON t.id=tt.topic_id WHERE g.name IN ($in) AND tt.topic_id<>? AND t.deleted=0 GROUP BY tt.topic_id ORDER BY COUNT(*) DESC, t.solved_post IS NULL, t.last_at DESC LIMIT 6", array_merge($tags, [$t['id']]))->fetchAll(PDO::FETCH_COLUMN);
  }
  if (count($ids) < 6 && fts_ok() && ($terms = array_filter(g_terms($t['title']), fn($w) => mb_strlen($w) > 3))) {
    $mq = 'title : (' . implode(' OR ', array_map(fn($w) => '"' . g_stem($w) . '"*', $terms)) . ')';
    try {
      foreach (q('SELECT p.topic_id FROM post_fts JOIN posts p ON p.id=post_fts.rowid JOIN topics t ON t.id=p.topic_id WHERE post_fts MATCH ? AND p.topic_id<>? AND t.deleted=0 ORDER BY bm25(post_fts) LIMIT 10', [$mq, $t['id']])->fetchAll(PDO::FETCH_COLUMN) as $x)
        if (!in_array($x, $ids)) $ids[] = $x;
    } catch (Throwable $e) {}
  }
  $ids = array_slice($ids, 0, 6); if (!$ids) return [];
  $rows = q('SELECT t.id, t.title, t.replies, t.solved_post, c.name cname FROM topics t JOIN cats c ON c.id=t.cat_id WHERE t.id IN (' . implode(',', array_map('intval', $ids)) . ')')->fetchAll();
  usort($rows, fn($a, $b) => array_search($a['id'], $ids) <=> array_search($b['id'], $ids));
  return $rows;
}

// ===================== создание и правка =====================
function tags_field($value) {
  $pop = q('SELECT name FROM tags WHERE n>0 ORDER BY n DESC LIMIT 60')->fetchAll(PDO::FETCH_COLUMN);
  return '<label>Теги, до пяти через запятую<span class="f-tagin"><input name="tags" maxlength="160" value="' . h($value) . '" list="f-taglist" placeholder="например: toolface, взд, реактивный момент" autocomplete="off">'
    . '<button type="button" class="btn f-tagsug" data-url="' . h(url('tagsuggest')) . '">Подобрать</button></span><small>Теги помогают найти тему из других разделов. «Подобрать» предложит теги по тексту</small></label>'
    . '<datalist id="f-taglist">' . implode('', array_map(fn($n) => '<option value="' . h($n) . '">', $pop)) . '</datalist>';
}
function new_topic_form($slug, $err = '', $title = '', $body = '', $tags = null) {
  need_login();
  if ($why = can_post()) { page('Новая тема', '<div class="f-box f-warn">' . $why . '</div>', '', crumbs('Новая тема'), true); }
  $cats = q('SELECT * FROM cats ' . (is_mod() ? '' : 'WHERE admin_only=0') . ' ORDER BY ord')->fetchAll();
  $opt = ''; $grp = '';
  foreach ($cats as $c) {
    if ($c['grp'] !== $grp) { $opt .= ($grp ? '</optgroup>' : '') . '<optgroup label="' . h($c['grp']) . '">'; $grp = $c['grp']; }
    $opt .= '<option value="' . h($c['slug']) . '"' . ($c['slug'] === $slug ? ' selected' : '') . '>' . h($c['name']) . '</option>';
  }
  $opt .= '</optgroup>';
  $m = '<div class="f-head"><h1>Новая тема</h1></div>' . ($err ? '<div class="f-flash warn">' . h($err) . '</div>' : '')
     . '<form class="f-box f-form" method="post" action="' . h(url('new')) . '">' . csrf_field()
     . '<label>Раздел<select name="c" required>' . $opt . '</select></label>'
     . '<label>Заголовок<input name="title" required minlength="5" maxlength="140" value="' . h($title) . '" placeholder="Коротко о сути вопроса"></label>'
     . '<label>Сообщение</label>' . editor('body', $body, 12)
     . tags_field($tags ?? (string)($_GET['tags'] ?? ''))
     . '<p class="f-hint">Без названий скважин, месторождений и данных заказчика без разрешения. <a href="' . h(url('rules')) . '" target="_blank">Правила</a></p>'
     . '<div class="f-actions"><button class="btn pri" type="submit">Создать тему</button></div></form>';
  page('Новая тема | Форум', $m, '', crumbs('Новая тема'), true);
}
function create_topic() {
  need_login(); if (can_post()) redirect(url('new'));
  $me = me();
  $c = one('SELECT * FROM cats WHERE slug=?', [$_POST['c'] ?? '']);
  $title = txt('title', 140); $body = txt('body', 20000); $tags = txt('tags', 160);
  if (!$c || ($c['admin_only'] && !is_mod())) new_topic_form('', 'Выберите раздел.', $title, $body, $tags);
  if (mb_strlen($title) < 5) new_topic_form($c['slug'], 'Заголовок слишком короткий.', $title, $body, $tags);
  if (mb_strlen($body) < 10) new_topic_form($c['slug'], 'Сообщение слишком короткое.', $title, $body, $tags);
  if (!is_mod() && !rate('topic:' . $me['id'], 5, 3600)) new_topic_form($c['slug'], 'Не больше пяти тем в час. Попробуйте позже.', $title, $body, $tags);
  $now = time();
  q('INSERT INTO topics (cat_id, user_id, title, created, last_at, last_user) VALUES (?,?,?,?,?,?)', [$c['id'], $me['id'], $title, $now, $now, $me['id']]);
  $tid = (int)db()->lastInsertId();
  q('INSERT INTO posts (topic_id, user_id, body, created, ip) VALUES (?,?,?,?,?)', [$tid, $me['id'], $body, $now, ip()]);
  fts_put((int)db()->lastInsertId());
  q('UPDATE users SET posts=posts+1 WHERE id=?', [$me['id']]);
  tags_set($tid, tags_parse($tags) ?: tags_suggest($title . "\n" . $body, 3));
  badges_check($me['id']);
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
  $pid = (int)db()->lastInsertId();
  fts_put($pid);
  q('UPDATE topics SET replies=replies+1, last_at=?, last_user=? WHERE id=?', [$now, $me['id'], $tid]);
  q('UPDATE users SET posts=posts+1 WHERE id=?', [$me['id']]);
  note((int)$t['user_id'], 'reply', $me['id'], $tid, $pid);
  badges_check($me['id']);
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
      if ($first) {
        if (mb_strlen($nt = txt('title', 140)) >= 5) q('UPDATE topics SET title=? WHERE id=?', [$nt, $p['tid']]);
        tags_set((int)$p['tid'], tags_parse(txt('tags', 160)));
      }
      fts_put($pid);
      badges_check((int)$p['user_id']);
    }
    goto_post($pid);
  }
  $cur = implode(', ', tags_of([$p['tid']])[$p['tid']] ?? []);
  $m = '<div class="f-head"><h1>Изменить сообщение</h1></div><form class="f-box f-form" method="post" action="' . h(url('edit/' . $pid)) . '">' . csrf_field()
     . ($first ? '<label>Заголовок темы<input name="title" required minlength="5" maxlength="140" value="' . h($p['title']) . '"></label>' : '')
     . editor('body', $p['body'], 12) . ($first ? tags_field($cur) : '')
     . '<div class="f-actions"><button class="btn pri" type="submit">Сохранить</button><a class="btn" href="' . h(url('post/' . $pid)) . '">Отмена</a></div></form>';
  page('Изменить сообщение', $m, '', crumbs([$p['title'], url('t/' . $p['tid'])], 'Изменить'), true);
}
function tag_suggest_json() {
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['tags' => tags_suggest(txt('title', 140) . "\n" . txt('body', 20000), 5)], JSON_UNESCAPED_UNICODE); exit;
}

// ===================== «Спасибо» и решение =====================
function is_ajax() { return ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') === 'fetch'; }
function like() {
  need_login(); $me = me(); $pid = (int)($_POST['pid'] ?? 0);
  $p = one('SELECT * FROM posts WHERE id=? AND deleted=0', [$pid]);
  $on = false;
  if ($p && $p['user_id'] != $me['id'] && rate('like:' . $me['id'], 120, 3600)) {
    if (one('SELECT 1 FROM likes WHERE post_id=? AND user_id=?', [$pid, $me['id']])) { q('DELETE FROM likes WHERE post_id=? AND user_id=?', [$pid, $me['id']]); q('UPDATE posts SET likes=MAX(0, likes-1) WHERE id=?', [$pid]); }
    else { q('INSERT INTO likes (post_id, user_id, created) VALUES (?,?,?)', [$pid, $me['id'], time()]); q('UPDATE posts SET likes=likes+1 WHERE id=?', [$pid]); $on = true; note((int)$p['user_id'], 'like', $me['id'], (int)$p['topic_id'], $pid); }
    rep_calc((int)$p['user_id']); badges_check($me['id']);
  }
  if (is_ajax()) { header('Content-Type: application/json'); echo json_encode(['on' => $on, 'n' => (int)val('SELECT likes FROM posts WHERE id=?', [$pid])]); exit; }
  goto_post($pid);
}
function solve() {
  need_login(); $me = me(); $pid = (int)($_POST['pid'] ?? 0);
  $p = one('SELECT p.*, t.user_id tuser, t.solved_post, c.slug cslug FROM posts p JOIN topics t ON t.id=p.topic_id JOIN cats c ON c.id=t.cat_id WHERE p.id=? AND p.deleted=0 AND t.deleted=0', [$pid]);
  if (!$p || in_array($p['cslug'], ['kb', 'about'], true) || !($me['id'] == $p['tuser'] || is_mod()) || $p['user_id'] == $p['tuser']) goto_post($pid);
  $prev = $p['solved_post'] ? (int)val('SELECT user_id FROM posts WHERE id=?', [$p['solved_post']]) : 0;
  if ($p['solved_post'] == $pid) { q('UPDATE topics SET solved_post=NULL, solved_at=NULL WHERE id=?', [$p['topic_id']]); flash('Отметка решения снята.'); }
  else { q('UPDATE topics SET solved_post=?, solved_at=? WHERE id=?', [$pid, time(), $p['topic_id']]); note((int)$p['user_id'], 'solved', $me['id'], (int)$p['topic_id'], $pid); flash('Ответ отмечен как решение. Спасибо, что закрыли вопрос!'); }
  if ($prev) rep_calc($prev);
  rep_calc((int)$p['user_id']);
  goto_post($pid);
}

// ===================== рейтинг, бейджи, уведомления =====================
function top_page() {
  $per = $_GET['per'] ?? ''; $per = in_array($per, ['30', '7'], true) ? $per : '';
  $rows = leaders($per ? time() - (int)$per * 86400 : 0, 50);
  $rows = array_values(array_filter($rows, fn($u) => $u['rep'] > 0));
  $m = '<div class="f-head"><div><h1>Рейтинг участников</h1><p class="f-sub">Репутация растёт, когда ваши ответы помогают: «Спасибо» +' . REP_LIKE . ', ответ отмечен решением +' . REP_SOLVED . '. Сообщения сами по себе очков не дают.</p></div></div>';
  $m .= '<div class="f-chips">';
  foreach (['' => 'За всё время', '30' => 'За 30 дней', '7' => 'За неделю'] as $k => $t) $m .= '<a class="f-chip' . ($k === $per ? ' on' : '') . '" href="' . h(url('top', $k ? ['per' => $k] : [])) . '">' . $t . '</a>';
  $m .= '</div><div class="f-grid"><div class="f-box f-rank">';
  if (!$rows) $m .= '<p class="f-muted">За этот период репутацию ещё никто не получил. Ответьте в теме из списка <a href="' . h(url('latest', ['f' => 'open'])) . '">«Ждут ответа»</a>, и вы можете оказаться первым.</p>';
  else {
    $m .= '<table class="f-ranktab"><thead><tr><th>#</th><th>Участник</th><th>Уровень</th><th>Решения</th><th>' . ($per ? 'Репутация за период' : 'Репутация') . '</th></tr></thead><tbody>';
    foreach ($rows as $i => $u) {
      $lv = level((int)($u['total'] ?? $u['rep']));
      $m .= '<tr' . (me() && me()['id'] == $u['id'] ? ' class="me"' : '') . '><td class="f-place p' . ($i + 1) . '">' . ($i + 1) . '</td><td><a class="f-ru" href="' . h(url('u/' . rawurlencode($u['name']))) . '">' . avatar($u, 32) . '<span>' . h($u['name']) . '<small>' . h($u['title'] ?: 'Участник') . '</small></span></a></td>'
          . '<td><i class="f-lvl l' . $lv['i'] . '">' . h($lv['name']) . '</i></td><td>' . (int)$u['solved'] . '</td><td><b>' . ($per ? '+' : '') . (int)$u['rep'] . '</b></td></tr>';
    }
    $m .= '</tbody></table>';
  }
  $m .= '</div><aside class="f-side">';
  $ex = '';
  foreach (q("SELECT id, name, slug FROM cats WHERE slug NOT IN ('kb','about','offtop') ORDER BY ord")->fetchAll() as $c) {
    $l = array_values(array_filter(leaders(1, 3, $c['id']), fn($u) => $u['rep'] > 0));
    if ($l) $ex .= '<div class="f-exp"><a href="' . h(url('c/' . $c['slug'])) . '">' . h($c['name']) . '</a><ol class="f-lead">' . implode('', array_map(fn($u) => '<li>' . avatar($u, 22) . '<a href="' . h(url('u/' . rawurlencode($u['name']))) . '">' . h($u['name']) . '</a><b>' . (int)$u['rep'] . '</b></li>', $l)) . '</ol></div>';
  }
  $m .= '<div class="f-box"><h3>Эксперты разделов</h3>' . ($ex ?: '<p class="f-muted">Появятся, когда в разделах начнут отмечать решения и благодарить за ответы.</p>') . '</div>';
  $m .= '<div class="f-box"><h3>Уровни</h3><ul class="f-levels">';
  foreach (levels() as $i => $l) $m .= '<li><i class="f-lvl l' . $i . '">' . h($l[1]) . '</i><span>от ' . $l[0] . '</span></li>';
  $m .= '</ul><a class="f-more" href="' . h(url('badges')) . '">Бейджи и как их получить</a></div></aside></div>';
  page('Рейтинг участников | Форум', $m, 'Рейтинг участников форума DrillHarmony: репутация за полезные ответы и решения, эксперты разделов.', crumbs('Рейтинг'));
}
function badges_page() {
  $cnt = []; foreach (q("SELECT CASE WHEN code LIKE 'expert:%' THEN 'expert' ELSE code END k, COUNT(*) n FROM user_badges GROUP BY k")->fetchAll() as $r) $cnt[$r['k']] = (int)$r['n'];
  $mine = me() ? array_column(user_badges(me()['id']), 'code') : [];
  $m = '<div class="f-head"><div><h1>Бейджи</h1><p class="f-sub">Бейджи выдаются автоматически за вклад в форум. Бронзовые даются за первые шаги, серебряные за постоянную помощь, золотые за ответы, к которым возвращаются.</p></div></div>';
  foreach ([1 => 'Бронза', 2 => 'Серебро', 3 => 'Золото'] as $tier => $tn) {
    $m .= '<section class="f-box"><h2>' . $tn . '</h2><div class="f-badges-all">';
    foreach (badge_defs() as $code => $b) if ($b[2] === $tier) {
      $has = $code === 'expert' ? (bool)array_filter($mine, fn($c) => strpos($c, 'expert:') === 0) : in_array($code, $mine, true);
      $m .= '<div class="f-bcard' . ($has ? ' has' : '') . '">' . badge_html($code, 0, true) . '<small>' . ($cnt[$code] ?? 0) . ' ' . plural($cnt[$code] ?? 0, 'участник', 'участника', 'участников') . ($has ? ' · есть у вас' : '') . '</small></div>';
    }
    $m .= '</div></section>';
  }
  $m .= '<p class="f-note">«Знаток раздела» выдаётся отдельно по каждому разделу, например «Знаток: Геонавигация».</p>';
  page('Бейджи | Форум', $m, 'Бейджи форума DrillHarmony: за ответы, решения и помощь коллегам.', crumbs('Бейджи'));
}
function notes_page() {
  need_login(); $me = me();
  $rows = q('SELECT n.*, u.name actor, u.avatar aavatar, t.title FROM notes n LEFT JOIN users u ON u.id=n.actor_id LEFT JOIN topics t ON t.id=n.topic_id WHERE n.user_id=? ORDER BY n.id DESC LIMIT 100', [$me['id']])->fetchAll();
  q('UPDATE notes SET seen=1 WHERE user_id=? AND seen=0', [$me['id']]);
  $m = '<div class="f-head"><div><h1>Уведомления</h1><p class="f-sub">Ответы в ваших темах, «Спасибо», решения и новые бейджи.</p></div></div><div class="f-box f-notes">';
  if (!$rows) $m .= '<p class="f-muted">Пока ничего нового.</p>';
  foreach ($rows as $n) {
    $who = $n['actor'] ? '<b>' . h($n['actor']) . '</b>' : '';
    $tt = $n['title'] ? '«' . h($n['title']) . '»' : '';
    switch ($n['kind']) {
      case 'reply': $txt = $who . ' ответил(а) в вашей теме ' . $tt; $href = url('post/' . $n['post_id']); $ic = 'reply'; break;
      case 'like': $txt = $who . ($n['n'] > 1 ? ' и ещё ' . ($n['n'] - 1) . ' ' . plural($n['n'] - 1, 'участник', 'участника', 'участников') : '') . ' сказал(и) «Спасибо» за ваше сообщение в теме ' . $tt; $href = url('post/' . $n['post_id']); $ic = 'heart'; break;
      case 'solved': $txt = 'Ваш ответ в теме ' . $tt . ' отмечен как решение: +' . REP_SOLVED . ' к репутации'; $href = url('post/' . $n['post_id']); $ic = 'check'; break;
      case 'badge': $b = badge_info($n['extra']); $txt = 'Новый бейдж: <b>' . h($b[0] ?? '') . '</b>. ' . h($b[1] ?? ''); $href = url('u/' . rawurlencode($me['name']), ['tab' => 'badges']); $ic = $b[3] ?? 'star'; break;
      case 'level': $txt = 'Новый уровень: <b>' . h($n['extra']) . '</b>'; $href = url('u/' . rawurlencode($me['name'])); $ic = 'crown'; break;
      default: continue 2;
    }
    $m .= '<a class="f-noteit' . ($n['seen'] ? '' : ' new') . '" href="' . h($href) . '"><span class="f-note-i k-' . h($n['kind']) . '">' . badge_icon($ic) . '</span><span>' . $txt . '<small>' . ago($n['created']) . '</small></span></a>';
  }
  page('Уведомления | Форум', $m . '</div>', '', crumbs('Уведомления'), true);
}

// ===================== профиль =====================
function profile($name) {
  $u = one('SELECT * FROM users WHERE name=?', [$name]);
  if (!$u) return;
  $f = user_fields($u); $me = me(); $self = $me && $me['id'] == $u['id'];
  $acc = profile_accents()[$u['accent'] ?? ''][1] ?? profile_accents()['amber'][1];
  $rs = rep_stats($u['id']); $lv = level((int)$u['rep']);
  $tab = $_GET['tab'] ?? ''; $tab = in_array($tab, ['posts', 'topics', 'solutions', 'badges'], true) ? $tab : '';
  $badges = user_badges($u['id']);
  $cover = $f['cover'] === 'custom' && $u['cover'] ? ' style="background-image:url(' . h($u['cover']) . ')"' : '';
  $m = '<div class="f-pro" style="--acc:' . h($acc) . '"><div class="f-cover cov-' . h($f['cover'] === 'custom' && $u['cover'] ? 'custom' : ($f['cover'] ?: 'strata')) . '"' . $cover . '></div>'
     . '<div class="f-pro-head"><div class="f-pro-ava">' . avatar($u, 112) . '</div><div class="f-pro-id"><h1>' . h($u['name']) . ' ' . role_badge($u) . '</h1>'
     . ($f['status'] ? '<p class="f-status">' . h($f['status']) . '</p>' : '')
     . '<p class="f-pro-line">' . implode(' · ', array_map('h', array_filter([$u['title'] ?: 'Участник', $f['company'], $f['city']]))) . '</p></div>'
     . '<div class="f-pro-act">' . ($self ? '<a class="btn" href="' . h(url('me')) . '">Редактировать профиль</a>' : '') . '</div></div>';
  if ($u['role'] !== 'bot') {
    $m .= '<div class="f-pro-stats"><div class="f-pro-rep"><b>' . (int)$u['rep'] . '</b><span>репутация · <i class="f-lvl l' . $lv['i'] . '">' . h($lv['name']) . '</i></span>'
       . '<div class="f-prog" title="' . ($lv['next'] ? 'До уровня «' . h(levels()[$lv['i'] + 1][1]) . '»: ' . ($lv['next'] - $u['rep']) : 'Высший уровень') . '"><i style="width:' . $lv['pct'] . '%"></i></div>'
       . '<small>' . ($lv['next'] ? 'до уровня «' . h(levels()[$lv['i'] + 1][1]) . '» ' . ($lv['next'] - $u['rep']) : 'высший уровень') . '</small></div>'
       . '<div><b>' . (int)$u['posts'] . '</b><span>' . plural($u['posts'], 'сообщение', 'сообщения', 'сообщений') . '</span></div>'
       . '<div><b>' . (int)$rs['solved'] . '</b><span>' . plural($rs['solved'], 'решение', 'решения', 'решений') . '</span></div>'
       . '<div><b>' . (int)$rs['likes'] . '</b><span>«спасибо»</span></div>'
       . '<div><b>' . count($badges) . '</b><span>' . plural(count($badges), 'бейдж', 'бейджа', 'бейджей') . '</span></div>'
       . '<div><b>' . date('d.m.Y', $u['created']) . '</b><span>на форуме с</span></div></div>';
  }
  $base = 'u/' . rawurlencode($u['name']);
  $m .= '<nav class="f-tabs2">';
  foreach (['' => 'Обзор', 'posts' => 'Сообщения', 'topics' => 'Темы', 'solutions' => 'Решения', 'badges' => 'Бейджи'] as $k => $t) $m .= '<a href="' . h(url($base, $k ? ['tab' => $k] : [])) . '"' . ($k === $tab ? ' aria-current="page"' : '') . '>' . $t . '</a>';
  $m .= '</nav></div>';
  if ($tab === '') {
    $m .= '<div class="f-grid f-pro-grid"><div>';
    if ($u['about']) $m .= '<section class="f-box"><h2>О себе</h2><div class="f-body">' . render($u['about']) . '</div></section>';
    $dl = [];
    if ($f['fio']) $dl['Имя и фамилия'] = h($f['fio']);
    if ($u['title']) $dl['Должность'] = h($u['title']);
    if ($f['company']) $dl['Компания'] = h($f['company']);
    if ($f['city']) $dl['Город, регион'] = h($f['city']);
    if ($f['exp'] !== '') $dl['Опыт в отрасли'] = h($f['exp']);
    if ($f['spec']) $dl['Специализация'] = '<span class="f-tags">' . implode('', array_map(fn($s) => '<span class="f-tag plain">' . h($s) . '</span>', $f['spec'])) . '</span>';
    if ($f['skills']) $dl['Навыки и оборудование'] = '<span class="f-tags">' . implode('', array_map(fn($s) => '<span class="f-tag plain">' . h($s) . '</span>', tags_parse($f['skills'], 20))) . '</span>';
    if ($f['edu']) $dl['Образование'] = h($f['edu']);
    $showC = $f['vis'] === 'all' || ($f['vis'] === 'users' && $me) || $self;
    if ($showC && $f['tg']) $dl['Telegram'] = '<a href="https://t.me/' . h(ltrim($f['tg'], '@')) . '" rel="nofollow ugc noopener" target="_blank">@' . h(ltrim($f['tg'], '@')) . '</a>';
    if ($showC && $f['site']) $dl['Сайт'] = '<a href="' . h($f['site']) . '" rel="nofollow ugc noopener" target="_blank">' . h(preg_replace('~^https?://~', '', $f['site'])) . '</a>';
    if (!$showC && ($f['tg'] || $f['site'])) $dl['Контакты'] = '<span class="f-muted">' . ($f['vis'] === 'users' ? 'Видны только участникам форума. <a href="' . h(url('login', ['next' => url($base)])) . '">Войти</a>' : 'Скрыты') . '</span>';
    $m .= '<section class="f-box"><h2>Анкета</h2>' . ($dl ? '<dl class="f-dl">' . implode('', array_map(fn($k, $v) => '<dt>' . $k . '</dt><dd>' . $v . '</dd>', array_keys($dl), $dl)) . '</dl>' : '<p class="f-muted">' . ($self ? 'Анкета пока пустая. <a href="' . h(url('me')) . '">Заполните её</a>: коллегам проще понять, с кем они говорят, а заполненная анкета даёт бейдж.' : 'Участник пока не заполнил анкету.') . '</p>') . '</section>';
    $m .= '<section class="f-box"><h2>Последние сообщения</h2>' . user_posts($u['id'], 6) . '<a class="f-more" href="' . h(url($base, ['tab' => 'posts'])) . '">Все сообщения</a></section></div><aside class="f-side">';
    $m .= '<div class="f-box"><h3>Бейджи</h3>' . ($badges ? '<div class="f-badges">' . implode('', array_map(fn($b) => badge_html($b['code'], $b['created']), array_slice($badges, 0, 8))) . '</div>' . (count($badges) > 8 ? '<a class="f-more" href="' . h(url($base, ['tab' => 'badges'])) . '">Все бейджи</a>' : '') : '<p class="f-muted">Пока нет бейджей.</p>') . '</div>';
    $cats = q("SELECT c.name, c.slug, (SELECT COUNT(*) FROM likes l JOIN posts p ON p.id=l.post_id JOIN topics t ON t.id=p.topic_id WHERE t.cat_id=c.id AND p.user_id=:u AND p.deleted=0) * " . REP_LIKE . "
        + (SELECT COUNT(*) FROM topics t JOIN posts p ON p.id=t.solved_post WHERE t.cat_id=c.id AND p.user_id=:u AND t.user_id<>:u AND t.deleted=0) * " . REP_SOLVED . " r FROM cats c ORDER BY r DESC LIMIT 4", [':u' => $u['id']])->fetchAll();
    $cats = array_filter($cats, fn($c) => $c['r'] > 0);
    if ($cats) { $mx = max(array_column($cats, 'r')); $m .= '<div class="f-box"><h3>Сильные стороны</h3><ul class="f-bars">' . implode('', array_map(fn($c) => '<li><a href="' . h(url('c/' . $c['slug'])) . '">' . h($c['name']) . '</a><span><i style="width:' . round($c['r'] * 100 / $mx) . '%"></i></span><b>' . (int)$c['r'] . '</b></li>', $cats)) . '</ul><small class="f-muted">Репутация по разделам</small></div>'; }
    $tg = q('SELECT g.name, COUNT(DISTINCT p.topic_id) n FROM posts p JOIN topic_tags tt ON tt.topic_id=p.topic_id JOIN tags g ON g.id=tt.tag_id WHERE p.user_id=? AND p.deleted=0 GROUP BY g.id ORDER BY n DESC LIMIT 10', [$u['id']])->fetchAll();
    if ($tg) $m .= '<div class="f-box"><h3>Пишет о</h3>' . tag_chips(array_column($tg, 'name')) . '</div>';
    $m .= '</aside></div>';
  } elseif ($tab === 'posts') $m .= '<section class="f-box">' . user_posts($u['id'], 50) . '</section>';
  elseif ($tab === 'topics') {
    [$list] = topics_block('t.user_id=?', [$u['id']], $base, ['tab' => 'topics']);
    $m .= $list;
  } elseif ($tab === 'solutions') {
    $rows = q('SELECT p.id, p.body, t.title, t.solved_at FROM topics t JOIN posts p ON p.id=t.solved_post WHERE p.user_id=? AND t.deleted=0 ORDER BY t.solved_at DESC LIMIT 50', [$u['id']])->fetchAll();
    $m .= '<section class="f-box">' . ($rows ? implode('', array_map(fn($p) => '<div class="f-hit"><a href="' . h(url('post/' . $p['id'])) . '"><i class="f-solved">Решено</i>' . h($p['title']) . '</a><p>' . h(mb_strimwidth(plain_text($p['body']), 0, 200, '…')) . '</p><small>' . ago($p['solved_at']) . '</small></div>', $rows)) : '<p class="f-muted">Пока нет ответов, отмеченных решением.</p>') . '</section>';
  } else {
    $m .= '<section class="f-box">' . ($badges ? '<div class="f-badges-all">' . implode('', array_map(fn($b) => '<div class="f-bcard has">' . badge_html($b['code'], $b['created'], true) . '<small>получен ' . date('d.m.Y', $b['created']) . '</small></div>', $badges)) . '</div>' : '<p class="f-muted">Пока нет бейджей.</p>') . '<a class="f-more" href="' . h(url('badges')) . '">Все бейджи форума</a></section>';
  }
  page($u['name'] . ' | Участник форума', $m, ($u['title'] ?: 'Участник') . ' на форуме DrillHarmony', crumbs($u['name']), $u['posts'] == 0);
}
function user_posts($uid, $n) {
  $ps = q('SELECT p.id, p.body, p.created, p.likes, t.title, t.solved_post FROM posts p JOIN topics t ON t.id=p.topic_id WHERE p.user_id=? AND p.deleted=0 AND t.deleted=0 ORDER BY p.id DESC LIMIT ' . (int)$n, [$uid])->fetchAll();
  if (!$ps) return '<p class="f-muted">Пока нет сообщений.</p>';
  return implode('', array_map(fn($p) => '<div class="f-hit"><a href="' . h(url('post/' . $p['id'])) . '">' . ($p['solved_post'] == $p['id'] ? '<i class="f-solved">Решение</i>' : '') . h($p['title']) . '</a><p>' . h(mb_strimwidth(plain_text($p['body']), 0, 200, '…')) . '</p><small>' . ago($p['created']) . ($p['likes'] ? ' · «спасибо»: ' . (int)$p['likes'] : '') . '</small></div>', $ps));
}

function me_form($msg = '') {
  need_login(); $u = me(); $f = user_fields($u);
  $acc = $u['accent'] ?: 'amber';
  $exp = ['', 'меньше года', '1–3 года', '3–5 лет', '5–10 лет', '10–20 лет', 'больше 20 лет'];
  $inp = fn($n, $l, $v, $max, $ph = '', $hint = '') => '<label>' . $l . '<input name="' . $n . '" maxlength="' . $max . '" value="' . h($v) . '" placeholder="' . h($ph) . '">' . ($hint ? '<small>' . $hint . '</small>' : '') . '</label>';
  $m = '<div class="f-head"><div><h1>Мой профиль</h1><p class="f-sub">Заполните то, что хотите показать коллегам. Все поля, кроме имени, необязательные.</p></div><a class="btn" href="' . h(url('u/' . rawurlencode($u['name']))) . '">Открыть мою страницу</a></div>' . flash() . ($msg ? '<div class="f-flash warn">' . h($msg) . '</div>' : '');
  $m .= '<div class="f-edit"><nav class="f-edit-nav"><a href="#look">Фото и оформление</a><a href="#main">Основное</a><a href="#prof">Профессия</a><a href="#about">О себе</a><a href="#contacts">Контакты</a><a href="#sec">Безопасность</a>' . (is_admin() ? '<a href="' . h(url('bot')) . '">Бот форума</a>' : '') . '</nav>'
     . '<form class="f-form f-edit-form" method="post" action="' . h(url('me')) . '" enctype="multipart/form-data">' . csrf_field();
  // оформление с живым предпросмотром
  $m .= '<section class="f-box" id="look"><h2>Фото и оформление</h2>'
     . '<div class="f-mini" style="--acc:' . h(profile_accents()[$acc][1]) . '"><div class="f-cover cov-' . h($f['cover'] === 'custom' && $u['cover'] ? 'custom' : $f['cover']) . '"' . ($f['cover'] === 'custom' && $u['cover'] ? ' style="background-image:url(' . h($u['cover']) . ')"' : '') . '></div>'
     . '<div class="f-mini-b"><span class="f-mini-ava">' . avatar($u, 64) . '</span><b>' . h($u['name']) . '</b><i class="f-mini-st">' . h($f['status'] ?: 'Статус') . '</i></div></div>'
     . '<div class="f-two"><label>Аватар<input type="file" name="avatar" accept="image/jpeg,image/png,image/webp,image/gif" class="f-imgin" data-target=".f-mini-ava"><small>Квадратная картинка, обрежем по центру до 256×256</small></label>'
     . ($u['avatar'] ? '<label class="f-check"><input type="checkbox" name="del_avatar" value="1"> Удалить аватар</label>' : '') . '</div>'
     . '<fieldset class="f-fs"><legend>Обложка</legend><div class="f-covers">';
  foreach (profile_covers() + ['custom' => 'Своя картинка'] as $k => $t)
    $m .= '<label class="f-covopt"><input type="radio" name="cover" value="' . $k . '"' . ($f['cover'] === $k ? ' checked' : '') . '><span class="f-cover cov-' . $k . '"' . ($k === 'custom' && $u['cover'] ? ' style="background-image:url(' . h($u['cover']) . ')"' : '') . '></span><small>' . $t . '</small></label>';
  $m .= '</div><label>Своя обложка<input type="file" name="cover_file" accept="image/jpeg,image/png,image/webp" class="f-imgin" data-target="cover"><small>Широкая картинка, обрежем до 1600×400</small></label></fieldset>'
     . '<fieldset class="f-fs"><legend>Цвет страницы</legend><div class="f-accents">';
  foreach (profile_accents() as $k => [$t, $c]) $m .= '<label class="f-accopt" title="' . $t . '"><input type="radio" name="accent" value="' . $k . '"' . ($acc === $k ? ' checked' : '') . ' data-c="' . $c . '"><span style="background:' . $c . '"></span><small>' . $t . '</small></label>';
  $m .= '</div></fieldset>' . $inp('status', 'Статус под именем', $f['status'], 80, 'Например: веду горизонтали в Западной Сибири', 'До 80 символов') . '</section>';
  $m .= '<section class="f-box" id="main"><h2>Основное</h2><label>Имя на форуме<input value="' . h($u['name']) . '" disabled><small>Имя менять нельзя: по нему вас узнают в темах</small></label><div class="f-two">'
     . $inp('fio', 'Имя и фамилия', $f['fio'], 60, '', 'Видно всем. Можно не указывать')
     . $inp('title', 'Должность', $u['title'], 60, 'Инженер ННБ, телеметрист, геолог ГТИ')
     . $inp('company', 'Компания', $f['company'], 80, '', 'Указывайте, только если это не противоречит правилам вашей компании')
     . $inp('city', 'Город или регион', $f['city'], 60) . '</div></section>';
  $m .= '<section class="f-box" id="prof"><h2>Профессия</h2><fieldset class="f-fs"><legend>Специализация</legend><div class="f-checks">';
  foreach (profile_specs() as $s) $m .= '<label class="f-pill"><input type="checkbox" name="spec[]" value="' . h($s) . '"' . (in_array($s, $f['spec'], true) ? ' checked' : '') . '><span>' . h($s) . '</span></label>';
  $m .= '</div></fieldset><div class="f-two"><label>Опыт в отрасли<select name="exp">';
  foreach ($exp as $e) $m .= '<option value="' . h($e) . '"' . ($f['exp'] === $e ? ' selected' : '') . '>' . ($e ?: 'Не указывать') . '</option>';
  $m .= '</select></label>' . $inp('edu', 'Образование', $f['edu'], 120, 'Вуз, специальность, год') . '</div>'
     . $inp('skills', 'Навыки и оборудование', $f['skills'], 300, 'Через запятую: РУС, ВЗД, гироскоп, WITSML, Petrel', 'До 20 пунктов') . '</section>';
  $m .= '<section class="f-box" id="about"><h2>О себе</h2>' . editor('about', $u['about'], 6, false) . '<small class="f-hint">Опыт, регионы, интересные задачи. Без телефонов, адресов и данных заказчиков</small></section>';
  $m .= '<section class="f-box" id="contacts"><h2>Контакты для связи</h2><div class="f-two">'
     . $inp('tg', 'Telegram', $f['tg'], 33, '@username') . $inp('site', 'Сайт или профиль', $f['site'], 120, 'https://')
     . '</div><label>Кому показывать контакты<select name="vis">';
  foreach (['users' => 'Только участникам форума', 'all' => 'Всем посетителям', 'none' => 'Никому'] as $k => $t) $m .= '<option value="' . $k . '"' . ($f['vis'] === $k ? ' selected' : '') . '>' . $t . '</option>';
  $m .= '</select><small>E-mail другим участникам не показывается никогда</small></label></section>';
  if (is_admin()) { $bc = bot_cfg(); $on = $bc['provider'] && $bc['key'];
    $m .= '<section class="f-box f-ownerbox" id="bot"><h2>Бот форума</h2><p class="f-muted">Видно только владельцу. ' . ($on ? 'Модель подключена: <b>' . h(bot_providers()[$bc['provider']][0] ?? $bc['provider']) . ($bc['model'] ? ' · ' . h($bc['model']) : '') . '</b>' . ($bc['enabled'] ? '' : ', бот выключен') . '.' : 'Модель не подключена, бот отвечает подборкой ссылок.') . '</p>'
       . '<a class="btn" href="' . h(url('bot')) . '">' . ($on ? 'Настроить подключение' : 'Подключить модель') . '</a></section>'; }
  $m .= '<section class="f-box" id="sec"><h2>Безопасность</h2><p class="f-muted">E-mail: ' . h($u['email']) . '</p><div class="f-two"><label>Текущий пароль<input name="old" type="password" autocomplete="current-password"></label><label>Новый пароль<input name="new" type="password" minlength="8" autocomplete="new-password"><small>Оставьте пустым, если не меняете</small></label></div></section>'
     . '<div class="f-savebar"><button class="btn pri" type="submit">Сохранить профиль</button></div></form></div>';
  page('Мой профиль | Форум', $m, '', crumbs('Мой профиль'), true);
}
function save_me() {
  need_login(); $u = me(); $warn = [];
  $f = user_fields($u);
  foreach (['fio' => 60, 'company' => 80, 'city' => 60, 'edu' => 120, 'status' => 80] as $k => $max) $f[$k] = txt($k, $max);
  $f['skills'] = implode(', ', tags_parse(txt('skills', 300), 20));
  $f['spec'] = array_values(array_intersect(profile_specs(), (array)($_POST['spec'] ?? [])));
  $e = txt('exp', 20); $f['exp'] = in_array($e, ['меньше года', '1–3 года', '3–5 лет', '5–10 лет', '10–20 лет', 'больше 20 лет'], true) ? $e : '';
  $tg = ltrim(txt('tg', 33), '@'); $f['tg'] = preg_match('/^[A-Za-z0-9_]{5,32}$/', $tg) ? $tg : ''; if ($tg !== '' && $f['tg'] === '') $warn[] = 'Telegram: 5–32 латинские буквы, цифры или «_».';
  $site = txt('site', 120); $f['site'] = preg_match('~^https?://[^\s<>"]+\.[^\s<>"]+$~i', $site) ? $site : ''; if ($site !== '' && $f['site'] === '') $warn[] = 'Адрес сайта должен начинаться с https://';
  $f['vis'] = in_array($_POST['vis'] ?? '', ['all', 'users', 'none'], true) ? $_POST['vis'] : 'users';
  $accent = array_key_exists($_POST['accent'] ?? '', profile_accents()) ? $_POST['accent'] : 'amber';
  $cover = array_key_exists($_POST['cover'] ?? '', profile_covers() + ['custom' => 1]) ? $_POST['cover'] : 'strata';
  $avatar = $u['avatar']; $coverImg = $u['cover'];
  if (!empty($_POST['del_avatar'])) { drop_profile_image($avatar); $avatar = null; }
  if (!rate('pimg:' . $u['id'], 20, 3600) && (!empty($_FILES['avatar']['name']) || !empty($_FILES['cover_file']['name']))) $warn[] = 'Слишком много загрузок картинок за час.';
  else {
    [$a, $err] = save_profile_image($_FILES['avatar'] ?? null, 'avatar', $u['id']);
    if ($a) { drop_profile_image($u['avatar']); $avatar = $a; } elseif ($err) $warn[] = 'Аватар: ' . $err;
    [$c, $err] = save_profile_image($_FILES['cover_file'] ?? null, 'cover', $u['id']);
    if ($c) { drop_profile_image($u['cover']); $coverImg = $c; $cover = 'custom'; } elseif ($err) $warn[] = 'Обложка: ' . $err;
  }
  if ($cover === 'custom' && !$coverImg) $cover = 'strata';
  $f['cover'] = $cover;
  q('UPDATE users SET title=?, about=?, fields=?, accent=?, avatar=?, cover=? WHERE id=?', [txt('title', 60), txt('about', 3000), json_encode($f, JSON_UNESCAPED_UNICODE), $accent, $avatar, $coverImg, $u['id']]);
  $new = (string)($_POST['new'] ?? '');
  if ($new !== '') {
    if (!password_verify((string)($_POST['old'] ?? ''), $u['pass'])) $warn[] = 'Текущий пароль указан неверно, пароль не изменён.';
    elseif (mb_strlen($new) < 8) $warn[] = 'Новый пароль должен быть не короче 8 символов.';
    else q('UPDATE users SET pass=? WHERE id=?', [password_hash($new, PASSWORD_DEFAULT), $u['id']]);
  }
  badges_check($u['id']);
  flash($warn ? 'Профиль сохранён, но: ' . implode(' ', $warn) : 'Профиль сохранён.', $warn ? 'warn' : 'ok');
  redirect(url('me'));
}

// ===================== поиск =====================
function search() {
  $q = trim(mb_substr((string)($_GET['q'] ?? ''), 0, 100));
  $cat = (string)($_GET['c'] ?? ''); $tag = tag_norm($_GET['tag'] ?? ''); $author = trim(mb_substr((string)($_GET['a'] ?? ''), 0, 24));
  $only = in_array($_GET['in'] ?? '', ['titles', 'solved'], true) ? $_GET['in'] : ''; $sort = ($_GET['s'] ?? '') === 'new' ? 'new' : '';
  $cats = q('SELECT slug, name, grp FROM cats ORDER BY ord')->fetchAll();
  $hidden = strpos(url('search'), '?r=') !== false ? '<input type="hidden" name="r" value="search">' : '';
  $m = '<div class="f-head"><div><h1>Поиск по форуму</h1><p class="f-sub">Ищет по заголовкам и тексту сообщений с учётом окончаний: «замеров» найдёт и «замер», и «замеры». Фильтры сужают выдачу.</p></div></div>'
     . '<form class="f-box f-search2" method="get" action="' . h(url('search')) . '">' . $hidden
     . '<div class="f-searchbig"><input type="search" name="q" value="' . h($q) . '" placeholder="Например: реактивный момент на ВЗД" autofocus><button class="btn pri" type="submit">Найти</button></div><div class="f-filters">'
     . '<label>Раздел<select name="c"><option value="">Все разделы</option>';
  foreach ($cats as $c) $m .= '<option value="' . h($c['slug']) . '"' . ($c['slug'] === $cat ? ' selected' : '') . '>' . h($c['name']) . '</option>';
  $m .= '</select></label><label>Тег<input name="tag" value="' . h($tag) . '" list="f-taglist2" placeholder="любой"></label><label>Автор<input name="a" value="' . h($author) . '" placeholder="имя на форуме"></label>'
     . '<label>Где искать<select name="in"><option value="">Везде</option><option value="titles"' . ($only === 'titles' ? ' selected' : '') . '>Только в заголовках</option><option value="solved"' . ($only === 'solved' ? ' selected' : '') . '>Только в решённых темах</option></select></label>'
     . '<label>Порядок<select name="s"><option value="">По релевантности</option><option value="new"' . ($sort === 'new' ? ' selected' : '') . '>Сначала новые</option></select></label></div>'
     . '<datalist id="f-taglist2">' . implode('', array_map(fn($n) => '<option value="' . h($n) . '">', q('SELECT name FROM tags WHERE n>0 ORDER BY n DESC LIMIT 80')->fetchAll(PDO::FETCH_COLUMN))) . '</datalist></form>';
  $active = mb_strlen($q) >= 2 || $tag !== '' || $author !== '';
  if ($active) {
    $w = ['p.deleted=0', 't.deleted=0']; $a = [];
    if ($cat !== '') { $w[] = 'c.slug=?'; $a[] = $cat; }
    if ($tag !== '') { $w[] = 't.id IN (SELECT tt.topic_id FROM topic_tags tt JOIN tags g ON g.id=tt.tag_id WHERE g.name=?)'; $a[] = $tag; }
    if ($author !== '') { $w[] = 'u.name=?'; $a[] = $author; }
    if ($only === 'solved') $w[] = 't.solved_post IS NOT NULL';
    $sel = 'SELECT p.id, p.body, p.created, p.likes, p.topic_id, t.title, t.solved_post, c.name cname, u.name FROM posts p JOIN topics t ON t.id=p.topic_id JOIN cats c ON c.id=t.cat_id JOIN users u ON u.id=p.user_id';
    $rows = [];
    if (mb_strlen($q) >= 2 && fts_ok() && ($fq = fts_query($q)) !== '') {
      $mq = $only === 'titles' ? 'title : (' . $fq . ')' : $fq;
      try { $rows = q("$sel JOIN post_fts ON post_fts.rowid=p.id WHERE post_fts MATCH ? AND " . implode(' AND ', $w) . ' ORDER BY ' . ($sort === 'new' ? 'p.id DESC' : 'bm25(post_fts, 8.0, 1.0) - (t.solved_post=p.id) * 2 - MIN(p.likes, 10) * 0.2') . ' LIMIT 300', array_merge([$mq], $a))->fetchAll(); }
      catch (Throwable $e) { $rows = []; }
    } elseif (mb_strlen($q) >= 2) {
      // без FTS5: перебор с учётом регистра кириллицы
      $terms = array_map('g_stem', g_terms($q));
      $rows = array_values(array_filter(q("$sel WHERE " . implode(' AND ', $w) . ' ORDER BY p.id DESC LIMIT 5000', $a)->fetchAll(), function ($r) use ($terms, $only) {
        $hay = mb_strtolower($only === 'titles' ? $r['title'] : $r['title'] . ' ' . $r['body']);
        foreach ($terms as $t) if (mb_strpos($hay, $t) === false) return false; return true;
      }));
    } else $rows = q("$sel WHERE " . implode(' AND ', $w) . ' ORDER BY p.id DESC LIMIT 300', $a)->fetchAll();
    // по одному лучшему сообщению на тему
    $seen = []; $hits = [];
    foreach ($rows as $r) { if (isset($seen[$r['topic_id']])) { $seen[$r['topic_id']]++; continue; } $seen[$r['topic_id']] = 1; $hits[] = $r; }
    $hits = array_slice($hits, 0, 40);
    $tagHits = mb_strlen($q) >= 2 ? array_filter(q('SELECT name, n FROM tags WHERE n>0 ORDER BY n DESC LIMIT 300')->fetchAll(), fn($t) => mb_strpos($t['name'], mb_strtolower($q)) !== false || mb_strpos(mb_strtolower($q), $t['name']) !== false) : [];
    if ($tagHits) $m .= '<div class="f-cloud f-cloud-line"><span class="f-muted">Теги:</span>' . implode('', array_map(fn($t) => '<a class="f-tag" href="' . h(tag_url($t['name'])) . '">' . h($t['name']) . '<i>' . (int)$t['n'] . '</i></a>', array_slice($tagHits, 0, 8))) . '</div>';
    $m .= '<section class="f-box"><h2>' . ($hits ? 'Найдено тем: ' . count($hits) : 'Ничего не нашлось') . '</h2>';
    if (!$hits) $m .= '<p class="f-muted">Попробуйте другое слово, уберите фильтры или <a href="' . h(url('new')) . '">задайте вопрос</a>.</p>';
    $stems = array_map('g_stem', g_terms($q));
    $tags = tags_of(array_column($hits, 'topic_id'));
    foreach ($hits as $r) {
      $plain = plain_text($r['body']);
      $pos = 0; foreach ($stems as $s) if (($x = mb_stripos($plain, $s)) !== false) { $pos = $x; break; }
      $start = max(0, $pos - 70);
      $snip = h(($start ? '…' : '') . mb_substr($plain, $start, 240) . (mb_strlen($plain) > $start + 240 ? '…' : ''));
      $title = h($r['title']);
      if ($stems) { $re = '/(' . implode('|', array_map(fn($s) => preg_quote(h($s), '/'), $stems)) . ')[\p{L}\p{N}]*/iu'; $snip = preg_replace($re, '<mark>$0</mark>', $snip); $title = preg_replace($re, '<mark>$0</mark>', $title); }
      $m .= '<div class="f-hit"><a href="' . h(url('post/' . $r['id'])) . '">' . ($r['solved_post'] ? '<i class="f-solved">Решено</i>' : '') . $title . '</a><p>' . $snip . '</p><small>' . h($r['cname']) . ' · ' . h($r['name']) . ' · ' . ago($r['created']) . ($seen[$r['topic_id']] > 1 ? ' · ещё ' . ($seen[$r['topic_id']] - 1) . ' ' . plural($seen[$r['topic_id']] - 1, 'совпадение', 'совпадения', 'совпадений') . ' в теме' : '') . '</small>' . tag_chips($tags[$r['topic_id']] ?? []) . '</div>';
    }
    $m .= '</section>';
  } elseif ($q !== '') $m .= '<p class="f-muted">Введите хотя бы два символа.</p>';
  page('Поиск по форуму', $m, '', crumbs('Поиск'), true);
}
// подсказки в строке поиска: темы и теги
function suggest_json() {
  header('Content-Type: application/json; charset=utf-8');
  $q = trim(mb_substr((string)($_GET['q'] ?? ''), 0, 60)); $out = ['topics' => [], 'tags' => []];
  if (mb_strlen($q) >= 2) {
    $ql = mb_strtolower($q);
    foreach (q('SELECT name, n FROM tags WHERE n>0 ORDER BY n DESC LIMIT 400')->fetchAll() as $t) if (mb_strpos($t['name'], $ql) !== false) { $out['tags'][] = ['n' => $t['name'], 'c' => (int)$t['n'], 'u' => tag_url($t['name'])]; if (count($out['tags']) >= 4) break; }
    $rows = [];
    if (fts_ok() && ($fq = fts_query($q)) !== '') { try { $rows = q('SELECT t.id, t.title, t.solved_post FROM post_fts JOIN posts p ON p.id=post_fts.rowid JOIN topics t ON t.id=p.topic_id WHERE post_fts MATCH ? AND t.deleted=0 AND p.deleted=0 ORDER BY bm25(post_fts, 8.0, 1.0) LIMIT 30', ['title : (' . $fq . ')'])->fetchAll(); } catch (Throwable $e) {} }
    else $rows = array_filter(q('SELECT id, title, solved_post FROM topics WHERE deleted=0 ORDER BY last_at DESC LIMIT 1500')->fetchAll(), fn($t) => mb_strpos(mb_strtolower($t['title']), $ql) !== false);
    $seen = [];
    foreach ($rows as $r) { if (isset($seen[$r['id']])) continue; $seen[$r['id']] = 1; $out['topics'][] = ['t' => $r['title'], 'u' => url('t/' . $r['id']), 's' => (bool)$r['solved_post']]; if (count($out['topics']) >= 6) break; }
  }
  $out['all'] = url('search', ['q' => $q]);
  echo json_encode($out, JSON_UNESCAPED_UNICODE); exit;
}
