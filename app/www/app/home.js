// DrillHarmony · главный экран: разделы, поиск, профиль скважины, история, справочник, настройки.
(() => {
  const { items, groups } = window.DH, GI = window.DH_GI, IC = window.DH_IC;
  const by = Object.fromEntries(items.map((x) => [x.slug, x]));
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const A = window.dhApp, esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const plural = (n, a, b, c) => n % 10 === 1 && n % 100 !== 11 ? a : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? b : c;

  // ---------- навигация: вкладка и раздел в адресе, чтобы «назад» на Android работал внутри экрана ----------
  const state = () => { const h = new URLSearchParams(location.hash.slice(1)); return { tab: h.get("t") || "calc", sect: h.get("s") || "" }; };
  const go = (tab, sect = "", push = true) => {
    const h = tab === "calc" && !sect ? "" : "#t=" + tab + (sect ? "&s=" + sect : "");
    try { history[push ? "pushState" : "replaceState"](null, "", location.pathname + h); } catch (e) {}
    render();
  };
  window.addEventListener("popstate", () => render());
  $$(".tabs [data-tab]").forEach((b) => b.addEventListener("click", () => { const s = state(); if (s.tab !== b.dataset.tab || s.sect) go(b.dataset.tab, "", s.tab !== b.dataset.tab); }));
  // ---------- оформление строк в стиле iOS: цветной значок, название, значение справа, стрелка ----------
  // один акцент, как на сайте: янтарный для всех значков (раньше каждый раздел был своего цвета)
  const COL = new Proxy({}, { get: () => "var(--amber)" });
  const gOf = Object.fromEntries(groups.flatMap((g) => g.s.map((s) => [s, g.k])));
  const chev = IC.go.replace("<svg", '<svg class="chev"');
  const cell = ({ tag = "a", href, attrs = "", ic, c, title, sub, val, badge }) =>
    `<${tag} class="r"${href ? ` href="${href}"` : ""}${tag === "button" ? ' type="button"' : ""} ${attrs}><span class="ri" style="--c:${c}">${ic}</span>` +
    `<span class="rt"><b><span class="nm">${title}</span>${badge || ""}</b>${sub ? `<small>${sub}</small>` : ""}</span>${val != null ? `<span class="rv">${val}</span>` : ""}${chev}</${tag}>`;
  const row = (x) => cell({ href: x.href, attrs: `data-slug="${x.slug}"`, c: COL[gOf[x.slug]] || "#8e8e93",
    ic: x.svg ? x.svg : `<i class="ab">${esc(x.icon)}</i>`, title: esc(x.name), sub: esc(x.desc) });
  const word = (k, n) => k === "models" ? plural(n, "модель", "модели", "моделей") : k === "tools" || k === "learn" ? plural(n, "раздел", "раздела", "разделов") : plural(n, "расчёт", "расчёта", "расчётов");
  const SUB = { traj: "Минимальная кривизна, отклонитель, отдача ВЗД, посадка", survey: "Сырые оси, НУБТ, SAG, слепая зона, батарея", drill: "MSE, гидравлика долота, ВЗД, вес на крюке",
    hyd: "Потери давления, ЭЦП, репрессия, затрубье", mud: "Барит, разбавление, реология, реторта, насос", gti: "Lag, d-экспонента, поровое давление, окно",
    tools: "3D-траектория, LAS, НПВ, единицы, шпаргалка", models: "Интерактивные 3D-модели из статей", learn: "Тесты, задача недели, игра «Посади горизонталь»" };
  const group = (h, rows) => rows.length ? `${h ? `<div class="gh">${h}</div>` : ""}<div class="glist">${rows.join("")}</div>` : "";

  // ---------- главный экран «пульт»: карточка скважины, онлайн-данные, недавние, разделы списком ----------
  const grid = $("#grid");
  const ABR = { traj: "MC", survey: "GxB", drill: "MSE", hyd: "ΔP", mud: "ρ", gti: "dc", tools: "", models: "", learn: "" };
  const prow = (g, i) => `<button type="button" class="prow" data-g="${g.k}" style="--i:${i}"><span class="pic">${ABR[g.k] ? `<i class="ab">${ABR[g.k]}</i>` : GI[g.k]}</span>` +
    `<span class="pt"><b>${esc(g.t === "Модели" ? "3D-модели" : g.t)}</b><small>${SUB[g.k] || ""}</small></span><span class="pn">${g.s.length}</span>${chev}</button>`;
  const count = (el, to, dec) => { if (!el) return; if (!isFinite(to)) { el.textContent = "—"; return; } const t0 = performance.now(), fx = document.documentElement.classList.contains("fx");
    const f = (v) => v.toFixed(dec).replace(".", ","); if (!fx) { el.textContent = f(to); return; }
    const run = (t) => { const k = Math.min(1, (t - t0) / 900), e = 1 - Math.pow(1 - k, 3); el.textContent = f(to * e); if (k < 1) requestAnimationFrame(run); }; requestAnimationFrame(run); };
  const num = (v) => { const n = parseFloat(String(v || "").replace(",", ".")); return isFinite(n) ? n : NaN; };
  const dec = (v) => { const m = /[.,](\d+)/.exec(String(v || "")); return m ? m[1].length : 0; };
  const home = () => {
    const w = A.activeWell(), v = (w && w.v) || {}, f = A.fav().filter((s) => by[s]), r = A.recent().filter((s) => by[s] && !f.includes(s)).slice(0, 6);
    const calc = groups.filter((g) => ["traj", "survey", "drill", "hyd", "mud", "gti"].includes(g.k)), more = groups.filter((g) => ["tools", "models", "learn"].includes(g.k));
    grid.innerHTML =
      (f.length + r.length ? `<div class="h2">Недавние</div><div class="recent">${f.map((s) => `<a class="rc" href="${by[s].href}"><i>★</i>${esc(by[s].name)}</a>`).join("")}${r.map((s) => `<a class="rc" href="${by[s].href}">${esc(by[s].name)}</a>`).join("")}</div>` : "") +
      `<div class="h2">Расчёты</div><div class="plist">${calc.map(prow).join("")}</div>` +
      `<div class="h2">Инструменты и обучение</div><div class="plist">${more.map((g, i) => prow(g, i + 6)).join("")}` +
      (by.game ? `<a class="prow" href="${by.game.href}" style="--i:9"><span class="pic">${GI.game}</span><span class="pt"><b>Вахта</b><small>Игра: смена на буровой</small></span><span class="pn"></span>${chev}</a>` : "") + `</div>` +
      `<p class="foot">DrillHarmony.com · расчёты справочные</p>`;
  };
  const drill = () => {}; const coverflow = () => {};
  // поиск по кнопке в шапке
  document.addEventListener("click", (e) => { if (!e.target.closest("#sbtn")) return; const sb = $("#sbox"); sb.classList.toggle("open"); if (sb.classList.contains("open")) setTimeout(() => $("#q").focus(), 120); else { $("#q").value = ""; search(); } });
  grid.addEventListener("click", (e) => { const b = e.target.closest("[data-g]"); if (b) return go("calc", b.dataset.g); const p = e.target.closest("[data-go]"); if (p) go(p.dataset.go); });
  $("#sect-back").addEventListener("click", () => history.length > 1 && location.hash ? history.back() : go("calc", "", false));

  const sect = (k) => {
    const g = groups.find((x) => x.k === k); if (!g) return false;
    $("#sect-t").textContent = g.t === "Модели" ? "3D-модели" : g.t; $("#sect-n").textContent = g.s.length + " " + word(k, g.s.length) + (SUB[k] ? " · " + SUB[k] : "");
    $("#sect-l").innerHTML = g.s.map((s) => row(by[s])).join("");
    return true;
  };
  const quick = home;              // избранное и недавние живут в списке главного экрана

  // ---------- поиск ----------
  const norm = (s) => s.toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9°/ ]+/g, " ");
  const gname = Object.fromEntries(groups.flatMap((g) => g.s.map((s) => [s, g.t])));
  const idx = items.map((x) => [x, norm([x.name, x.desc, gname[x.slug] || "", x.icon].join(" "))]);
  const q = $("#q");
  const search = () => {
    const words = norm(q.value).split(/\s+/).filter(Boolean), on = words.length > 0, s = state();
    $("#q-x").classList.toggle("hidden", !q.value);
    $("#found").classList.toggle("hidden", !on);
    grid.classList.toggle("hidden", on || !!s.sect); $("#sect").classList.toggle("hidden", on || !s.sect);
    if (on) $("#sbox").classList.add("open");
    $("#lt").classList.toggle("hidden", !!s.sect && !on); $(".ios-srch").classList.toggle("hidden", !!s.sect && !on);
    $("#heroes").classList.toggle("hidden", on || !!s.sect);
    if (!on) { $("#none").classList.add("hidden"); return; }
    const hit = idx.filter(([, t]) => words.every((w) => t.includes(w))).map(([x]) => x);
    $("#found").innerHTML = hit.map(row).join("");
    $("#found").classList.toggle("hidden", !hit.length);
    $("#none").classList.toggle("hidden", hit.length > 0);
  };
  q.addEventListener("input", search);
  q.addEventListener("keydown", (e) => { if (e.key === "Enter") q.blur(); });
  $("#q-x").addEventListener("click", () => { q.value = ""; search(); q.focus(); });

  // ---------- профиль скважины ----------
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const wellchip = () => { if (state().tab === "calc") home(); };
  const EX = { md: "3200", tvd: "2650", bit: "215,9", csg_id: "224,4", shoe: "1350", dp_od: "127", dp_id: "108,6", dp_w: "31", dc_od: "172", dc_id: "71", dc_len: "150",
    rho: "1,18", mud_v: "120", q: "30", pump_l: "18,5", tfa: "350", t600: "52", t300: "32", t6: "7", t3: "6", pp: "1,12", fg: "1,65", bt: "58420", dip: "74,6", decl: "15,4" };
  const prof = () => {
    const pane = $('[data-pane="prof"]'), ws = A.wells(), w = A.activeWell();
    const secs = [...new Set(A.PROF.map((p) => p[3]))];
    pane.innerHTML = `<div class="wells chips">${ws.map((x) => `<button type="button" class="chip${w && x.id === w.id ? " on" : ""}" data-w="${x.id}">${esc(x.name || "Без названия")}</button>`).join("")}<button type="button" class="chip add" data-add>+ Скважина</button></div>` +
      (!w ? `<div class="card"><h2>Профиль скважины</h2><p>Конструкция, КНБК, раствор и магнитная модель вводятся один раз и подставляются во все расчёты, где есть такие поля. Можно завести несколько скважин и переключаться между ними.</p><p><button type="button" class="btn pri" data-add>Создать профиль</button></p></div>` :
        `<div class="pf"><label class="pf-name"><span>Название</span><input id="pf-name" value="${esc(w.name || "")}" placeholder="Куст 12, скв. 1204" autocomplete="off"></label>` +
        secs.map((s) => `<div class="pf-sec">${esc(s)}</div><div class="pf-grid">` + A.PROF.filter((p) => p[3] === s).map(([k, l, u]) =>
          `<label data-u="${esc(u)}"><span data-u="${esc(u)}">${esc(l)}</span><input data-k="${k}" inputmode="decimal" placeholder="${EX[k] || ""}" value="${esc((w.v || {})[k] || "")}"><small>${esc(u)}</small></label>`).join("") + `</div>`).join("") +
        `<div class="pf-act"><button type="button" class="btn" data-dup>Дублировать скважину</button><button type="button" class="btn warn" data-del>Удалить</button></div>` +
        `<p class="muted small">Поля из профиля в расчётах отмечены точкой. Значение, исправленное в самом расчёте, профиль не перезаписывает, кнопка «Профиль» внизу расчёта подставит всё заново.</p></div>`);
    const save = (fn) => { const all = A.wells(), cur = all.find((x) => x.id === (A.activeWell() || {}).id); if (cur) { fn(cur); A.saveWells(all); wellchip(); } };
    pane.onclick = (e) => {
      const t = e.target.closest("button"); if (!t) return;
      if (t.dataset.w) { A.setActive(t.dataset.w); prof(); wellchip(); }
      else if (t.hasAttribute("data-add")) { const all = A.wells(), n = { id: uid(), name: "Скважина " + (all.length + 1), v: {} }; all.push(n); A.saveWells(all); A.setActive(n.id); prof(); wellchip(); $("#pf-name").select(); }
      else if (t.hasAttribute("data-dup")) { const all = A.wells(), c = A.activeWell(), n = { id: uid(), name: (c.name || "Скважина") + " (копия)", v: { ...c.v } }; all.push(n); A.saveWells(all); A.setActive(n.id); prof(); wellchip(); }
      else if (t.hasAttribute("data-del")) { const c = A.activeWell(); if (!confirm(`Удалить профиль «${c.name || "без названия"}»?`)) return; const all = A.wells().filter((x) => x.id !== c.id); A.saveWells(all); A.setActive(all[0] ? all[0].id : null); prof(); wellchip(); }
    };
    const nm = $("#pf-name");
    if (nm) nm.addEventListener("input", () => save((c) => { c.name = nm.value.trim(); }));
    $$(".pf-grid input", pane).forEach((i) => i.addEventListener("input", () => save((c) => { c.v = c.v || {}; const v = i.value.trim(); if (v) c.v[i.dataset.k] = v; else delete c.v[i.dataset.k]; })));
    const ins = $$(".pf input", pane);
    ins.forEach((i, n) => i.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); n < ins.length - 1 ? ins[n + 1].focus() : i.blur(); } }));
  };

  // ---------- история ----------
  const hist = () => {
    const pane = $('[data-pane="hist"]'), h = A.history();
    if (!h.length) { pane.innerHTML = `<div class="card"><h2>История расчётов</h2><p>Нажмите «В историю» внизу любого расчёта, и здесь сохранятся исходные данные и результат. Из истории расчёт открывается с теми же значениями.</p></div>`; return; }
    const day = (t) => new Date(t).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
    const tm = (t) => new Date(t).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    let cur = "", out = `<div class="srch">${IC.search}<input id="hq" type="search" placeholder="Поиск по истории" aria-label="Поиск по истории"></div><div id="hl">`;
    h.forEach((e, i) => {
      const d = day(e.t); if (d !== cur) { out += `<div class="hday">${d}</div>`; cur = d; }
      out += `<div class="he" data-i="${i}"><a href="${esc(e.rel + (e.qs || ""))}"><b>${esc(e.name)}</b><small>${tm(e.t)}${e.well ? " · " + esc(e.well) : ""}</small>` +
        `<span class="hv">${e.outs.map((o) => `<i>${esc(o[0])}: <em>${esc(o[1])}</em> ${esc(o[2])}</i>`).join("")}</span>${e.v ? `<span class="hvd">${esc(e.v)}</span>` : ""}</a>` +
        `<button type="button" class="ib del" aria-label="Удалить">×</button></div>`;
    });
    pane.innerHTML = out + `</div><button type="button" class="row danger" id="hclear">Очистить историю<small>${h.length} ${plural(h.length, "запись", "записи", "записей")}</small></button>`;
    pane.onclick = (ev) => {
      const del = ev.target.closest(".del");
      if (del) { const i = +del.closest(".he").dataset.i, all = A.history(); all.splice(i, 1); A.setHistory(all); hist(); }
      if (ev.target.closest("#hclear") && confirm("Удалить всю историю расчётов?")) { A.setHistory([]); hist(); }
    };
    $("#hq").addEventListener("input", (ev) => {
      const w = norm(ev.target.value).split(/\s+/).filter(Boolean);
      $$(".he", pane).forEach((el) => { el.hidden = w.length > 0 && !w.every((x) => norm(el.textContent).includes(x)); });
      $$(".hday", pane).forEach((d) => { let n = d.nextElementSibling, any = false; while (n && !n.classList.contains("hday")) { if (!n.hidden) any = true; n = n.nextElementSibling; } d.hidden = !any; });
    });
  };

  // ---------- справочник: термины и русско-английский словарь ----------
  let refMode = "g";
  const ref = () => {
    const pane = $('[data-pane="ref"]');
    if (!pane.innerHTML) {
      const R = window.DH_REF || { gloss: [], dict: [] };
      pane.innerHTML = `<div class="srch">${IC.search}<input id="rq" type="search" placeholder="Термин на русском или английском" autocomplete="off" aria-label="Поиск в справочнике"></div>` +
        `<div class="seg" id="rseg"><button type="button" data-r="g" aria-pressed="true">Термины · ${R.gloss.length}</button><button type="button" data-r="d" aria-pressed="false">Словарь RU–EN · ${R.dict.length}</button></div><div id="rl"></div>`;
      const gl = R.gloss.map(([t, d]) => [norm(t + " " + d), `<div class="gl"><b>${esc(t)}</b><span>${esc(d)}</span></div>`]);
      let sec = "";
      const dl = R.dict.map(([s, ru, en, note]) => [norm([s, ru, en, note].join(" ")), s, `<div class="dl"><b>${esc(ru)}</b><span class="en">${esc(en)}</span>${note ? `<small>${esc(note)}</small>` : ""}</div>`]);
      const draw = () => {
        const w = norm($("#rq").value).split(/\s+/).filter(Boolean), ok = (t) => w.every((x) => t.includes(x));
        if (refMode === "g") $("#rl").innerHTML = gl.filter(([t]) => ok(t)).map((x) => x[1]).join("") || `<p class="empty">Ничего не нашлось</p>`;
        else { sec = ""; $("#rl").innerHTML = dl.filter(([t]) => ok(t)).map(([, s, h]) => (s !== sec ? `<div class="hday">${esc(sec = s)}</div>` : "") + h).join("") || `<p class="empty">Ничего не нашлось</p>`; }
      };
      $("#rq").addEventListener("input", draw);
      $("#rseg").addEventListener("click", (e) => { const b = e.target.closest("[data-r]"); if (!b) return; refMode = b.dataset.r; $$("#rseg button").forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false")); draw(); });
      draw();
    }
  };

  // ---------- ещё: тема, размер, избранное, данные ----------
  const seg = () => {
    $$("#themes [data-t]").forEach((b) => b.setAttribute("aria-pressed", document.documentElement.dataset.theme === b.dataset.t ? "true" : "false"));
    $$("#sizes [data-s]").forEach((b) => b.setAttribute("aria-pressed", document.documentElement.dataset.size === b.dataset.s ? "true" : "false"));
    $$("#anims [data-f]").forEach((b) => b.setAttribute("aria-pressed", String(document.documentElement.classList.contains("fx") === (b.dataset.f === "1"))));
  };
  $$("#themes [data-t]").forEach((b) => b.addEventListener("click", () => { A.setTheme(b.dataset.t); seg(); }));
  $$("#sizes [data-s]").forEach((b) => b.addEventListener("click", () => { A.setSize(b.dataset.s); seg(); }));
  $$("#anims [data-f]").forEach((b) => b.addEventListener("click", () => { window.dhFx && window.dhFx.set(b.dataset.f === "1"); seg(); }));
  const favs = () => {
    const f = A.fav().filter((s) => by[s]);
    $("#favs").innerHTML = f.map((s) => row(by[s])).join(""); $("#fav-none").classList.toggle("hidden", f.length > 0);
  };
  $("#clear").addEventListener("click", () => {
    try { Object.keys(localStorage).filter((k) => k.startsWith("dh-in:") || k.startsWith("dh-mode:") || k === "dh-recent").forEach((k) => localStorage.removeItem(k)); } catch (e) {}
    quick(); A.toast("Введённые значения удалены");
  });
  $("#clear-all").addEventListener("click", () => {
    if (!confirm("Удалить профили скважин, историю, избранное и введённые значения?")) return;
    try { Object.keys(localStorage).filter((k) => k.startsWith("dh-") && k !== "dh-theme" && k !== "dh-size").forEach((k) => localStorage.removeItem(k)); } catch (e) {}
    quick(); favs(); wellchip(); A.toast("Данные приложения удалены");
  });

  // ---------- отрисовка ----------
  const LT0 = $("#lt").innerHTML;
  const render = () => {
    let { tab, sect: s } = state();
    if (!["calc", "prof", "hist", "ref", "more"].includes(tab)) tab = "calc";
    $$(".tabs [data-tab]").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === tab ? "true" : "false"));
    { const tb = $(".tabs"), sel = $(".tabs [aria-selected=true]"); let ind = $(".tab-ind"); if (!ind) { ind = document.createElement("i"); ind.className = "tab-ind"; tb.appendChild(ind); }
      if (sel) { ind.style.width = sel.offsetWidth * 0.5 + "px"; ind.style.transform = `translateX(${sel.offsetLeft + sel.offsetWidth * 0.25}px)`; } }
    $$("[data-pane]").forEach((p) => p.classList.toggle("hidden", p.dataset.pane !== tab));
    const TT = { prof: "Скважина", hist: "История", ref: "Справочник", more: "Ещё" };
    $("#lt").innerHTML = tab === "calc" ? LT0 : `<span>${TT[tab]}</span>`; $("#lt").classList.remove("hidden");
    if (tab === "calc") { if (s && !sect(s)) s = ""; home(); search(); }
    if (tab === "prof") prof();
    if (tab === "hist") hist();
    if (tab === "ref") ref();
    if (tab === "more") { seg(); favs(); }
    window.scrollTo(0, 0);
  };
  window.addEventListener("pageshow", () => { wellchip(); const t = state().tab; if (t === "calc") quick(); if (t === "hist") hist(); if (t === "more") favs(); });
  wellchip(); render();
})();
