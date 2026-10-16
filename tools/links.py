"""Блок «Связанные материалы» на всех статьях и калькуляторах: статья → калькулятор → программа → тест."""
import os, re, sys
sys.path.insert(0, "/home/claude/proj/tools")
from page import names as anames
from calc import names as cnames
SITE = "/home/claude/proj/site"
P = {"etude": "Etude — проектирование траекторий и расчёты", "tempo": "Tempo — мониторинг бурения онлайн", "slidex": "SlideX — тренажёр инженера ННБ"}
T = {"trajectory": "Траектория и замеры", "orientation": "Ориентирование и слайд", "hydraulics": "Гидравлика и очистка", "drilling": "Бурение, долото, колонна", "data": "Данные: WITS и WITSML", "interview": "Собеседование"}
# страница: (калькуляторы, статьи, программа, тест)
A = {
 "minimum-curvature": (["minimum-curvature", "projection"], ["dogleg-severity", "j-profile"], "etude", "trajectory"),
 "j-profile": (["dogleg", "landing"], ["minimum-curvature", "landing"], "etude", "trajectory"),
 "dogleg-severity": (["dogleg", "minimum-curvature"], ["bha-build", "casing-run"], "etude", "trajectory"),
 "azimuth-declination": (["raw-survey", "survey-axes"], ["magnetic-qc", "gyro"], "etude", "trajectory"),
 "separation-factor": (["minimum-curvature"], ["gyro", "sidetrack"], "etude", "trajectory"),
 "magnetic-qc": (["raw-survey", "short-collar", "nmdc"], ["gyro", "azimuth-declination"], "etude", "trajectory"),
 "geosteering": (["landing", "projection"], ["landing", "witsml"], "tempo", "data"),
 "landing": (["landing", "projection"], ["geosteering", "slide-hacks"], "etude", "trajectory"),
 "gyro": (["raw-survey", "nmdc"], ["magnetic-qc", "separation-factor"], "etude", "trajectory"),
 "sidetrack": (["toolface", "minimum-curvature"], ["toolface", "separation-factor"], "etude", "orientation"),
 "toolface": (["toolface", "projection"], ["slide-hacks", "motor-curve"], "slidex", "orientation"),
 "bha-build": (["dogleg", "motor"], ["rss-vs-motor", "slide-hacks"], "slidex", "orientation"),
 "rss-vs-motor": (["dogleg", "hookload"], ["wob-loss", "bha-build"], "etude", "orientation"),
 "weight-transfer": (["hookload", "buoyancy"], ["wob-loss", "broomstick"], "slidex", "drilling"),
 "wob-loss": (["motor", "hookload"], ["motor-curve", "broomstick"], "slidex", "orientation"),
 "slide-hacks": (["toolface", "projection"], ["toolface", "wob-loss"], "tempo", "orientation"),
 "motor-curve": (["motor", "mse"], ["wob-loss", "mse"], "slidex", "drilling"),
 "mse": (["mse", "motor"], ["vibration", "bit-hydraulics"], "tempo", "drilling"),
 "bit-hydraulics": (["bit-hydraulics", "annular-velocity"], ["hole-cleaning", "ecd"], "etude", "hydraulics"),
 "broomstick": (["hookload", "buoyancy"], ["casing-run", "hole-cleaning"], "etude", "drilling"),
 "casing-run": (["hookload", "buoyancy"], ["broomstick", "dogleg-severity"], "etude", "drilling"),
 "ecd": (["ecd", "hydrostatic"], ["hole-cleaning", "kick"], "etude", "hydraulics"),
 "hole-cleaning": (["annular-velocity", "well-volume"], ["ecd", "broomstick"], "etude", "hydraulics"),
 "kick": (["kill-mud", "hydrostatic"], ["ecd", "stuck-pipe"], "slidex", "hydraulics"),
 "stuck-pipe": (["hookload", "hydrostatic"], ["hole-cleaning", "broomstick"], "slidex", "drilling"),
 "vibration": (["critical-rpm", "mse"], ["mse", "motor-curve"], "tempo", "drilling"),
 "mwd-telemetry": (["raw-survey"], ["witsml", "wits-witsml"], "tempo", "data"),
 "wits-witsml": ([], ["witsml", "geosteering"], "tempo", "data"),
 "witsml": ([], ["wits-witsml", "geosteering"], "tempo", "data"),
 "migration": ([], ["ai-well-planning", "witsml"], "etude", None),
 "ai-well-planning": ([], ["migration", "landing"], "etude", None),
 "nnb-training": ([], ["interview", "slide-hacks"], "slidex", "interview"),
 "reporting": (["toolface", "projection"], ["slide-hacks", "interview"], "tempo", "orientation"),
 "interview": (["toolface", "dogleg"], ["nnb-training", "slide-hacks"], "slidex", "interview"),
 "glossary": (["units"], ["dictionary", "interview"], "slidex", "interview"),
 "dictionary": (["units"], ["glossary", "witsml"], "slidex", "interview"),
}
C = {
 "minimum-curvature": (["minimum-curvature"], "etude", "trajectory"), "toolface": (["toolface", "slide-hacks"], "slidex", "orientation"),
 "projection": (["landing", "slide-hacks"], "tempo", "orientation"), "dogleg": (["dogleg-severity", "j-profile"], "etude", "trajectory"),
 "landing": (["landing", "geosteering"], "etude", "trajectory"), "raw-survey": (["magnetic-qc", "azimuth-declination"], "etude", "trajectory"),
 "survey-axes": (["magnetic-qc", "azimuth-declination"], "etude", "trajectory"), "short-collar": (["magnetic-qc", "gyro"], "etude", "trajectory"),
 "sag": (["magnetic-qc", "bha-build"], "etude", "trajectory"), "nmdc": (["magnetic-qc", "gyro"], "etude", "trajectory"),
 "mse": (["mse", "vibration"], "tempo", "drilling"), "bit-hydraulics": (["bit-hydraulics", "hole-cleaning"], "etude", "hydraulics"),
 "motor": (["motor-curve", "wob-loss"], "slidex", "drilling"), "hookload": (["broomstick", "casing-run"], "etude", "drilling"),
 "ecd": (["ecd", "hole-cleaning"], "etude", "hydraulics"), "hydrostatic": (["ecd", "kick"], "etude", "hydraulics"),
 "kill-mud": (["kick", "ecd"], "slidex", "hydraulics"), "annular-velocity": (["hole-cleaning", "bit-hydraulics"], "etude", "hydraulics"),
 "well-volume": (["hole-cleaning", "kick"], "tempo", "hydraulics"), "barite": (["kick", "ecd"], "etude", "hydraulics"),
 "buoyancy": (["broomstick", "weight-transfer"], "etude", "drilling"), "critical-rpm": (["vibration", "mse"], "tempo", "drilling"),
 "units": (["glossary", "interview"], "etude", None),
}

