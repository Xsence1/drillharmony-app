#!/usr/bin/env python3
"""DrillHarmony · сборка веб-части мобильного приложения (app/www) из собранного сайта (dist/).

Порядок: python3 build.py  →  python3 app/mk_app.py  →  cd app && npx cap sync

Что попадает в приложение:
- калькуляторы сайта: те же поля и те же скрипты расчёта, страница перестроена под телефон
  (результат сверху, поля сеткой, схема и пояснения свёрнуты);
- расчёты только для приложения: app/shell/newcalcs.js (формулы из открытых источников);
- интерактивные модели из статей, инструменты, тесты, задача недели, игра;
- справочник: глоссарий и русско-английский словарь, работают без сети.
Ссылки на статьи, форум и страницы продуктов открываются в браузере.
"""
import html, json, os, re, shutil, subprocess, sys
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup

APP = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(APP)
DIST, WWW, SHELL = os.path.join(ROOT, "dist"), os.path.join(APP, "www"), os.path.join(APP, "shell")
SITE = "https://drillharmony.com/"
VERSION = json.load(open(os.path.join(APP, "package.json"), encoding="utf-8"))["version"]

sys.path.insert(0, os.path.join(ROOT, "tools"))
from calc import CNAV  # noqa: E402  названия калькуляторов сайта

# ---------- разделы главного экрана ----------
GROUPS = [
    ("traj", "Траектория", ["minimum-curvature", "toolface", "projection", "dogleg", "landing", "plan-dev", "closure"]),
    ("survey", "Инклинометрия", ["raw-survey", "survey-axes", "short-collar", "sag", "nmdc"]),
    ("drill", "Бурение и КНБК", ["mse", "bit-hydraulics", "motor", "hookload", "critical-rpm", "buoyancy"]),
    ("hyd", "Гидравлика · БРД", ["circ-loss", "ecd", "hydrostatic", "annular-velocity", "well-volume"]),
    ("mud", "Буровые растворы", ["barite", "mud-dilution", "mud-mix", "kill-mud", "rheology", "owr", "solids", "solids-eff", "moisture", "chem", "tank", "pump", "trip-fill"]),
    ("gti", "ГТИ", ["lag", "d-exponent", "eaton", "window"]),
    ("tools", "Инструменты", ["live", "trajectory", "las-viewer", "npt-cost", "units", "cheatsheet"]),
    ("models", "Модели", []),            # заполняется моделями из статей
    ("learn", "Обучение", ["tests", "tasks", "play"]),
    ("game", "Вахта · игра", ["game"]),
]

TOOLS = [  # путь на сайте, slug, имя, значок, раздел
    ("tools/live/", "live", "Онлайн-данные WITS и WITSML", "live"),
    ("tools/trajectory/", "trajectory", "Траектория из таблицы в 3D", "traj"),
    ("tools/las-viewer/", "las-viewer", "Просмотр LAS", "las"),
    ("tools/npt-cost/", "npt-cost", "Сколько стоит скрытое НПВ", "npt"),
    ("calculators/units/", "units", "Перевод единиц", "units"),
    ("cheatsheet/", "cheatsheet", "Шпаргалка ННБ", "sheet"),
    ("tests/", "tests", "Тесты по ННБ", "test"),
    ("tasks/", "tasks", "Задача недели", "task"),
    ("play/", "play", "Игра: посади горизонталь", "play"),
]

# поля калькуляторов сайта, которые берутся из профиля скважины: slug → {id поля: ключ профиля}
SITE_PROF = {
    "raw-survey": {"btr": "bt", "dr": "dip", "cr": "decl"}, "survey-axes": {"bt": "bt", "dip": "dip", "cr": "decl"},
    "short-collar": {"btr": "bt", "dr": "dip", "cr": "decl"}, "nmdc": {"bt": "bt", "dip": "dip"},
    "sag": {"dh": "bit", "od": "dc_od", "id": "dc_id", "rho": "rho"}, "mse": {"d": "bit"},
    "bit-hydraulics": {"q": "q", "rho": "rho", "d": "bit"}, "motor": {"d": "bit"},
    "hookload": {"md": "md", "q": "dp_w", "rho": "rho"}, "ecd": {"rho": "rho", "tvd": "tvd"},
    "hydrostatic": {"rho": "rho", "tvd": "tvd"}, "kill-mud": {"rho": "rho", "tvd": "tvd"},
    "annular-velocity": {"q": "q", "dh": "bit", "dp": "dp_od"},
    "well-volume": {"dc": "csg_id", "lc": "shoe", "dh": "bit", "md": "md", "od": "dp_od", "id": "dp_id", "q": "q"},
    "barite": {"v": "mud_v", "r1": "rho"}, "buoyancy": {"rho": "rho"},
    "critical-rpm": {"len": "md", "dpo": "dp_od", "dpi": "dp_id", "cod": "dc_od", "cid": "dc_id"},
}

