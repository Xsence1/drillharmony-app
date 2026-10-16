"""Разделы: Инструменты (LAS, траектория), Задача недели, Карьера в ННБ, Русско-английский словарь."""
import sys; sys.path.insert(0, "/home/claude/proj/tools")
from mk_tests import page

def side(cur, pre):
    items = [("tools/", "Все инструменты"), ("tools/las-viewer/", "Просмотр LAS онлайн"), ("tools/trajectory/", "Траектория из таблицы в 3D"), ("tools/npt-cost/", "Сколько стоит скрытое НПВ"), ("play/", "Игра: посади горизонталь")]
    more = [("tasks/", "Задача недели"), ("career/", "Карьера в ННБ"), ("articles/dictionary/", "Словарь RU–EN"), ("tests/", "Тесты"), ("cheatsheet/", "Шпаргалка")]
    a = lambda l: "".join(f'<a href="{pre}{u}"' + (' aria-current="page"' if u == cur else "") + f">{n}</a>" for u, n in l)
    return f'<aside class="anav-wrap"><details class="anav" open><summary>Инструменты</summary><nav aria-label="Инструменты"><div class="ang"><div class="ang-h">Инструменты</div>{a(items)}</div><div class="ang"><div class="ang-h">Инженеру ННБ</div>{a(more)}</div><div class="ang ang-more"><a href="{pre}calculators/">Калькуляторы</a><a href="{pre}articles/">Статьи</a></div></nav></details></aside>'

# ---------------- просмотрщик LAS ----------------
las = '''<p class="lead">Откройте файл LAS прямо в браузере: планшет с ГК, сопротивлением, нейтроном и плотностью, свои дорожки и шкалы, значения на любой глубине и картинка для отчёта. Файл не загружается на сервер, всё читается на вашем компьютере.</p>
<section class="wx lv" id="lv" aria-label="Просмотр LAS-файла">
<div class="lv-drop" id="lv-drop"><b>Перетащите LAS-файл сюда</b><span>или</span><label class="btn pri lv-pick">Выбрать файл<input type="file" id="lv-file" accept=".las,.LAS,.txt" hidden></label><button type="button" class="btn" id="lv-sample">Открыть учебный пример</button><small>LAS 1.2 и 2.0, кодировки UTF-8 и Windows-1251. Файл остаётся у вас.</small></div>
<p class="lv-msg" id="lv-msg"></p>
<div id="lv-work" hidden>
<div class="wl-ctl"><span class="wx-spd">Окно <button type="button" data-span="20">20 м</button><button type="button" data-span="50">50 м</button><button type="button" data-span="150">150 м</button><button type="button" data-span="all">весь</button></span><span id="lv-range" class="wl-ro"></span><button type="button" class="wx-b" id="lv-png">Сохранить картинку</button></div>
<p class="wl-ro" id="lv-ro">Наведите на планшет, чтобы увидеть значения. Колесо прокручивает, Ctrl + колесо меняет масштаб, перетаскивание сдвигает.</p>
<div class="wl-plw lv-plw"><canvas id="lv-cv" role="img" aria-label="Планшет каротажа из LAS-файла"></canvas></div>
<h3>Дорожки</h3><p class="ia-hint">Кривые распознаются по мнемоникам автоматически: ГК, сопротивление, нейтрон, плотность, PEF, каверномер. Кривые и шкалы можно поменять, до трёх кривых на дорожку.</p>
<div class="wl-edt" id="lv-ed"></div>
<h3>Кривые в файле</h3><div class="wl-map tablewrap" id="lv-tab"></div>
</div>
</section>
<h2>Что такое LAS</h2>
<p>LAS (Log ASCII Standard) — открытый текстовый формат каротажа, который поддерживает Канадское общество каротажа (CWLS). Файл состоит из секций: ~V — версия, ~W — скважина и диапазон глубин, ~C — список кривых с единицами, ~P — параметры, ~A — сами данные столбцами.</p>
<div class="formula">~Curve information
 DEPT.M      : Measured depth        ← мнемоника.единица : описание
 GR  .GAPI   : Gamma ray
~A
 2400.0   105.3                      ← значения в порядке ~C</div>
<ul>
<li><b>NULL</b> в секции ~W задаёт значение «нет данных», обычно −999.25. Просмотрщик его не рисует.</li>
<li><b>WRAP YES</b> означает, что строка данных разбита на несколько строк файла. Просмотрщик читает и такие файлы.</li>
<li><b>Кодировка.</b> Российские программы часто пишут LAS в Windows-1251, названия скважин и описания кривых откроются правильно.</li>
</ul>
<p>Как называются кривые телесистемы и каротажа и как их сопоставлять, рассказано в статье <a href="../../articles/witsml/">WITSML с нуля</a>, раздел «Мнемоники ННБ».</p>
<div class="note"><b>Каротаж в реальном времени</b> со станций ГТИ и телесистем, а не из файлов, смотрят в <a href="../../tempo/">Tempo</a>.</div>'''
page("tools/las-viewer/", "Просмотр LAS-файла онлайн — планшет каротажа в браузере", "Просмотр LAS онлайн",
     "Бесплатный просмотрщик LAS-файлов в браузере: планшет ГК, сопротивления, нейтрона и плотности, свои дорожки и шкалы, значения на глубине, сохранение картинки. LAS 1.2 и 2.0, Windows-1251. Файл не загружается на сервер.",
     '<a href="../../tools/">Инструменты</a> / Просмотр LAS', "Инструменты", side("tools/las-viewer/", "../../"), las, ["@las-viewer.js"], css=("@articles.css", "@witsml.css", "@tools.css"))

