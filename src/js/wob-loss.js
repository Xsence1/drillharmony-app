// DrillHarmony · Модель «нагрузка не доходит до долота».
// Мягкая нить (soft-string): осевая сила считается от долота вверх с учётом веса в растворе,
// трения от прижатия к стенке и дополнительного прижатия при спиральном продольном изгибе.
// Формулы открытые (классическая модель мягкой нити, критерии продольного изгиба для наклонного ствола).
(() => {
  const root = document.getElementById("ia-wob");
  if (!root || !window.DH3D) return;
  const { view, W, F: fmt, bindSliders } = DH3D;
  const $ = (s) => root.querySelector(s), val = (id) => +$("#" + id).value;
  const g = 9.81, R = Math.PI / 180, E = 207e9, RHO_STEEL = 7.85;

  // ---- геометрия ствола: вертикаль → набор → горизонталь ----
  const geom = (lat, bur) => {
    const KOP = 1500, st = [];
    let md = 0, inc = 0, n = 0, tvd = 0;
    const push = () => st.push({ md, inc, n, tvd });
    push();
    const ds = 10;
    while (md < KOP) { md += ds; tvd += ds; push(); }
    while (inc < 89.5) { const i2 = Math.min(89.5, inc + bur / 30 * ds); const a = (inc + i2) / 2 * R; md += ds; tvd += ds * Math.cos(a); n += ds * Math.sin(a); inc = i2; push(); }
    const end = md + lat;
    while (md < end) { md += ds; tvd += ds * Math.cos(inc * R); n += ds * Math.sin(inc * R); push(); }
    return st;
  };

  // ---- колонна: от долота вверх ----
  const pipe = (heavyTop) => {
    const sec = (len, kg, od, id, name) => ({ len, w: kg, od: od / 1000, id: id / 1000, name });
    const BHA = sec(60, 150, 172, 71, "КНБК"), HW = sec(150, 74, 127, 76, "ТБТ"), DP = sec(1e6, 31, 127, 108, "СБТ");
    return heavyTop ? [BHA, DP] : [BHA, HW, DP];
  };

  // ---- осевая сила по стволу при заданной нагрузке на долото ----
  const profile = (st, wobT, o) => {
    const bf = 1 - o.mud / RHO_STEEL, Dh = 0.2159;
    const secs = pipe(o.heavyTop), mdBit = st[st.length - 1].md;
    const secAt = (dist, md) => {
      if (o.heavyTop && md > 900 && md < 1300) return { w: 74, od: 0.127, id: 0.076 };   // ТБТ перенесены в вертикаль
      let acc = 0; for (const s of secs) { acc += s.len; if (dist <= acc) return s; } return secs[secs.length - 1];
    };
    const muAx = o.mu * (o.mode === "rot" ? 0.12 : o.mode === "osc" ? 0.6 : 1);
    let Fz = -wobT * 1000 * g;              // Н, растяжение со знаком «+»
    const out = new Array(st.length);
    out[st.length - 1] = { md: mdBit, F: Fz, buck: 0 };
    let helLen = 0, sinLen = 0, hl0 = 0;
    for (let i = st.length - 1; i > 0; i--) {
      const a = st[i - 1], b = st[i], dL = b.md - a.md, I = (a.inc + b.inc) / 2 * R, dI = (b.inc - a.inc) * R;
      const s = secAt(mdBit - b.md, b.md), w = s.w * g * bf;                     // Н/м в растворе
      const Ip = Math.PI / 64 * (s.od ** 4 - s.id ** 4), rc = (Dh - s.od) / 2;
      let N = Math.abs(Fz * dI + w * Math.sin(I) * dL);                          // прижатие мягкой нити
      let buck = 0;
      if (Fz < 0 && Math.sin(I) > 0.05) {
        const Fcr = 2 * Math.sqrt(E * Ip * w * Math.sin(I) / rc);              // синусоидальный изгиб
        const Fhel = 2 * Math.SQRT2 * Fcr;                                       // спиральный изгиб
        if (-Fz > Fhel) { buck = 2; N += rc * Fz * Fz / (4 * E * Ip) * dL; helLen += dL; }
        else if (-Fz > Fcr) { buck = 1; sinLen += dL; }
      }
      Fz = Fz + w * Math.cos(I) * dL - muAx * N;
      hl0 += w * Math.cos(I) * dL;
      out[i - 1] = { md: a.md, F: Fz, buck };
    }
    return { out, hook: Fz, hl0, helLen, sinLen };
  };

  // ---- кривая передачи: индикатор на поверхности → реальная нагрузка ----
  const transfer = (st, o) => {
    const pts = [], p0 = profile(st, 0, o);
    // ноль индикатора: «при подаче вниз» — вес на весу при спуске без нагрузки (трение уже вычтено);
    // «при вращении» — вес на весу без трения
    const ref = o.zero === "rot" ? p0.hl0 : p0.hook;
    for (let wob = 0; wob <= 30.001; wob += 0.5) {
      const p = profile(st, wob, o);
      pts.push({ wob, ind: (ref - p.hook) / (1000 * g), hook: p.hook });
    }
    return pts;
  };
  const solve = (tr, ind) => {
    if (ind <= tr[0].ind) return 0;
    for (let i = 1; i < tr.length; i++) if (tr[i].ind >= ind) { const a = tr[i - 1], b = tr[i]; return a.wob + (b.wob - a.wob) * (ind - a.ind) / Math.max(1e-6, b.ind - a.ind); }
    return null;                                                                 // столько не разгрузить
  };

  // ---- состояние ----
  let mode = "slide", heavyTop = false, shown = 0, target = 0, S = null;
  const opt = () => ({ mu: val("wb-mu") - ($("#wb-lub").checked ? 0.06 : 0), mud: val("wb-mud"), mode, heavyTop, zero: $("#wb-zero").value });
  const compute = () => {
    const st = geom(val("wb-lat"), val("wb-bur")), o = opt(), tr = transfer(st, o), ind = val("wb-ind");
    const wob = solve(tr, ind);
    S = { st, o, tr, ind, wob, lock: wob == null };
    target = wob == null ? tr[tr.length - 1].wob : wob;
    S.prof = profile(st, target, o);
    const set = (id, v) => ($("#" + id).textContent = v);
    const loss = wob == null ? null : ind - wob;
    set("wb-o-ind", fmt(ind, 1)); set("wb-o-wob", wob == null ? "не дойдёт" : fmt(wob, 1));
    set("wb-o-loss", loss == null ? "—" : fmt(Math.max(0, loss), 1));
    set("wb-o-eff", wob == null || ind < 0.1 ? "—" : fmt(Math.min(100, wob / ind * 100), 0));
    const np = S.prof.out.find((p) => p.F < 0);                                  // нейтральная точка: выше неё растяжение
    set("wb-o-np", np ? fmt(np.md, 0) : "—");
    set("wb-o-hel", fmt(S.prof.helLen, 0));
    set("wb-o-dp", wob == null ? "—" : fmt(wob * 0.22, 1));
    $("#wb-o-wob").parentElement.classList.toggle("warn", wob == null || (ind > 2 && wob / ind < 0.5));
    $("#wb-o-hel").parentElement.classList.toggle("warn", S.prof.helLen > 0);
    const msg = $("#wb-msg");
    msg.textContent = wob == null ? "Колонна «заперлась»: сколько ни разгружай, нагрузка на долото больше не растёт. Вес уходит на трение спирали о стенку. Помогут ротор, осциллятор, смазка или более короткая горизонталь."
      : S.prof.helLen > 0 ? "Часть колонны на горизонтали изогнулась спиралью (красный участок): она прижимается к стенке сильнее, и каждая следующая тонна разгрузки почти не доходит до долота."
      : mode === "rot" ? "При вращении трение работает в основном по окружности, и вдоль ствола почти всё, что разгрузили, доходит до долота."
      : "Разгрузку «съедает» трение колонны о нижнюю стенку горизонтали. Смотрите на перепад на ВЗД: он растёт только от реальной нагрузки на долото.";
    tv.invalidate(); drawCharts();
  };

  // ---- 3D: ствол и колонна, окрашенная по осевой силе ----
  const tv = view($("#wb-cv"), { radius: 1300, pitch: 0.18, yaw: -1.35, auto: false });
  const col = (p, c) => p.buck === 2 ? c.bad : p.F < 0 ? c.amb : c.cy;
  tv.render = (t) => {
    if (!S) return;
    const c = t.c, st = S.st, last = st[st.length - 1];
    t.target = W(last.n * 0.5, 0, last.tvd * 0.55); t.radius = Math.max(last.n, last.tvd) * 0.62;
    // поверхность и ствол
    t.line([W(-200, -150, 0), W(last.n + 200, -150, 0), W(last.n + 200, 150, 0), W(-200, 150, 0)], { color: c.line, width: 1, close: true, alpha: 0.7 });
    t.line(st.map((p) => W(p.n, 0, p.tvd)), { color: c.mut, width: 9, alpha: 0.18 });
    const pr = S.prof.out;
    for (let i = 1; i < st.length; i++) {
      const p = pr[i];
      if (p.buck === 2) {                                                         // спираль — видно, что колонна «змеится»
        const a = st[i - 1], b = st[i], k = (performance.now() / 600) % (Math.PI * 2);
        const amp = 18, ph1 = (a.md / 9) + k, ph2 = (b.md / 9) + k;
        t.line([W(a.n, Math.sin(ph1) * amp, a.tvd + Math.cos(ph1) * amp * 0.5), W(b.n, Math.sin(ph2) * amp, b.tvd + Math.cos(ph2) * amp * 0.5)], { color: c.bad, width: 3 });
      } else t.line([W(st[i - 1].n, 0, st[i - 1].tvd), W(st[i].n, 0, st[i].tvd)], { color: col(p, c), width: 3 });
    }
    // нейтральная точка
    const ni = pr.findIndex((p) => p.F < 0);
    if (ni > 0) { const p = st[ni]; t.dot(W(p.n, 0, p.tvd), 6, c.ink); t.label(W(p.n, 0, p.tvd), "нейтральная точка", c.ink, 10, -10); }
    // долото и стрелка нагрузки
    const bp = W(last.n, 0, last.tvd);
    t.dot(bp, 7, c.amb, c.ink);
    t.label(bp, "на долоте " + fmt(shown, 1) + " т", c.amb, t.W < 560 ? -120 : -60, -16, "700 13px " + c.mono);
    t.label(W(0, 0, 0), "индикатор " + fmt(S.ind, 1) + " т", c.ink, 10, 18, "600 12px " + c.mono);
    t.text(12, t.H - 12, t.W < 560 ? "Перетащите — повернуть" : "Перетащите — повернуть · колесо — масштаб", c.mut);
  };
  tv.anim = () => {                                                               // нагрузка «доходит» до долота не сразу
    if (Math.abs(shown - target) > 0.02) shown += (target - shown) * 0.12; else shown = target;
  };

  // ---- 2D: сила по стволу и кривая передачи ----
  const cf = $("#wb-ch"), ctx = cf.getContext("2d");
  const drawCharts = () => {
    if (!S) return;
    const r = cf.getBoundingClientRect(), d = devicePixelRatio || 1;
    if (!r.width) return;
    cf.width = Math.round(r.width * d); cf.height = Math.round(r.height * d); ctx.setTransform(d, 0, 0, d, 0, 0);
    const c = DH3D.C(), Wd = r.width, H = r.height, narrow = Wd < 620;
    ctx.clearRect(0, 0, Wd, H); ctx.font = "11px " + c.mono;
    const box = (x, y, w, h, title) => { ctx.strokeStyle = c.line; ctx.strokeRect(x + 0.5, y + 0.5, w, h); ctx.fillStyle = c.mut; ctx.textAlign = "left"; ctx.fillText(title, x, y - 8); };
    // (а) осевая сила вдоль ствола
    const A = narrow ? { x: 46, y: 26, w: Wd - 60, h: H / 2 - 50 } : { x: 46, y: 26, w: Wd * 0.52 - 60, h: H - 60 };
    box(A.x, A.y, A.w, A.h, "Осевая сила по стволу, т");
    const pr = S.prof.out, mdMax = pr[pr.length - 1].md, Fs = pr.map((p) => p.F / 1000 / g), Fmax = Math.max(...Fs, 5), Fmin = Math.min(...Fs, -5);
    const X = (md) => A.x + md / mdMax * A.w, Y = (f) => A.y + (Fmax - f) / (Fmax - Fmin) * A.h;
    ctx.strokeStyle = c.mut; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(A.x, Y(0)); ctx.lineTo(A.x + A.w, Y(0)); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = c.mut; ctx.textAlign = "right"; [Fmax, 0, Fmin].forEach((f) => ctx.fillText(fmt(f, 0), A.x - 6, Y(f) + 4));
    ctx.textAlign = "center"; [0, 0.5, 1].forEach((t) => ctx.fillText(fmt(mdMax * t, 0) + " м", A.x + t * A.w, A.y + A.h + 16));
    ctx.lineWidth = 2;
    for (let i = 1; i < pr.length; i++) { ctx.strokeStyle = col(pr[i], c); ctx.beginPath(); ctx.moveTo(X(pr[i - 1].md), Y(Fs[i - 1])); ctx.lineTo(X(pr[i].md), Y(Fs[i])); ctx.stroke(); }
    ctx.lineWidth = 1;
    // (б) кривая передачи
    const B = narrow ? { x: 46, y: H / 2 + 26, w: Wd - 60, h: H / 2 - 50 } : { x: Wd * 0.52 + 30, y: 26, w: Wd * 0.48 - 44, h: H - 60 };
    box(B.x, B.y, B.w, B.h, "Индикатор → на долоте, т");
    const tr = S.tr, xm = Math.min(120, Math.max(40, Math.ceil(Math.max(...tr.map((p) => p.ind)) / 10) * 10)), ym = 30;
    const BX = (v) => B.x + Math.min(1, v / xm) * B.w, BY = (v) => B.y + B.h - v / ym * B.h;
    ctx.setLineDash([4, 4]); ctx.strokeStyle = c.mut; ctx.beginPath(); ctx.moveTo(BX(0), BY(0)); ctx.lineTo(BX(ym), BY(ym)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = c.mut; ctx.textAlign = "left"; ctx.fillText("без потерь", BX(ym * 0.62) + 4, BY(ym * 0.62) + 2);
    ctx.strokeStyle = c.amb; ctx.lineWidth = 2.5; ctx.beginPath(); tr.forEach((p, i) => (i ? ctx.lineTo(BX(p.ind), BY(p.wob)) : ctx.moveTo(BX(p.ind), BY(p.wob)))); ctx.stroke(); ctx.lineWidth = 1;
    ctx.textAlign = "right"; [0, 10, 20, 30].forEach((v) => ctx.fillText(v, B.x - 6, BY(v) + 4));
    ctx.textAlign = "center"; [0, xm / 2, xm].forEach((v) => ctx.fillText(v, BX(v), B.y + B.h + 16));
    // текущая точка
    const px = BX(S.ind), py = BY(S.wob == null ? tr[tr.length - 1].wob : S.wob);
    ctx.fillStyle = S.wob == null ? c.bad : c.amb; ctx.beginPath(); ctx.arc(px, py, 6, 0, 7); ctx.fill();
    ctx.strokeStyle = c.ink; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(px, B.y + B.h); ctx.lineTo(px, py); ctx.lineTo(B.x, py); ctx.stroke(); ctx.setLineDash([]);
  };

  // ---- управление ----
  root.querySelectorAll("[data-m]").forEach((b) => b.onclick = () => { mode = b.dataset.m; root.querySelectorAll("[data-m]").forEach((x) => x.classList.toggle("on", x === b)); compute(); });
  $("#wb-heavy").onchange = (e) => { heavyTop = e.target.checked; compute(); };
  $("#wb-lub").onchange = compute;
  $("#wb-zero").onchange = compute;
  bindSliders(root, compute);
  addEventListener("resize", drawCharts);
  new MutationObserver(drawCharts).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  compute(); shown = target;
})();
