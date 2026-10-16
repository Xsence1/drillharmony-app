#!/usr/bin/env python3
"""DrillHarmony site build.

site/  — HTML и готовые ассеты (то, что уже было собрано раньше)
src/js, src/css — читаемые исходники нового кода
dist/  — результат: минифицированные файлы с хешем в имени, пропатченный HTML

В HTML исходники подключаются как  assets/j/@name.js  и  assets/c/@name.css  —
сборка заменяет @name на хеш содержимого. Кроме того, на каждую страницу
добавляются общие fix.css и nav.js, а assets/page.css получает хешированное имя,
чтобы телефоны не брали из кеша старую версию стилей.
"""
import hashlib, os, re, shutil, subprocess, sys, zipfile, datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE, SRC, DIST = (os.path.join(ROOT, d) for d in ("site", "src", "dist"))
ESBUILD = "/opt/npm-tools/node_modules/.bin/esbuild"


def h10(data: bytes) -> str:
    return hashlib.sha1(data).hexdigest()[:10]


def minify(path: str, loader: str) -> bytes:
    out = subprocess.run([ESBUILD, path, "--minify", "--charset=utf8", "--log-level=warning"]
                         + (["--target=es2020"] if loader == "js" else []),
                         capture_output=True, check=True)
    if out.stderr:
        sys.stderr.write(out.stderr.decode())
    return out.stdout