# ---------------- траектория ----------------
traj = '''<p class="lead">Вставьте замеры из Excel (глубину, зенит и азимут) и получите траекторию методом минимальной кривизны: координаты, вертикаль, интенсивность, 3D-вид, разрез и план. Добавьте соседний ствол, и инструмент найдёт место наибольшего сближения.</p>
<section class="wx tt" id="tt" aria-label="Траектория из таблицы">
<div class="tt-in">
<div><label class="tt-l" for="tt-a">Ствол: MD, зенит, азимут</label><textarea id="tt-a" spellcheck="false" rows="9"></textarea>
<div class="tt-row"><label>TVD первой станции <input id="tt-tvd" value="0" inputmode="decimal"></label></div></div>
<div><label class="tt-l" for="tt-b">Соседний ствол (необязательно)</label><textarea id="tt-b" spellcheck="false" rows="9" placeholder="MD  зенит  азимут"></textarea>
<div class="tt-row"><label>Устье: С+ <input id="tt-n2" value="0" inputmode="decimal"></label><label>В+ <input id="tt-e2" value="0" inputmode="decimal"></label><label>TVD <input id="tt-tvd2" value="0" inputmode="decimal"></label></div></div>
</div>
<div class="wl-ctl"><button type="button" class="wx-b pri" id="tt-go">Рассчитать</button><button type="button" class="wx-b" id="tt-sample">Пример: ствол рядом с соседней скважиной</button><label>Азимут разреза <input id="tt-vs" value="0" inputmode="decimal" style="width:70px"></label><label class="wx-hold"><input type="checkbox" id="tt-vsauto" checked> на забой</label><button type="button" class="wx-b" id="tt-csv">Скачать таблицу (CSV)</button></div>
<p class="ia-hint" id="tt-msg"></p>
<div class="ia-outs"><div class="ia-o key"><span>Забой по стволу</span><b id="tt-o-md">—</b><small>м</small></div><div class="ia-o key"><span>По вертикали</span><b id="tt-o-tvd">—</b><small>м</small></div><div class="ia-o"><span>Отход</span><b id="tt-o-hd">—</b><small>м</small></div><div class="ia-o"><span>Макс. интенсивность</span><b id="tt-o-dls">—</b><small>°/30 м</small></div><div class="ia-o"><span>Мин. расстояние до соседа</span><b id="tt-o-sep">—</b><small>м</small></div><div class="ia-o"><span>На глубине</span><b id="tt-o-sepmd">—</b><small>м по стволу</small></div></div>
<canvas class="ia-cv" id="tt-cv" style="height:440px;margin-top:12px" aria-label="3D-вид траектории"></canvas>
<canvas class="ia-cv flat" id="tt-2d" style="height:380px;margin-top:12px" role="img" aria-label="Вертикальный разрез и план"></canvas>
<h3>Таблица</h3><div class="wl-map tablewrap tt-tab" id="tt-tab"></div>
</section>
<h2>Как это считается</h2>
<p>Между соседними замерами ствол считается дугой окружности. Это метод минимальной кривизны, стандарт отрасли. Подробно с формулами в статье <a href="../../articles/minimum-curvature/">Метод минимальной кривизны</a>, расчёт одного интервала в <a href="../../calculators/minimum-curvature/">калькуляторе</a>.</p>
<ul>
<li><b>Координаты</b> считаются от устья своего ствола: север плюс, восток плюс. Для соседнего ствола задайте положение его устья относительно первого.</li>
<li><b>Азимут</b> используется тот, что в таблице: магнитный, истинный или дирекционный. Для сравнения стволов азимуты должны быть приведены к одному северу, см. <a href="../../articles/azimuth-declination/">Азимуты и склонение</a>.</li>
<li><b>Расстояние между стволами</b> считается между осями, без эллипсов неопределённости. Это не замена антиколлизии по ISCWSA, см. <a href="../../articles/separation-factor/">коэффициент разделения SF</a>.</li>
</ul>
<div class="note"><b>Весь куст и месторождение</b> с эллипсами ISCWSA, коэффициентом разделения и проектированием ведутся в <a href="../../etude/">Etude</a>.</div>'''
page("tools/trajectory/", "Траектория скважины из Excel: 3D, разрез, план и сближение онлайн", "Траектория из таблицы в 3D",
     "Вставьте замеры инклинометрии из Excel и получите траекторию по методу минимальной кривизны: TVD, координаты, интенсивность, 3D-вид, вертикальный разрез, план, расстояние до соседнего ствола и выгрузку в CSV.",
     '<a href="../../tools/">Инструменты</a> / Траектория в 3D', "Инструменты", side("tools/trajectory/", "../../"), traj, ["82ef5376c6.js", "@traj-tool.js"], css=("@articles.css", "@witsml.css", "@tools.css"))

# ---------------- индекс инструментов ----------------
idx = '''<p class="lead">Бесплатные инструменты инженера ННБ в браузере, без регистрации. Данные обрабатываются на вашем компьютере и никуда не отправляются.</p>
<div class="alist">
<a href="../tools/las-viewer/"><b>Просмотр LAS онлайн</b><span>Планшет ГК, сопротивления, нейтрона и плотности из LAS-файла: свои дорожки и шкалы, значения на глубине, картинка для отчёта.</span></a>
<a href="../tools/trajectory/"><b>Траектория из таблицы в 3D</b><span>Замеры из Excel → минимальная кривизна, 3D, разрез, план, интенсивность, расстояние до соседнего ствола, CSV.</span></a>
<a href="../tools/npt-cost/"><b>Сколько стоит скрытое НПВ</b><span>Потери на наращиваниях, СПО и ожиданиях в рублях за год и при каком сокращении окупается мониторинг.</span></a>
<a href="../play/"><b>Игра: посади горизонталь за 60 секунд <i class="new">новое</i></b><span>Слайд и ротор, кровля пласта по ГК. Войдите в пласт и удержитесь в нём. Рекорд сохраняется.</span></a>
<a href="../calculators/"><b>23 калькулятора</b><span>Траектория и посадка, toolface, инклинометрия, MSE, гидравлика долота, ВЗД, вес на крюке, давление.</span></a>
<a href="../tests/"><b>Тесты по ННБ</b><span>Пять тем и смешанный тест для подготовки к собеседованию.</span></a>
<a href="../cheatsheet/"><b>Шпаргалка ННБ</b><span>Формулы и единицы на одном листе для печати.</span></a>
<a href="../tasks/"><b>Задача недели</b><span>Практические задачи из работы инженера ННБ с разбором решения.</span></a>
</div>'''
page("tools/", "Инструменты инженера ННБ онлайн: LAS, траектория, калькуляторы", "Инструменты инженера ННБ",
     "Бесплатные онлайн-инструменты для наклонно-направленного бурения: просмотр LAS-файлов, траектория из Excel в 3D, калькуляторы, тесты и шпаргалка.",
     "Инструменты", "Инструменты", side("tools/", "../"), idx, [], css=("@articles.css",))

# ---------------- задача недели ----------------
T = [
 ("", "Успеем сесть в пласт?", "Зенит на долоте 62°, до кровли по вертикали 14 м, нужно войти с зенитом 88°. Компоновка в слайде даёт 4,5°/30 м. Хватит ли набора и с каким запасом?",
  "Чтобы набрать с 62° до 88°, дуга «съедает» по вертикали R·(sin 88° − sin 62°). При 4,5°/30 м R = 1718,9 / 4,5 ≈ 382 м, и дуга займёт 382 · (0,9994 − 0,8829) ≈ 44,5 м по вертикали. А до кровли всего 14 м. Чтобы сесть сразу, нужно 1718,9 · 0,1165 / 14 ≈ 14,3°/30 м, втрое больше способности компоновки. Не успеваем: ствол придёт на кровлю с зенитом около 67°. Выход один: обсудить с геологом вход в пласт ниже по вертикали или заранее пересмотреть посадку.", "calculators/landing/", "Калькулятор посадки"),
 ("", "Сколько слайдить?", "Зенит 35°, азимут 120°. К концу свечи 28 м нужен зенит 37°, азимут 124°. Компоновка даёт 6°/30 м, реактивный угол 20°. Куда ставить отклонитель и сколько слайдить?",
  "Нужный поворот ствола — пространственный угол между направлениями: около 3,1°. Слайд = 3,1 / 6 · 30 ≈ 15,5 м, остальные 12,5 м бурим ротором. Toolface на нужное направление около 51° (набор плюс поворот вправо), с упреждением на реактивный момент выставляем ≈ 71°. Проверить можно в слайд-шите статьи.", "articles/slide-hacks/", "Слайд-шит на свечу"),
 ("", "Почему долото «не берёт»?", "Разгрузка по индикатору выросла с 8 до 14 т, перепад на ВЗД остался 2,1 МПа, механическая скорость не изменилась, toolface периодически уходит влево на 30–40°. Что происходит и что делать?",
  "Перепад не вырос, значит, нагрузка на долоте та же: лишние 6 т съело трение колонны. Уход toolface влево говорит о срывах: колонна зависает и отдаёт нагрузку ударом, двигатель реагирует реактивным моментом. Что делать: не наращивать разгрузку, вернуться к рабочему перепаду, покачать колонну ротором, проверить очистку ствола, при необходимости закачать смазочную пачку.", "articles/wob-loss/", "Нагрузка не доходит до долота"),
 ("", "Фактическое трение по весу на крюке", "Вертикаль до 800 м, набор 3°/30 м до 60°, долото на 3 000 м, трубы 31 кг/м, раствор 1,18 г/см³, вес талевой системы 25 т. Вес при подъёме 108 т. Какое фактическое трение и что это значит?",
  "Подставляем в калькулятор веса на крюке: при трении 0,25 расчётный подъём около 102 т, а 108 т соответствуют трению около 0,30. Это выше расчётного, так что проверьте тренд на последних свечах. Если трение растёт от свечи к свече, копится шлам: проработка, промывка до чистых сит.", "calculators/hookload/", "Калькулятор веса на крюке"),
]
tb = '<p class="lead">Практические задачи из работы инженера ННБ. Попробуйте сначала решить сами, потом откройте разбор. К каждой задаче есть калькулятор или статья, где можно проверить ответ.</p>'
for i, (d, h, q, a, u, un) in enumerate(T):
    tb += f'<section class="task" id="t{len(T) - i}"><div class="task-d">Задача {len(T) - i}</div><h2>{h}</h2><p>{q}</p><details><summary>Разбор решения</summary><p>{a}</p><p><a href="../{u}">{un} →</a></p></details></section>'