# короткие обозначения на значках калькуляторов сайта
ABBR = {"minimum-curvature": "MC", "toolface": "TF", "projection": "→Д", "dogleg": "°/30", "landing": "цель", "raw-survey": "GxB",
        "survey-axes": "XYZ", "short-collar": "НУБТ", "sag": "SAG", "nmdc": "L", "mse": "MSE", "bit-hydraulics": "HSI", "motor": "ВЗД",
        "hookload": "Т", "ecd": "ЭЦП", "hydrostatic": "Pг", "kill-mud": "ρгл", "annular-velocity": "Vа", "well-volume": "Vскв",
        "barite": "BaSO₄", "buoyancy": "Kпл", "critical-rpm": "об", "units": "ppg"}

I = lambda d, w="1.9": f'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round">{d}</svg>'
ICONS = {
    "back": I('<path d="M15 5l-7 7 7 7"/>', "2.2"),
    "star": I('<path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>'),
    "search": I('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>', "2"),
    "go": I('<path d="M9 6l6 6-6 6"/>', "2"),
    # разделы
    "traj": I('<path d="M6 3v6c0 5 4 9 9 10.5"/><circle cx="18" cy="20" r="2" fill="currentColor"/>'),
    "survey": I('<circle cx="12" cy="12" r="8"/><path d="M12 4v3M12 17v3M4 12h3M17 12h3"/><path d="M12 12l3.5-5" stroke-width="2.2"/>'),
    "drill": I('<path d="M12 2v6M9 8h6l-1 7h-4z"/><path d="M10 15l2 7 2-7"/>'),
    "hyd": I('<path d="M12 3c3 4 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-7 6-11z"/><path d="M9 14a3 3 0 0 0 3 3"/>'),
    "mud": I('<path d="M5 8h14l-1.5 12h-11z"/><path d="M5 8l1-4h12l1 4M8 13h8"/>'),
    "gti": I('<path d="M3 20h18"/><path d="M5 17l4-6 3 3 4-7 3 4"/>'),
    "tools": I('<path d="M14.5 6.5a4 4 0 0 0-5.3 5.3L4 17l3 3 5.2-5.2a4 4 0 0 0 5.3-5.3l-2.5 2.5-2.5-.5-.5-2.5z"/>'),
    "models": I('<path d="M12 2l8.5 5v10L12 22l-8.5-5V7z"/><path d="M12 22V12M3.5 7L12 12l8.5-5"/>'),
    "learn": I('<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5"/>'),
    # инструменты
    "live": I('<path d="M3 12h3l2.5-6 4 12 3-9 2 3H21"/>', "2"),
    "las": I('<path d="M4 3v18M12 3v18M20 3v18" opacity=".35"/><path d="M7 3c2 3-2 5 0 8s-1 6 1 10M16 3c-2 4 3 6 0 9s2 5 0 9"/>', "2"),
    "npt": I('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>', "2"),
    "sheet": I('<path d="M6 3h9l4 4v14H6z"/><path d="M9 11h7M9 15h7M9 7h3"/>'),
    "units": I('<path d="M4 7h13l-3-3M20 17H7l3 3"/>'),
    "test": I('<path d="M9 11l2 2 4-4"/><rect x="4" y="3" width="16" height="18" rx="3"/>'),
    "task": I('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17.5h.01"/>'),
    "play": I('<path d="M3 9c5 0 8 2 10 6"/><path d="M3 15h18M3 19h18" opacity=".45"/><circle cx="13.5" cy="15" r="2" fill="currentColor"/>', "2"),
    "game": I('<path d="M6 10h4M8 8v4M15 9h.01M18 11h.01"/><path d="M7 5h10a5 5 0 0 1 5 5v1a5 5 0 0 1-9 3h-2a5 5 0 0 1-9-3v-1a5 5 0 0 1 5-5z"/>'),
    "model": I('<path d="M12 2l8.5 5v10L12 22l-8.5-5V7z"/><path d="M12 22V12M3.5 7L12 12l8.5-5"/>'),
    # вкладки и панель действий
    "t_calc": I('<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M8 7h8M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01"/>'),
    "t_prof": I('<path d="M12 2v20"/><path d="M8 6h8M7 10h10M9 16h6"/><circle cx="12" cy="20" r="1.6" fill="currentColor"/>'),
    "t_hist": I('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>'),
    "t_ref": I('<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z"/><path d="M20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/>'),
    "t_more": I('<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>'),
    "a_prof": I('<path d="M12 3v18"/><path d="M8 7h8M7 11h10M9 16h6"/>'),
    "a_reset": I('<path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.6"/><path d="M4 4v4.6h4.6"/>'),
    "a_copy": I('<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'),
    "a_share": I('<path d="M12 3v12M7.5 7.5L12 3l4.5 4.5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>'),
    "a_save": I('<path d="M6 3h12v18l-6-4-6 4z"/>'),
}
# официальный знак DrillHarmony (favicon.svg сайта, цвета не меняются): плашка, линии пластов, траектория со входом в пласт
MARK = ('<svg class="mark" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#f2a541"/>'
        '<path d="M8 17H56M8 25H56" stroke="rgba(27,18,4,.25)" stroke-width="2.5" stroke-linecap="round"/>'
        '<path d="M19 7V24C19 36 27 45 39 50.5C43.5 52.5 47.5 53.5 51 53.6" fill="none" stroke="#1b1204" stroke-width="7.5" stroke-linecap="round"/>'
        '<circle cx="51.5" cy="53.6" r="6.2" fill="#1b1204"/></svg>')
