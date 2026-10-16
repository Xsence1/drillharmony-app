import sys, re; sys.path.insert(0,'.')
from page import make_article, refresh_navs
b=open('content/witsml.html').read()
b=b.replace('      &lt;typeTrajStation&gt;MWD&lt;/typeTrajStation&gt;','      &lt;typeTrajStation&gt;MD INCL and AZ&lt;/typeTrajStation&gt;  &lt;!-- замер: глубина, зенит, азимут --&gt;\n      &lt;typeSurveyTool&gt;magnetic MWD&lt;/typeSurveyTool&gt;')
b=b.replace('@@WM@@',open('wm_section.html').read())
b=re.sub(r'(<div class="formula wl-code">)(.*?)(</div>)', lambda m: m.group(1)+re.sub(r'&lt;!--(.*?)--&gt;', r'<span class="cm">&lt;!--\1--&gt;</span>', m.group(2))+m.group(3), b, flags=re.S)
make_article('witsml','WITSML с нуля: объекты, XML с комментариями и мнемоники ННБ',
 'WITSML с нуля: объекты, XML с комментариями, мнемоники ННБ',
 'Как устроен WITSML для начинающих: сервер и объекты, разбор XML trajectory и log по строкам, мнемоники телесистемы, ГК, УЭС, нейтронного и плотностного каротажа, интерактивный планшет и приборы с назначением мнемоник.',
 'WITSML с нуля','Статьи · данные с буровой',b,scripts=['@witsml-lab.js','cbfe39eaad.js'],css=['@witsml.css'])