tb += '<div class="note"><b>Есть своя задача из практики?</b> <a href="../?lead=other#contact">Пришлите её нам</a>. Разберём и опубликуем без названий скважин и компаний.</div>'
page("tasks/", "Задача недели для инженера ННБ: практические задачи с разбором", "Задача недели",
     "Практические задачи наклонно-направленного бурения с разбором: посадка горизонтали, слайд и toolface, нагрузка на долото, фактическое трение по весу на крюке.",
     "Задача недели", "Инженеру ННБ", side("tasks/", "../"), tb, [], css=("@articles.css", "@tools.css"))

# ---------------- карьера ----------------
car = '''<p class="lead">Путь в наклонно-направленном бурении обычно идёт от телеметрии к ННБ и дальше, к сопровождению, проектированию или супервайзингу. Ниже о том, что нужно знать на каждой ступени и какие материалы сайта помогут подготовиться.</p>
<div class="steps2">
<section><div class="st-n">1</div><h2>Телеметрист</h2><p>Обслуживает телесистему на буровой: сборка и проверка прибора, декодирование сигнала, контроль замеров, связь с инженером ННБ.</p><ul><li>Как работает гидроканал и почему теряется сигнал: <a href="../articles/mwd-telemetry/">Сбои телесистемы</a></li><li>Контроль замеров Gt, Bt, Dip: <a href="../articles/magnetic-qc/">Магнитные помехи</a></li><li>Расчёт замера по осям: <a href="../calculators/raw-survey/">калькулятор</a></li><li>Данные с буровой: <a href="../articles/wits-witsml/">WITS</a> и <a href="../articles/witsml/">WITSML</a></li></ul><p class="st-t"><a href="../tests/#data">Тест: данные WITS и WITSML</a> · <a href="../tests/#trajectory">Тест: траектория и замеры</a></p></section>
<section><div class="st-n">2</div><h2>Инженер ННБ</h2><p>Ведёт ствол по проекту: ориентирование, слайды, прогноз на долото, посадка горизонтали, компоновка, отчётность.</p><ul><li><a href="../articles/toolface/">Отклонитель и реактивный момент</a>, <a href="../articles/slide-hacks/">лайфхаки слайда</a></li><li><a href="../articles/landing/">Посадка горизонтали</a>, <a href="../articles/geosteering/">геонавигация</a></li><li><a href="../articles/bha-build/">КНБК для набора</a>, <a href="../articles/motor-curve/">характеристика ВЗД</a></li><li><a href="../articles/reporting/">Отчётность инженера ННБ</a></li></ul><p class="st-t"><a href="../tests/#orientation">Тест: ориентирование и слайд</a> · <a href="../articles/interview/">Вопросы на собеседовании</a></p></section>
<section><div class="st-n">3</div><h2>Ведущий инженер, сопровождение</h2><p>Отвечает за несколько скважин или куст: план/факт, антиколлизия, режимы бурения, разбор осложнений, обучение молодых инженеров.</p><ul><li><a href="../articles/separation-factor/">Коэффициент разделения SF</a>, <a href="../articles/gyro/">гироскоп</a></li><li><a href="../articles/broomstick/">«Метла»</a>, <a href="../articles/wob-loss/">передача нагрузки</a>, <a href="../articles/mse/">MSE</a></li><li><a href="../articles/ecd/">ЭЦП</a>, <a href="../articles/hole-cleaning/">очистка ствола</a>, <a href="../articles/casing-run/">спуск колонны</a></li></ul><p class="st-t"><a href="../tests/#drilling">Тест: бурение, долото, колонна</a> · <a href="../tests/#hydraulics">Тест: гидравлика</a></p></section>
<section><div class="st-n">4</div><h2>Проектирование и супервайзинг</h2><p>Проект профиля и программы на бурение, проверка расчётами, контроль подрядчиков на буровой.</p><ul><li><a href="../articles/minimum-curvature/">Минимальная кривизна</a>, <a href="../articles/j-profile/">J-профиль</a>, <a href="../articles/dogleg-severity/">ограничения интенсивности</a></li><li><a href="../articles/sidetrack/">Боковые стволы</a>, <a href="../articles/migration/">переход на новое ПО</a></li><li><a href="../tools/trajectory/">Траектория в 3D</a>, <a href="../calculators/">все калькуляторы</a></li></ul></section>
</div>
<h2>Как ускорить рост</h2>
<ul>
<li><b>Считайте сами, а не только по программе.</b> Прогноз на долото, слайд, посадку проверяйте вручную или в калькуляторе, пока это не станет привычкой.</li>
<li><b>Ведите свой слайд-шит</b> и записывайте фактическую способность компоновок по пластам. Получится личный справочник.</li>
<li><b>Разбирайте осложнения</b> после каждой скважины: что было видно заранее на параметрах.</li>
<li><b>Учите английские термины</b>: отчёты сервисных компаний и программы часто на английском. Поможет <a href="../articles/dictionary/">словарь RU–EN</a>.</li>
<li><b>Тренируйтесь без риска.</b> Осложнения и ориентирование можно отработать на тренажёре <a href="../slidex/">SlideX</a>, с разбором каждой попытки.</li>
</ul>'''
page("career/", "Карьера в ННБ: от телеметриста до инженера и проектировщика", "Что нужно знать на каждой ступени карьеры в ННБ",
     "Путь в наклонно-направленном бурении: телеметрист, инженер ННБ, ведущий инженер, проектирование и супервайзинг. Что нужно знать на каждой ступени, статьи, тесты и вопросы на собеседовании.",
     "Карьера в ННБ", "Инженеру ННБ", side("career/", "../"), car, [], css=("@articles.css", "@tools.css"))

