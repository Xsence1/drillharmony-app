"""Помощник для статей: собирает страницу статьи по образцу существующих и
обновляет боковое меню статей на всех страницах."""
import json, os, re

SITE = "/home/claude/proj/site"
TEMPLATE = os.path.join(SITE, "articles/toolface/index.html")

# Боковое меню статей (порядок и группы)
NAV = [
    ("Траектория", [("minimum-curvature", "Метод минимальной кривизны"), ("j-profile", "Расчёт J-профиля"),
                    ("dogleg-severity", "Интенсивность искривления"), ("azimuth-declination", "Азимуты и магнитное склонение"),
                    ("separation-factor", "Коэффициент разделения SF"), ("magnetic-qc", "Магнитные помехи и контроль замеров"),
                    ("geosteering", "Геонавигация"), ("landing", "Посадка горизонтали"), ("gyro", "Гироскоп: когда обязателен"),
                    ("sidetrack", "Боковой ствол и зарезка")]),
    ("Ориентирование и КНБК", [("toolface", "Отклонитель и реактивный момент"), ("bha-build", "КНБК для набора кривизны"),
                               ("rss-vs-motor", "РУС или ВЗД"), ("weight-transfer", "Передача нагрузки в слайде"),
                               ("wob-loss", "Нагрузка не доходит до долота"), ("slide-hacks", "Лайфхаки слайда"),
                               ("motor-curve", "Характеристика ВЗД и срыв")]),
    ("Бурение, долото, колонна", [("mse", "MSE: эффективность бурения"), ("bit-hydraulics", "Гидравлика долота"),
                                  ("broomstick", "«Метла»: вес на крюке"), ("casing-run", "Спуск колонны в горизонталь")]),
    ("Гидравлика и осложнения", [("ecd", "ЭЦП"), ("hole-cleaning", "Очистка ствола"), ("kick", "ГНВП и глушение"),
                                 ("stuck-pipe", "Прихват колонны"), ("vibration", "Вибрации и stick-slip"),
                                 ("mwd-telemetry", "Сбои телесистемы")]),
    ("Данные, программы, обучение", [("wits-witsml", "WITS: поток с буровой"), ("witsml", "WITSML с нуля"),
                                     ("migration", "Переход на новое ПО"), ("ai-well-planning", "ИИ в проектировании"),
                                     ("nnb-training", "Обучение инженеров ННБ"), ("reporting", "Отчётность инженера ННБ"),
                                     ("interview", "Вопросы на собеседовании"), ("glossary", "Словарь терминов"), ("dictionary", "Словарь RU–EN")]),
]


def anav(current):
    out = ['<aside class="anav-wrap"><details class="anav" open><summary>Все статьи</summary><nav aria-label="Статьи">']
    for g, items in NAV:
        out.append(f'<div class="ang"><div class="ang-h">{g}</div>')
        for slug, name in items:
            if not os.path.exists(os.path.join(SITE, "articles", slug, "index.html")) and slug != current:
                continue
            cur = ' aria-current="page"' if slug == current else ""
            out.append(f'<a href="../../articles/{slug}/"{cur}>{name}</a>')
        out.append("</div>")
    out.append('<div class="ang ang-more"><a href="../../articles/">Все статьи</a><a href="../../calculators/">Калькуляторы</a></div></nav></details></aside>')
    return "".join(out)


def order():
    return [s for _, items in NAV for s, _ in items if os.path.exists(os.path.join(SITE, "articles", s, "index.html"))]


def names():
    return {s: n for _, items in NAV for s, n in items}


def refresh_navs():
    """Переписывает боковое меню и ссылки «предыдущая / следующая» во всех статьях."""
    seq, nm = order(), names()
    for slug in seq:
        p = os.path.join(SITE, "articles", slug, "index.html")
        s = open(p, encoding="utf-8").read()
        s = re.sub(r'<aside class="anav-wrap">.*?</aside>', lambda m: anav(slug), s, count=1, flags=re.S)
        i = seq.index(slug)
        prv, nxt = seq[i - 1] if i else None, seq[i + 1] if i + 1 < len(seq) else None
        apn = '<nav class="apn" aria-label="Соседние статьи">'
        if prv:
            apn += f'<a class="prev" href="../../articles/{prv}/"><small>Предыдущая</small>{nm[prv]}</a>'
        if nxt:
            apn += f'<a class="next" href="../../articles/{nxt}/"><small>Следующая</small>{nm[nxt]}</a>'
        apn += "</nav>"
        s = re.sub(r'<nav class="apn" aria-label="Соседние статьи">.*?</nav>', lambda m: apn, s, count=1, flags=re.S)
        open(p, "w", encoding="utf-8").write(s)