WORDMARK = f'<span class="brand">{MARK}<span class="wm">Drill<b>Harmony</b></span></span>'


def esc(s):
    return html.escape(s, quote=True)


def soup(path):
    return BeautifulSoup(open(path, encoding="utf-8").read(), "html.parser")


def short_desc(d):
    """Описание для списка в приложении: без поисковых оборотов «онлайн», «в браузере», «бесплатный»."""
    if d.startswith("Онлайн-калькулятор") and ": " in d[:90]:
        d = d.split(": ", 1)[1]
        d = d[0].upper() + d[1:]
    d = re.sub(r"^Онлайн-калькулятор ", "Расчёт ", d)
    d = re.sub(r"^Онлайн-перевод", "Перевод", d)
    d = re.sub(r"^Бесплатный просмотрщик LAS-файлов в браузере", "Просмотр LAS-файлов", d)
    d = re.sub(r"^Браузерная игра", "Игра", d)
    d = re.sub(r"\s*Без регистрации\.", "", d)
    return re.sub(r"\s+онлайн\b", "", d).strip()


def page_desc(s):
    d = s.find("meta", attrs={"name": "description"})
    return short_desc(d["content"] if d else "")


def js_head(name):
    p = os.path.join(DIST, "assets/j", os.path.basename(name))
    return open(p, encoding="utf-8").read(400) if os.path.exists(p) else ""


def is_dropped_script(src):
    """Скрипты сайта, которые в приложении не нужны: меню шапки, сворачивание бокового меню, фон."""
    if src.endswith("bg.js"):
        return True
    t = js_head(src)
    return 'querySelector("header.top")' in t or ('querySelector(".anav")' in t and len(t) < 200)


def fix_links(root, path, app_paths, up):
    """Свои страницы открываются внутри приложения, остальное — на сайте в браузере."""
    for a in root.find_all("a", href=True):
        href = a["href"]
        if href.startswith(("mailto:", "tel:", "#", "javascript:")):
            continue
        u = urlparse(urljoin(SITE + path, href))
        if u.netloc == "drillharmony.com":
            sp = u.path.lstrip("/")
            if sp in app_paths:
                a["href"] = up + app_paths[sp] + "index.html" + (("#" + u.fragment) if u.fragment else "")
                continue
        a["href"] = u.geturl()
        a["class"] = (a.get("class") or []) + ["ext"]
        a["rel"] = "noopener"