# ---------------- словарь RU–EN ----------------
D = {
"Траектория и замеры": [
("Глубина по стволу","MD, measured depth","длина ствола по оси от точки отсчёта"),("Глубина по вертикали","TVD, true vertical depth",""),
("Зенитный угол","inclination, INC","угол отклонения оси от вертикали"),("Азимут","azimuth, AZI",""),("Магнитный азимут","magnetic azimuth",""),
("Истинный азимут","true azimuth",""),("Дирекционный угол","grid azimuth",""),("Магнитное склонение","magnetic declination",""),
("Сближение меридианов","grid convergence",""),("Магнитное наклонение","dip angle",""),("Интенсивность искривления","DLS, dogleg severity","°/30 м или °/100 ft"),
("Пространственный угол искривления","dogleg",""),("Темп набора","BUR, build-up rate",""),("Темп поворота","TR, turn rate",""),
("Отход","horizontal displacement, closure",""),("Вертикальная проекция (разрез)","vertical section, VS",""),("Точка зарезки","KOP, kick-off point",""),
("Участок стабилизации","tangent, hold section",""),("Участок набора","build section",""),("Горизонтальный участок","lateral",""),
("Проектный профиль","well plan, planned trajectory",""),("Фактическая траектория","actual survey",""),("Замер инклинометрии","survey, survey station",""),
("Привязка","tie-on point",""),("Прогноз на долото","projection to bit",""),("Расстояние от датчика до долота","survey offset, bit-to-sensor",""),
("Метод минимальной кривизны","minimum curvature method",""),("Антиколлизия","anti-collision",""),("Коэффициент разделения","SF, separation factor",""),
("Эллипс неопределённости","ellipse of uncertainty",""),("Модель погрешностей","error model, tool code","ISCWSA"),("Куст скважин","pad",""),
("Целевой круг (допуск)","target, tolerance",""),("Гироскопический инклинометр","gyro, gyro survey",""),("Многоточечный замер","MSS, multi-shot survey",""),
],
"Ориентирование и КНБК": [
("Отклонитель (положение)","toolface, TF",""),("Гравитационный отклонитель","GTF, gravity toolface","от верхней стенки"),("Магнитный отклонитель","MTF, magnetic toolface","от севера"),
("Реактивный момент","reactive torque",""),("Слайд (бурение без вращения)","sliding",""),("Роторное бурение","rotary drilling, rotating",""),
("Винтовой забойный двигатель","PDM, positive displacement motor, mud motor",""),("Угол перекоса ВЗД","bent housing angle, AKO",""),("Регулятор угла","adjustable kick-off sub",""),
("Роторная управляемая система","RSS, rotary steerable system",""),("Компоновка низа бурильной колонны","BHA, bottom hole assembly",""),("Калибратор, центратор","stabilizer, near-bit stabilizer",""),
("Немагнитная УБТ","NMDC, non-magnetic drill collar",""),("Утяжелённая бурильная труба","DC, drill collar",""),("Толстостенная бурильная труба","HWDP, heavy-weight drill pipe",""),
("Бурильная труба","DP, drill pipe",""),("Ясс","jar",""),("Переводник","sub, crossover",""),("Обратный клапан","float valve",""),
("Ориентирование","orienting the toolface",""),("Способность компоновки","motor yield, BHA tendency",""),("Срыв двигателя","stall",""),
],
"Бурение и долото": [
("Нагрузка на долото","WOB, weight on bit",""),("Частота вращения","RPM",""),("Крутящий момент","torque",""),("Механическая скорость","ROP, rate of penetration",""),
("Вес на крюке","hookload",""),("Вес при подъёме","pick-up weight, PUW",""),("Вес при спуске","slack-off weight, SOW",""),("Вес при вращении","free rotating weight",""),
("Коэффициент трения","friction factor",""),("Продольный изгиб","buckling","sinusoidal, helical"),("Посадка, затяжка","drag, overpull",""),
("Удельная механическая энергия","MSE, mechanical specific energy",""),("Долото PDC","PDC bit",""),("Шарошечное долото","roller cone bit, tricone",""),
("Насадка","nozzle, jet",""),("Площадь насадок","TFA, total flow area",""),("Гидромощность на долоте","HSI, hydraulic horsepower per square inch",""),
("Вибрации","vibration","axial, lateral, torsional"),("Прерывистое вращение","stick-slip",""),("Вихревое движение долота","bit whirl",""),
("Разгрузка, посадка инструмента","set down weight",""),("Наращивание","connection",""),("Спуско-подъёмные операции","tripping, trip in / trip out",""),
("Проработка","reaming, back-reaming",""),("Забой","bottom hole",""),("Обсадная колонна","casing",""),("Хвостовик","liner",""),("Башмак","shoe",""),
("Цементирование","cementing",""),("Зарезка бокового ствола","sidetrack",""),("Клин-отклонитель","whipstock",""),("Окно в колонне","casing exit, window",""),
],
"Гидравлика и раствор": [
("Буровой раствор","drilling fluid, mud",""),("Плотность раствора","mud weight, MW",""),("Эквивалентная циркуляционная плотность","ECD",""),
("Расход","flow rate, GPM",""),("Давление на стояке","SPP, standpipe pressure",""),("Перепад давления","pressure drop, differential",""),
("Кольцевое пространство (затруб)","annulus",""),("Скорость в затрубе","annular velocity, AV",""),("Время отставания","lag time",""),
("Шлам","cuttings",""),("Очистка ствола","hole cleaning",""),("Шламовая подушка","cuttings bed",""),("Вибросито","shale shaker",""),
("Пластическая вязкость","PV, plastic viscosity",""),("Динамическое напряжение сдвига","YP, yield point",""),("Поглощение","lost circulation, losses",""),
("Газонефтеводопроявление","kick, well control event",""),("Противовыбросовое оборудование","BOP, blowout preventer",""),("Гидростатическое давление","hydrostatic pressure",""),
("Поровое давление","pore pressure",""),("Давление гидроразрыва","fracture pressure",""),("Прихват","stuck pipe",""),("Дифференциальный прихват","differential sticking",""),
],
"Телеметрия и каротаж": [
("Телесистема","MWD, measurement while drilling",""),("Каротаж в процессе бурения","LWD, logging while drilling",""),("Гидроканал","mud pulse telemetry",""),
("Электромагнитный канал","EM telemetry",""),("Пульсатор","pulser",""),("Декодирование","decoding",""),("Акселерометр","accelerometer","Gx, Gy, Gz"),
("Магнитометр","magnetometer","Bx, By, Bz"),("Полное поле","total field, Btotal",""),("Гамма-каротаж","GR, gamma ray",""),
("Сопротивление","resistivity",""),("Нейтронный каротаж","neutron porosity",""),("Плотностной каротаж","bulk density",""),
("Азимутальный ГК","azimuthal gamma, image",""),("Геонавигация","geosteering",""),("Кровля / подошва пласта","top / base of formation",""),
("Станция ГТИ","mud logging unit",""),("Глубиномер","depth tracking",""),("Протокол данных","WITS, WITSML",""),
],
"Отчётность и организация": [
("Суточный рапорт","DDR, daily drilling report",""),("Программа на бурение","drilling program",""),("Супервайзер","company man, drilling supervisor",""),
("Буровой мастер","toolpusher",""),("Бурильщик","driller",""),("Инженер ННБ","directional driller, DD",""),("Телеметрист","MWD engineer",""),
("Заказчик (недропользователь)","operator",""),("Сервисная компания","service company",""),("Непроизводительное время","NPT, non-productive time",""),
("Анализ после бурения","post-well review, lessons learned",""),("Наряд-допуск","permit to work",""),("Инструктаж перед работой","pre-job meeting, toolbox talk",""),
],
}
n = sum(len(v) for v in D.values())
db = f'<p class="lead">{n} {"термин" if n % 10 == 1 and n % 100 != 11 else "термина" if 2 <= n % 10 <= 4 and not 12 <= n % 100 <= 14 else "терминов"} наклонно-направленного бурения на русском и английском, чтобы читать отчёты сервисных компаний, программы и документацию. Начните вводить слово на любом языке.</p>'
db += '<div class="dict-bar"><input type="search" class="dict-q" id="dict-q" placeholder="Например: toolface, затяжка, ECD" aria-label="Поиск по словарю"><span class="dict-n" id="dict-n"></span></div><div class="dict" id="dict">'
for sec, rows in D.items():
    db += f'<h3>{sec}</h3><div class="tablewrap"><table><thead><tr><th>Русский</th><th>English</th><th>Примечание</th></tr></thead><tbody>' + "".join(f"<tr><td>{a}</td><td>{b}</td><td>{c}</td></tr>" for a, b, c in rows) + "</tbody></table></div>"
