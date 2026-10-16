// DrillHarmony · общий код приложения: тема, размер текста, профиль скважины, история, избранное,
// копирование и «поделиться». Подключается в <head> каждой страницы до скриптов калькулятора.
(() => {
  const ls = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };
  const P = () => (window.Capacitor && window.Capacitor.Plugins) || {};
  const SITE = "https://drillharmony.com/";
  const D = document.documentElement;
  window.dhApp = { ls, SITE };

  // ---------- тема, размер текста, системные панели ----------
  try { const t = localStorage.getItem("dh-theme"); if (t === "light" || t === "dark") D.dataset.theme = t; } catch (e) {}
  const size = () => { const s = ls.get("dh-size", "m"); D.dataset.size = s; };
  size();
  const bar = () => {
    const sb = P().SystemBars; if (!sb) return;
    try { sb.setStyle({ style: D.dataset.theme === "light" ? "LIGHT" : "DARK" }); } catch (e) {}
  };
  new MutationObserver(bar).observe(D, { attributes: true, attributeFilter: ["data-theme"] });
  window.dhApp.setTheme = (t) => { D.dataset.theme = t; try { localStorage.setItem("dh-theme", t); } catch (e) {} };
  window.dhApp.setSize = (s) => { ls.set("dh-size", s); size(); };

  // ---------- профиль скважины ----------
  // [ключ, подпись, единица, раздел]; значения вводятся так же, как в калькуляторах
  const PROF = [
    ["md", "Забой по стволу", "м", "Скважина"], ["tvd", "Вертикальная глубина", "м", "Скважина"], ["bit", "Диаметр долота", "мм", "Скважина"],
    ["csg_id", "ID обсадной колонны", "мм", "Скважина"], ["shoe", "Глубина башмака", "м", "Скважина"],
    ["dp_od", "Трубы Ø наруж.", "мм", "Колонна и КНБК"], ["dp_id", "Трубы Ø внутр.", "мм", "Колонна и КНБК"], ["dp_w", "Вес 1 м труб", "кг/м", "Колонна и КНБК"],
    ["dc_od", "УБТ/КНБК Ø наруж.", "мм", "Колонна и КНБК"], ["dc_id", "УБТ/КНБК Ø внутр.", "мм", "Колонна и КНБК"], ["dc_len", "Длина УБТ/КНБК", "м", "Колонна и КНБК"],
    ["rho", "Плотность раствора", "г/см³", "Раствор и насос"], ["mud_v", "Объём раствора", "м³", "Раствор и насос"], ["q", "Расход", "л/с", "Раствор и насос"],
    ["pump_l", "Подача насоса", "л/ход", "Раствор и насос"], ["tfa", "TFA насадок", "мм²", "Раствор и насос"],
    ["t600", "θ600", "дел.", "Раствор и насос"], ["t300", "θ300", "дел.", "Раствор и насос"], ["t6", "θ6", "дел.", "Раствор и насос"], ["t3", "θ3", "дел.", "Раствор и насос"],
    ["pp", "Поровое давление", "г/см³ экв.", "Давления"], ["fg", "Давление ГРП", "г/см³ экв.", "Давления"],
    ["bt", "Bt модели", "нТл", "Магнитная модель"], ["dip", "Dip модели", "°", "Магнитная модель"], ["decl", "Поправка азимута", "°", "Магнитная модель"],
  ];
  const wells = () => ls.get("dh-wells", []);
  const activeWell = () => { const w = wells(), id = ls.get("dh-well", null); return w.find((x) => x.id === id) || w[0] || null; };
  Object.assign(window.dhApp, {
    PROF, wells, activeWell,
    saveWells: (w) => ls.set("dh-wells", w),
    setActive: (id) => ls.set("dh-well", id),
  });

  // ---------- сообщения, копирование, поделиться ----------
  const toast = (msg) => {
    let el = document.querySelector(".toast");
    if (!el) { el = document.createElement("div"); el.className = "toast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
    el.textContent = msg; el.classList.add("on"); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("on"), 1800);
  };
  const copy = async (text) => {
    const cb = P().Clipboard;
    if (cb) { try { await cb.write({ string: text }); return true; } catch (e) {} }
    if (navigator.clipboard && window.isSecureContext) { try { await navigator.clipboard.writeText(text); return true; } catch (e) {} }
    const ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;opacity:0;top:0";
    document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand("copy"); } catch (e) {} ta.remove(); return ok;
  };
  window.dhApp.toast = toast;
  const modeQS = () => { const m = document.querySelector(".cmode"); const b = m && m.querySelector("[aria-pressed=true]"); return m && b ? m.dataset.mode + "=" + b.dataset.v : ""; };
  const pageQS = () => {
    let qs = ""; try { if (typeof calcQS === "function") qs = calcQS(); } catch (e) {}
    const m = modeQS(); return m ? (qs ? qs + "&" : "?") + m : qs;
  };
  // ссылка на ту же страницу сайта с введёнными значениями
  const pageUrl = () => {
    const path = (document.body && document.body.dataset.path) || "", hash = path.indexOf("#");
    return SITE + (hash < 0 ? path + pageQS() : path);
  };
  // заменяет calcCopy сайта: текст результата уходит в буфер обмена
  window.dhAppCopy = (text, btn, msg) => {
    const w = activeWell(), head = w && w.name ? "Скважина: " + w.name + "\n" : "";
    copy(head + text.replace(/https?:\/\/(localhost|127\.0\.0\.1)[^\s]*/g, pageUrl())).then((ok) => toast(ok ? msg : "Не удалось скопировать"));
  };
  window.dhAppShare = async () => {
    const url = pageUrl(), title = document.body.dataset.name || "DrillHarmony", sh = P().Share;
    try {
      if (sh) { await sh.share({ title, url, dialogTitle: "Поделиться расчётом" }); return; }
      if (navigator.share) { await navigator.share({ title, url }); return; }
    } catch (e) { if (e && /cancel|abort/i.test(String(e.message || e.name || e))) return; }
    copy(url).then((ok) => toast(ok ? "Ссылка скопирована" : "Не удалось скопировать"));
  };

  // ---------- сохранение файлов (CSV, PNG) ----------
  // В WebView <a download> не работает: файл пишется во временную папку и отдаётся в системное меню «Поделиться».
  const native = () => { const c = window.Capacitor; try { return !!c && (c.isNativePlatform ? c.isNativePlatform() : c.getPlatform && c.getPlatform() !== "web"); } catch (e) { return false; } };
  const toB64 = (blob) => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1]); r.onerror = no; r.readAsDataURL(blob); });
  const click0 = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    const fs = P().Filesystem, sh = P().Share;
    if (!this.hasAttribute("download") || !native() || !fs || !sh) return click0.call(this);
    const name = (this.getAttribute("download") || "drillharmony").replace(/[^\w.\-а-яё]+/gi, "_");
    fetch(this.href).then((r) => r.blob()).then(toB64)
      .then((data) => fs.writeFile({ path: name, data, directory: "CACHE" }))
      .then((w) => sh.share({ title: name, files: [w.uri], dialogTitle: "Сохранить или отправить" }))
      .catch((e) => { if (!/cancel/i.test(String(e && e.message))) toast("Не удалось сохранить файл"); });
  };

  // ---------- онлайн-данные и форум внутри приложения ----------
  // Вход по учётной записи DrillHarmony: форум выдаёт одноразовый пропуск и переводит на live.drillharmony.com.
  // Окно открывается поверх приложения с кнопкой «Закрыть»; вход хранится в нём 30 дней, как на сайте.
  const LIVE = SITE + "forum/sso/live";
  const inApp = (u) => /^https:\/\/(live\.)?drillharmony\.com\/(forum\/|sso|$)/.test(u) || /^https:\/\/live\.drillharmony\.com\//.test(u);
  window.dhApp.openWeb = (url) => {
    const ib = P().InAppBrowser;
    if (ib && native()) {
      return ib.openInWebView({ url, options: {
        showURL: false, showToolbar: true, closeButtonText: "Закрыть", showNavigationButtons: true, toolbarPosition: "TOP", leftToRight: false,
        clearCache: false, clearSessionCache: false, mediaPlaybackRequiresUserAction: true, customWebViewUserAgent: null,
        android: { allowZoom: false, hardwareBack: true, pauseMedia: true },
        iOS: { allowOverScroll: true, enableViewportScale: false, allowInLineMediaPlayback: false, surpressIncrementalRendering: false,
          viewStyle: "FULL_SCREEN", animationEffect: "COVER_VERTICAL", allowsBackForwardNavigationGestures: true },
      } }).catch(() => window.open(url, "_blank"));
    }
    window.open(url, "_blank");
  };
  window.dhApp.openLive = () => window.dhApp.openWeb(LIVE);
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-live]");
    if (b) { e.preventDefault(); return window.dhApp.openLive(); }
    const a = e.target.closest("a[href]");
    if (a && (a.hasAttribute("data-inapp") || inApp(a.href))) { e.preventDefault(); window.dhApp.openWeb(a.href); }
  });

  // ---------- избранное, недавние, история ----------
  const fav = () => ls.get("dh-fav", []);
  Object.assign(window.dhApp, {
    fav,
    toggleFav: (slug) => { const f = fav(), i = f.indexOf(slug); i < 0 ? f.unshift(slug) : f.splice(i, 1); ls.set("dh-fav", f); return i < 0; },
    recent: () => ls.get("dh-recent", []),
    history: () => ls.get("dh-hist", []),
    setHistory: (h) => ls.set("dh-hist", h),
  });
  const pushRecent = (slug) => { const r = ls.get("dh-recent", []).filter((s) => s !== slug); r.unshift(slug); ls.set("dh-recent", r.slice(0, 8)); };

  document.addEventListener("DOMContentLoaded", () => {
    bar();
    const SB = P().SplashScreen; if (SB) try { SB.hide(); } catch (e) {}
    const body = document.body, slug = body.dataset.slug;

    // назад: по истории, а если её нет — на главный экран
    document.querySelectorAll("[data-back]").forEach((b) => b.addEventListener("click", (e) => {
      e.preventDefault();
      if (history.length > 1 && document.referrer) history.back(); else location.href = b.getAttribute("href");
    }));
    if (!slug) return;
    pushRecent(slug);

    // схема и пояснения свёрнуты; при открытии схема перерисовывается под ширину экрана
    document.querySelectorAll("details.fold").forEach((d) => {
      const k = "dh-fold:" + slug + ":" + [...document.querySelectorAll("details.fold")].indexOf(d);
      if (ls.get(k, false)) d.open = true;
      d.addEventListener("toggle", () => {
        ls.set(k, d.open);
        if (d.open) requestAnimationFrame(() => {
          window.dispatchEvent(new Event("resize"));
          const i = document.querySelector(".calc .ci input"); if (i) i.dispatchEvent(new Event("input", { bubbles: true }));
        });
      });
    });

    const npl = document.getElementById("np-link");
    if (npl) npl.addEventListener("click", (e) => { e.stopImmediatePropagation(); e.preventDefault(); window.dhAppShare(); }, true);

    const st = document.querySelector(".ib.star");
    if (st) {
      st.setAttribute("aria-pressed", fav().includes(slug) ? "true" : "false");
      st.addEventListener("click", () => {
        const on = window.dhApp.toggleFav(slug);
        st.setAttribute("aria-pressed", on ? "true" : "false");
        toast(on ? "Добавлено в избранное" : "Убрано из избранного");
      });
    }

    const ins = [...document.querySelectorAll(".calc .ci input")];
    if (!ins.length) return;
    const fire = (i) => i && i.dispatchEvent(new Event("input", { bubbles: true }));
    const key = "dh-in:" + slug, saved = ls.get(key, null);

    // профиль скважины: поля с data-p
    const profLabels = [...document.querySelectorAll(".calc .ci label[data-p]")];
    const fromProfile = (force) => {
      const w = activeWell(); if (!w) return 0;
      let n = 0, last = null;
      profLabels.forEach((l) => {
        const v = (w.v || {})[l.dataset.p], i = l.querySelector("input");
        if (v == null || String(v).trim() === "") return;
        if (force || i.value !== v) { i.value = v; last = i; }
        l.classList.add("fromp"); n++;
      });
      fire(last); return n;
    };
    // порядок: значения из ссылки (или истории) → иначе профиль скважины, поверх него — то, что вводили вручную
    if (!location.search) {
      fromProfile(false);
      if (saved) {
        let changed = null;
        ins.forEach((i) => {
          if (i.id in saved && saved[i.id] !== i.value) { i.value = saved[i.id]; changed = i; const l = i.closest("label"); if (l) l.classList.remove("fromp"); }
        });
        fire(changed);
      }
    }
    // запоминаются только поля, изменённые вручную
    ins.forEach((i) => i.addEventListener("input", (e) => {
      if (!e.isTrusted) return;
      const l = i.closest("label"); if (l) l.classList.remove("fromp");
      const o = ls.get(key, {}) || {};
      if (i.value === i.dataset.def) delete o[i.id]; else o[i.id] = i.value;
      Object.keys(o).length ? ls.set(key, o) : ls.del(key);
    }));

    // «Готово» на клавиатуре: переход к следующему видимому полю
    const vis = () => ins.filter((i) => !i.closest("label").hidden);
    ins.forEach((i) => {
      i.addEventListener("keydown", (e) => { if (e.key !== "Enter") return; e.preventDefault(); const v = vis(), n = v.indexOf(i); n < v.length - 1 ? v[n + 1].focus() : i.blur(); });
      i.addEventListener("focus", () => { const v = vis(); i.setAttribute("enterkeyhint", v.indexOf(i) < v.length - 1 ? "next" : "done"); setTimeout(() => i.select(), 0); });
    });

    // панель действий
    const siteBtn = (a) => document.querySelector(`.calc-act [data-act="${a}"]`);
    const actions = {
      prof() {
        const w = activeWell();
        if (!profLabels.length) return toast("В этом расчёте нет полей из профиля скважины");
        if (!w) return toast("Профиль не заполнен: вкладка «Скважина» на главном экране");
        const o = ls.get(key, {}) || {};
        profLabels.forEach((l) => { const v = (w.v || {})[l.dataset.p]; if (v != null && String(v).trim() !== "") delete o[l.querySelector("input").id]; });
        Object.keys(o).length ? ls.set(key, o) : ls.del(key);
        const n = fromProfile(true);
        toast(n ? `Из профиля «${w.name || "без названия"}»: ${n} ${n === 1 ? "поле" : n < 5 ? "поля" : "полей"}` : "В профиле нет данных для этих полей");
      },
      reset() { ls.del(key); profLabels.forEach((l) => l.classList.remove("fromp")); const b = siteBtn("reset"); if (b) b.click(); toast("Значения по умолчанию"); },
      copy() { const b = siteBtn("copy"); if (b) b.click(); },
      share() { window.dhAppShare(); },
      save() {
        const outs = [...document.querySelectorAll(".calc .co")].filter((c) => !c.classList.contains("verdict") && c.closest("[hidden]") == null)
          .map((c) => [c.querySelector("span").textContent, c.querySelector("b").textContent, c.querySelector("small").textContent]).filter((x) => x[1] !== "—");
        const vd = document.querySelector(".calc .co.verdict b"), w = activeWell();
        const back = document.querySelector("[data-back]").getAttribute("href"), depth = (back.match(/\.\.\//g) || []).length;
        const rel = location.pathname.split("/").filter(Boolean).slice(-depth - 1).join("/");
        const h = window.dhApp.history();
        h.unshift({ t: Date.now(), slug, name: body.dataset.name, rel: rel.endsWith(".html") ? rel : rel + "/index.html", qs: pageQS(),
          outs: outs.slice(0, 4), v: vd && vd.textContent !== "—" ? vd.textContent : "", well: w && w.name || "" });
        window.dhApp.setHistory(h.slice(0, 300));
        toast("Сохранено в историю");
      },
    };
    const ab = document.querySelector(".actbar");
    if (ab) {
      if (!profLabels.length) ab.querySelector('[data-a="prof"]').classList.add("dim");
      ab.addEventListener("click", (e) => { const b = e.target.closest("[data-a]"); if (b) actions[b.dataset.a](); });
    }
  });
})();
