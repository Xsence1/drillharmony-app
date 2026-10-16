"""Раздел «Тесты» и печатная «Шпаргалка инженера ННБ»."""
import json, os, re, sys
sys.path.insert(0, "/home/claude/proj/tools")
SITE = "/home/claude/proj/site"
TPL = open(os.path.join(SITE, "articles/toolface/index.html"), encoding="utf-8").read()

def page(path, title, h1, desc, crumb, eyebrow, side, body, scripts, css=("@articles.css",)):
    pre = "../" * path.strip("/").count("/") + "../"
    head = TPL[:TPL.index("</head>")]
    head = re.sub(r"<title>.*?</title>", f"<title>{title} | DrillHarmony</title>", head, flags=re.S)
    head = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{desc}">', head)
    head = head.replace("articles/toolface/", path)
    head = re.sub(r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{title} | DrillHarmony">', head)
    head = re.sub(r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{desc}">', head)
    head = re.sub(r'<script type="application/ld\+json">.*?</script>', lambda m: '<script type="application/ld+json">' + json.dumps({"@context": "https://schema.org", "@type": "WebPage", "name": h1, "description": desc, "inLanguage": "ru", "url": "https://drillharmony.com/" + path}, ensure_ascii=False) + "</script>", head, flags=re.S)
    head = head.replace("../../", pre)
    for c in css: head += f'<link rel="stylesheet" href="{pre}assets/c/{c}">'
    hdr = TPL[TPL.index("<body>"):TPL.index('<nav class="crumbs')].replace("../../", pre)
    foot = TPL[TPL.index("<footer>"):].replace("../../", pre)
    sc = "".join(f'<script src="{pre}assets/j/{x}"></script>\n' for x in scripts)
    html = (head + "</head>" + hdr + f'<nav class="crumbs w" aria-label="Навигация"><a href="{pre}">DrillHarmony</a> / {crumb}</nav>\n<main>\n<div class="w artwrap">{side}\n'
            f'<article class="article">\n<div class="eyebrow">{eyebrow}</div>\n<h1>{h1}</h1>\n{body}\n</article></div>\n<script src="{pre}assets/j/4431636cc5.js"></script>\n{sc}</main>\n' + foot)
    os.makedirs(os.path.join(SITE, path), exist_ok=True)
    open(os.path.join(SITE, path, "index.html"), "w", encoding="utf-8").write(html)

if __name__ != "__main__":
    pass
SETS = [("trajectory", "Траектория и замеры"), ("orientation", "Ориентирование и слайд"), ("hydraulics", "Гидравлика и очистка"), ("drilling", "Бурение, долото, колонна"), ("data", "Данные: WITS и WITSML"), ("interview", "Собеседование: смешанный")]
side = ('<aside class="anav-wrap"><details class="anav" open><summary>Тесты</summary><nav aria-label="Тесты"><div class="ang"><div class="ang-h">Темы</div>'
        + "".join(f'<a href="#{k}">{n}</a>' for k, n in SETS) + '</div><div class="ang ang-more"><a href="../cheatsheet/">Шпаргалка ННБ</a><a href="../articles/">Статьи</a><a href="../calculators/">Калькуляторы</a></div></nav></details></aside>')
body = ('<p class="lead">Проверьте себя по темам наклонно-направленного бурения: 8 вопросов в каждом тесте, вопросы и варианты каждый раз в новом порядке. После проверки появится объяснение и ссылка на статью или калькулятор.</p>'
        '<div class="tldr"><b>Как устроено</b><ul><li>Отвечайте на все вопросы и нажмите «Проверить».</li><li>«Другие вопросы» дают новую выборку и порядок.</li><li>Ответы не сохраняются и никуда не отправляются.</li></ul></div>'
        + "".join(f'<h2 id="{k}">{n}</h2><div class="quiz" data-set="{k}" data-n="8"></div>' for k, n in SETS)
        + '<div class="note"><b>Полноценная аттестация</b>, с экзаменами под контролем сервера, сертификатами и разбором каждой попытки, есть в тренажёре <a href="../slidex/">SlideX</a>.</div>')
page("tests/", "Тесты по наклонно-направленному бурению — проверьте себя", "Тесты по ННБ",
     "Бесплатные тесты по наклонно-направленному бурению: траектория и замеры, ориентирование и слайд, гидравлика, долото и колонна, WITS и WITSML. С объяснениями и ссылками на статьи.",
     "Тесты", "Тесты", side, body, ["@quiz.js"])

# ---------- шпаргалка ----------
cs = '''<p class="lead">Основные формулы и переводы единиц на одной странице. Нажмите «Распечатать», и получится лист A4, который удобно держать в вагончике. Сохранить в PDF можно там же, в окне печати.</p>
<p class="noprint"><button type="button" class="btn pri" onclick="window.print()">Распечатать или сохранить PDF</button></p>
<div class="cs-grid">
<section><h3>Интенсивность и радиус</h3><div class="formula">°/30 м  = °/10 м × 3
°/100 ft = °/10 м × 3,048
R, м = 1718,9 / DLS(°/30 м)
L набора = ΔI / DLS × 30</div></section>
<section><h3>Toolface и слайд</h3><div class="formula">ΔI ≈ DLS · L/30 · cos TF
ΔA ≈ DLS · L/30 · sin TF / sin I
Слайд, м = поворот / DLS × 30
TF на пульте = TF нужный + реактивный</div></section>
<section><h3>Азимуты</h3><div class="formula">Истинный = магнитный + склонение
Дирекционный = истинный − сближение
(восточное склонение — со знаком +)</div></section>
<section><h3>Посадка</h3><div class="formula">ΔTVD дуги = R · (sin I2 − sin I1)
DLS сесть сразу =
  1718,9 · (sin I2 − sin I1) / ΔTVD</div></section>
<section><h3>Давление</h3><div class="formula">P, МПа = 0,00981 · ρ(г/см³) · TVD(м)
ЭЦП = ρ + ΔPзатр / (0,00981 · TVD)
ρглуш = ρ + Pтр / (0,00981 · TVD)</div></section>
<section><h3>Объёмы</h3><div class="formula">V, л/м = π/4 · D²(мм) / 1000
Затруб, л/м = π/4 · (D² − d²) / 1000
Lag, мин = Vзатр(л) / Q(л/с) / 60
v затр, м/с = Q / Aзатр</div></section>
<section><h3>Колонна</h3><div class="formula">Kп = 1 − ρр / 7,85
Вес в растворе = вес в воздухе · Kп
Подъём = вес + трение
Спуск  = вес − трение</div></section>
<section><h3>Долото и ВЗД</h3><div class="formula">TFA = Σ n · π/4 · (d/32 · 25,4)²
ΔPдол = ρ · v² / (2 · 0,95²)
Mвзд ≈ Mmax · Δp / Δpmax
MSE = WOB/A + 2π·N·T / (A·ROP)</div></section>
<section><h3>Единицы</h3><div class="formula">1 фут = 0,3048 м    1 дюйм = 25,4 мм
1 psi = 6,895 кПа  1 МПа = 145 psi
1 т = 9,807 кН     1 klbf = 4,448 кН
1 bbl = 159 л      1 gal = 3,785 л
1 ppg = 0,1198 г/см³</div></section>
</div>
<p class="small muted">Справочные формулы для оценки. Проектные решения принимаются по утверждённым методикам и программе на бурение. Все расчёты с пояснениями есть в <a href="../calculators/">калькуляторах</a>.</p>'''
side2 = '<aside class="anav-wrap"><details class="anav" open><summary>Разделы</summary><nav aria-label="Разделы"><div class="ang"><div class="ang-h">Инженеру ННБ</div><a href="../articles/">Статьи</a><a href="../calculators/">Калькуляторы</a><a href="../tests/">Тесты</a><a href="../cheatsheet/" aria-current="page">Шпаргалка</a></div></nav></details></aside>'
page("cheatsheet/", "Шпаргалка инженера ННБ: формулы и единицы на одном листе", "Шпаргалка инженера ННБ",
     "Формулы наклонно-направленного бурения на одном листе для печати: интенсивность, toolface, азимуты, посадка, давление, объёмы, колонна, долото и ВЗД, перевод единиц.",
     "Шпаргалка", "Инженеру ННБ", side2, cs, [])
print("ok")