db += '</div><p>Определения терминов на русском есть в <a href="../glossary/">словаре терминов</a>. Как называются кривые телесистемы в файлах, рассказано в статье <a href="../witsml/">WITSML с нуля</a>.</p>'
db += """<script>(()=>{const q=document.getElementById('dict-q'),n=document.getElementById('dict-n'),root=document.getElementById('dict');const f=()=>{const v=q.value.trim().toLowerCase();let k=0;root.querySelectorAll('tr').forEach(r=>{if(r.parentNode.tagName==='THEAD')return;const ok=!v||r.textContent.toLowerCase().includes(v);r.hidden=!ok;if(ok)k++;});root.querySelectorAll('h3').forEach(h=>{const t=h.nextElementSibling,any=[...t.querySelectorAll('tbody tr')].some(r=>!r.hidden);h.hidden=!any;t.hidden=!any;});n.textContent=v?('Найдено: '+k):'';};q.addEventListener('input',f);})();</script>"""
from page import make_article, refresh_navs, refresh_index
make_article("dictionary", "Русско-английский словарь ННБ: термины бурения и телеметрии", "Русско-английский словарь ННБ",
     f"Словарь наклонно-направленного бурения RU–EN: {n} {"термин" if n % 10 == 1 and n % 100 != 11 else "термина" if 2 <= n % 10 <= 4 and not 12 <= n % 100 <= 14 else "терминов"} траектории, ориентирования, КНБК, долота, гидравлики, телеметрии и отчётности с поиском.",
     "Словарь RU–EN", "Данные, программы, обучение", db, css=("@tools.css",),
     cta='<div class="w"><div class="cta"><div><h2>Тренажёр инженера ННБ</h2><p>Ориентирование, слайд и осложнения на тренажёре SlideX, с разбором каждой попытки.</p></div><div class="btns"><a class="btn pri" href="../../slidex/">Подробнее о SlideX</a></div></div></div>')
refresh_navs(); refresh_index()
print("ok", n)

# ---------------- скрытое НПВ ----------------
def sl(id, name, mn, mx, stp, val, u, d=0):
    return f'<label class="ia-sl">{name}<output></output><input type="range" id="np-{id}" min="{mn}" max="{mx}" step="{stp}" value="{val}" data-u="{u}" data-d="{d}"></label>'
def nf(id, name, val, hint=""):
    return f'<label class="np-f">{name}<input id="np-{id}" value="{val}" inputmode="decimal">' + (f"<small>{hint}</small>" if hint else "") + "</label>"
npt = f'''<p class="lead">Явный простой виден всем. Скрытое НПВ — это минуты, на которые каждое наращивание и каждая свеча СПО дольше норматива. За год они складываются в недели работы буровой. Подставьте свои цифры, и калькулятор покажет потери в рублях и при каком сокращении окупается мониторинг.</p>
<section class="wx np" id="np" aria-label="Калькулятор скрытого НПВ">
<div class="np-g">
<fieldset><legend>Буровые</legend>{nf("n", "Число буровых (партий)", "10")}{nf("rate", "Стоимость суток, ₽", "1 200 000", "буровая и сервисы вместе")}{nf("days", "Дней в бурении в году", "300")}</fieldset>
<fieldset><legend>Наращивания</legend>{sl("cn", "Наращиваний в сутки", 0, 60, 1, 18, "")}{sl("ca", "Факт «клинья — клинья», мин", 2, 20, 0.5, 6, " мин", 1)}{sl("cnorm", "Норматив, мин", 1, 15, 0.5, 4, " мин", 1)}</fieldset>
<fieldset><legend>СПО и ожидания</legend>{sl("trip", "СПО в среднем, ч/сутки", 0, 12, 0.5, 3, " ч", 1)}{sl("tex", "Из них сверх норматива", 0, 50, 1, 12, " %")}{sl("oth", "Ожидания, согласования, ч/сутки", 0, 4, 0.1, 0.5, " ч", 1)}</fieldset>
</div>
<div class="np-res">
<h3>Сутки одной буровой</h3>
<div class="np-bar" id="np-day" aria-label="Доля скрытого НПВ в сутках"></div>
<ul class="np-leg" id="np-leg"></ul>
<div class="ia-outs">
<div class="ia-o"><span>Скрытое НПВ на буровую</span><b id="np-o-h">—</b><small>ч/сутки</small></div>
<div class="ia-o"><span>За год на буровую</span><b id="np-o-hy">—</b><small>ч</small></div>
<div class="ia-o"><span>Это суток работы</span><b id="np-o-d">—</b><small>на буровую</small></div>
<div class="ia-o key"><span>Потери в год, все буровые</span><b id="np-o-loss">—</b></div>
<div class="ia-o"><span>Окупаемость начинается с</span><b id="np-o-be">—</b><small>% сокращения</small></div>
<div class="ia-o"><span>Потери в год на буровую</span><b id="np-o-l1">—</b></div>
</div>
<h3>Если вернуть часть скрытого НПВ</h3>
<fieldset class="np-as"><legend>Ваши допущения</legend>{sl("rec", "Удастся сократить скрытое НПВ на", 0, 60, 1, 20, " %")}{nf("price", "Мониторинг на буровую, ₽ в месяц", "90 000")}</fieldset>
<div class="np-cmp" id="np-cmp"></div><div class="ia-outs np-o4"><div class="ia-o"><span>Возврат за год</span><b id="np-o-save">—</b></div><div class="ia-o"><span>Мониторинг за год</span><b id="np-o-cost">—</b></div><div class="ia-o"><span>Отдача на 1 ₽ мониторинга</span><b id="np-o-roi">—</b><small>₽</small></div><div class="ia-o"><span>Окупится за</span><b id="np-o-pay">—</b><small>мес.</small></div></div>
<p class="np-verdict" id="np-verdict"></p>
<div class="np-btns"><a class="btn pri" id="np-send" href="../../?lead=pilot#contact">Проверить на своей буровой: пилот на 30 дней</a><button type="button" class="btn" id="np-print">Распечатать или PDF</button><button type="button" class="btn" id="np-link">Скопировать ссылку на расчёт</button></div>
</div>
</section>
<h2>Откуда берутся цифры</h2>
<ul>
<li><b>Наращивания.</b> Каждое наращивание дольше норматива на 1–3 минуты незаметно. При 15–25 наращиваниях в сутки это полчаса-час каждый день.</li>
<li><b>СПО.</b> Скорость спуска и подъёма заметно зависит от бригады и смены. Время сверх норматива по свечам обычно и есть главная часть скрытого НПВ.</li>
<li><b>Ожидания.</b> Согласования, ожидание решения, лишние промывки: всё, что в рапорте записано как штатная операция.</li>
</ul>
<p>Все значения в калькуляторе — ваши допущения. Сколько скрытого НПВ на самом деле, покажут данные станции: Tempo сам определяет операции буровой, считает время «клинья — клинья» и «вес — вес» по каждому наращиванию и сравнивает с нормативом по сменам и видам работ.</p>
<div class="note"><b>Как проверить на своих данных</b> — <a href="../../pilot/">пилот Tempo за 30 дней</a>: подключаем 1–3 буровые, в конце готовим отчёт по фактическому скрытому НПВ.</div>'''
page("tools/npt-cost/", "Сколько стоит скрытое НПВ буровой — калькулятор потерь", "Сколько стоит скрытое НПВ",
     "Калькулятор скрытого непроизводительного времени буровой: потери на наращиваниях, СПО и ожиданиях в рублях за год, окупаемость мониторинга бурения.",
     '<a href="../../tools/">Инструменты</a> / Скрытое НПВ', "Инструменты", side("tools/npt-cost/", "../../"), npt, ["@npt-cost.js"], css=("@articles.css", "@tools.css"))

