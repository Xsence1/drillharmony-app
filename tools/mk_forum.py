"""Шаблон страниц форума: шапка и подвал сайта + метки для PHP ({{TITLE}}, {{MAIN}} …)."""
import json, os, re, sys
sys.path.insert(0, "/home/claude/proj/tools")
SITE = "/home/claude/proj/site"
TPL = open(os.path.join(SITE, "articles/toolface/index.html"), encoding="utf-8").read()
pre = "../"
head = TPL[:TPL.index("</head>")]
head = re.sub(r"<title>.*?</title>", "<title>{{TITLE}} | DrillHarmony</title>", head, flags=re.S)
head = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="{{DESC}}">', head)
head = head.replace("articles/toolface/", "forum/{{PATH}}")
head = re.sub(r'<meta property="og:title" content="[^"]*">', '<meta property="og:title" content="{{TITLE}}">', head)
head = re.sub(r'<meta property="og:description" content="[^"]*">', '<meta property="og:description" content="{{DESC}}">', head)
head = re.sub(r'<meta property="og:type" content="[^"]*">', '<meta property="og:type" content="website">', head)
ld = {"@context": "https://schema.org", "@type": "WebPage", "name": "Форум DrillHarmony", "inLanguage": "ru", "isPartOf": {"@type": "WebSite", "name": "DrillHarmony.com", "url": "https://drillharmony.com/"}}
head = re.sub(r'<script type="application/ld\+json">.*?</script>', lambda m: '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + "</script>", head, flags=re.S)
head = head.replace("../../", pre)
for c in ("@articles.css", "@forum.css"): head += f'<link rel="stylesheet" href="{pre}assets/c/{c}">'
hdr = TPL[TPL.index("<body>"):TPL.index('<nav class="crumbs')].replace("../../", pre)
foot = TPL[TPL.index("<footer>"):].replace("../../", pre)
# на форуме в подвале без строк про ИП и авторские права
foot = re.sub(r"<br>ИП [^<]*?· (<a [^>]*privacy[^>]*>[^<]*</a>)<br>©[^<]*", r"<br>\1", foot)
html = (head + "</head>" + hdr + '<nav class="crumbs w" aria-label="Навигация">{{CRUMB}}</nav>\n<main class="w f-wrap">\n{{USERBAR}}\n{{MAIN}}\n</main>\n'
        f'<script src="{pre}assets/j/@forum.js" defer></script>\n' + foot)
open(os.path.join(SITE, "forum/layout.html"), "w", encoding="utf-8").write(html)
print("ok forum layout")