def app_texts(root):
    for node in root.find_all(string=True):
        if node.parent.name in ("script", "style"):
            continue
        new = (str(node).replace("на вашем компьютере", "на вашем устройстве").replace("прямо в браузере", "прямо в приложении")
               .replace("Перетащите LAS-файл сюда", "Откройте LAS-файл").replace("мышью или пальцем", "пальцем"))
        if new != str(node):
            node.replace_with(new)


def assets_of(s):
    css = [l["href"] for l in s.find_all("link", rel="stylesheet")]
    head_js = [x["src"] for x in s.head.find_all("script", src=True)]
    body_js = []
    for sc in s.body.find_all("script"):
        if sc.get("type") == "application/ld+json":
            continue
        if sc.get("src"):
            if not is_dropped_script(sc["src"]):
                body_js.append(f'<script src="{sc["src"]}"{" defer" if sc.has_attr("defer") else ""}></script>')
        elif sc.string and sc.string.strip():
            body_js.append(f"<script>{sc.string}</script>")
    return css, head_js, body_js


def fold(summary, inner, cls=""):
    return f'<details class="fold{(" " + cls) if cls else ""}"><summary>{summary}</summary><div class="fold-b">{inner}</div></details>'


def write_page(path, title, group, slug, kind, body, css, head_js, body_js, extra="", src_path=None, actbar=False):
    up = "../" * path.count("/")
    star = f'<button class="ib star" type="button" aria-label="В избранное" aria-pressed="false">{ICONS["star"]}</button>'
    reset = f'<button class="ib" type="button" data-a="reset" aria-label="Сбросить значения">{ICONS["a_reset"]}</button>' if actbar else ""
    act = ""
    if actbar:
        b = lambda k, ic, t: f'<button type="button" data-a="{k}">{ICONS[ic]}<span>{t}</span></button>'
        act = (f'<nav class="actbar" aria-label="Действия">{b("prof", "a_prof", "Из профиля")}'
               f'{b("copy", "a_copy", "Копировать")}{b("share", "a_share", "Поделиться")}'
               f'<button type="button" class="act-pri" data-a="save">{ICONS["a_save"]}<span>Сохранить</span></button></nav>')
    src = f'<a class="srcrow ext" href="{SITE}{src_path}" rel="noopener"><span>Открыть на сайте</span><small>drillharmony.com/{src_path}</small></a>' if src_path else ""
    out = f'''<!doctype html>
<html lang="ru" data-theme="dark"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0a0f14"><meta name="format-detection" content="telephone=no">
<title>{esc(title)} · DrillHarmony</title>
{"".join(f'<script src="{x}"></script>' for x in head_js)}
{"".join(f'<link rel="stylesheet" href="{x}">' for x in css)}
<link rel="stylesheet" href="{up}app/app.css"><script src="{up}app/app.js"></script><script src="{up}app/fx.js"></script>
</head><body class="in-app k-{kind}{" has-act" if actbar else ""}" data-slug="{slug}" data-path="{src_path or ""}" data-kind="{kind}" data-name="{esc(title)}">
<header class="abar"><a class="ib" href="{up}index.html" data-back aria-label="Назад">{ICONS["back"]}</a>
<div class="ttl"><small>{esc(group)}</small><span>{esc(title)}</span></div>{reset}{star}
<button id="theme" type="button" hidden aria-hidden="true"></button></header>
<main class="app-main">
{body}
{src}
</main>
{act}{extra}
{"".join(body_js)}
</body></html>
'''
    dst = os.path.join(WWW, path, "index.html")
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    open(dst, "w", encoding="utf-8").write(out)


def strip_site(art):
    for sel in ["aside.calc-lead", "section.rel", "nav.apn", "p.calc-ask", ".cta", "aside.anav-wrap", "div.eyebrow"]:
        for el in art.select(sel):
            el.decompose()
    for p in art.select("p"):                                   # приглашения оставить заявку
        if p.find("a", href=re.compile(r"lead=|#contact")):
            p.decompose()
    for b in art.select('#np-print, button[onclick*="print"]'):   # печать в WebView недоступна; скрипт ищет кнопку
        b["hidden"] = ""
    for b in art.select("#np-link"):
        b.string = "Поделиться расчётом"
    for i in art.select('input[type=file]'):                    # на Android .las не сопоставлен типу
        if i.has_attr("accept"):
            del i["accept"]