# ---------------- игра ----------------
game = '''<p class="lead">Ствол идёт с зенитом около 50°, впереди пласт толщиной 5 м. Где точно кровля, неизвестно: по проекту она на пунктирной линии, на деле может оказаться выше или ниже и с наклоном. Войдите в пласт почти горизонтально и удержитесь в нём до конца минуты.</p>
<section class="pg" id="pg" aria-label="Игра: посади горизонталь">
<div class="pg-hud"><div><span>Время</span><b id="pg-t">60 с</b></div><div><span>Зенит</span><b id="pg-inc">—</b></div><div><span>До кровли по проекту</span><b id="pg-plan">—</b></div><div><span>ГК</span><b id="pg-grv">—</b></div><div><span>Режим</span><b id="pg-mode">Ротор</b></div><div><span>В пласте</span><b id="pg-zone">—</b></div></div>
<canvas class="pg-cv" id="pg-cv" role="img" aria-label="Разрез: ствол, проектная кровля и подошва пласта"></canvas>
<div class="pg-ctl"><button type="button" id="pg-up">▲ Слайд на набор<small>держать · стрелка вверх или W</small></button><button type="button" id="pg-dn">▼ Слайд на падение<small>держать · стрелка вниз или S</small></button></div>
<div class="pg-ov" id="pg-start"><div class="pg-card"><h2>Посади горизонталь за 60 секунд</h2><ul><li>Отпустили кнопки, и пошёл ротор: ствол идёт прямо и чуть падает.</li><li>Держите кнопку, чтобы слайдить: набор или падение 8° на 30 м.</li><li>Если ГК падает и ствол становится жёлтым, вы в коллекторе. Если растёт, подходите к глинам.</li><li>Очки: 70 % за долю горизонтали в пласте, 30 % за то, насколько горизонтально вошли.</li></ul><div class="pg-btns"><button type="button" class="btn pri" id="pg-go">Начать</button></div><p class="pg-best" id="pg-best"></p></div></div>
<div class="pg-ov" id="pg-res" hidden><div class="pg-card"><div class="pg-big"><span id="pg-sc">0</span><small> / 100</small></div><h2 id="pg-gr"></h2><div id="pg-det"></div><div class="pg-btns"><button type="button" class="btn pri" id="pg-again">Ещё раз</button><button type="button" class="btn" id="pg-share">Поделиться результатом</button><a class="btn" href="../slidex/">Полная версия в SlideX</a></div></div></div>
</section>
<h2>Что в игре упрощено</h2>
<p>Это разминка. Здесь замер мгновенный и прямо на долоте, нет реактивного момента, компоновка всегда даёт ровно 8°/30 м, а ротор одинаково роняет угол. В реальной скважине замер отстаёт от долота на 10–20 м, а способность компоновки меняется от пласта к пласту, поэтому посадку считают заранее.</p>
<ul><li>Как рассчитать посадку на цель: <a href="../articles/landing/">статья</a> и <a href="../calculators/landing/">калькулятор посадки</a>.</li><li>Как ведут ствол по ГК и сопротивлению: <a href="../articles/geosteering/">Геонавигация</a>.</li><li>Ориентирование, отставание замера, реактивный момент и осложнения есть в тренажёре <a href="../slidex/">SlideX</a>.</li></ul>'''
page("play/", "Игра «Посади горизонталь за 60 секунд» — проверь себя как инженер ННБ", "Посади горизонталь за 60 секунд",
     "Браузерная игра для инженеров ННБ: слайд и ротор, кровля пласта по ГК. Войдите в пласт горизонтально и удержитесь в нём. Без регистрации.",
     "Игра", "Игра для инженеров ННБ", "", game, ["@play.js"], css=("@articles.css", "@tools.css"))
import os
pp = "/home/claude/proj/site/play/index.html"; t = open(pp, encoding="utf-8").read().replace('<div class="w artwrap">', '<div class="w artwrap solo">', 1); open(pp, "w", encoding="utf-8").write(t)

# ---------------- пилот ----------------
pil = '''<p class="lead">Проверьте Tempo на своих буровых, прежде чем принимать решение. За месяц подключаем 1–3 буровые, все службы работают в Tempo, а в конце вы получаете отчёт: сколько скрытого НПВ на самом деле, на каких операциях и в какие смены.</p>
<div class="pl-steps">
<section><div class="pl-w">Дни 1–3</div><h3>Подготовка</h3><ul><li>Выбираем буровые и станции ГТИ, ННБ</li><li>Согласуем подключение с ИТ и безопасностью</li><li>Договор пилота и соглашение о конфиденциальности</li><li>Ваши нормативы на операции</li></ul></section>
<section><div class="pl-w">Неделя 1</div><h3>Подключение</h3><ul><li>Tempo Box к станции по RS-232 или сети</li><li>Проверка потока данных и профиля станции</li><li>Доступы службам: роли, скважины</li><li>Короткое обучение на рабочих местах</li></ul></section>
<section><div class="pl-w">Недели 2–3</div><h3>Работа</h3><ul><li>Мониторинг для всех служб в браузере</li><li>Баланс времени и суточный рапорт без ручного сбора</li><li>Скрытое НПВ по сменам и видам работ</li><li>Помощник ННБ: долото, следующий слайд</li></ul></section>
<section><div class="pl-w">Неделя 4</div><h3>Итоги</h3><ul><li>Отчёт: фактическое скрытое НПВ по операциям и сменам</li><li>Оценка в рублях по вашей стоимости суток</li><li>Что мешало и что подключить дальше</li><li>Решение о продолжении</li></ul></section>
</div>
<div class="pl-two">
<div><h3>Что нужно от вас</h3><ul><li>Доступ к данным станции ГТИ или телесистемы ННБ на выбранных буровых</li><li>Контакт на буровой для подключения</li><li>Нормативы на наращивания и СПО для расчёта скрытого НПВ</li><li>Стоимость суток, если нужна оценка в рублях</li></ul></div>
<div><h3>Что делаем мы</h3><ul><li>Подключение станций и настройка профилей</li><li>Организацию и доступы для служб</li><li>Обучение и поддержку на время пилота</li><li>Итоговый отчёт и разбор с вашей командой</li></ul></div>
</div>
<h2>Данные и безопасность</h2>
<ul>
<li>Блоку Tempo Box нужен только исходящий HTTPS к серверу Tempo, входящие подключения в сеть буровой не открываются.</li>
<li>При обрыве связи данные копятся на блоке и досылаются по порядку, когда связь восстановится.</li>
<li>Работаем в облаке DrillHarmony или устанавливаем Tempo на сервер заказчика.</li>
<li>ИИ-помощник на выбор: российские или зарубежные модели или локальная модель в контуре заказчика. Цифры считает Tempo, модель только пишет текст.</li>
<li>Условия хранения и удаления данных после пилота фиксируются в договоре. Подробнее на странице <a href="../security/">Безопасность данных</a>.</li>
</ul>
<h2>Частые вопросы</h2>
<div class="qa"><details><summary>Сколько стоит пилот?</summary><p>Условия пилота, включая оборудование на время пилота, обсуждаются под число буровых и срок. Напишите, и мы пришлём предложение.</p></details>
<details><summary>Нужно ли ставить программы на компьютер станции?</summary><p>Нет, если используется Tempo Box: блок подключается к станции кабелем или по сети. Если у станции свой сервер, блок сам забирает с него каротаж и замеры.</p></details>
<details><summary>Какие станции ГТИ поддерживаются?</summary><p>Tempo работает с профилями под разные станции ГТИ; для нестандартной станции настраивается свой профиль. Перечислите станции в заявке, и мы проверим заранее.</p></details>
<details><summary>Когда можно начать?</summary><p>Tempo сейчас в раннем доступе, релиз 30 ноября 2026 года. Пилоты раннего доступа планируем по заявкам.</p></details></div>
<p>Прикинуть эффект до пилота можно в калькуляторе <a href="../tools/npt-cost/">«Сколько стоит скрытое НПВ»</a>.</p>
<div class="cta"><div><h2>Подключить буровую на пилот</h2><p>Расскажите, сколько буровых и какие станции ГТИ, и мы ответим с предложением.</p></div><div class="btns"><a class="btn pri" href="../?lead=pilot#contact">Оставить заявку</a><a class="btn" href="../tempo/">О Tempo</a></div></div>'''
pside = '<aside class="anav-wrap"><details class="anav" open><summary>Tempo</summary><nav aria-label="Tempo"><div class="ang"><div class="ang-h">Tempo</div><a href="../tempo/">О программе</a><a href="../pilot/" aria-current="page">Пилот за 30 дней</a><a href="../tools/npt-cost/">Сколько стоит скрытое НПВ</a><a href="../buy/">Как купить</a><a href="../security/">Безопасность данных</a></div><div class="ang"><div class="ang-h">Другие продукты</div><a href="../slidex/">SlideX</a><a href="../etude/">Etude</a></div></nav></details></aside>'
page("pilot/", "Пилот Tempo за 30 дней: мониторинг бурения на ваших буровых", "Пилот Tempo за 30 дней",
     "Как проходит пилот онлайн-мониторинга бурения Tempo: подготовка, подключение станций ГТИ и ННБ, три недели работы и отчёт по фактическому скрытому НПВ.",
     "Пилот Tempo", "Tempo · пилот", pside, pil, [], css=("@articles.css", "@tools.css"))
