"""Калькуляторы: генерация новых страниц, бокового меню и списка на calculators/index.html."""
import json, os, re
SITE = "/home/claude/proj/site"
TPL = os.path.join(SITE, "calculators/dogleg/index.html")

CNAV = [
    ("Траектория", [("minimum-curvature", "Траектория по двум замерам"), ("toolface", "Положение отклонителя"), ("projection", "Прогноз на долото"), ("dogleg", "Перевод интенсивности"), ("landing", "Посадка на цель")]),
    ("Инклинометрия", [("raw-survey", "Замер по сырым осям"), ("survey-axes", "Оси по замеру"), ("short-collar", "Коррекция азимута (НУБТ)"), ("sag", "Поправка на прогиб (SAG)"), ("nmdc", "Длина НУБТ")]),
    ("Бурение и долото", [("mse", "MSE — эффективность бурения"), ("bit-hydraulics", "Гидравлика долота"), ("motor", "ВЗД: момент и обороты"), ("hookload", "Вес на крюке и трение")]),
    ("Давление и гидравлика", [("ecd", "ЭЦП"), ("hydrostatic", "Гидростатика и репрессия"), ("kill-mud", "Плотность глушения"), ("annular-velocity", "Скорость в затрубье"), ("well-volume", "Объём скважины и lag time")]),
    ("Раствор и колонна", [("barite", "Утяжеление баритом"), ("buoyancy", "Плавучесть и вес колонны"), ("critical-rpm", "Критические обороты")]),
    ("Единицы", [("units", "Перевод единиц")]),
]

def cnav(cur, pre="../../"):
    o = ['<aside class="anav-wrap"><details class="anav" open><summary>Все калькуляторы</summary><nav aria-label="Все калькуляторы">']
    for g, items in CNAV:
        o.append(f'<div class="ang"><div class="ang-h">{g}</div>')
        for s, n in items:
            if os.path.exists(os.path.join(SITE, "calculators", s, "index.html")) or s == cur:
                o.append(f'<a href="{pre}calculators/{s}/"' + (' aria-current="page"' if s == cur else "") + f">{n}</a>")
        o.append("</div>")
    o.append(f'<div class="ang ang-more"><a href="{pre}calculators/">Все калькуляторы</a><a href="{pre}articles/">Статьи</a></div></nav></details></aside>')
    return "".join(o)

def seq():
    return [s for _, it in CNAV for s, _ in it if os.path.exists(os.path.join(SITE, "calculators", s, "index.html"))]

def names():
    return {s: n for _, it in CNAV for s, n in it}

def refresh():
    sq, nm = seq(), names()
    for s in sq:
        p = os.path.join(SITE, "calculators", s, "index.html"); t = open(p, encoding="utf-8").read()
        t = re.sub(r'<aside class="anav-wrap">.*?</aside>', lambda m: cnav(s), t, count=1, flags=re.S)
        i = sq.index(s); pv = sq[i - 1] if i else None; nx = sq[i + 1] if i + 1 < len(sq) else None
        apn = '<nav class="apn" aria-label="Соседние калькуляторы">' + (f'<a class="prev" href="../../calculators/{pv}/"><small>Предыдущий</small>{nm[pv]}</a>' if pv else "") + (f'<a class="next" href="../../calculators/{nx}/"><small>Следующий</small>{nm[nx]}</a>' if nx else "") + "</nav>"
        t = re.sub(r'<nav class="apn" aria-label="Соседние калькуляторы">.*?</nav>', lambda m: apn, t, count=1, flags=re.S)
        open(p, "w", encoding="utf-8").write(t)
    # список на calculators/index.html
    p = os.path.join(SITE, "calculators/index.html"); t = open(p, encoding="utf-8").read()
    t = re.sub(r'<aside class="anav-wrap">.*?</aside>', lambda m: cnav("", "../"), t, count=1, flags=re.S)
    parts = []
    for g, it in CNAV:
        cards = []
        for s, _ in it:
            f = os.path.join(SITE, "calculators", s, "index.html")
            if not os.path.exists(f): continue
            x = open(f, encoding="utf-8").read()
            h1 = re.sub(r"<[^>]+>", "", re.search(r"<h1[^>]*>(.*?)</h1>", x, re.S).group(1))
            d = re.search(r'<meta name="description" content="([^"]*)"', x).group(1)
            new = ' <i class="new">новое</i>' if s in ("landing", "mse", "bit-hydraulics", "motor", "hookload") else ""
            cards.append(f'<a href="../calculators/{s}/"><b>{h1}{new}</b><span>{d}</span></a>')
        parts.append(f"<h2>{g}</h2><div class=\"alist\">" + "".join(cards) + "</div>")
    a = t.index("<h2>Траектория</h2>"); b = t.index("</div>", t.rindex('<div class="alist">')) + 6
    t = t[:a] + "".join(parts) + t[b:]
    pl = lambda n: "расчёт" if n % 10 == 1 and n % 100 != 11 else "расчёта" if 2 <= n % 10 <= 4 and not 12 <= n % 100 <= 14 else "расчётов"
    t = re.sub(r"\d+ расчёт(ов|а)? в браузере", f"{len(sq)} {pl(len(sq))} в браузере", t)
    open(p, "w", encoding="utf-8").write(t)
    return len(sq)