def calc_layout(art, soup_, prof):
    """Калькулятор: результат сверху, поля сеткой, схема и пояснения свёрнуты."""
    calc = art.select_one(".calc")
    ci, cout = calc.select_one(".ci"), calc.select_one(".cout")
    cout.extract()
    calc.insert(0, cout)
    for iid, key in (prof or {}).items():
        inp = calc.find(id=iid)
        if inp and inp.find_parent("label"):
            inp.find_parent("label")["data-p"] = key
    for lab in ci.find_all("label"):
        sm = lab.find("small")
        if sm and sm.get_text(strip=True):
            lab["data-u"] = sm.get_text(" ", strip=True)
            if lab.find("span"):
                lab.find("span")["data-u"] = lab["data-u"]
    for el in art.select(".calc-act [data-act]"):
        el.parent["hidden"] = ""
    viz = art.select_one("section.ia-calc")
    keep = {id(calc)}
    act = art.select_one(".calc-act")
    mode = art.select_one(".cmode")
    if act: keep.add(id(act))
    if mode: keep.add(id(mode))
    rest = [el for el in list(art.children) if getattr(el, "name", None) and id(el) not in keep and el is not viz]
    ref_html = "".join(str(el.extract()) for el in rest)
    parts = []
    if viz:
        viz.extract()
        top = viz.select_one(".wx-top")
        if top: top.decompose()
        parts.append(fold("Схема", str(viz), "viz"))
    if ref_html.strip():
        parts.append(fold("Как считается", ref_html, "ref"))
    for p in parts:
        art.append(BeautifulSoup(p, "html.parser"))


def convert(path, out_path, title, group, slug, kind, app_paths, prof=None, section=None):
    s = soup(os.path.join(DIST, path, "index.html"))
    up = "../" * out_path.count("/")
    art = s.find("main").find(class_="article")
    if section is not None:                                     # модель из статьи: только её блок
        sec = art.find(id=section)
        top = sec.select_one(".wx-top")
        if top:
            for el in top.select(".eyebrow, b"):
                el.decompose()
            for p in top.find_all("p"):
                p["class"] = (p.get("class") or []) + ["hint"]
        art = BeautifulSoup(f'<article class="article">{sec}</article>', "html.parser").article
    strip_site(art)
    fix_links(art, path, app_paths, up)
    app_texts(art)
    for b in art.select('.calc-act [data-act="link"]'):
        b.string = "Поделиться"
    if kind == "calc":
        calc_layout(art, s, prof)
    else:
        h1 = art.find("h1")
        if h1: h1["class"] = (h1.get("class") or []) + ["vh"]
        lead = art.select_one("p.lead")
        if lead: lead["class"] = lead.get("class") + ["hint"]
    css, head_js, body_js = assets_of(s)
    lb = s.find("dialog", id="lb")
    write_page(out_path, title, group, slug, kind, str(art), css, head_js, body_js, extra=str(lb or ""),
               src_path=(path if section is None else path + "#" + section), actbar=(kind == "calc"))
    return s


def new_calc_pages(ref_soup, app_paths):
    """Расчёты приложения: разметка из app/shell/newcalcs.js, общий движок калькуляторов сайта."""
    meta = json.loads(subprocess.check_output(["node", "-e", "process.stdout.write(JSON.stringify(require(process.argv[1]).meta))",
                                               os.path.join(SHELL, "newcalcs.js")]))
    css, head_js, body_js = assets_of(ref_soup)
    keep = ("const N=", "Оформление результатов", 'getElementById("theme").onclick', "fromCharCode(100,114")
    body_js = [x for x in body_js if any(k in js_head(re.search(r'src="([^"]+)"', x).group(1)) for k in keep)] if body_js else []
    body_js.append('<script src="../../app/newcalcs.js"></script>')
    assert any("const N=" in js_head(re.search(r'src="([^"]+)"', x).group(1)) for x in body_js[:-1]), "не найден движок калькуляторов"
    items = []
    for m in meta:
        path = f"calculators/{m['slug']}/"
        art = BeautifulSoup(f'<article class="article">{m["html"]}</article>', "html.parser").article
        calc_layout(art, None, m["prof"])
        write_page(path, m["name"], m["group"], m["slug"], "calc", str(art), css, head_js, body_js, actbar=True)
        items.append({"slug": m["slug"], "name": m["name"], "desc": m["desc"], "href": path + "index.html", "icon": m["abbr"], "kind": "calc", "app": 1})
    return items