print("ok more")

# ---------------- как купить ----------------
bside = lambda cur: '<aside class="anav-wrap"><details class="anav" open><summary>Заказчикам</summary><nav aria-label="Заказчикам"><div class="ang"><div class="ang-h">Заказчикам</div>' + "".join(f'<a href="../{u}"' + (' aria-current="page"' if u == cur else "") + f">{n}</a>" for u, n in [("about/", "О компании"), ("buy/", "Как купить"), ("security/", "Безопасность данных"), ("pilot/", "Пилот Tempo за 30 дней"), ("tools/npt-cost/", "Сколько стоит скрытое НПВ")]) + '</div><div class="ang"><div class="ang-h">Продукты</div><a href="../slidex/">SlideX</a><a href="../tempo/">Tempo</a><a href="../etude/">Etude</a></div></nav></details></aside>'
buy = '''<p class="lead">Как компании начать работать с SlideX, Tempo или Etude: от первой заявки до подключения сотрудников. Каждый шаг можно пройти в своём темпе, а решение о покупке принимается после проверки на ваших задачах.</p>
<ol class="by-steps">
<li><b>Заявка</b><span>Напишите, какая программа интересна, сколько буровых, рабочих мест или слушателей. Ответим и предложим время для демонстрации.</span></li>
<li><b>Демонстрация</b><span>Онлайн, 40–60 минут. Показываем программу на ваших сценариях: скважина, куст, учебная группа. Отвечаем на вопросы специалистов и ИТ.</span></li>
<li><b>Проверка на ваших данных</b><span>Tempo — <a href="../pilot/">пилот на 1–3 буровых</a>. Etude — тестовый доступ и перенос ваших проектов из EDM XML. SlideX — пробная группа слушателей.</span></li>
<li><b>Коммерческое предложение</b><span>Под ваш объём: число буровых, мест или слушателей, срок, облако или ваш сервер, поддержка и доработки.</span></li>
<li><b>Согласования и договор</b><span>Документы для закупки и проверка службой безопасности: материалы на странице <a href="../security/">«Безопасность данных»</a>. Лицензионный договор и счёт.</span></li>
<li><b>Подключение</b><span>Заводим организацию, дальше компания сама добавляет сотрудников и настраивает доступы. Обучение пользователей, поддержка.</span></li>
</ol>
<h2>Варианты работы</h2>
<div class="by-cards">
<section><h3>Tempo</h3><p>Подписка за буровую в месяц. Блок Tempo Box на буровую. Облако DrillHarmony или сервер заказчика.</p><a href="../tempo/">О Tempo</a></section>
<section><h3>Etude</h3><p>Рабочие места для проектировщиков или установка на сервер компании. Личный доступ подойдёт инженеру, который проектирует сам.</p><a href="../etude/">Об Etude</a></section>
<section><h3>SlideX</h3><p>Учебным центрам и компаниям подключаем нужное число слушателей на срок обучения. Инженеру подойдёт личный доступ.</p><a href="../slidex/">О SlideX</a></section>
</div>
<h2>Частые вопросы закупки</h2>
<div class="qa">
<details><summary>Можно ли купить одну программу, а не все три?</summary><p>Да. Каждая программа работает отдельно. Если нужны несколько, условия считаются пакетом.</p></details>
<details><summary>Работаете ли вы с тендерными процедурами?</summary><p>Да, участвуем в закупках заказчика. Сообщите регламент и сроки, и мы подготовим предложение и документы под процедуру.</p></details>
<details><summary>Как устроена поддержка?</summary><p>Порядок и сроки ответа фиксируются в договоре. На время пилота и подключения ваших специалистов сопровождаем отдельно.</p></details>
<details><summary>Можно ли доработать программу под нас?</summary><p>Да: профили нестандартных станций ГТИ, форматы отчётов, интеграции. Объём доработок оговаривается в предложении.</p></details>
<details><summary>Сколько стоит?</summary><p>Зависит от объёма и варианта установки. Напишите, сколько буровых, рабочих мест или слушателей, и мы пришлём предложение.</p></details>
</div>
<div class="cta"><div><h2>Начать с демонстрации</h2><p>Расскажите о задаче: подберём программу и покажем её на ваших сценариях.</p></div><div class="btns"><a class="btn pri" href="../?lead=several#contact">Оставить заявку</a><a class="btn" href="../pilot/">Пилот Tempo</a></div></div>'''
page("buy/", "Как купить SlideX, Tempo и Etude: шаги для компании", "Как купить",
     "Как компании начать работать с программами DrillHarmony: заявка, демонстрация, пилот на ваших данных, коммерческое предложение, договор и подключение сотрудников.",
     "Как купить", "Заказчикам", bside("buy/"), buy, [], css=("@articles.css", "@tools.css"))

