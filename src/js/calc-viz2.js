// DrillHarmony · Модели к новым калькуляторам: MSE, гидравлика долота, посадка, ВЗД, «метла».
(() => {
  if (!window.DH3D) return;
  const { canvas2d, inp, F: fmt, RM } = DH3D;
  const n = (id, d) => { const v = inp(id); return isFinite(v) ? v : d; };
  const cl = (x, a, b) => Math.max(a, Math.min(b, x)), R = Math.PI / 180;
  const txt = (ctx, s, x, y, col, font, al) => { ctx.fillStyle = col; ctx.font = font; ctx.textAlign = al || "left"; ctx.fillText(s, x, y); };
  const txtb = (ctx, s, x, y, col, font, al) => { ctx.font = font; const w = ctx.measureText(s).width, a = al || "left", x0 = a === "right" ? x - w : a === "center" ? x - w / 2 : x; ctx.fillStyle = DH3D.C().panel; ctx.globalAlpha = 0.9; ctx.fillRect(x0 - 3, y - 11, w + 6, 15); ctx.globalAlpha = 1; txt(ctx, s, x, y, col, font, al); };
  const models = [];
  const reg = (id, draw) => { const el = document.getElementById(id); if (el) models.push({ el, draw: draw(canvas2d(el.querySelector("canvas"))), vis: true }); };

  // ---- MSE: из чего складывается энергия и сколько уходит в породу ----
  reg("iv-mse", (get) => (t) => {
    const { ctx, W, H, c } = get(), D = n("d", 215.9) / 1000, wob = n("wob", 10) * 9806.65, rpm = n("rpm", 120), T = n("tq", 6) * 1000, rop = n("rop", 25) / 3600, ucs = n("ucs", 80);
    const A = Math.PI / 4 * D * D, ax = wob / A / 1e6, rot = rop > 0 ? 2 * Math.PI * rpm / 60 * T / (A * rop) / 1e6 : 0, mse = ax + rot;
    const nw = W < 520, x0 = nw ? 14 : 40, w = W - x0 - (nw ? 14 : 40), mx = Math.max(mse, ucs) * 1.1, X = (v) => x0 + v / mx * w;
    const row = (y, label, parts) => { txt(ctx, label, x0, y - 8, c.mut, "12px " + c.mono); let a = 0; parts.forEach(([v, col]) => { ctx.fillStyle = col; ctx.fillRect(X(a), y, X(a + v) - X(a), 26); a += v; }); };
    row(46, "Прочность породы (UCS)", [[ucs, c.cy]]);
    row(116, "MSE: осевая часть + вращательная", [[ax, c.ink], [rot, c.amb]]);
    txtb(ctx, fmt(ucs, 0) + " МПа", X(ucs) + 6, 64, c.cy, "600 12px " + c.mono, X(ucs) > W - 120 ? "right" : "left");
    txtb(ctx, fmt(mse, 0) + " МПа", Math.min(X(mse) + 6, W - 8), 134, c.amb, "700 13px " + c.mono, X(mse) > W - 120 ? "right" : "left");
    // эффективность: доля энергии, которая уходит на разрушение
    const eff = ucs > 0 ? cl(ucs / mse, 0, 1) : 0, gy = 190, gw = w;   // шкала 0–100 %, практический потолок ~35 %
    txt(ctx, "Эффективность разрушения породы", x0, gy - 8, c.mut, "12px " + c.mono);
    ctx.fillStyle = c.line; ctx.fillRect(x0, gy, gw, 14);
    ctx.fillStyle = eff >= 0.25 ? c.ok : eff >= 0.12 ? c.amb : c.bad; ctx.fillRect(x0, gy, gw * eff, 14);
    [0.12, 0.25].forEach((f) => { ctx.strokeStyle = c.mut; ctx.beginPath(); ctx.moveTo(x0 + gw * f, gy - 4); ctx.lineTo(x0 + gw * f, gy + 18); ctx.stroke(); });
    txt(ctx, fmt(eff * 100, 0) + " %", x0 + gw * eff + 6, gy + 12, c.ink, "700 12px " + c.mono, eff > 0.85 ? "right" : "left");
    // анимация: «искры» разрушения пропорциональны эффективности
    if (!RM) for (let k = 0; k < 30; k++) { const f = (t * 0.6 + k / 30) % 1; ctx.globalAlpha = (1 - f) * eff; ctx.fillStyle = c.amb; ctx.fillRect(x0 + ((k * 97) % 100) / 100 * gw * eff, gy + 22 + f * 24, 2, 2); }
    ctx.globalAlpha = 1;
    txt(ctx, nw ? "ниже 12 %: ищите причину" : "Ниже ~12 %: вибрации, сальник на долоте, плохая очистка или изношенное долото", x0, H - 12, c.mut, "11px " + c.mono);
  });

  // ---- гидравлика долота: струи из насадок ----
  reg("iv-bith", (get) => (t) => {
    const { ctx, W, H, c } = get(), q = n("q", 30) / 1000, n1 = n("n1", 5), d1 = n("d1", 12), n2 = n("n2", 0), d2 = n("d2", 0);
    const a = (k, d) => (k > 0 && d > 0 ? k * Math.PI / 4 * Math.pow(d / 32 * 0.0254, 2) : 0), A = a(n1, d1) + a(n2, d2), v = A > 0 ? q / A : 0;
    const cx = W < 520 ? W / 2 : W * 0.3, cy = H * 0.5, Rb = Math.min(H * 0.38, W * 0.2);
    // торец долота
    ctx.fillStyle = c.panel; ctx.strokeStyle = c.mut; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, Rb, 0, 7); ctx.fill(); ctx.stroke(); ctx.lineWidth = 1;
    const blades = 5; for (let b = 0; b < blades; b++) { const an = b / blades * Math.PI * 2 - Math.PI / 2; ctx.strokeStyle = c.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx + Math.cos(an) * Rb * 0.18, cy + Math.sin(an) * Rb * 0.18); ctx.quadraticCurveTo(cx + Math.cos(an + 0.35) * Rb * 0.6, cy + Math.sin(an + 0.35) * Rb * 0.6, cx + Math.cos(an + 0.2) * Rb * 0.97, cy + Math.sin(an + 0.2) * Rb * 0.97); ctx.stroke(); }
    ctx.lineWidth = 1;
    const list = []; for (let k = 0; k < n1; k++) list.push(d1); for (let k = 0; k < n2; k++) list.push(d2);
    list.forEach((d, k) => {
      const an = (k + 0.5) / list.length * Math.PI * 2 - Math.PI / 2, rr = Rb * (k % 2 ? 0.45 : 0.62), x = cx + Math.cos(an) * rr, y = cy + Math.sin(an) * rr, r = 3 + d / 32 * 10;
      ctx.fillStyle = c.cy; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      if (!RM) { const len = cl(v / 140, 0.1, 1.4) * Rb * 0.5; for (let p = 0; p < 6; p++) { const f = (t * (0.5 + v / 120) + p / 6) % 1; ctx.globalAlpha = 1 - f; ctx.beginPath(); ctx.arc(x + Math.cos(an) * len * f, y + Math.sin(an) * len * f, r * (1 - f * 0.6), 0, 7); ctx.fill(); } ctx.globalAlpha = 1; }
    });
    if (W >= 520) {
      const x0 = W * 0.58, y0 = 40;
      txt(ctx, "Скорость в насадках", x0, y0, c.mut, "12px " + c.mono);
      const mx = 180, bw = W - x0 - 30; ctx.fillStyle = c.line; ctx.fillRect(x0, y0 + 10, bw, 16);
      ctx.fillStyle = "rgba(95,209,139,.25)"; ctx.fillRect(x0 + bw * 60 / mx, y0 + 10, bw * 80 / mx, 16);
      ctx.fillStyle = v < 60 || v > 140 ? c.bad : c.ok; ctx.fillRect(x0, y0 + 14, bw * cl(v / mx, 0, 1), 8);
      txt(ctx, fmt(v, 0) + " м/с", x0 + bw, y0, c.ink, "700 13px " + c.mono, "right");
      txt(ctx, "зелёным обычный диапазон 60–140 м/с", x0, y0 + 44, c.mut, "11px " + c.mono);
      txt(ctx, list.length + " насадок, TFA " + fmt(A * 1e6, 0) + " мм²", x0, y0 + 80, c.ink, "600 13px " + c.mono);
    } else txt(ctx, fmt(v, 0) + " м/с в насадках", 14, 20, c.ink, "600 12px " + c.mono);
  });

  // ---- посадка на цель: вертикальный разрез ----
  reg("iv-land", (get) => (t) => {
    const { ctx, W, H, c } = get(), i1 = n("i1", 60), i2 = n("i2", 88), dtvd = n("dtvd", 40), cap = n("cap", 4), unc = n("unc", 2);
    const K = 30 * 180 / Math.PI, s = (a) => Math.sin(a * R), co = (a) => Math.cos(a * R), Rr = K / cap, arcV = Rr * (s(i2) - s(i1)), hold = Math.max(0, (dtvd - arcV) / co(i1));
    const path = [[0, 0]]; let x = 0, z = 0, inc = i1;
    for (let m = 0; m < hold; m += 0.5) { x += 0.5 * s(inc); z += 0.5 * co(inc); path.push([x, z]); }
    while (inc < i2) { const i3 = Math.min(i2, inc + cap / 30 * 0.5); x += 0.5 * s((inc + i3) / 2); z += 0.5 * co((inc + i3) / 2); inc = i3; path.push([x, z]); }
    for (let m = 0; m < 40; m += 0.5) { x += 0.5 * s(inc); z += 0.5 * co(inc); path.push([x, z]); }
    const maxX = Math.max(...path.map((p) => p[0])), maxZ = Math.max(dtvd + unc + 4, ...path.map((p) => p[1]));
    const x0 = 50, y0 = 30, w = W - 70, h = H - 60, sc = Math.min(w / maxX, h / maxZ), X = (v) => x0 + v * sc, Y = (v) => y0 + v * sc * Math.min(1, (h / maxZ) / sc * 0 + 1);
    const Yz = (v) => y0 + v / maxZ * h, Xx = (v) => x0 + v / maxX * w;
    // пласт и неопределённость кровли
    ctx.fillStyle = "rgba(245,165,36,.12)"; ctx.fillRect(x0, Yz(dtvd), w, h - (Yz(dtvd) - y0));
    ctx.fillStyle = "rgba(255,90,70,.12)"; ctx.fillRect(x0, Yz(dtvd - unc), w, Yz(dtvd + unc) - Yz(dtvd - unc));
    ctx.strokeStyle = c.amb; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(x0, Yz(dtvd)); ctx.lineTo(x0 + w, Yz(dtvd)); ctx.stroke(); ctx.setLineDash([]);
    txtb(ctx, "кровля цели · ±" + fmt(unc, 1) + " м", x0 + w - 4, Yz(dtvd - unc) - 6, c.amb, "11px " + c.mono, "right");
    // траектория рисуется по ходу бурения
    const k = RM ? path.length : Math.max(2, Math.floor(((t * 0.35) % 1.3) / 1 * path.length));
    ctx.strokeStyle = c.ink; ctx.lineWidth = 3; ctx.beginPath(); path.slice(0, Math.min(k, path.length)).forEach((p, i) => (i ? ctx.lineTo(Xx(p[0]), Yz(p[1])) : ctx.moveTo(Xx(p[0]), Yz(p[1])))); ctx.stroke(); ctx.lineWidth = 1;
    const holdEnd = path[Math.round(hold / 0.5)] || path[0];
    ctx.fillStyle = c.cy; ctx.beginPath(); ctx.arc(Xx(holdEnd[0]), Yz(holdEnd[1]), 5, 0, 7); ctx.fill();
    txtb(ctx, hold > 0.5 ? "начать набор через " + fmt(hold, 1) + " м" : "набирать сразу", Xx(holdEnd[0]) + 10, Yz(holdEnd[1]) + 18, c.cy, "600 11px " + c.mono);
    txt(ctx, "0", x0 - 6, Yz(0) + 4, c.mut, "10px " + c.mono, "right"); txt(ctx, fmt(dtvd, 0) + " м", x0 - 6, Yz(dtvd) + 4, c.mut, "10px " + c.mono, "right");
    txt(ctx, W < 520 ? "Разрез: TVD вниз, отход вправо" : "Вертикальный разрез: TVD вниз, отход вправо (масштабы разные)", x0 + w, H - 8, c.mut, "11px " + c.mono, "right");
    void X; void Y;
  });

  // ---- ВЗД: характеристика двигателя ----
  reg("iv-motor", (get) => (t) => {
    const { ctx, W, H, c } = get(), dp0 = n("dp0", 4), dp = n("dp", 7), dmax = n("dmax", 5), tmax = n("tmax", 12), rpm0 = n("rpm0", 160);
    const x0 = 50, y0 = 26, w = W - 100, h = H - 64, xm = 1.4, X = (f) => x0 + f / xm * w, Yr = (r) => y0 + h - r / (rpm0 * 1.1) * h, Yt = (q) => y0 + h - q / (tmax * 1.5) * h;
    ctx.strokeStyle = c.line; ctx.strokeRect(x0 + .5, y0 + .5, w, h);
    ctx.fillStyle = "rgba(255,90,70,.1)"; ctx.fillRect(X(1), y0, X(xm) - X(1), h);
    txt(ctx, "выше максимума", X(1.2), y0 + 14, c.bad, "10px " + c.mono, "center");
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = c.cy; ctx.beginPath(); for (let f = 0; f <= xm; f += 0.02) { const r = f >= 1.3 ? 0 : rpm0 * Math.max(0, 1 - 0.28 * Math.pow(f, 1.6)); f ? ctx.lineTo(X(f), Yr(r)) : ctx.moveTo(X(f), Yr(r)); } ctx.stroke();
    ctx.strokeStyle = c.amb; ctx.beginPath(); for (let f = 0; f <= Math.min(xm, 1.3); f += 0.02) { const q = tmax * f; f ? ctx.lineTo(X(f), Yt(q)) : ctx.moveTo(X(f), Yt(q)); } ctx.stroke(); ctx.lineWidth = 1;
    txt(ctx, "обороты", x0 + 6, Yr(rpm0) - 6, c.cy, "600 11px " + c.mono); txt(ctx, "момент", X(0.95), Yt(tmax * 0.95) - 8, c.amb, "600 11px " + c.mono, "right");
    const f = cl((dp - dp0) / dmax, 0, xm), r = f >= 1.3 ? 0 : rpm0 * Math.max(0, 1 - 0.28 * Math.pow(f, 1.6));
    ctx.strokeStyle = c.ink; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(X(f), y0); ctx.lineTo(X(f), y0 + h); ctx.stroke(); ctx.setLineDash([]);
    [[Yr(r), c.cy], [Yt(tmax * Math.min(f, 1.3)), c.amb]].forEach(([y, col]) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X(f), y, 6, 0, 7); ctx.fill(); });
    [0, 0.5, 1].forEach((k) => txt(ctx, fmt(dmax * k, 1), X(k), y0 + h + 14, c.mut, "10px " + c.mono, "center"));
    txt(ctx, "перепад под нагрузкой, МПа", x0 + w, y0 + h + 30, c.mut, "10px " + c.mono, "right");
    // ротор двигателя крутится с текущими оборотами
    const rx = W - 30, ry = y0 + 20; ctx.strokeStyle = c.mut; ctx.beginPath(); ctx.arc(rx, ry, 14, 0, 7); ctx.stroke();
    const an = RM ? 0 : t * r / 60 * 2 * Math.PI * 0.25; ctx.strokeStyle = r > 0 ? c.amb : c.bad; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + Math.cos(an) * 12, ry + Math.sin(an) * 12); ctx.stroke(); ctx.lineWidth = 1;
    if (f >= 1.3) txtb(ctx, "СРЫВ", X(1.3), y0 + h / 2, c.bad, "700 14px " + c.mono, "center");
  });

  // ---- «метла»: вес при подъёме и спуске по глубине для нескольких μ ----
  let hookKey = "", hookData = null;
  reg("iv-hook", (get) => () => {
    if (!window.dhHook) return;
    const key = ["kop", "bur", "inc", "md", "q", "rho", "pu", "blk"].map((k) => n(k, 0)).join() + (document.getElementById("iv-hook").getBoundingClientRect().width) + document.documentElement.dataset.theme;
    if (key === hookKey) return; hookKey = key;
    const { ctx, W, H, c } = get(), kop = n("kop", 800), bur = n("bur", 3), inc = n("inc", 60), md = n("md", 3000), q = n("q", 31), rho = n("rho", 1.18), mu = n("mu", 0.25), fact = n("pu", 0), blk = n("blk", 25);
    const mus = [0.1, 0.2, 0.3, 0.4], depths = []; for (let d = 200; d <= md; d += Math.max(50, md / 30)) depths.push(d); depths.push(md);
    const data = mus.map((m) => depths.map((d) => window.dhHook(kop, bur, inc, d, q, rho, m, blk))); hookData = data;
    const rot = depths.map((d) => window.dhHook(kop, bur, inc, d, q, rho, 0, blk).rot);
    const all = data.flat().flatMap((r) => [r.pu, r.so]); const lo = Math.min(blk, ...all), hi = Math.max(...all, fact || 0) * 1.05;
    const x0 = 56, y0 = 22, w = W - 72, h = H - 52, X = (v) => x0 + (v - lo) / (hi - lo) * w, Y = (d) => y0 + d / md * h;
    ctx.strokeStyle = c.line; ctx.strokeRect(x0 + .5, y0 + .5, w, h);
    txt(ctx, "Вес на крюке, т", x0, y0 - 8, c.mut, "11px " + c.mono);
    data.forEach((arr, k) => {
      const a = 0.35 + k * 0.15;
      [["pu", c.amb], ["so", c.cy]].forEach(([key, col]) => { ctx.strokeStyle = col; ctx.globalAlpha = a; ctx.lineWidth = 1.6; ctx.beginPath(); arr.forEach((r, i) => (i ? ctx.lineTo(X(r[key]), Y(depths[i])) : ctx.moveTo(X(r[key]), Y(depths[i])))); ctx.stroke(); });
      ctx.globalAlpha = 1; if (W >= 520) txt(ctx, "μ " + mus[k], X(arr[arr.length - 1].pu) + 4, Y(md) - 4, c.amb, "10px " + c.mono);
    });
    ctx.strokeStyle = c.ink; ctx.lineWidth = 2; ctx.beginPath(); rot.forEach((r, i) => (i ? ctx.lineTo(X(r), Y(depths[i])) : ctx.moveTo(X(r), Y(depths[i])))); ctx.stroke(); ctx.lineWidth = 1;
    if (fact > 0) { ctx.fillStyle = c.bad; ctx.beginPath(); ctx.arc(X(fact), Y(md), 7, 0, 7); ctx.fill(); txtb(ctx, "факт " + fmt(fact, 1) + " т", X(fact) - 10, Y(md) - 12, c.bad, "600 11px " + c.mono, "right"); }
    [0, 0.5, 1].forEach((f) => txt(ctx, fmt(md * f, 0) + " м", x0 - 6, Y(md * f) + 4, c.mut, "10px " + c.mono, "right"));
    [lo, (lo + hi) / 2, hi].forEach((v) => txt(ctx, fmt(v, 0), X(v), y0 + h + 14, c.mut, "10px " + c.mono, "center"));
    if (W >= 520) { txt(ctx, "оранжевые подъём, голубые спуск, белая вращение", x0 + 8, y0 + 16, c.mut, "11px " + c.mono); void mu; }
  });

  if (!models.length) return;
  models.forEach((m) => "IntersectionObserver" in window && new IntersectionObserver((e) => (m.vis = e[0].isIntersecting)).observe(m.el));
  const loop = (now) => { requestAnimationFrame(loop); models.forEach((m) => m.vis && m.draw(now / 1000)); };
  requestAnimationFrame(loop);
})();
