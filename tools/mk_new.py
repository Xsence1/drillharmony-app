import sys; sys.path.insert(0,'.')
from page import make_article, refresh_navs, refresh_index
make_article('wob-loss','Нагрузка не доходит до долота: признаки, причины и что делать в слайде',
 'Нагрузка не доходит до долота: признаки, причины и что делать',
 'Почему разгрузка по индикатору не доходит до долота на горизонтали: трение, продольный изгиб и запирание колонны, шлам, тяжёлые трубы. Признаки на станции, 11 приёмов инженера ННБ и интерактивная 3D-модель передачи нагрузки.',
 'Нагрузка не доходит до долота','Статьи · ориентирование и КНБК',open('content/wob-loss.html').read(),
 scripts=['82ef5376c6.js','@wob-loss.js'], og='article-wob.png', css=['@articles.css'],
 cta='<div class="w"><div class="cta"><div><h2>Слайд на тренажёре SlideX</h2><p>Передача нагрузки, реактивный момент и срывы по физике проводки, до того как это случится на буровой.</p></div><div class="btns"><a class="btn pri" href="../../slidex/">Подробнее о SlideX</a></div></div></div>')
if len(sys.argv)>1:
    exec(open('mk_hacks.py').read())
refresh_navs(); refresh_index()