TN = {"trajectory": "Траектория из таблицы в 3D", "las-viewer": "Просмотр LAS онлайн"}
TL = {"minimum-curvature": "trajectory", "j-profile": "trajectory", "separation-factor": "trajectory", "dogleg-severity": "trajectory", "sidetrack": "trajectory",
      "witsml": "las-viewer", "wits-witsml": "las-viewer", "geosteering": "las-viewer", "mwd-telemetry": "las-viewer", "reporting": "trajectory",
      "calc:minimum-curvature": "trajectory", "calc:projection": "trajectory", "calc:dogleg": "trajectory"}

def block(pre, calcs, arts, prod, test, cur_calc=None, tool=None):
    an, cn = anames(), cnames(); items = []
    if tool: items.append(f'<a href="{pre}tools/{tool}/"><small>Инструмент</small>{TN[tool]}</a>')
    for c in calcs:
        if c != cur_calc and c in cn and os.path.exists(f"{SITE}/calculators/{c}/index.html"): items.append(f'<a href="{pre}calculators/{c}/"><small>Калькулятор</small>{cn[c]}</a>')
    for a in arts:
        if a in an and os.path.exists(f"{SITE}/articles/{a}/index.html"): items.append(f'<a href="{pre}articles/{a}/"><small>Статья</small>{an[a]}</a>')
    if test: items.append(f'<a href="{pre}tests/#{test}"><small>Тест</small>{T[test]}</a>')
    if prod: items.append(f'<a class="prod" href="{pre}{prod}/"><small>Программа</small>{P[prod]}</a>')
    return '<section class="rel" aria-label="Связанные материалы"><h2>Связанные материалы</h2><div class="rel-g">' + "".join(items) + "</div></section>"

def apply():
    n = 0
    for slug, (calcs, arts, prod, test) in A.items():
        p = f"{SITE}/articles/{slug}/index.html"
        if not os.path.exists(p): continue
        s = open(p, encoding="utf-8").read()
        s = re.sub(r'<section class="rel".*?</section>', "", s, flags=re.S)
        s = s.replace('<nav class="apn" aria-label="Соседние статьи">', block("../../", calcs, [a for a in arts if a != slug], prod, test, tool=TL.get(slug)) + '\n<nav class="apn" aria-label="Соседние статьи">', 1)
        open(p, "w", encoding="utf-8").write(s); n += 1
    for slug, (arts, prod, test) in C.items():
        p = f"{SITE}/calculators/{slug}/index.html"
        if not os.path.exists(p): continue
        s = open(p, encoding="utf-8").read()
        s = re.sub(r'<section class="rel".*?</section>', "", s, flags=re.S)
        s = s.replace('<nav class="apn" aria-label="Соседние калькуляторы">', block("../../", [], arts, prod, test, slug, tool=TL.get("calc:" + slug)) + '\n<nav class="apn" aria-label="Соседние калькуляторы">', 1)
        open(p, "w", encoding="utf-8").write(s); n += 1
    return n

if __name__ == "__main__":
    print("pages:", apply())
