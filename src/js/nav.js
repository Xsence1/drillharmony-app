// Шапка сайта: поиск, «Войти», «Ранний доступ», мобильное меню.
// Подключается на всех страницах (build.py добавляет его автоматически).
(() => {
  const top = document.querySelector("header.top");
  const nav = top && top.querySelector(".nav");
  if (!nav || nav.querySelector(".hact")) return;

  const mark = top.querySelector(".mark");
  const homeHref = mark && mark.getAttribute("href");
  const isHome = homeHref === "#top";
  const root = isHome ? "" : homeHref || "/";           // относительный путь к корню сайта
  const theme = nav.querySelector("#theme");
  // единое меню на всех страницах — как на главной
  if (!isHome) {
    const cur = /\/forum\//.test(location.pathname) ? "Форум" : /\/(tools|tasks|career|tests|cheatsheet|play)\//.test(location.pathname) ? "Инструменты" : /\/about\//.test(location.pathname) ? "О компании" : /\/(pilot|buy|security)\//.test(location.pathname) ? "" : (nav.querySelector("a[aria-current]") || {}).textContent;
    nav.querySelectorAll(":scope > a").forEach((a) => a.remove());
    [["slidex/", "SlideX"], ["tempo/", "Tempo"], ["etude/", "Etude"], ["articles/", "Статьи"], ["calculators/", "Калькуляторы"], ["tools/", "Инструменты"], ["forum/", "Форум"], ["about/", "О компании"]].forEach(([h, t]) => {
      const a = document.createElement("a"); a.href = root + h; a.textContent = t;
      if (t === cur || (t === "SlideX" || t === "Tempo" || t === "Etude") && (location.pathname.includes("/" + t.toLowerCase() + "/") || t === "Tempo" && location.pathname.includes("/pilot/"))) a.setAttribute("aria-current", "page");
      nav.insertBefore(a, theme);
    });
  }
  const svg = (d, s = 18) => `<svg viewBox="0 0 20 20" width="${s}" height="${s}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

  // ---- блок действий справа ----
  const act = document.createElement("div");
  act.className = "hact";
  act.innerHTML =
    `<button type="button" class="tgl sbtn" aria-label="Поиск по сайту" title="Поиск (Ctrl+K)">${svg('<circle cx="9" cy="9" r="5.5"/><path d="m13.2 13.2 3.8 3.8"/>')}</button>` +
    `<div class="login"><button type="button" class="hbtn" aria-haspopup="true" aria-expanded="false">Войти</button>` +
    `<div class="login-m" hidden><a href="https://slidex.drillharmony.com" rel="noopener">SlideX<small>Тренажёр инженера ННБ</small></a>` +
    `<a href="https://tempo.drillharmony.com" rel="noopener">Tempo<small>Мониторинг бурения</small></a>` +
    `<a href="https://etude.drillharmony.com" rel="noopener">Etude<small>Проектирование траекторий</small></a></div></div>` +
    `<a class="hbtn pri" href="${root}?lead=other#contact">Ранний доступ ${svg('<path d="M4 10h11M11 6l4 4-4 4"/>', 16)}</a>`;
  if (theme) act.insertBefore(theme, act.firstChild.nextSibling);
  const burger = document.createElement("button");
  burger.type = "button";
  burger.className = "tgl burger";
  burger.setAttribute("aria-label", "Меню");
  burger.setAttribute("aria-expanded", "false");
  burger.innerHTML = svg('<path d="M3 5.5h14M3 10h14M3 14.5h14"/>');
  act.appendChild(burger);
  nav.appendChild(act);

  // ---- «Войти» ----
  const lb = act.querySelector(".login .hbtn"), lm = act.querySelector(".login-m");
  lb.addEventListener("click", (e) => { e.stopPropagation(); lm.hidden = !lm.hidden; lb.setAttribute("aria-expanded", String(!lm.hidden)); });
  document.addEventListener("click", (e) => { if (!e.target.closest(".login")) { lm.hidden = true; lb.setAttribute("aria-expanded", "false"); } });

  // ---- мобильное меню ----
  const links = [...nav.querySelectorAll(":scope > a")];
  const panel = document.createElement("nav");
  panel.className = "mnav";
  panel.setAttribute("aria-label", "Меню сайта");
  panel.hidden = true;
  const add = (href, text, cur) => { const a = document.createElement("a"); a.href = href; a.textContent = text; if (cur) a.setAttribute("aria-current", "page"); panel.appendChild(a); };
  if (!isHome && homeHref) add(homeHref, "Главная");
  links.forEach((a) => add(a.getAttribute("href"), a.textContent.trim(), a.getAttribute("aria-current")));
  const row = document.createElement("div");
  row.className = "mrow";
  row.innerHTML = `<a class="hbtn" href="https://slidex.drillharmony.com" rel="noopener">Войти в SlideX</a><a class="hbtn pri" href="${root}?lead=other#contact">Ранний доступ</a>`;
  panel.appendChild(row);
  top.appendChild(panel);
  const setMenu = (open) => {
    panel.hidden = !open;
    burger.setAttribute("aria-expanded", String(open));
    burger.innerHTML = open ? svg('<path d="M5 5l10 10M15 5 5 15"/>') : svg('<path d="M3 5.5h14M3 10h14M3 14.5h14"/>');
  };
  burger.addEventListener("click", (e) => { e.stopPropagation(); setMenu(panel.hidden); });
  panel.addEventListener("click", (e) => e.target.closest("a") && setMenu(false));
  document.addEventListener("click", (e) => !panel.hidden && !top.contains(e.target) && setMenu(false));
  matchMedia("(min-width: 1101px)").addEventListener("change", (e) => e.matches && setMenu(false));

  // ---- поиск по сайту (search.json собирает build.py) ----
  let idx = null, dlg = null;
  const norm = (s) => s.toLowerCase().replace(/ё/g, "е");
  const openSearch = () => {
    if (!dlg) {
      dlg = document.createElement("dialog");
      dlg.className = "sdlg";
      dlg.innerHTML = '<input type="search" placeholder="Статьи, калькуляторы, программы…" aria-label="Поиск по сайту"><div class="sres"></div>';
      document.body.appendChild(dlg);
      const inp = dlg.querySelector("input"), res = dlg.querySelector(".sres");
      let sel = 0;
      const draw = () => {
        if (!idx) { res.innerHTML = "<p>Загружаем…</p>"; return; }
        const q = norm(inp.value.trim()), words = q.split(/\s+/).filter(Boolean);
        let list = idx.map((p) => {
          const t = norm(p.t), d = norm(p.d + " " + (p.k || ""));
          let s = 0;
          for (const w of words) { if (t.includes(w)) s += 3; else if (d.includes(w)) s += 1; else return null; }
          return [s, p];
        }).filter(Boolean);
        if (!words.length) list = idx.filter((p) => p.f).map((p) => [0, p]);
        list.sort((a, b) => b[0] - a[0]);
        sel = 0;
        res.innerHTML = list.slice(0, 14).map(([, p], i) => `<a href="${root}${p.u}"${i ? "" : ' class="sel"'}><i>${p.s}</i>${p.t}<small>${p.d}</small></a>`).join("") || "<p>Ничего не нашлось. Попробуйте другое слово: «toolface», «ЭЦП», «WITSML».</p>";
      };
      inp.addEventListener("input", draw);
      inp.addEventListener("keydown", (e) => {
        const items = [...res.querySelectorAll("a")];
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + items.length) % Math.max(1, items.length);
          items.forEach((a, i) => a.classList.toggle("sel", i === sel));
          items[sel] && items[sel].scrollIntoView({ block: "nearest" });
        } else if (e.key === "Enter" && items[sel]) location.href = items[sel].href;
      });
      dlg.addEventListener("click", (e) => e.target === dlg && dlg.close());
      dlg._draw = draw;
      fetch(root + "search.json").then((r) => r.json()).then((j) => { idx = j; draw(); }).catch(() => { res.innerHTML = "<p>Поиск недоступен.</p>"; });
    }
    dlg.showModal();
    dlg.querySelector("input").select();
    dlg._draw();
  };
  act.querySelector(".sbtn").addEventListener("click", openSearch);
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openSearch(); }
    if (e.key === "Escape") { setMenu(false); lm.hidden = true; }
  });

  // ---- на главной: подсветка раздела в меню при прокрутке ----
  if (isHome && "IntersectionObserver" in window) {
    const map = new Map(links.filter((a) => a.hash).map((a) => [a.hash.slice(1), a]));
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) links.forEach((a) => a.classList.toggle("on", a === map.get(e.target.id)));
    }), { rootMargin: "-45% 0px -50% 0px" });
    map.forEach((_, id) => { const s = document.getElementById(id); s && io.observe(s); });
  }
})();