def make(slug, title, h1, desc, group, lead, inputs, outputs, viz, body, kind, og="calc.png"):
    """inputs: [(id, label, value, unit)]; outputs: [(id, label, unit, cls)]; viz: (title, text, height)."""
    t = open(TPL, encoding="utf-8").read()
    head = t[:t.index("</head>")]
    head = re.sub(r"<title>.*?</title>", f"<title>{title} | DrillHarmony</title>", head, flags=re.S)
    head = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{desc}">', head)
    head = head.replace("calculators/dogleg/", f"calculators/{slug}/")
    head = re.sub(r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{title} | DrillHarmony">', head)
    head = re.sub(r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{desc}">', head)
    head = re.sub(r'<script type="application/ld\+json">.*?</script>', lambda m: '<script type="application/ld+json">' + json.dumps({"@context": "https://schema.org", "@graph": [
        {"@type": "WebApplication", "name": h1, "url": f"https://drillharmony.com/calculators/{slug}/", "applicationCategory": "EngineeringApplication", "operatingSystem": "Web", "inLanguage": "ru", "offers": {"@type": "Offer", "price": "0", "priceCurrency": "RUB"}},
        {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "DrillHarmony", "item": "https://drillharmony.com/"}, {"@type": "ListItem", "position": 2, "name": "Калькуляторы", "item": "https://drillharmony.com/calculators/"}, {"@type": "ListItem", "position": 3, "name": h1, "item": f"https://drillharmony.com/calculators/{slug}/"}]}]}, ensure_ascii=False) + "</script>", head, flags=re.S)
    ci = "".join(f'<label><span>{l}</span><input id="{i}" inputmode="decimal" value="{v}"><small>{u}</small></label>' for i, l, v, u in inputs)
    co = "".join(f'<div class="co{(" " + c) if c else ""}"><span>{l}</span><b id="{i}">—</b><small>{u}</small></div>' for i, l, u, c in outputs)
    vt, vd, vh = viz
    lead_box = t[t.index('<aside class="calc-lead"'):t.index("</aside>", t.index('<aside class="calc-lead"')) + 8]
    main = (f'<main>\n<div class="w artwrap">{cnav(slug)}<div class="article">\n<div class="eyebrow">Калькуляторы · {group}</div>\n<h1>{h1}</h1>\n<p class="lead">{lead}</p>\n'
            f'<div class="calc" data-calc="{kind}"><div class="ci">{ci}</div><div class="cout">{co}</div></div>\n'
            '<div class="calc-act"><button type="button" data-act="copy">Скопировать результат</button><button type="button" data-act="link">Ссылка на расчёт</button><button type="button" data-act="reset">Сбросить</button></div>\n'
            f'<section class="wx ia ia-calc" id="iv-{kind}" aria-label="{vt}"><div class="wx-top"><div class="eyebrow">Модель расчёта</div><b>{vt}</b><p>{vd}</p></div><canvas class="ia-cv flat" style="height:{vh}px" role="img" aria-label="{vt}"></canvas></section>\n'
            f"{lead_box}\n{body}\n"
            '<p class="small muted calc-more">Расчёт справочный. Проектные решения принимаются по утверждённым методикам и программе на бурение.</p>\n'
            '<p class="calc-ask">Не хватает расчёта или нашли расхождение? <a href="../../?lead=other#contact">Напишите нам</a>, и мы добавим его в калькуляторы.</p>\n'
            '<nav class="apn" aria-label="Соседние калькуляторы"></nav></div></div>\n<script src="../../assets/j/4431636cc5.js"></script>\n')
    cta = t[t.index('<div class="w"><div class="cta">'):t.index("</div></div></div>", t.index('<div class="w"><div class="cta">')) + 18]
    scripts = ('<script src="../../assets/j/518f08db58.js"></script>\n<script src="../../assets/j/@calc-new.js"></script>\n<script src="../../assets/j/3219c16883.js"></script>\n'
               '<script src="../../assets/j/82ef5376c6.js" data-ia="dh3d"></script>\n<script src="../../assets/j/@calc-viz2.js"></script>\n')
    footer = t[t.index("<footer>"):]
    body0 = t[t.index("<body>"):t.index('<nav class="crumbs')]
    page = head + "</head>" + body0 + f'<nav class="crumbs w" aria-label="Навигация"><a href="../../">DrillHarmony</a> / <a href="../../calculators/">Калькуляторы</a> / {h1}</nav>\n' + main + cta + "\n" + scripts + "</main>\n" + footer
    os.makedirs(os.path.join(SITE, "calculators", slug), exist_ok=True)
    open(os.path.join(SITE, "calculators", slug, "index.html"), "w", encoding="utf-8").write(page)


def block(kind, inputs, outputs, viz, link):
    """Тот же интерактивный расчёт, что на странице калькулятора, — для вставки в статью."""
    ci = "".join(f'<label><span>{l}</span><input id="{i}" inputmode="decimal" value="{v}"><small>{u}</small></label>' for i, l, v, u in inputs)
    co = "".join(f'<div class="co{(" " + c) if c else ""}"><span>{l}</span><b id="{i}">—</b><small>{u}</small></div>' for i, l, u, c in outputs)
    vt, vd, vh = viz
    return (f'<div class="calc" data-calc="{kind}"><div class="ci">{ci}</div><div class="cout">{co}</div></div>\n'
            f'<p class="calc-link">Этот же расчёт отдельной страницей, со ссылкой на ваши цифры: <a href="../../calculators/{link}/">калькулятор</a>.</p>\n'
            f'<section class="wx ia ia-calc" id="iv-{kind}" aria-label="{vt}"><div class="wx-top"><div class="eyebrow">Модель расчёта</div><b>{vt}</b><p>{vd}</p></div><canvas class="ia-cv flat" style="height:{vh}px" role="img" aria-label="{vt}"></canvas></section>\n')

CALC_SCRIPTS = ['518f08db58.js', '@calc-new.js', '3219c16883.js', '82ef5376c6.js', '@calc-viz2.js']