# ---------------- безопасность ----------------
sec = '''<p class="lead">Ответы для службы безопасности и ИТ заказчика: где хранятся данные, как подключается буровая, кто видит информацию и где работает ИИ-помощник. Если нужен документ под ваш опросник, напишите, и мы его заполним.</p>
<div class="sx-grid">
<section><h3>Где хранятся данные</h3><ul><li>В облаке DrillHarmony или на сервере заказчика, по выбору организации.</li><li>Etude и Tempo устанавливаются на сервер компании, если данные не должны выходить за её периметр.</li><li>Условия хранения и удаления данных фиксируются в договоре.</li></ul></section>
<section><h3>Подключение буровой</h3><ul><li>Tempo Box подключается к станции ГТИ или телесистеме ННБ кабелем RS-232 или по сети.</li><li>Блоку нужен только исходящий HTTPS к серверу Tempo, входящие подключения в сеть буровой не открываются.</li><li>Программы на компьютер станции не ставятся.</li><li>При обрыве связи данные копятся на блоке (около трёх недель) и досылаются по порядку.</li></ul></section>
<section><h3>Доступ сотрудников</h3><ul><li>Организацию заводит DrillHarmony, дальше компания сама добавляет сотрудников.</li><li>Доступ настраивается по ролям и скважинам: каждый видит только то, что ему открыли.</li><li>Работа через браузер, на рабочие места ничего не устанавливается.</li></ul></section>
<section><h3>ИИ-помощник</h3><ul><li>По выбору организации: российские или зарубежные облачные модели либо локальная модель на сервере компании.</li><li>С локальной моделью запросы не выходят за периметр компании.</li><li>Цифры считает программа, модель только пишет текст: сводку, разбор уведомления, ответ на вопрос.</li><li>Встроенный помощник Etude работает без внешних сервисов.</li></ul></section>
<section><h3>Работа без связи</h3><ul><li>Etude: ствол берётся на куст, работа на ноутбуке без интернета, правки уходят на сервер, когда появляется связь.</li><li>Tempo Box: данные не теряются при обрыве канала, есть запасной 4G-модем.</li></ul></section>
<section><h3>Бесплатные инструменты сайта</h3><ul><li>Просмотр LAS, траектория, калькуляторы работают в браузере пользователя.</li><li>Файлы и введённые данные не отправляются на сервер.</li></ul></section>
</div>
<h2>Для согласования</h2>
<p>Для проверки службой безопасности подготовим под вашу процедуру описание архитектуры и потоков данных, требования к серверу при установке у заказчика, ответы на опросник по информационной безопасности. Запрос можно отправить через <a href="../?lead=onprem#contact">форму заявки</a> или на <a href="mailto:info@drillharmony.com">info@drillharmony.com</a>.</p>
<p>Как обрабатываются персональные данные посетителей сайта, описано в <a href="../privacy.html">политике обработки персональных данных</a>.</p>'''
page("security/", "Безопасность данных в Tempo, Etude и SlideX: для службы безопасности заказчика", "Безопасность данных",
     "Где хранятся данные программ DrillHarmony, как Tempo Box подключается к буровой, доступ по ролям, ИИ-помощник в контуре заказчика, работа без связи.",
     "Безопасность данных", "Заказчикам", bside("security/"), sec, [], css=("@articles.css", "@tools.css"))
print("ok buy/security")

# ---------------- о компании ----------------
about = '''<p class="lead">DrillHarmony делает программы для наклонно-направленного бурения: для тех, кто ведёт ствол на буровой, проектирует скважины и учит инженеров. Три программы закрывают весь путь скважины: обучение, проект, бурение.</p>
<div class="ab-prod">
<a href="../slidex/"><small>Обучение</small><b>SlideX</b><span>Тренажёр инженера ННБ: сборка КНБК, ориентирование, замеры и осложнения на учебных скважинах. Экзамены и сертификаты для учебных центров.</span></a>
<a href="../etude/"><small>Проект</small><b>Etude</b><span>Проектирование траекторий и контроль сближения стволов по кусту и месторождению, расчёты бурения, программа на бурение.</span></a>
<a href="../tempo/"><small>Бурение</small><b>Tempo</b><span>Онлайн-мониторинг для всех служб: операции буровой, скрытое НПВ, траектория и подсказки ННБ, суточный рапорт.</span></a>
</div>
<h2>Как мы работаем</h2>
<div class="ab-pr">
<section><h3>Считает программа</h3><p>Все цифры берутся из расчёта по формулам и данным скважины. ИИ-помощник только пишет текст: сводку, разбор, ответ на вопрос. Решение остаётся за инженером.</p></section>
<section><h3>Свои расчёты по открытым методам</h3><p>Минимальная кривизна, модели погрешностей ISCWSA, расчёт нагрузок на колонну реализованы самостоятельно по открытым публикациям, без копирования чужих закрытых разработок.</p></section>
<section><h3>Проверка на реальных данных</h3><p>Расчёты сверяем с данными реальных скважин, а не только с примерами из учебника. Например, при переносе 25 траекторий из EDM XML расхождение с исходной программой не превысило 0,5 мм.</p></section>
<section><h3>Данные остаются у заказчика</h3><p>Облако DrillHarmony или сервер компании, локальная модель ИИ в контуре заказчика. Подробно на странице <a href="../security/">Безопасность данных</a>.</p></section>
<section><h3>Сделано для буровой</h3><p>Работа без связи на кусту, сборщик данных, который не теряет поток при обрыве канала, интерфейс, понятный на смене.</p></section>
<section><h3>Открытые знания</h3><p>Статьи, калькуляторы и инструменты на сайте бесплатны и без регистрации: <a href="../articles/">36 статей</a>, <a href="../calculators/">23 калькулятора</a>, <a href="../tools/">инструменты</a> и <a href="../tests/">тесты</a>.</p></section>
</div>
<h2>Цифры</h2>
<div class="facts2 ab-f"><div><b>3</b><span>программы: обучение, проект, бурение</span></div><div><b>16</b><span>учебных билетов SlideX на пяти скважинах</span></div><div><b>0,5 мм</b><span>расхождение при переносе 25 траекторий из EDM XML</span></div><div><b>6</b><span>служб на одном экране Tempo: ГТИ, ННБ, растворы, долота, супервайзер, заказчик</span></div></div>
<h2>Выход программ</h2>
<ol class="ab-tl">
<li><time>31 октября 2026</time><b>SlideX</b><span>Релиз тренажёра. Сейчас открыт ранний доступ.</span></li>
<li><time>30 ноября 2026</time><b>Tempo</b><span>Релиз мониторинга. Пилоты раннего доступа проводим по заявкам: <a href="../pilot/">пилот за 30 дней</a>.</span></li>
<li><time>1 квартал 2027</time><b>Etude</b><span>Релиз проектирования. Сейчас открыт ранний доступ и личный доступ для инженеров.</span></li>
</ol>
<p>В раннем доступе мы собираем замечания первых пользователей и учитываем их в следующих версиях.</p>
<h2>Реквизиты</h2>
<div class="ab-req"><div><span>Организация</span><b>ИП Шайсламова Анастасия Васильевна</b></div><div><span>ИНН</span><b>780445570608</b></div><div><span>Почта</span><b><a href="mailto:info@drillharmony.com">info@drillharmony.com</a></b></div><div><span>Сайт</span><b>drillharmony.com</b></div></div>
<div class="cta"><div><h2>Обсудить задачу</h2><p>Расскажите, что нужно: обучение, проектирование или мониторинг. Ответим и предложим демонстрацию.</p></div><div class="btns"><a class="btn pri" href="../?lead=other#contact">Написать нам</a><a class="btn" href="../buy/">Как купить</a></div></div>'''
page("about/", "О компании DrillHarmony: программы для наклонно-направленного бурения", "О компании",
     "DrillHarmony делает программы для наклонно-направленного бурения: тренажёр SlideX, проектирование Etude, мониторинг Tempo. Принципы работы, сроки выхода программ, реквизиты.",
     "О компании", "DrillHarmony", bside("about/"), about, [], css=("@articles.css", "@tools.css"))
print("ok about")