def models(app_paths):
    """Интерактивные модели из статей сайта."""
    found, seen = [], set()
    for d in sorted(os.listdir(os.path.join(DIST, "articles"))):
        p = os.path.join(DIST, "articles", d, "index.html")
        if not os.path.exists(p):
            continue
        s = soup(p)
        for el in s.select("section.wx.ia[id^=ia-]"):
            sid = el["id"]
            if sid in seen:
                continue
            seen.add(sid)
            t = el.select_one(".wx-top b")
            hint = el.select_one(".wx-top p")
            found.append((f"articles/{d}/", sid, t.get_text(" ", strip=True) if t else sid,
                          hint.get_text(" ", strip=True) if hint else ""))
    items = []
    for path, sid, name, hint in found:
        slug = sid[3:]
        out = f"models/{slug}/"
        app_paths[f"{path}#{sid}"] = out
        items.append({"slug": "m-" + slug, "name": name, "desc": first_sentence(hint), "href": out + "index.html", "icon": "model", "kind": "model",
                      "src": path, "sid": sid, "out": out})
    return items


def first_sentence(t):
    m = re.match(r"(.+?[.!?])(\s|$)", t)
    return (m.group(1) if m else t)[:150]


def reference():
    """Глоссарий и словарь сайта → www/app/ref.js."""
    g = soup(os.path.join(DIST, "articles/glossary/index.html"))
    gloss = [[dt.get_text(" ", strip=True), dt.find_next_sibling("dd").get_text(" ", strip=True)] for dt in g.select("dl.gloss dt")]
    d = soup(os.path.join(DIST, "articles/dictionary/index.html"))
    dic, sec = [], ""
    for el in d.select("#dict h3, #dict tbody tr"):
        if el.name == "h3":
            sec = el.get_text(strip=True)
        else:
            td = [x.get_text(" ", strip=True) for x in el.find_all("td")]
            dic.append([sec] + td[:3] + [""] * (3 - len(td[:3])))
    assert len(gloss) > 20 and len(dic) > 100, (len(gloss), len(dic))
    open(os.path.join(WWW, "app/ref.js"), "w", encoding="utf-8").write(
        "window.DH_REF=" + json.dumps({"gloss": gloss, "dict": dic}, ensure_ascii=False, separators=(",", ":")) + ";\n")
    return len(gloss), len(dic)


def patch_assets():
    """Копирование и запись результатов: в приложении через буфер обмена и меню «Поделиться» системы."""
    n = 0
    for f in os.listdir(os.path.join(WWW, "assets/j")):
        p = os.path.join(WWW, "assets/j", f)
        t = open(p, encoding="utf-8").read()
        # схемы калькуляторов: обновление схемы, которой нет на странице, давало ошибку при каждом вводе
        t2 = re.sub(r"(\b[A-Za-z_$]+)\(\(\)=>([A-Za-z_$]+)\.invalidate\(\)\)", r"\1(()=>\2&&\2.invalidate())", t)
        if t2 != t:
            t = t2
            open(p, "w", encoding="utf-8").write(t)
        if "const calcCopy=(e,t,c)=>{" in t:
            t = t.replace("const calcCopy=(e,t,c)=>{", "const calcCopy=(e,t,c)=>{if(window.dhAppCopy)return window.dhAppCopy(e,t,c);", 1)
            t = t.replace('if("link"===t)return calcCopy(c,e,"Ссылка скопирована")',
                          'if("link"===t)return(window.dhAppShare||calcCopy)(c,e,"Ссылка скопирована")', 1)
            assert "dhAppShare" in t, "не найден обработчик ссылки в " + f
            open(p, "w", encoding="utf-8").write(t)
            n += 1
    assert n == 1, f"ожидался один файл с calcCopy, найдено {n}"


