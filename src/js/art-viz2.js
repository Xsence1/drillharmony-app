// DrillHarmony · Интерактивные модели к статьям (часть 2): КНБК по трём точкам, РУС и ВЗД,
// магнитные помехи, телеметрия по гидроканалу. Учебные модели, собственная реализация.
(() => {
  if (!window.DH3D) return;
  const { canvas2d, view, bindSliders, F: fmt, RM, W: Wv } = DH3D;
  const cl = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t, R = Math.PI / 180;
  const T = (ctx, s, x, y, col, font, al) => { ctx.fillStyle = col; ctx.font = font; ctx.textAlign = al || "left"; ctx.fillText(s, x, y); };
  const TB = (ctx, s, x, y, col, font, al) => { ctx.font = font; const w = ctx.measureText(s).width, a = al || "left", x0 = a === "right" ? x - w : a === "center" ? x - w / 2 : x; ctx.fillStyle = DH3D.C().panel; ctx.globalAlpha = 0.9; ctx.fillRect(x0 - 3, y - 10, w + 6, 14); ctx.globalAlpha = 1; T(ctx, s, x, y, col, font, al); };
  const loopers = [];
  const loop = (root, fn) => { const o = { fn, vis: true }; loopers.push(o); "IntersectionObserver" in window && new IntersectionObserver((e) => (o.vis = e[0].isIntersecting)).observe(root); };
  let last = performance.now();
  const tick = (now) => { requestAnimationFrame(tick); const dt = Math.min(0.05, (now - last) / 1000); last = now; loopers.forEach((o) => o.vis && !document.hidden && o.fn(now / 1000, dt)); };
  requestAnimationFrame(tick);
  const outs = (root, m) => Object.entries(m).forEach(([id, v]) => { const e = root.querySelector("#" + id); if (e) e.textContent = v; });
  const flag = (root, id, cls, on) => { const e = root.querySelector("#" + id); e && e.parentElement.classList.toggle(cls, on); };

  // ================= КНБК: оценка набора по трём точкам =================
  (() => {
    const root = document.getElementById("ia-bha"); if (!root) return;
    const $ = (s) => root.querySelector(s), v = (id) => +$("#" + id).value, get = canvas2d($("canvas"));
    const draw = (t) => {
      const { ctx, W, H, c } = get(), a = v("bh-a"), L1 = v("bh-l1"), L2 = v("bh-l2"), EX = 8;
      const k = 2 * a * R / (L1 + L2), i10 = k / R * 10, Rr = 1 / k;                         // рад/м, °/10 м, радиус
      // точки касания: долото (0,0), перекос — на L1 вверх по оси, калибратор — ещё L2 по оси выше перекоса
      const sc = (W - 120) / (L1 + L2), ox = W - 60, oy = H * 0.62;
      const P = (s, d) => [ox - s * sc, oy + d * sc * EX];                                     // s — вдоль оси, d — поперёк (увеличено)
      // ось двигателя: нижнее плечо отклонено на угол a (увеличено)
      const bend = P(L1, 0), bit = P(0, -L1 * Math.tan(a * R)), stab = P(L1 + L2, 0);
      // окружность через три точки ствола: долото, середина (касание у перекоса — противоположная стенка), калибратор
      const y = (s) => s * (L1 + L2 - s) * k / 2;                                               // прогиб дуги относительно хорды
      ctx.strokeStyle = c.line; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(P(0, 0)[0], P(0, 0)[1]); ctx.lineTo(stab[0], stab[1]); ctx.stroke(); ctx.setLineDash([]);
      // стенки ствола вдоль дуги
      const wall = (off) => { ctx.beginPath(); for (let s = -1; s <= L1 + L2 + 1; s += 0.1) { const p = P(s, -y(s) + off); s > -1 ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } ctx.stroke(); };
      ctx.strokeStyle = c.mut; ctx.lineWidth = 2; wall(-0.012); wall(0.012); ctx.lineWidth = 1;
      // анимация: ствол «рисуется» вперёд по дуге
      const prog = RM ? 1 : (t * 0.25) % 1.2;
      ctx.strokeStyle = c.amb; ctx.lineWidth = 4; ctx.beginPath();
      for (let s = L1 + L2; s >= Math.max(0, (L1 + L2) * (1 - Math.min(1, prog))); s -= 0.1) { const p = P(s, -y(s)); s === L1 + L2 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]); }
      ctx.stroke(); ctx.lineWidth = 1;
      // двигатель
      const bp = P(0, -y(0)), mp = P(L1, -y(L1) + 0.006), sp = P(L1 + L2, -y(L1 + L2));
      ctx.strokeStyle = c.ink; ctx.lineWidth = 9; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(sp[0], sp[1]); ctx.lineTo(mp[0], mp[1]); ctx.lineTo(bp[0], bp[1]); ctx.stroke(); ctx.lineWidth = 1;
      [[bp, "долото", "right"], [mp, "перекос", "center"], [sp, "калибратор", "left"]].forEach(([p, n, al], i) => { ctx.fillStyle = c.amb; ctx.beginPath(); ctx.arc(p[0], p[1], 6, 0, 7); ctx.fill(); TB(ctx, n, p[0] + (al === "right" ? 6 : al === "left" ? -6 : 0), p[1] + (i === 1 ? -22 : 30), c.ink, "600 11px " + c.mono, al); });
      T(ctx, "L1 = " + fmt(L1, 2) + " м", (bp[0] + mp[0]) / 2, H - 14, c.mut, "11px " + c.mono, "center");
      T(ctx, "L2 = " + fmt(L2, 2) + " м", (mp[0] + sp[0]) / 2, H - 14, c.mut, "11px " + c.mono, "center");
      T(ctx, W < 560 ? "R = " + fmt(Rr, 0) + " м · поперечно ×" + EX : "Перекос " + fmt(a, 2) + "° → дуга радиусом " + fmt(Rr, 0) + " м · поперечный масштаб ×" + EX, 14, 20, c.ink, "600 12px " + c.mono);
      outs(root, { "bh-o-10": fmt(i10, 2), "bh-o-30": fmt(i10 * 3, 2), "bh-o-r": fmt(Rr, 0), "bh-o-50": fmt(i10 * 3 * 0.55, 1) });
    };
    loop(root, draw); bindSliders(root, () => {});
  })();

  // ================= РУС или ВЗД: ровность ствола =================
  (() => {
    const root = document.getElementById("ia-rss"); if (!root) return;
    const $ = (s) => root.querySelector(s), v = (id) => +$("#" + id).value;
    const tv = view($("canvas.ia-cv"), { radius: 260, pitch: 0.12, yaw: -0.55, auto: false }), get = canvas2d($("#rs-ch"));
    let prog = 1, S = null;
    const build = () => {
      const need = v("rs-need"), cap = v("rs-cap"), stand = v("rs-stand"), Ltot = 300, ds = 0.5;
      const frac = cl(need / cap, 0, 1), slideL = stand * frac;
      const mk = (motor) => { let inc = 30, n = 0, z = 0; const pts = [], dls = []; for (let s = 0; s <= Ltot; s += ds) { const inStand = s % stand; const d = motor ? (inStand < slideL ? cap : 0) : need; inc += d / 30 * ds; n += ds * Math.sin(inc * R); z += ds * Math.cos(inc * R); pts.push([n, z]); dls.push(d); } return { pts, dls, inc }; };
      const m = mk(true), r = mk(false);
      const tort = (a) => a.dls.reduce((x, y) => x + y, 0) / a.dls.length;
      S = { m, r, need, cap, slideL, stand, frac, tm: Math.max(...m.dls), tr: need };
      outs(root, { "rs-o-sl": fmt(frac * 100, 0), "rs-o-m": fmt(cap, 1), "rs-o-r": fmt(need, 1), "rs-o-tq": fmt(lerp(0, 18, cl((cap - need) / 8, 0, 1)), 0), "rs-o-pos": fmt(Math.hypot(m.pts.at(-1)[0] - r.pts.at(-1)[0], m.pts.at(-1)[1] - r.pts.at(-1)[1]), 1) });
      flag(root, "rs-o-sl", "warn", frac > 0.75);
      $("#rs-msg").textContent = frac >= 1 ? "Нужная интенсивность выше способности ВЗД: слайдить придётся всю свечу, и всё равно не успеть. Нужен больший перекос или РУС." : "ВЗД даёт ту же среднюю интенсивность " + fmt(need, 1) + "°/30 м, но кусками по " + fmt(cap, 1) + "°/30 м в слайде и прямыми в роторе: ствол «ступенчатый». РУС ведёт ствол ровной дугой.";
      prog = 0; tv.invalidate();
    };
    tv.render = (t) => {
      if (!S) return; const c = t.c, n = Math.floor(prog * (S.m.pts.length - 1));
      const off = 30, P = (p, o) => Wv(p[0], o, p[1]);
      t.target = Wv(S.r.pts.at(-1)[0] / 2, 0, S.r.pts.at(-1)[1] / 2); t.radius = 150;
      t.line(S.r.pts.map((p) => P(p, off)), { color: c.mut, width: 1, alpha: 0.3 }); t.line(S.m.pts.map((p) => P(p, -off)), { color: c.mut, width: 1, alpha: 0.3 });
      t.line(S.r.pts.slice(0, n + 1).map((p) => P(p, off)), { color: c.cy, width: 4 });
      for (let i = 1; i <= n; i++) t.line([P(S.m.pts[i - 1], -off), P(S.m.pts[i], -off)], { color: S.m.dls[i] > 0 ? c.amb : c.ink, width: 4 });
      t.label(P(S.r.pts[0], off), "РУС", c.cy, -30, -6, "700 13px " + c.mono); t.label(P(S.m.pts[0], -off), "ВЗД", c.amb, -30, -6, "700 13px " + c.mono);
      t.text(12, t.H - 12, "оранжевое слайд, белое ротор · 300 м ствола", c.mut);
    };
    tv.anim = () => { if (prog < 1) { prog = Math.min(1, prog + (RM ? 1 : 0.004)); drawCh(); } };
    const drawCh = () => {
      if (!S) return; const { ctx, W, H, c } = get(), n = Math.floor(prog * (S.m.dls.length - 1));
      const x0 = 44, w = W - 60, y0 = 22, h = H - 46, mx = Math.max(S.cap, S.need) * 1.2, X = (i) => x0 + i / (S.m.dls.length - 1) * w, Y = (d) => y0 + h - d / mx * h;
      ctx.strokeStyle = c.line; ctx.strokeRect(x0 + .5, y0 + .5, w, h); T(ctx, "Интенсивность по стволу, °/30 м", x0, y0 - 8, c.mut, "11px " + c.mono);
      ctx.strokeStyle = c.amb; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i <= n; i++) i ? ctx.lineTo(X(i), Y(S.m.dls[i])) : ctx.moveTo(X(i), Y(S.m.dls[i])); ctx.stroke();
      ctx.strokeStyle = c.cy; ctx.beginPath(); ctx.moveTo(X(0), Y(S.need)); ctx.lineTo(X(n), Y(S.need)); ctx.stroke(); ctx.lineWidth = 1;
      [0, mx / 2, mx].forEach((d) => T(ctx, fmt(d, 1), x0 - 6, Y(d) + 4, c.mut, "10px " + c.mono, "right"));
    };
    $("#rs-go").onclick = () => { prog = 0; };
    bindSliders(root, build); build(); addEventListener("resize", drawCh);
  })();

  // ================= Магнитные помехи: осевая намагниченность и ошибка азимута =================
  (() => {
    const root = document.getElementById("ia-mag"); if (!root) return;
    const $ = (s) => root.querySelector(s), v = (id) => +$("#" + id).value;
    const tv = view($("canvas.ia-cv"), { radius: 2.2, pitch: 0.35, yaw: -0.9, auto: !RM }), get = canvas2d($("#mg-ch"));
    // оси прибора: z — вдоль ствола, x — к верхней стенке, y — вправо
    const frame = (I, A) => ({ z: [Math.sin(I * R) * Math.cos(A * R), Math.sin(I * R) * Math.sin(A * R), Math.cos(I * R)], x: [Math.cos(I * R) * Math.cos(A * R), Math.cos(I * R) * Math.sin(A * R), -Math.sin(I * R)], y: [-Math.sin(A * R), Math.cos(A * R), 0] });
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const meas = (I, A, dip, Bt, dBz) => {
      const f = frame(I, A), g = [0, 0, 1], B = [Bt * Math.cos(dip * R), 0, Bt * Math.sin(dip * R)];   // N, E, вниз
      const G = [dot(g, f.x), dot(g, f.y), dot(g, f.z)], M = [dot(B, f.x), dot(B, f.y), dot(B, f.z) + dBz];
      // азимут по трём осям: проекция поля на горизонтальную плоскость в системе прибора
      const Gt = Math.hypot(...G), Bm = Math.hypot(...M);
      const inc = Math.acos(cl(G[2] / Gt, -1, 1)) / R;
      const az = ((Math.atan2(Gt * (G[0] * M[1] - G[1] * M[0]), M[2] * (G[0] ** 2 + G[1] ** 2) - G[2] * (G[0] * M[0] + G[1] * M[1])) / R) % 360 + 360) % 360;
      const dp = Math.asin(cl(dot(G, M) / (Gt * Bm), -1, 1)) / R;
      return { inc, az, Bt: Bm, dip: dp };
    };
    // знак формулы азимута подбираем по нулевой помехе
    let SGN = 1; { const t = meas(60, 70, 70, 58000, 0); if (Math.abs(((t.az - 70 + 540) % 360) - 180) > 1) SGN = -1; }
    const azOf = (m) => (SGN > 0 ? m.az : (360 - m.az) % 360);
    let S = null;
    const calc = () => {
      const I = v("mg-i"), A = v("mg-a"), dip = v("mg-dip"), Bt = v("mg-bt"), dBz = v("mg-dbz");
      const m0 = meas(I, A, dip, Bt, 0), m1 = meas(I, A, dip, Bt, dBz), a0 = azOf(m0), a1 = azOf(m1), err = ((a1 - a0 + 540) % 360) - 180;
      const okB = Math.abs(m1.Bt - Bt) <= v("mg-tb"), okD = Math.abs(m1.dip - dip) <= v("mg-td");
      S = { I, A, dip, Bt, dBz, err, m1 };
      outs(root, { "mg-o-err": fmt(err, 2), "mg-o-bt": fmt(m1.Bt - Bt, 0), "mg-o-dip": fmt(m1.dip - dip, 2), "mg-o-qc": okB && okD ? "пройден" : "не пройден" });
      flag(root, "mg-o-qc", "ok", okB && okD); flag(root, "mg-o-qc", "warn", !(okB && okD)); flag(root, "mg-o-err", "warn", Math.abs(err) > 0.5);
      $("#mg-msg").textContent = okB && okD && Math.abs(err) > 0.5 ? "Опасный случай: Bt и Dip в допуске, а азимут уже ушёл на " + fmt(Math.abs(err), 1) + "°. Осевая помеха сильнее всего бьёт по азимуту при стволе на восток или запад с большим зенитом, и контроль по Bt и Dip может её не поймать." : !(okB && okD) ? "Замер не прошёл контроль: Bt или Dip вне допуска. Нужна коррекция азимута, длиннее НУБТ или контрольный замер гироскопом." : "Помеха мала, азимут почти не искажён.";
      tv.invalidate(); drawCh();
    };
    tv.render = (t) => {
      if (!S) return; const c = t.c, f = frame(S.I, S.A), w = (p) => [p[1], p[0], -p[2]];
      t.target = [0, 0, 0]; t.radius = 1.6;
      t.grid(0, 1.2, 0.4); t.compass(0, 1.1);
      t.line([w(f.z.map((x) => -x * 1.3)), w(f.z.map((x) => x * 1.3))], { color: c.ink, width: 6, alpha: 0.85 });
      t.label(w(f.z.map((x) => x * 1.35)), t.W < 560 ? "ось" : "ось прибора", c.ink, 6, 0);
      const B = [Math.cos(S.dip * R), 0, Math.sin(S.dip * R)];
      t.arrow([0, 0, 0], w(B), { color: c.cy, width: 3 }); t.label(w(B), "поле Земли", c.cy, -84, -6);
      const e = S.dBz / S.Bt * 6;                                                                  // помеха вдоль оси, увеличено ×6
      t.arrow(w(B), w(B.map((x, i) => x + f.z[i] * e)), { color: c.bad, width: 3 }); t.label(w(B.map((x, i) => x + f.z[i] * e)), "с помехой (×6)", c.bad, 8, 18);
      t.arrow([0, 0, 0], w([0, 0, 0.9]), { color: c.mut, width: 2 }); t.label(w([0, 0, 0.9]), "g", c.mut, 6, 0);
      t.text(12, t.H - 12, "Перетащите — повернуть", c.mut);
    };
    const drawCh = () => {
      if (!S) return; const { ctx, W, H, c } = get(), x0 = 46, w = W - 62, y0 = 22, h = H - 46;
      const errs = []; for (let a = 0; a <= 360; a += 5) { const m0 = meas(S.I, a, S.dip, S.Bt, 0), m1 = meas(S.I, a, S.dip, S.Bt, S.dBz); errs.push(((azOf(m1) - azOf(m0) + 540) % 360) - 180); }
      const mx = Math.max(0.5, ...errs.map(Math.abs)) * 1.15, X = (a) => x0 + a / 360 * w, Y = (e) => y0 + h / 2 - e / mx * h / 2;
      ctx.strokeStyle = c.line; ctx.strokeRect(x0 + .5, y0 + .5, w, h); T(ctx, (W < 560 ? "Ошибка азимута, зенит " : "Ошибка азимута от направления ствола при зените ") + fmt(S.I, 0) + "°", x0, y0 - 8, c.mut, "11px " + c.mono);
      ctx.strokeStyle = c.mut; ctx.beginPath(); ctx.moveTo(x0, Y(0)); ctx.lineTo(x0 + w, Y(0)); ctx.stroke();
      ctx.strokeStyle = c.bad; ctx.lineWidth = 2; ctx.beginPath(); errs.forEach((e, i) => (i ? ctx.lineTo(X(i * 5), Y(e)) : ctx.moveTo(X(0), Y(e)))); ctx.stroke(); ctx.lineWidth = 1;
      ctx.fillStyle = c.amb; ctx.beginPath(); ctx.arc(X(S.A), Y(S.err), 5, 0, 7); ctx.fill();
      [["С", 0], ["В", 90], ["Ю", 180], ["З", 270], ["С", 360]].forEach(([n, a]) => T(ctx, n + " " + a + "°", X(a), y0 + h + 14, c.mut, "10px " + c.mono, "center"));
      [mx, 0, -mx].forEach((e) => T(ctx, fmt(e, 1) + "°", x0 - 6, Y(e) + 4, c.mut, "10px " + c.mono, "right"));
    };
    bindSliders(root, calc); calc(); addEventListener("resize", drawCh);
  })();

  // ================= Телеметрия по гидроканалу: импульсы, помехи насосов, декодирование =================
  (() => {
    const root = document.getElementById("ia-mwd"); if (!root) return;
    const $ = (s) => root.querySelector(s), v = (id) => +$("#" + id).value, get = canvas2d($("canvas"));
    let seed = 48271; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, gn = () => (rnd() + rnd() + rnd() - 1.5) * 1.15;
    let word = null, wt = 0, value = 0, decoded = null, errs = 0, sent = 0, okWords = 0, words = 0;
    const NB = 9;                                                                                   // toolface 0–511 → 9 бит
    const newWord = () => { value = Math.floor(rnd() * 360); const code = Math.round(value / 360 * 511); word = []; for (let i = NB - 1; i >= 0; i--) word.push((code >> i) & 1); wt = 0; decoded = null; };
    newWord();
    const draw = (t, dt) => {
      const { ctx, W, H, c } = get(), amp = v("mw-amp"), pump = v("mw-pump"), br = v("mw-br"), gas = v("mw-gas");
      const bitT = 1 / br, total = NB * bitT, att = amp * (1 - gas / 100 * 0.85);                  // газ гасит импульс
      if (!RM) wt += dt;
      // сигнал за последнее окно: импульс + помехи насосов (гармоники хода) + шум
      const win = total + 1.2, N = 600, sig = [];
      for (let i = 0; i < N; i++) {
        const tt = wt - win + i / N * win, k = Math.floor(tt / bitT);
        const bit = tt >= 0 && k < NB ? word[k] : 0;
        const pumpN = pump * (Math.sin(2 * Math.PI * 1.65 * tt) + 0.5 * Math.sin(2 * Math.PI * 3.3 * tt + 1) + 0.3 * Math.sin(2 * Math.PI * 1.61 * tt + 2));
        sig.push([tt, bit * att + pumpN + gn() * (8 + gas * 0.2)]);
      }
      // декодирование окончено — сравниваем
      if (wt > total && decoded == null) {
        const got = []; for (let k = 0; k < NB; k++) { let s = 0, n = 0; for (const [tt, y] of sig) if (tt >= k * bitT && tt < (k + 1) * bitT) { s += y; n++; } got.push(s / Math.max(1, n) > att / 2 ? 1 : 0); }
        const bad = got.reduce((a, b, i) => a + (b !== word[i]), 0); errs += bad; sent += NB; words++; if (!bad) okWords++;
        const code = got.reduce((a, b) => a * 2 + b, 0); decoded = { got, bad, val: code / 511 * 360 };
      }
      if (wt > total + 1.2) newWord();
      const x0 = 46, w = W - 60, y0 = 30, h = H - 120, mx = Math.max(60, amp * 1.2 + pump * 2), X = (tt) => x0 + (tt - (wt - win)) / win * w, Y = (p) => y0 + h * 0.5 - p / mx * h * 0.45;
      ctx.strokeStyle = c.line; ctx.strokeRect(x0 + .5, y0 + .5, w, h);
      T(ctx, W < 560 ? "Давление на стояке, кПа" : "Давление на стояке за вычетом среднего, кПа", x0, y0 - 10, c.mut, "11px " + c.mono);
      // границы бит
      for (let k = 0; k <= NB; k++) { const x = X(k * bitT); if (x < x0 || x > x0 + w) continue; ctx.strokeStyle = c.line; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + h); ctx.stroke(); if (k < NB) T(ctx, String(word[k]), x + (X(bitT) - X(0)) / 2, y0 + 14, c.amb, "700 12px " + c.mono, "center"); }
      ctx.strokeStyle = c.amb; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(x0, Y(att / 2)); ctx.lineTo(x0 + w, Y(att / 2)); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = c.cy; ctx.lineWidth = 1.4; ctx.beginPath(); sig.forEach(([tt, y], i) => (i ? ctx.lineTo(X(tt), Y(y)) : ctx.moveTo(X(tt), Y(y)))); ctx.stroke(); ctx.lineWidth = 1;
      [mx * 0.8, 0, -mx * 0.8].forEach((p) => T(ctx, fmt(p, 0), x0 - 6, Y(p) + 4, c.mut, "10px " + c.mono, "right"));
      // слово
      const by = y0 + h + 30;
      T(ctx, "Передаётся toolface " + fmt(value, 0) + "° (" + NB + " бит)", x0, by, c.ink, "600 13px " + c.mono);
      if (decoded) { T(ctx, "Принято: " + decoded.got.join("") + " → " + fmt(decoded.val, 0) + "°", x0, by + 22, decoded.bad ? c.bad : c.ok, "600 13px " + c.mono); if (decoded.bad) T(ctx, "ошибок в слове: " + decoded.bad, x0 + w, by + 22, c.bad, "600 12px " + c.mono, "right"); }
      else T(ctx, "Приём…", x0, by + 22, c.mut, "13px " + c.mono);
      const snr = 20 * Math.log10(Math.max(1, att) / Math.max(1, Math.hypot(pump * 0.8, 8 + gas * 0.2)));
      outs(root, { "mw-o-snr": fmt(snr, 1), "mw-o-ber": sent ? fmt(errs / sent * 100, 1) : "—", "mw-o-ok": words ? fmt(okWords / words * 100, 0) : "—", "mw-o-t": fmt(total, 1) });
      flag(root, "mw-o-snr", "warn", snr < 6);
    };
    loop(root, draw);
    bindSliders(root, () => { errs = sent = okWords = words = 0; });
  })();
})();
