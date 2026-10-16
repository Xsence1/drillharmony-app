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
  $("#wellchip").addEventListener("click", () => go("prof"));

  const row = (x) => `<a class="it" href="${x.href}" data-slug="${x.slug}"><span class="ic">${x.svg || esc(x.icon)}</span>` +
    `<span class="tx"><b>${esc(x.name)}${x.app ? '<i class="tag">новое</i>' : ""}</b><span>${esc(x.desc)}</span></span>${IC.go.replace("<svg", '<svg class="go"')}</a>`;

  // ---------- расчёты: сетка разделов ----------
  const grid = $("#grid");
  grid.innerHTML = groups.map((g, i) => {
    const n = g.s.length, w = g.k === "models" ? plural(n, "модель", "модели", "моделей") : g.k === "tools" || g.k === "learn" ? plural(n, "раздел", "раздела", "разделов") : plural(n, "расчёт", "расчёта", "расчётов");
    const title = esc(g.t).replace("Инклинометрия", "Инклино&shy;метрия").replace("Инструменты", "Инстру&shy;менты");
    if (g.k === "game") return `<a class="tile wide t-game" href="${by.game.href}" style="--i:${i}"><span class="ti">${GI.game}</span><b>${esc(by.game.name)}</b><small>Играть →</small></a>`;
    return `<button type="button" class="tile t-${g.k}" data-g="${g.k}" style="--i:${i}"><span class="ti">${GI[g.k]}</span><b>${title}</b><small>${n} ${w}</small></button>`;
  }).join("");
  grid.addEventListener("click", (e) => { const b = e.target.closest("[data-g]"); if (b) go("calc", b.dataset.g); });
  $("#sect-back").addEventListener("click", () => history.length > 1 && location.hash ? history.back() : go("calc", "", false));

  const sect = (k) => {
    const g = groups.find((x) => x.k === k); if (!g) return false;
    $("#sect-t").textContent = g.t; $("#sect-n").textContent = g.s.length;
    $("#sect-l").innerHTML = g.s.map((s) => row(by[s])).join("");
    $$("#sect-l .it").forEach((a, i) => a.style.setProperty("--i", i));
    return true;
  };

  // ---------- слайдер карточек: точки и автопрокрутка ----------
  const sl = $("#slider"), dots = $("#dots");
  if (sl && dots) {
    const n = sl.children.length; dots.innerHTML = "<i></i>".repeat(n); [...sl.children].forEach((c, i) => c.style.setProperty("--i", i));
    const cur = () => Math.round(sl.scrollLeft / (sl.children[1].offsetLeft - sl.children[0].offsetLeft || 1));
    const mark = () => $$("i", dots).forEach((d, i) => d.classList.toggle("on", i === Math.min(n - 1, cur())));
    sl.addEventListener("scroll", mark, { passive: true }); mark();
    let idle = 0; const auto = setInterval(() => { if (document.hidden || !document.documentElement.classList.contains("fx") || state().tab !== "calc") return;
      if (++idle < 2) return; const k = (cur() + 1) % n; sl.scrollTo({ left: sl.children[k].offsetLeft - sl.children[0].offsetLeft, behavior: "smooth" }); }, 4500);
    ["pointerdown", "touchstart"].forEach((ev) => sl.addEventListener(ev, () => { idle = -3; }, { passive: true }));
  }

  // ---------- быстрый доступ: избранное и недавние ----------
  const quick = () => {
    const f = A.fav().filter((s) => by[s]), r = A.recent().filter((s) => by[s] && !f.includes(s)).slice(0, 6);
    $("#quick").innerHTML = f.map((s) => `<a class="chip fav" href="${by[s].href}">${IC.star}${esc(by[s].name)}</a>`).join("") +
      r.map((s) => `<a class="chip" href="${by[s].href}">${esc(by[s].name)}</a>`).join("");
    $("#quick").classList.toggle("hidden", !(f.length + r.length));
  };

  // ---------- поиск ----------
  const norm = (s) => s.toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9°/ ]+/g, " ");
  const gname = Object.fromEntries(groups.flatMap((g) => g.s.map((s) => [s, g.t])));
  const idx = items.map((x) => [x, norm([x.name, x.desc, gname[x.slug] || "", x.icon].join(" "))]);
  const q = $("#q");
  const search = () => {
    const words = norm(q.value).split(/\s+/).filter(Boolean), on = words.length > 0, s = state();
    $("#q-x").classList.toggle("hidden", !q.value);
    $("#found").classList.toggle("hidden", !on);
    $("#grid").classList.toggle("hidden", on || !!s.sect); $("#sect").classList.toggle("hidden", on || !s.sect);
    $("#quick").classList.toggle("hidden", on || !!s.sect || !$("#quick").innerHTML);
    [".hero", "#slider", "#dots"].forEach((q) => { const el = $(q); if (el) el.classList.toggle("hidden", on || !!s.sect); });
    if (!on) { $("#none").classList.add("hidden"); return; }
    const hit = idx.filter(([, t]) => words.every((w) => t.includes(w))).map(([x]) => x);
    $("#found").innerHTML = hit.map(row).join("");
    $("#none").classList.toggle("hidden", hit.length > 0);
  };
  q.addEventListener("input", search);
  q.addEventListener("keydown", (e) => { if (e.key === "Enter") q.blur(); });
  $("#q-x").addEventListener("click", () => { q.value = ""; search(); q.focus(); });

  // ---------- профиль скважины ----------
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const wellchip = () => { const w = A.activeWell(); $("#wellchip").innerHTML = `<i></i>${esc(w ? w.name || "Скважина" : "Профиль скважины")}`; $("#wellchip").classList.toggle("empty", !w); };
  const prof = () => {
    const pane = $('[data-pane="prof"]'), ws = A.wells(), w = A.activeWell();
    const secs = [...new Set(A.PROF.map((p) => p[3]))];
    pane.innerHTML = `<div class="wells chips">${ws.map((x) => `<button type="button" class="chip${w && x.id === w.id ? " on" : ""}" data-w="${x.id}">${esc(x.name || "Без названия")}</button>`).join("")}<button type="button" class="chip add" data-add>+ Скважина</button></div>` +
      (!w ? `<div class="card"><h2>Профиль скважины</h2><p>Конструкция, КНБК, раствор и магнитная модель вводятся один раз и подставляются во все расчёты, где есть такие поля. Можно завести несколько скважин и переключаться между ними.</p><p><button type="button" class="btn pri" data-add>Создать профиль</button></p></div>` :
        `<div class="pf"><label class="pf-name"><span>Название</span><input id="pf-name" value="${esc(w.name || "")}" placeholder="Куст 12, скв. 1204" autocomplete="off"></label>` +
        secs.map((s) => `<div class="pf-sec">${esc(s)}</div><div class="pf-grid">` + A.PROF.filter((p) => p[3] === s).map(([k, l, u]) =>
          `<label data-u="${esc(u)}"><span data-u="${esc(u)}">${esc(l)}</span><input data-k="${k}" inputmode="decimal" value="${esc((w.v || {})[k] || "")}"><small>${esc(u)}</small></label>`).join("") + `</div>`).join("") +
        `<p class="pf-act"><button type="button" class="btn" data-dup>Копия</button><button type="button" class="btn warn" data-del>Удалить</button></p>` +
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
    let cur = "", out = `<div class="hbar"><input id="hq" type="search" placeholder="Поиск по истории" aria-label="Поиск по истории"><button type="button" class="btn" id="hclear">Очистить</button></div><div id="hl">`;
    h.forEach((e, i) => {
      const d = day(e.t); if (d !== cur) { out += `<div class="hday">${d}</div>`; cur = d; }
      out += `<div class="he" data-i="${i}"><a href="${esc(e.rel + (e.qs || ""))}"><b>${esc(e.name)}</b><small>${tm(e.t)}${e.well ? " · " + esc(e.well) : ""}</small>` +
        `<span class="hv">${e.outs.map((o) => `<i>${esc(o[0])}: <em>${esc(o[1])}</em> ${esc(o[2])}</i>`).join("")}</span>${e.v ? `<span class="hvd">${esc(e.v)}</span>` : ""}</a>` +
        `<button type="button" class="ib del" aria-label="Удалить">×</button></div>`;
    });
    pane.innerHTML = out + "</div>";
    pane.onclick = (ev) => {
      const del = ev.target.closest(".del");
      if (del) { const i = +del.closest(".he").dataset.i, all = A.history(); all.splice(i, 1); A.setHistory(all); hist(); }
      if (ev.target.id === "hclear" && confirm("Удалить всю историю расчётов?")) { A.setHistory([]); hist(); }
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
  const render = () => {
    let { tab, sect: s } = state();
    if (!["calc", "prof", "hist", "ref", "more"].includes(tab)) tab = "calc";
    $$(".tabs [data-tab]").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === tab ? "true" : "false"));
    $$("[data-pane]").forEach((p) => p.classList.toggle("hidden", p.dataset.pane !== tab));
    if (tab === "calc") { if (s && !sect(s)) s = ""; quick(); search(); }
    if (tab === "prof") prof();
    if (tab === "hist") hist();
    if (tab === "ref") ref();
    if (tab === "more") { seg(); favs(); }
    window.scrollTo(0, 0);
  };
  window.addEventListener("pageshow", () => { wellchip(); const t = state().tab; if (t === "calc") quick(); if (t === "hist") hist(); if (t === "more") favs(); });
  wellchip(); render();
})();