def home(items, groups, css_links):
    items = [dict(x, svg=ICONS[x["icon"]]) if x["icon"] in ICONS else x for x in items]
    data = json.dumps({"items": items, "groups": groups, "version": VERSION}, ensure_ascii=False, separators=(",", ":"))
    tab = lambda k, ic, name, sel: f'<button type="button" role="tab" data-tab="{k}" aria-selected="{sel}">{ICONS[ic]}<span>{name}</span></button>'
    gi = {k: ICONS[k] for k, _, _ in GROUPS}
    gi.update(live=ICONS["live"], well=ICONS["t_prof"], fav=ICONS["star"], recent=ICONS["t_hist"])
    return f'''<!doctype html>
<html lang="ru" data-theme="dark"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0a0f14"><meta name="format-detection" content="telephone=no">
<title>DrillHarmony</title>
<link rel="stylesheet" href="fonts/fonts.css">{css_links}
<link rel="stylesheet" href="app/app.css"><script src="app/app.js"></script><script src="app/fx.js"></script>
</head><body class="in-app home-b">
<main class="home">
<h1 class="lt" id="lt"><span class="lt-brand">{MARK}<span>Drill<b>Harmony</b></span></span></h1>
<section data-pane="calc">
<div class="srch ios-srch">{ICONS["search"]}<input id="q" type="search" placeholder="Поиск по расчётам" autocomplete="off" enterkeyhint="search" aria-label="Поиск"><button type="button" id="q-x" class="hidden" aria-label="Очистить">×</button></div>
<div class="surface" id="heroes"><canvas id="hero3d" data-cx="36" aria-label="3D-сцена: вышка на устье скважины"></canvas>
<div class="surface-t"><small>Устье · 0 м</small><b>Буровая в кармане</b><span>40 расчётов, 20 моделей. Листайте вниз — бурим.</span></div></div>
<div id="grid" class="well"></div><div class="bit" id="bit" aria-hidden="true"><i></i><b id="bitd">0 м</b></div>
<div id="sect" class="hidden"><button type="button" class="nav-back" id="sect-back">{ICONS["back"]}<span>Расчёты</span></button><h2 class="lt-h" id="sect-t"></h2><p class="lt-sub" id="sect-n"></p><div class="glist" id="sect-l"></div></div>
<div id="found" class="glist hidden"></div><p id="none" class="empty hidden">Ничего не нашлось. Попробуйте другое слово, например «зенит» или «ppg».</p>
</section>
<section data-pane="prof" class="hidden"></section>
<section data-pane="hist" class="hidden"></section>
<section data-pane="ref" class="hidden"></section>
<section data-pane="more" class="hidden">{MORE}</section>
</main>
<nav class="tabs" role="tablist">{tab("calc", "t_calc", "Расчёты", "true")}{tab("prof", "t_prof", "Скважина", "false")}{tab("hist", "t_hist", "История", "false")}{tab("ref", "t_ref", "Справочник", "false")}{tab("more", "t_more", "Ещё", "false")}</nav>
<script>window.DH={data};window.DH_GI={json.dumps(gi, ensure_ascii=False)};window.DH_IC={json.dumps({k: ICONS[k] for k in ("go", "star", "search")}, ensure_ascii=False)};</script>
<script src="app/ref.js"></script>
<script src="app/home.js"></script>
</body></html>
'''


MORE = f'''
<div class="card brandcard">{MARK}<div><b>DrillHarmony</b><span>Расчёты и инструменты инженера ННБ, бурового и ГТИ. Работают без интернета. Версия {VERSION}.</span></div></div>
<div class="card"><h2>Оформление</h2><div class="seg" id="themes"><button type="button" data-t="dark">Тёмная</button><button type="button" data-t="light">Светлая</button></div>
<h2 class="mt">Анимации и 3D</h2><div class="seg" id="anims"><button type="button" data-f="1">Включены</button><button type="button" data-f="0">Выключены</button></div>
<h2 class="mt">Размер текста</h2><div class="seg" id="sizes"><button type="button" data-s="s">Мельче</button><button type="button" data-s="m">Обычный</button><button type="button" data-s="l">Крупнее</button></div></div>
<div class="card"><h2>Избранное</h2><div class="list" id="favs"></div><p id="fav-none" class="muted">Отметьте расчёт звёздочкой в его заголовке.</p></div>
<div class="card"><h2>Данные</h2>
<p>Приложение не собирает персональные данные и ничего не отправляет на сервер. Профили скважин, история, избранное и введённые значения хранятся только на этом устройстве.</p>
<div class="rows2"><button type="button" class="row" id="clear">Очистить введённые значения<small>профили и история останутся</small></button><button type="button" class="row danger" id="clear-all">Удалить все данные приложения<small>профили, история, избранное</small></button></div></div>
<div class="card"><h2>Важно</h2><p>Расчёты справочные. Проектные решения принимаются по утверждённым методикам, программе на бурение и регламентам вашей компании.</p></div>
<div class="card rows">
<a href="{SITE}articles/" rel="noopener">Статьи по ННБ</a>
<a href="{SITE}forum/" rel="noopener" data-inapp>Форум DrillHarmony</a>
<a href="{SITE}slidex/" rel="noopener">SlideX</a>
<a href="{SITE}tempo/" rel="noopener">Tempo</a>
<a href="{SITE}etude/" rel="noopener">Etude</a>
<a href="{SITE}privacy.html" rel="noopener">Политика конфиденциальности</a>
<a href="mailto:info@drillharmony.com">info@drillharmony.com</a>
</div>
<p class="foot">© ИП Шайсламова А. В. · DrillHarmony.com</p>
'''