def make_article(slug, title, h1, desc, crumb, eyebrow, body, scripts=(), og="article-wits.png", cta=None, date="2026-10-15", css=()):
    t = open(TEMPLATE, encoding="utf-8").read()
    head_end = t.index("</head>")
    head = t[:head_end]
    head = re.sub(r"<title>.*?</title>", f"<title>{title} | DrillHarmony</title>", head, flags=re.S)
    head = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{desc}">', head)
    head = head.replace("articles/toolface/", f"articles/{slug}/")
    head = re.sub(r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{title} | DrillHarmony">', head)
    head = re.sub(r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{desc}">', head)
    head = re.sub(r'og/[a-z-]+\.png', f"og/{og}", head)
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "Organization", "@id": "https://drillharmony.com/#org", "name": "DrillHarmony", "url": "https://drillharmony.com/", "logo": "https://drillharmony.com/icon-512.png", "email": "info@drillharmony.com"},
        {"@type": "Article", "headline": h1, "description": desc, "inLanguage": "ru", "datePublished": date, "dateModified": date,
         "author": {"@id": "https://drillharmony.com/#org"}, "publisher": {"@id": "https://drillharmony.com/#org"},
         "mainEntityOfPage": f"https://drillharmony.com/articles/{slug}/", "image": f"https://drillharmony.com/og/{og}"},
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "DrillHarmony", "item": "https://drillharmony.com/"},
            {"@type": "ListItem", "position": 2, "name": "Статьи", "item": "https://drillharmony.com/articles/"},
            {"@type": "ListItem", "position": 3, "name": crumb, "item": f"https://drillharmony.com/articles/{slug}/"}]}]}
    head = re.sub(r'<script type="application/ld\+json">.*?</script>', lambda m: '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + "</script>", head, flags=re.S)
    for c in css:
        head += f'<link rel="stylesheet" href="../../assets/c/{c}">'
    # шапка — из шаблона
    b0 = t.index("<body>")
    header = t[b0:t.index('<nav class="crumbs')]
    footer = t[t.index("<footer>"):]
    cta = cta or '<div class="w"><div class="cta"><div><h2>Подключить буровую к Tempo</h2><p>Данные станций ГТИ и ННБ в реальном времени для всех служб: операции, скрытое НПВ, подсказки ННБ.</p></div><div class="btns"><a class="btn pri" href="../../tempo/">Подробнее о Tempo</a></div></div></div>'
    sc = "".join(f'<script src="../../assets/j/{x}"></script>\n' for x in scripts)
    page = (head + "</head>" + header +
            f'<nav class="crumbs w" aria-label="Навигация"><a href="../../">DrillHarmony</a> / <a href="../../articles/">Статьи</a> / {crumb}</nav>\n<main>\n'
            f'<div class="w artwrap">{anav(slug)}\n<article class="article">\n<div class="eyebrow">{eyebrow}</div>\n<h1>{h1}</h1>\n{body}\n'
            '<nav class="apn" aria-label="Соседние статьи"></nav>\n</article></div>\n<script src="../../assets/j/4431636cc5.js"></script>\n'
            f"{cta}\n{sc}</main>\n" + footer)
    os.makedirs(os.path.join(SITE, "articles", slug), exist_ok=True)
    open(os.path.join(SITE, "articles", slug, "index.html"), "w", encoding="utf-8").write(page)


NEW = {"dictionary", "witsml", "landing"}


def refresh_index():
    """Перестраивает список статей на articles/index.html по NAV."""
    p = os.path.join(SITE, "articles/index.html")
    s = open(p, encoding="utf-8").read()
    s = re.sub(r'<aside class="anav-wrap">.*?</aside>', lambda m: anav("").replace("../../", "../"), s, count=1, flags=re.S)
    parts, n = [], 0
    for g, items in NAV:
        cards = []
        for slug, _ in items:
            f = os.path.join(SITE, "articles", slug, "index.html")
            if not os.path.exists(f):
                continue
            t = open(f, encoding="utf-8").read()
            h1 = re.sub(r"<[^>]+>", "", re.search(r"<h1[^>]*>(.*?)</h1>", t, re.S).group(1))
            d = re.search(r'<meta name="description" content="([^"]*)"', t).group(1)
            new = ' <i class="new">новое</i>' if slug in NEW else ""
            cards.append(f'<a href="../articles/{slug}/"><b>{h1}{new}</b><span>{d}</span></a>')
            n += 1
        parts.append(f'<h2 id="{g}">{g}</h2><div class="alist">' + "".join(cards) + "</div>")
    a = s.index('<h2 id="Траектория">')
    b = s.index("</div></div>", s.rindex('<div class="alist">'))  # конец последнего списка
    b = s.index("</div>", s.rindex('<div class="alist">')) + 6
    s = s[:a] + "".join(parts) + s[b:]
    s = re.sub(r"\d+ стат(ей|ьи|ья) о расчётах", f"{n} статей о расчётах", s)
    open(p, "w", encoding="utf-8").write(s)