def main():
    if os.path.isdir(DIST):
        for n in os.listdir(DIST):
            p = os.path.join(DIST, n)
            shutil.rmtree(p) if os.path.isdir(p) and not os.path.islink(p) else os.remove(p)
    shutil.copytree(SITE, DIST, dirs_exist_ok=True)

    names = {}  # "@x.js" -> "hash.js"
    for kind, ext, sub in (("js", ".js", "j"), ("css", ".css", "c")):
        d = os.path.join(SRC, kind)
        for f in sorted(os.listdir(d)):
            if not f.endswith(ext):
                continue
            data = minify(os.path.join(d, f), kind)
            hn = h10(data) + ext
            with open(os.path.join(DIST, "assets", sub, hn), "wb") as fh:
                fh.write(data)
            names["@" + f] = hn

    # page.css -> хешированное имя (кеш браузера)
    pc = open(os.path.join(DIST, "assets", "page.css"), "rb").read()
    page_css = h10(pc) + ".css"
    shutil.copy(os.path.join(DIST, "assets", "page.css"), os.path.join(DIST, "assets", "c", page_css))
    # старый файл оставляем — на него могут ссылаться закешированные страницы

    missing = set()
    for dp, _, fs in os.walk(DIST):
        for f in fs:
            if not f.endswith(".html"):
                continue
            p = os.path.join(dp, f)
            s = open(p, encoding="utf-8").read()
            rel = os.path.relpath(DIST, dp).replace(os.sep, "/")
            pre = "" if rel == "." else rel + "/"
            s = s.replace(pre + "assets/page.css", pre + "assets/c/" + page_css)
            s = re.sub(r'<script src="[^"]*bg\.js" defer></script>\n?', "", s)          # анимированный фон — убран
            s = s.replace("assets/j/3219c16883.js", "assets/j/@calc-ui.js")              # результаты без анимации чисел
            if "<head" in s and "@theme.css" not in s and "assets/" in s:
                s = re.sub(r"(<link rel=\"stylesheet\" href=\"[^\"]*assets/c/[^\"]+\.css\">)",
                           lambda m: m.group(1) + '<link rel="stylesheet" href="' + pre + 'assets/c/@theme.css">', s, count=1)
            if "</body>" in s and "@nav.js" not in s and 'class="top"' in s:
                s = s.replace("</body>", '<script src="' + pre + 'assets/j/@nav.js" defer></script>\n</body>', 1)

            def rep(m):
                k = m.group(1)
                if k not in names:
                    missing.add(k)
                    return m.group(0)
                return names[k]
            s = re.sub(r"(@[a-z0-9_-]+\.(?:js|css))", rep, s)
            open(p, "w", encoding="utf-8").write(s)
    if missing:
        sys.exit("missing sources: " + ", ".join(sorted(missing)))

    # индекс для поиска по сайту
    import json, html as H
    idx = []
    feat = {"slidex/", "tempo/", "etude/", "articles/", "calculators/", "tools/", "tools/las-viewer/", "tools/trajectory/", "articles/witsml/", "articles/wob-loss/"}
    for dp, _, fs in os.walk(DIST):
        if "index.html" not in fs:
            continue
        u = os.path.relpath(dp, DIST).replace(os.sep, "/")
        u = "" if u == "." else u + "/"
        s = open(os.path.join(dp, "index.html"), encoding="utf-8").read()
        t = re.search(r"<title>(.*?)</title>", s, re.S)
        d = re.search(r'<meta name="description" content="([^"]*)"', s)
        h1 = re.search(r"<h1[^>]*>(.*?)</h1>", s, re.S)
        if not t:
            continue
        title = re.sub(r"<[^>]+>", "", h1.group(1)) if h1 and u else t.group(1).split("|")[0]
        sec = ("Статья" if u.startswith("articles/") and u != "articles/" else
               "Калькулятор" if u.startswith("calculators/") and u != "calculators/" else
               "Инструмент" if u.startswith("tools/") and u != "tools/" else
               "Программа" if u.split("/")[0] in ("slidex", "tempo", "etude") else "Раздел")
        h2s = " ".join(re.sub(r"<[^>]+>", "", x) for x in re.findall(r"<h2[^>]*>(.*?)</h2>", s, re.S))
        idx.append({"u": u, "t": H.unescape(title.strip()), "d": H.unescape(d.group(1) if d else ""),
                    "s": sec, "k": H.unescape(h2s)[:600], "f": u in feat})
    if os.path.exists(os.path.join(DIST, "forum", "index.php")):
        idx.append({"u": "forum/", "t": "Форум DrillHarmony", "d": "Вопросы, опыт и разборы задач: траектория, слайд, телеметрия, геонавигация, режимы бурения, база знаний.", "s": "Раздел", "k": "форум база знаний вопросы", "f": True})
    idx.sort(key=lambda x: (not x["f"], x["s"], x["t"]))
    with open(os.path.join(DIST, "search.json"), "w", encoding="utf-8") as fh:
        json.dump(idx, fh, ensure_ascii=False, separators=(",", ":"))

    # sitemap.xml — lastmod меняется только когда меняется текст страницы.
    # Хеш считается по видимому тексту (без скриптов, стилей и имён ассетов),
    # поэтому пересборка без правок не сдвигает даты.
    import json as _j
    today = datetime.date.today().isoformat()
    lmf = os.path.join(ROOT, "lastmod.json")
    lm = _j.load(open(lmf, encoding="utf-8")) if os.path.exists(lmf) else {}
    def text_hash(path):
        t = open(path, encoding="utf-8").read()
        t = re.sub(r"<(script|style)\b.*?</\1>", " ", t, flags=re.S)
        t = re.sub(r"<[^>]+>", " ", t)
        return h10(re.sub(r"\s+", " ", t).strip().encode())
    def mod(u, path):
        hsh = text_hash(path)
        if lm.get(u, {}).get("h") != hsh:
            lm[u] = {"h": hsh, "d": today}
        return lm[u]["d"]
    pr = lambda u: "1.0" if u == "" else "0.9" if u in ("etude/", "tempo/", "slidex/") else "0.8" if u.startswith("tools/") else "0.6" if u in ("articles/", "calculators/") else "0.7"
    urls = sorted((x["u"] for x in idx), key=lambda u: (pr(u) != "1.0", -float(pr(u)), u))
    sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    sm += [f"  <url><loc>https://drillharmony.com/{u}</loc><lastmod>{mod(u, os.path.join(DIST, u, 'index.html') if os.path.exists(os.path.join(DIST, u, 'index.html')) else os.path.join(DIST, 'forum', 'layout.html'))}</lastmod><priority>{pr(u)}</priority></url>" for u in urls]
    sm += [f"  <url><loc>https://drillharmony.com/{u}</loc><lastmod>{mod(u, os.path.join(DIST, u))}</lastmod><priority>0.2</priority></url>" for u in ("privacy.html", "consent.html")]
    sm.append("</urlset>")
    open(os.path.join(DIST, "sitemap.xml"), "w", encoding="utf-8").write("\n".join(sm) + "\n")
    for u in [k for k in lm if k not in urls and k not in ("privacy.html", "consent.html")]:
        del lm[u]                                                                   # удалённые страницы
    _j.dump(lm, open(lmf, "w", encoding="utf-8"), ensure_ascii=False, indent=0, sort_keys=True)

    # zip
    if "--zip" in sys.argv:
        stamp = datetime.date.today().isoformat()
        zp = os.path.join(ROOT, "drillharmony-site_18.zip")
        with zipfile.ZipFile(zp, "w", zipfile.ZIP_DEFLATED) as z:
            for dp, _, fs in os.walk(DIST):
                if re.search(r'/forum/(_data|uploads)(/|$)', dp.replace(os.sep, '/')): continue   # данные и картинки форума
                for f in sorted(fs):
                    if f == 'forum-config.php': continue
                    full = os.path.join(dp, f)
                    z.write(full, os.path.relpath(full, DIST))
        print("zip:", zp, os.path.getsize(zp) // 1024, "KB")
    print("built", len(names), "sources; page.css ->", page_css)


if __name__ == "__main__":
    main()