def main():
    if not os.path.isdir(DIST):
        sys.exit("Нет dist/. Сначала соберите сайт: python3 build.py")
    if os.path.isdir(WWW):
        shutil.rmtree(WWW)
    os.makedirs(WWW)
    for d in ("assets", "fonts"):
        shutil.copytree(os.path.join(DIST, d), os.path.join(WWW, d))
    for f in ("favicon.svg", "icon-192.png", "icon-512.png"):
        shutil.copy(os.path.join(DIST, f), WWW)
    shutil.copytree(SHELL, os.path.join(WWW, "app"))
    patch_assets()

    names = {s: n for _, it in CNAV for s, n in it}
    calcs = [s for s in names if s != "units" and os.path.exists(os.path.join(DIST, "calculators", s, "index.html"))]
    app_paths = {f"calculators/{s}/": f"calculators/{s}/" for s in calcs}
    app_paths.update({p: p for p, *_ in TOOLS})
    mods = models(app_paths)
    group_of = {s: t for k, t, sl in GROUPS for s in sl}

    items = []
    for s in calcs:
        path = f"calculators/{s}/"
        src = convert(path, path, names[s], group_of.get(s, "Расчёты"), s, "calc", app_paths, prof=SITE_PROF.get(s))
        items.append({"slug": s, "name": names[s], "desc": page_desc(src), "href": path + "index.html", "icon": ABBR.get(s, "∑"), "kind": "calc"})
    ref_soup = soup(os.path.join(DIST, "calculators", "ecd", "index.html"))
    items += new_calc_pages(ref_soup, app_paths)
    for path, slug, n, ic in TOOLS:
        src = convert(path, path, n, group_of.get(slug, "Инструменты"), slug, "tool", app_paths)
        items.append({"slug": slug, "name": n, "desc": page_desc(src), "href": path + "index.html", "icon": ic, "kind": "tool"})
    # игра «Вахта»: отдельная страница без стилей сайта
    os.makedirs(os.path.join(WWW, "game"), exist_ok=True)
    shutil.copy(os.path.join(SHELL, "game.html"), os.path.join(WWW, "game", "index.html"))
    items.append({"slug": "game", "name": "Вахта: смена на буровой", "desc": "RPG: выбери героя, выполняй задания, успей в баню", "href": "game/index.html", "icon": "game", "kind": "game"})
    for m in mods:
        convert(m["src"], m["out"], m["name"], "Модели", m["slug"], "model", app_paths, section=m["sid"])
        items.append({k: m[k] for k in ("slug", "name", "desc", "href", "icon", "kind")})

    known = {x["slug"] for x in items}
    groups = []
    for k, t, sl in GROUPS:
        sl = [x["slug"] for x in mods] if k == "models" else sl
        miss = [s for s in sl if s not in known]
        assert not miss, f"нет страниц для {miss}"
        groups.append({"k": k, "t": t, "s": sl})
    placed = {s for g in groups for s in g["s"]}
    assert placed == known, f"не разложены по разделам: {known - placed}"

    css_links = "".join(f'<link rel="stylesheet" href="{l["href"].replace("../../", "")}">' for l in ref_soup.find_all("link", rel="stylesheet") if "fonts.css" not in l["href"])
    open(os.path.join(WWW, "index.html"), "w", encoding="utf-8").write(home(items, groups, css_links))
    ng, nd = reference()
    nc = sum(1 for x in items if x["kind"] == "calc")
    print(f"www: {nc} расчётов ({sum(1 for x in items if x.get('app'))} только в приложении), {len(mods)} моделей, "
          f"{len(TOOLS)} инструментов и разделов обучения, справочник {ng} терминов и {nd} слов")


if __name__ == "__main__":
    main()
