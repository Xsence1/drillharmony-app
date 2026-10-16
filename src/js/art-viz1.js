// DrillHarmony · Интерактивные модели к статьям (часть 1): ЭЦП, очистка ствола, ГНВП,
// дифференциальный прихват, stick-slip. Упрощённые учебные модели, коэффициенты подобраны
// для наглядности; формулы и подходы — из открытой литературы по бурению.
(() => {
  if (!window.DH3D) return;
  const { canvas2d, bindSliders, F: fmt, RM, C } = DH3D;
  const cl = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
  const T = (ctx, s, x, y, col, font, al) => { ctx.fillStyle = col; ctx.font = font; ctx.textAlign = al || "left"; ctx.fillText(s, x, y); };
  // подпись на подложке — чтобы не сливалась с линиями графика
  const TB = (ctx, s, x, y, col, font, al) => { ctx.font = font; const w = ctx.measureText(s).width, a = al || "left", x0 = a === "right" ? x - w : a === "center" ? x - w / 2 : x; ctx.fillStyle = C().panel; ctx.globalAlpha = 0.88; ctx.fillRect(x0 - 3, y - 10, w + 6, 14); ctx.globalAlpha = 1; T(ctx, s, x, y, col, font, al); };
  const loopers = [];
  const loop = (root, fn) => { const o = { root, fn, vis: true }; loopers.push(o); "IntersectionObserver" in window && new IntersectionObserver((e) => (o.vis = e[0].isIntersecting)).observe(root); };
  let last = performance.now();
  const tick = (now) => { requestAnimationFrame(tick); const dt = Math.min(0.05, (now - last) / 1000); last = now; loopers.forEach((o) => o.vis && !document.hidden && o.fn(now / 1000, dt)); };
  requestAnimationFrame(tick);
  const outs = (root, map) => Object.entries(map).forEach(([id, v]) => { const e = root.querySelector("#" + id); if (e) e.textContent = v; });
  const flag = (root, id, cls, on) => { const e = root.querySelector("#" + id); e && e.parentElement.classList.toggle(cls, on); };

  // ================= ЭЦП: окно давлений и циркуляция =================
  (() => {
    const root = document.getElementById("ia-ecd"); if (!root) return;
    const $ = (s) => root.querySelector(s), v = (id) => +$("#" + id).value, get = canvas2d($("canvas"));
    let pump = 1, pumpOn = true;
    const TVD = 2400;
    const pore = (z) => z < 1600 ? 1.04 : z < 2100 ? lerp(1.04, 1.24, (z - 1600) / 500) : lerp(1.24, 1.27, (z - 2100) / 300);   // аномалия ниже 1600 м
    const frac = (z) => lerp(1.3, 1.52, Math.pow(z / TVD, 0.7));
    $("#ec-pump").onclick = (e) => { pumpOn = !pumpOn; e.currentTarget.textContent = pumpOn ? "Остановить насосы" : "Запустить насосы"; };
    const draw = (t, dt) => {
      pump = cl(pump + (pumpOn ? 1 : -1) * dt * 0.8, 0, 1);
      const { ctx, W, H, c } = get(), mw = v("ec-mw"), q = v("ec-q"), L = v("ec-l"), rop = v("ec-rop");
      const dpm = 0.0009 * Math.pow(q / 30, 1.8);                                       // МПа на метр ствола, затруб 215,9/127
      const cut = 0.025 * (rop / 20) * (30 / q);                                         // утяжеление шламом, г/см³
      const ecdAt = (md, tvd) => mw + pump * (dpm * md / (0.00981 * tvd) + cut);
      const narrow = W < 560, A = narrow ? { x: 44, y: 24, w: W - 56, h: H * 0.5 - 44 } : { x: 50, y: 24, w: W * 0.48 - 60, h: H - 58 };
      const B = narrow ? { x: 44, y: H * 0.5 + 24, w: W - 56, h: H * 0.5 - 50 } : { x: W * 0.52 + 20, y: 24, w: W * 0.48 - 34, h: H - 58 };
      const r0 = 1.0, r1 = 1.75, X = (r, b) => b.x + (r - r0) / (r1 - r0) * b.w;
      // (а) окно по вертикальной глубине
      const Y = (z) => A.y + z / TVD * A.h;
      ctx.strokeStyle = c.line; ctx.strokeRect(A.x + .5, A.y + .5, A.w, A.h);
      T(ctx, "Окно давлений по вертикали, г/см³", A.x, A.y - 8, c.mut, "11px " + c.mono);
      const band = (f, col) => { ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); for (let z = 0; z <= TVD; z += 40) { const x = X(f(z), A); z ? ctx.lineTo(x, Y(z)) : ctx.moveTo(x, Y(z)); } ctx.stroke(); ctx.lineWidth = 1; };
      ctx.fillStyle = "rgba(255,90,70,.08)"; ctx.fillRect(A.x, A.y, X(pore(TVD), A) - A.x, A.h);
      band(pore, c.bad); band(frac, c.cy);
      ctx.strokeStyle = c.amb; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(X(mw, A), A.y); ctx.lineTo(X(mw, A), A.y + A.h); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = c.amb; ctx.lineWidth = 3; ctx.beginPath(); for (let z = 100; z <= TVD; z += 40) { const x = X(ecdAt(z, z), A); z > 100 ? ctx.lineTo(x, Y(z)) : ctx.moveTo(x, Y(z)); } ctx.stroke(); ctx.lineWidth = 1;
      [0, 1200, 2400].forEach((z) => T(ctx, z + " м", A.x - 6, Y(z) + 4, c.mut, "10px " + c.mono, "right"));
      [1.0, 1.25, 1.5, 1.75].forEach((r) => T(ctx, fmt(r, 2), X(r, A), A.y + A.h + 14, c.mut, "10px " + c.mono, "center"));
      TB(ctx, "пластовое", X(pore(TVD * 0.3), A) + 8, Y(TVD * 0.3) + 18, c.bad, "11px " + c.mono);
      TB(ctx, "гидроразрыв", X(frac(TVD * 0.62), A) + 8, Y(TVD * 0.62), c.cy, "11px " + c.mono);
      // (б) горизонталь: ЭЦП растёт с длиной ствола при той же вертикали
      const mdV = TVD + 400, X2 = (md) => B.x + (md - mdV) / 3000 * B.w, Y2 = (r) => B.y + B.h - (r - 1.15) / (1.75 - 1.15) * B.h;
      ctx.strokeStyle = c.line; ctx.strokeRect(B.x + .5, B.y + .5, B.w, B.h);
      T(ctx, "ЭЦП на забое по мере бурения горизонтали", B.x, B.y - 8, c.mut, "11px " + c.mono);
      const pf = pore(TVD), ff = frac(TVD);
      ctx.fillStyle = "rgba(94,200,216,.1)"; ctx.fillRect(B.x, B.y, B.w, Y2(ff) - B.y);
      ctx.fillStyle = "rgba(255,90,70,.1)"; ctx.fillRect(B.x, Y2(pf), B.w, B.y + B.h - Y2(pf));
      ctx.strokeStyle = c.cy; ctx.beginPath(); ctx.moveTo(B.x, Y2(ff)); ctx.lineTo(B.x + B.w, Y2(ff)); ctx.stroke();
      ctx.strokeStyle = c.bad; ctx.beginPath(); ctx.moveTo(B.x, Y2(pf)); ctx.lineTo(B.x + B.w, Y2(pf)); ctx.stroke();
      ctx.strokeStyle = c.amb; ctx.lineWidth = 3; ctx.beginPath();
      for (let md = mdV; md <= mdV + L; md += 25) { const x = X2(md), y = Y2(ecdAt(md, TVD)); md > mdV ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke(); ctx.lineWidth = 1;
      let lim = null; for (let md = mdV; md <= mdV + 3000; md += 10) if (ecdAt(md, TVD) > ff) { lim = md - mdV; break; }
      if (lim != null && lim < 3000) { ctx.strokeStyle = c.bad; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(X2(mdV + lim), B.y); ctx.lineTo(X2(mdV + lim), B.y + B.h); ctx.stroke(); ctx.setLineDash([]); TB(ctx, "предел " + fmt(lim, 0) + " м", X2(mdV + lim) + (X2(mdV + lim) > B.x + B.w - 90 ? -6 : 6), B.y + 16, c.bad, "600 11px " + c.mono, X2(mdV + lim) > B.x + B.w - 90 ? "right" : "left"); }
      TB(ctx, "гидроразрыв " + fmt(ff, 2), B.x + B.w - 6, Y2(ff) - 6, c.cy, "11px " + c.mono, "right");
      TB(ctx, "пластовое " + fmt(pf, 2), B.x + B.w - 6, Y2(pf) + 15, c.bad, "11px " + c.mono, "right");
      [0, 1000, 2000, 3000].forEach((m) => T(ctx, m + " м", X2(mdV + m), B.y + B.h + 14, c.mut, "10px " + c.mono, "center"));
      // насос-анимация
      if (!RM && pump > 0.02) { ctx.fillStyle = c.amb; for (let i = 0; i < 6; i++) { const f = (t * 0.25 * pump + i / 6) % 1; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(lerp(X(mw, A), X(ecdAt(TVD, TVD), A), 0.5), A.y + f * A.h, 2.5, 0, 7); ctx.fill(); } ctx.globalAlpha = 1; }
      const e = ecdAt(mdV + L, TVD);
      outs(root, { "ec-o-e": fmt(e, 3), "ec-o-dp": fmt(pump * dpm * (mdV + L), 2), "ec-o-mf": fmt(ff - e, 3), "ec-o-mp": fmt(mw - pf, 3), "ec-o-lim": lim == null ? "> 3000" : fmt(lim, 0) });
      flag(root, "ec-o-mf", "warn", e > ff); flag(root, "ec-o-mp", "warn", mw < pf);
      $("#ec-msg").textContent = mw < pf ? "Плотность ниже пластового давления: при остановке насосов возможен приток. ЭЦП держит пласт только при циркуляции."
        : e > ff ? "ЭЦП выше давления гидроразрыва: поглощение. Снизьте расход или плотность, улучшите очистку или остановите горизонталь раньше."
        : "ЭЦП внутри окна. С каждой сотней метров горизонтали она растёт, а вертикаль и окно остаются прежними.";
    };
    loop(root, draw); bindSliders(root, () => {});
  })();

  // ================= Очистка ствола: шлам в наклонном затрубье =================
  (() => {
    const root = document.getElementById("ia-clean"); if (!root) return;
    const $ = (s) => root.querySelector(s), v = (id) => +$("#" + id).value, get = canvas2d($("canvas"));
    const P = Array.from({ length: 160 }, () => ({ x: Math.random(), r: Math.random() * 2 - 1, st: 0 }));
    let bed = 0, pumpOn = true, slide = 0;
    $("#cl-pump").onclick = (e) => { pumpOn = !pumpOn; e.currentTarget.textContent = pumpOn ? "Остановить насосы" : "Запустить насосы"; };
    const draw = (t, dt) => {
      const { ctx, W, H, c } = get(), inc = v("cl-inc"), q = v("cl-q"), rpm = v("cl-rpm"), rop = v("cl-rop");
      const A = Math.PI / 4 * (0.2159 ** 2 - 0.127 ** 2), va = pumpOn ? q / 1000 / A : 0;      // м/с
      const s = Math.sin(inc * Math.PI / 180), co = Math.cos(inc * Math.PI / 180);
      // нужная скорость: растёт с зенитом, особенно в 40–65°; вращение и малая МСП помогают
      const hump = Math.exp(-Math.pow((inc - 52) / 16, 2));
      const vneed = 0.55 * (1 + 0.9 * s + 0.5 * hump) * (1 + 0.35 * rop / 30) / (1 + 0.9 * Math.min(rpm, 150) / 120);
      const target = inc < 25 ? 0 : cl((vneed - va) / vneed * 0.9, 0, 0.5) * ss(25, 40, inc);
      bed += (target - bed) * Math.min(1, dt * 0.6);
      const aval = !pumpOn && inc > 30 && inc < 62 && bed > 0.05;
      slide = aval ? Math.min(1, slide + dt * 0.25) : Math.max(0, slide - dt * 0.5);
      // рисунок: затруб как наклонная труба
      const cx = W * 0.5, cy = H * 0.52, Lh = Math.min(W * 0.82, 760), Rh = Math.min(70, H * 0.2), Rp = Rh * 127 / 215.9;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(-(90 - inc) * Math.PI / 180 * 0.999);
      ctx.fillStyle = "rgba(160,120,70,.18)"; ctx.fillRect(-Lh / 2, -Rh, Lh, Rh * 2);
      ctx.strokeStyle = c.mut; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-Lh / 2, -Rh); ctx.lineTo(Lh / 2, -Rh); ctx.moveTo(-Lh / 2, Rh); ctx.lineTo(Lh / 2, Rh); ctx.stroke();
      // труба лежит на нижней стенке при большом зените
      const off = (Rh - Rp) * cl((inc - 10) / 50, 0, 1) * 0.9;
      ctx.fillStyle = c.panel; ctx.fillRect(-Lh / 2, -Rp + off, Lh, Rp * 2); ctx.strokeRect(-Lh / 2, -Rp + off, Lh, Rp * 2);
      if (rpm > 0) { ctx.strokeStyle = c.mut; ctx.globalAlpha = 0.35; for (let k = 0; k < 26; k++) { const x = -Lh / 2 + ((k * 30 + (RM ? 0 : t * rpm * 0.5)) % Lh); ctx.beginPath(); ctx.moveTo(x, -Rp + off + 3); ctx.lineTo(x + 6, -Rp + off + Rp * 0.6); ctx.stroke(); } ctx.globalAlpha = 1; }
      // подушка шлама на нижней стенке (y > 0 — низ)
      const bh = bed * 2 * Rh;
      if (bh > 1) { ctx.fillStyle = "#b07a44"; ctx.beginPath(); ctx.moveTo(-Lh / 2, Rh); for (let x = -Lh / 2; x <= Lh / 2; x += 8) ctx.lineTo(x, Rh - bh * (0.85 + 0.15 * Math.sin(x / 23)) + slide * 0 ); ctx.lineTo(Lh / 2, Rh); ctx.closePath(); ctx.fill(); }
      // частицы
      const vis = RM ? 0 : 1;
      P.forEach((p) => {
        if (p.st) { if (Math.random() < dt * (rpm / 150) * 0.6) p.st = 0; else { if (slide > 0) p.x -= dt * 0.08 * slide; if (p.x < 0) p.x = 1; } }
        else {
          p.x += vis * dt * (va * 0.22 - 0.05 * co) * (0.6 + 0.8 * (1 - Math.abs(p.r)));
          p.r += vis * dt * 0.9 * s * (1 - Math.min(rpm, 150) / 200);
          if (p.r > 1 - bed * 2) { p.r = 1 - bed * 2; if (bed > 0.02) p.st = 1; }
          if (p.x > 1) { p.x = 0; p.r = Math.random() * 2 - 1; }
          if (p.x < 0) p.x = 1;
        }
        const y = p.r * Rh * 0.95; if (Math.abs(y - off) < Rp && !p.st) return;
        ctx.fillStyle = p.st ? "#8a5a2e" : "#d9a066"; ctx.beginPath(); ctx.arc(-Lh / 2 + p.x * Lh, y, 2.3, 0, 7); ctx.fill();
      });
      // стрелка потока
      if (va > 0) { ctx.strokeStyle = c.cy; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-60, -Rh - 14); ctx.lineTo(60, -Rh - 14); ctx.lineTo(50, -Rh - 20); ctx.moveTo(60, -Rh - 14); ctx.lineTo(50, -Rh - 8); ctx.stroke(); ctx.lineWidth = 1; }
      ctx.restore();
      if (W >= 560) T(ctx, "к устью →", W - 14, 18, c.mut, "11px " + c.mono, "right");
      T(ctx, W < 560 ? "поток " + fmt(va * 60, 0) + " / нужно " + fmt(vneed * 60, 0) + " м/мин" : "зенит " + fmt(inc, 0) + "° · поток " + fmt(va * 60, 0) + " м/мин · нужно ≈ " + fmt(vneed * 60, 0), 14, 18, c.ink, "600 12px " + c.mono);
      if (aval) T(ctx, W < 560 ? "подушка сползает вниз" : "насосы стоят: подушка сползает вниз, есть риск прихвата и пробки", 14, H - 12, c.bad, "600 12px " + c.mono);
      outs(root, { "cl-o-v": fmt(va * 60, 0), "cl-o-need": fmt(vneed * 60, 0), "cl-o-bed": fmt(bed * 100, 0), "cl-o-risk": inc < 25 ? "низкий" : inc < 65 ? "высокий" : "средний" });
      flag(root, "cl-o-bed", "warn", bed > 0.12); flag(root, "cl-o-v", "warn", va < vneed);
    };
    const ss = (a, b, x) => { const k = cl((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
    loop(root, draw); bindSliders(root, () => {});
  })();

  // ================= ГНВП: пачка газа в закрытой и открытой скважине =================
  (() => {
    const root = document.getElementById("ia-kick"); if (!root) return;
    const $ = (s) => root.querySelector(s), v = (id) => +$("#" + id).value, get = canvas2d($("canvas"));
    let mode = "shut", z = null, playing = false, simT = 0;
    root.querySelectorAll("[data-k]").forEach((b) => b.onclick = () => { mode = b.dataset.k; root.querySelectorAll("[data-k]").forEach((x) => x.classList.toggle("on", x === b)); reset(); });
    const reset = () => { z = null; simT = 0; playing = false; $("#kk-go").textContent = "Пустить миграцию"; };
    $("#kk-go").onclick = () => { playing = !playing; $("#kk-go").textContent = playing ? "Пауза" : "Продолжить"; };
    const draw = (t, dt) => {
      const { ctx, W, H, c } = get(), tvd = v("kk-tvd"), rho = v("kk-rho"), V0 = v("kk-v"), pp = v("kk-pp") ;  // pp — эквивалент пластового, г/см³
      const g = 0.00981, cap = Math.PI / 4 * (0.2159 ** 2 - 0.127 ** 2) * 1000;        // л/м затруба
      const Pp = g * pp * tvd, Ph = g * rho * tvd, sidpp = Math.max(0, Pp - Ph);
      if (z == null) z = tvd;
      const rate = 300 / 3600;                                                            // м/с — скорость всплытия газа
      if (playing && !RM) { simT += dt * 120; z = Math.max(0, tvd - rate * simT); if (z <= 0) playing = false; }
      let hB, Pb, Vb, sicp, bhp;
      if (mode === "shut") {                                                              // закрыто: объём постоянен, давление газа = Pp
        Vb = V0; hB = Vb * 1000 / cap; Pb = Pp;
        sicp = Math.max(0, Pb - g * rho * Math.max(0, z - hB)); bhp = Pb + g * rho * (tvd - z);
      } else {                                                                            // открыто: газ расширяется по закону Бойля
        const Ptop = g * rho * Math.max(0, z) + 0.101;
        Vb = V0 * (Pp + 0.101) / Ptop; hB = Vb * 1000 / cap; Pb = Ptop; sicp = 0;
        bhp = Ph - g * (rho - 0.2) * Math.min(hB, tvd);
      }
      const shoe = 1200, fracShoe = g * 1.62 * shoe, pShoe = mode === "shut" ? sicp + g * rho * Math.min(shoe, Math.max(0, z - hB)) + (z - hB < shoe ? g * 0.2 * Math.min(hB, shoe) : 0) : 0;
      // схема скважины
      const nw = W < 560, x0 = nw ? 46 : 70, wx = nw ? 48 : 70, top = 34, bot = H - 30, Y = (d) => top + d / tvd * (bot - top);
      ctx.fillStyle = "rgba(160,120,70,.35)"; ctx.fillRect(x0, top, wx, bot - top);
      ctx.fillStyle = c.panel; ctx.fillRect(x0 + wx / 2 - 8, top, 16, bot - top - 6);
      ctx.strokeStyle = c.mut; ctx.strokeRect(x0 + .5, top + .5, wx, bot - top);
      ctx.strokeStyle = c.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0 - 6, Y(shoe)); ctx.lineTo(x0 + 6, Y(shoe)); ctx.stroke(); ctx.lineWidth = 1;
      T(ctx, nw ? "баш." : "башмак", x0 - 8, Y(shoe) + 4, c.mut, "10px " + c.mono, "right");
      // газ
      const yb = Y(Math.max(0, z - hB)), ye = Y(Math.min(tvd, z));
      ctx.fillStyle = "rgba(255,90,70,.7)"; [x0 + 4, x0 + wx / 2 + 10].forEach((x) => { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, yb, wx / 2 - 14, Math.max(4, ye - yb), 6) : ctx.rect(x, yb, wx / 2 - 14, Math.max(4, ye - yb)); ctx.fill(); });
      TB(ctx, nw ? "газ" : "газ " + fmt(Vb, 1) + " м³", x0 + wx + 6, cl((yb + ye) / 2 + 4, top + 14, bot - 4), c.bad, "600 12px " + c.mono);
      // устье и манометры
      ctx.fillStyle = mode === "shut" ? c.ink : c.ok; ctx.fillRect(x0 - 10, top - 10, wx + 20, 8);
      T(ctx, mode === "shut" ? (nw ? "закрыта" : "превентор закрыт") : (nw ? "открыта" : "скважина открыта"), x0 + wx / 2, top - 16, c.mut, "11px " + c.mono, "center");
      const gx = nw ? x0 + wx + 22 : W * 0.5, gw = (W - gx - (nw ? 10 : 20));
      const bars = [[nw ? "В трубах" : "Давление в трубах", sidpp + (mode === "shut" ? bhp - Pp : 0), 20, c.amb], [nw ? "В затрубье" : "Давление в затрубье", sicp, 20, c.bad], [nw ? "На забое" : "Давление на забое", bhp, Pp * 1.6, c.ink], [nw ? "У башмака" : "Давление у башмака", pShoe, fracShoe * 1.2, fracShoe < pShoe ? c.bad : c.cy]];
      bars.forEach(([n, p, mx, col], i) => {
        const y = 40 + i * 52; T(ctx, n, gx, y, c.mut, "12px " + c.mono);
        ctx.fillStyle = c.line; ctx.fillRect(gx, y + 8, gw, 14); ctx.fillStyle = col; ctx.fillRect(gx, y + 8, gw * cl(p / mx, 0, 1), 14);
        T(ctx, fmt(p, 2) + " МПа", gx + gw, y, c.ink, "600 12px " + c.mono, "right");
        if (i === 3) { const fx = gx + gw * cl(fracShoe / mx, 0, 1); ctx.strokeStyle = c.bad; ctx.beginPath(); ctx.moveTo(fx, y + 4); ctx.lineTo(fx, y + 26); ctx.stroke(); T(ctx, "ГРП " + fmt(fracShoe, 1), fx, y + 38, c.bad, "10px " + c.mono, "center"); }
      });
      const pit = mode === "shut" ? V0 : Vb;
      T(ctx, (nw ? "Ёмкости +" : "Прирост в ёмкостях: ") + fmt(pit, 1) + " м³", gx, 40 + 4 * 52 + 6, mode === "shut" ? c.ink : c.bad, "600 13px " + c.mono);
      T(ctx, "Прошло " + fmt(simT / 60, 0) + " мин", gx, 40 + 4 * 52 + 26, c.mut, "11px " + c.mono);
      T(ctx, "Верх пачки на " + fmt(Math.max(0, z - hB), 0) + " м", gx, 40 + 4 * 52 + 42, c.mut, "11px " + c.mono);
      $("#kk-msg").textContent = mode === "shut"
        ? (pShoe > fracShoe ? "Газ всплыл, не расширяясь, и принёс с собой пластовое давление: давление растёт везде, у башмака оно выше гидроразрыва. Поэтому при миграции газа давление стравливают порциями (объёмный метод), сохраняя давление на забое." : "Закрытая скважина: газ всплывает, не расширяясь, и давление в трубах и затрубье растёт. Давление в трубах после закрытия показывает недостаток плотности: ρглуш = ρ + Pтр / (0,00981 · TVD) = " + fmt(rho + sidpp / (g * tvd), 3) + " г/см³.")
        : "Открытая скважина: у устья газ расширяется во много раз, выталкивает раствор, давление на забое падает, и приток усиливается. Отсюда правило: заметили признаки, закрывайте скважину.";
    };
    loop(root, draw); bindSliders(root, reset);
  })();

  // ================= Дифференциальный прихват =================
  (() => {
    const root = document.getElementById("ia-stuck"); if (!root) return;
    const $ = (s) => root.querySelector(s), v = (id) => +$("#" + id).value, get = canvas2d($("canvas"));
    let still = 0, run = true;
    $("#st-move").onclick = () => { still = 0; };
    const draw = (t, dt) => {
      if (run && !RM) still = Math.min(240, still + dt * 6);                               // минуты модели: 6 мин в секунду
      const { ctx, W, H, c } = get(), dp = v("st-dp"), len = v("st-len"), mu = v("st-mu"), avail = v("st-pull"), cake = v("st-cake");
      const tm = Math.max(still, 0.5), depth = cake / 1000 * (1 - Math.exp(-tm / 40)) * 0.9;   // вдавливание трубы в корку, м
      const rp = 0.0635, Rh = 0.108, kc = Rh / (Rh - rp), w = 2 * Math.sqrt(Math.max(0, 2 * rp * depth * kc));      // ширина контакта, м
      const F = dp * 1e6 * w * len * mu / 9810;                                                  // т
      const stuck = F > avail;
      // сечение
      const nw = W < 560, cx = nw ? W * 0.5 : W * 0.25, cy = nw ? H * 0.21 : H * 0.48, R = nw ? H * 0.14 : Math.min(W * 0.17, H * 0.36), Rp = R * 127 / 215.9, ck = R * 0.08 * cake / 3;
      ctx.fillStyle = "rgba(160,120,70,.2)"; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();
      ctx.fillStyle = "#6b5a3e"; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.arc(cx, cy, R - ck, 0, 7, true); ctx.fill();
      ctx.strokeStyle = c.mut; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke(); ctx.lineWidth = 1;
      const sink = depth / (cake / 1000) * ck, py = cy + R - ck - Rp + sink;
      ctx.fillStyle = c.panel; ctx.beginPath(); ctx.arc(cx, py, Rp, 0, 7); ctx.fill(); ctx.strokeStyle = stuck ? c.bad : c.ink; ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1;
      // зона контакта
      const half = Math.asin(Math.min(1, (w / 2) / rp));
      ctx.strokeStyle = c.bad; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, py, Rp, Math.PI / 2 - half, Math.PI / 2 + half); ctx.stroke(); ctx.lineWidth = 1;
      // стрелки перепада
      for (let k = -2; k <= 2; k++) { const x = cx + k * Rp * 0.35, y0 = py - Rp - 26; ctx.strokeStyle = c.amb; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + 18); ctx.lineTo(x - 4, y0 + 12); ctx.moveTo(x, y0 + 18); ctx.lineTo(x + 4, y0 + 12); ctx.stroke(); }
      if (!nw) T(ctx, "раствор: Pг", cx, py - Rp - 32, c.amb, "11px " + c.mono, "center");
      T(ctx, "пласт", cx, cy + R + 16, c.mut, "11px " + c.mono, "center");
      T(ctx, "корка", cx + R * 0.72 + 6, cy - R * 0.72 + (nw ? 10 : -4), c.mut, "11px " + c.mono);
      // график силы от времени
      const gx = nw ? 40 : W * 0.55, gw = W - gx - (nw ? 14 : 20), gy = nw ? H * 0.5 : 30, gh = nw ? H * 0.4 : H - 70, maxF = Math.max(avail * 1.6, 10);
      ctx.strokeStyle = c.line; ctx.strokeRect(gx + .5, gy + .5, gw, gh);
      T(ctx, "Сила прихвата, т", gx, gy - 10, c.mut, "11px " + c.mono);
      const fAt = (tt) => { const d = cake / 1000 * (1 - Math.exp(-Math.max(tt, 0.5) / 40)) * 0.9, ww = 2 * Math.sqrt(Math.max(0, 2 * rp * d * kc)); return dp * 1e6 * ww * len * mu / 9810; };
      ctx.strokeStyle = c.amb; ctx.lineWidth = 2.5; ctx.beginPath(); for (let tt = 0; tt <= 240; tt += 4) { const x = gx + tt / 240 * gw, y = gy + gh - cl(fAt(tt) / maxF, 0, 1) * gh; tt ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); ctx.lineWidth = 1;
      const ya = gy + gh - cl(avail / maxF, 0, 1) * gh; ctx.strokeStyle = c.ok; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(gx, ya); ctx.lineTo(gx + gw, ya); ctx.stroke(); ctx.setLineDash([]);
      TB(ctx, (nw ? "запас " : "запас на натяжение ") + fmt(avail, 0) + " т", gx + gw - 6, ya - 6, c.ok, "11px " + c.mono, "right");
      const xn = gx + still / 240 * gw; ctx.fillStyle = stuck ? c.bad : c.amb; ctx.beginPath(); ctx.arc(xn, gy + gh - cl(F / maxF, 0, 1) * gh, 6, 0, 7); ctx.fill();
      (nw ? [0, 120, 240] : [0, 60, 120, 180, 240]).forEach((m) => T(ctx, m + " мин", gx + m / 240 * gw, gy + gh + 14, c.mut, "10px " + c.mono, "center"));
      let tcrit = null; for (let tt = 0; tt <= 240; tt += 1) if (fAt(tt) > avail) { tcrit = tt; break; }
      outs(root, { "st-o-t": fmt(still, 0), "st-o-w": fmt(w * 100, 1), "st-o-f": fmt(F, 1), "st-o-crit": tcrit == null ? "> 240" : fmt(tcrit, 0) });
      flag(root, "st-o-f", "warn", stuck);
      $("#st-msg").textContent = stuck ? "Сила прилипания больше запаса на натяжение: колонну прихватило. Расхаживание не поможет, нужны снижение репрессии, ванны, удары ясом вниз с моментом." : "Колонна ещё свободна. Каждую минуту без движения она глубже уходит в корку. Нажмите «Двинуть колонну», и контакт пропадёт.";
    };
    loop(root, draw); bindSliders(root, () => {});
  })();

  // ================= Stick-slip: крутильный маятник =================
  (() => {
    const root = document.getElementById("ia-vib"); if (!root) return;
    const $ = (s) => root.querySelector(s), v = (id) => +$("#" + id).value, get = canvas2d($("canvas"));
    let th_s = 0, th_b = 0, w_b = 0, hist = [], stuckFlag = false, inited = false;
    const reset = () => { th_s = 0; th_b = 0; w_b = 0; hist = []; inited = false; };
    const step = (h) => {
      const Om = v("vb-rpm") * 2 * Math.PI / 60, wob = v("vb-wob") * 9810, L = v("vb-len");
      const G = 79.3e9, Jp = Math.PI / 32 * (0.127 ** 4 - 0.1086 ** 4), k = G * Jp / L;     // жёсткость колонны, Н·м/рад
      const J = 60 + 7850 * Jp * L / 3, cdamp = 25 + (v("vb-damp") ? 220 : 0);            // инерция КНБК + ⅓ колонны
      const R = 0.108, mus = 0.75, mud = 0.42, ws = 6;
      const Tf = (w) => wob * R * 0.667 * (mud + (mus - mud) * Math.exp(-Math.abs(w) / ws));
      if (!inited) { th_b = -Tf(Om) / k * 1.02; w_b = Om * 0.97; inited = true; }     // старт из установившегося вращения с малым возмущением
      th_s += Om * h;
      const Tsp = k * (th_s - th_b) - cdamp * w_b;
      if (Math.abs(w_b) < 1e-3 && Math.abs(Tsp) <= wob * R * 0.667 * mus) { w_b = 0; stuckFlag = true; }
      else { const acc = (Tsp - Tf(w_b) * Math.sign(w_b || Tsp)) / J; w_b += acc * h; if (w_b < 0) w_b = 0; th_b += w_b * h; stuckFlag = false; }
      return { k, J, Om };
    };
    bindSliders(root, () => { hist = []; });
    root.querySelector("#vb-damp").onchange = () => { hist = []; };
    let simTime = 0;
    const draw = (t, dt) => {
      const sim = RM ? 0 : dt * 1.0;                                                        // реальное время
      let info;
      for (let s = 0; s < 40; s++) info = step(sim / 40);
      simTime += sim;
      if (RM && !hist.length) for (let s = 0; s < 4000; s++) { info = step(0.005); if (s % 10 === 0) hist.push([s * 0.005, w_b * 60 / 2 / Math.PI]); }
      hist.push([simTime, w_b * 60 / 2 / Math.PI]); while (hist.length && hist[0][0] < simTime - 20) hist.shift();
      const recent = hist.filter((h) => h[0] > simTime - 10);
      const { ctx, W, H, c } = get(), rpmS = v("vb-rpm");
      // колонна с метками закрутки
      const x0 = 30, x1 = W - 30, y = 54, len = x1 - x0;
      ctx.fillStyle = c.line; ctx.fillRect(x0, y - 8, len, 16);
      const tw = (th_s - th_b);
      for (let i = 0; i <= 40; i++) { const f = i / 40, a = th_s - tw * f; const yy = y + Math.sin(a) * 7; ctx.fillStyle = Math.cos(a) > 0 ? c.amb : c.mut; ctx.fillRect(x0 + f * len - 1.5, yy - 1.5, 3, 3); }
      const disc = (x, a, lbl) => { ctx.strokeStyle = c.ink; ctx.beginPath(); ctx.arc(x, y, 18, 0, 7); ctx.stroke(); ctx.strokeStyle = c.amb; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 16, y + Math.sin(a) * 16); ctx.stroke(); ctx.lineWidth = 1; T(ctx, lbl, x, y + 34, c.mut, "11px " + c.mono, "center"); };
      disc(x0, th_s, "ротор"); disc(x1, th_b, "долото");
      T(ctx, "закрутка колонны " + fmt(tw / (2 * Math.PI), 1) + " об", W / 2, y - 16, c.mut, "11px " + c.mono, "center");
      // график оборотов долота
      const gx = 44, gy = 110, gw = W - 64, gh = H - gy - 30, mx = Math.max(rpmS * 3, 60), X = (tt) => gx + (tt - (simTime - 20)) / 20 * gw, Y = (r) => gy + gh - r / mx * gh;
      ctx.strokeStyle = c.line; ctx.strokeRect(gx + .5, gy + .5, gw, gh);
      ctx.strokeStyle = c.cy; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(gx, Y(rpmS)); ctx.lineTo(gx + gw, Y(rpmS)); ctx.stroke(); ctx.setLineDash([]);
      TB(ctx, "обороты ротора " + rpmS, gx + gw - 6, Y(rpmS) - 6, c.cy, "11px " + c.mono, "right");
      ctx.strokeStyle = c.amb; ctx.lineWidth = 2; ctx.beginPath(); hist.forEach(([tt, r], i) => (i ? ctx.lineTo(X(tt), Y(r)) : ctx.moveTo(X(tt), Y(r)))); ctx.stroke(); ctx.lineWidth = 1;
      T(ctx, "Обороты долота за 20 с, об/мин", gx, gy - 8, c.mut, "11px " + c.mono);
      [0, mx / 2, mx].forEach((r) => T(ctx, fmt(r, 0), gx - 6, Y(r) + 4, c.mut, "10px " + c.mono, "right"));
      const rs = recent.map((h) => h[1]), rmax = Math.max(...rs), rmin = Math.min(...rs), ravg = rs.reduce((a, b) => a + b, 0) / Math.max(1, rs.length);
      const ssi = (rmax - rmin) / (2 * Math.max(1, ravg));
      outs(root, { "vb-o-max": fmt(rmax, 0), "vb-o-min": fmt(rmin, 0), "vb-o-ssi": fmt(ssi, 2), "vb-o-per": fmt(2 * Math.PI / Math.sqrt(info.k / info.J), 1) });
      flag(root, "vb-o-ssi", "warn", ssi > 0.5);
      $("#vb-msg").textContent = ssi > 0.5 ? "Сильный stick-slip: долото то стоит, то разгоняется до " + fmt(rmax, 0) + " об/мин — в " + fmt(rmax / Math.max(1, rpmS), 1) + " раза быстрее ротора. Лечение: больше оборотов, меньше нагрузка, система гашения на верхнем приводе." : ssi > 0.2 ? "Умеренные крутильные колебания. Ещё немного оборотов или меньше нагрузки, и они уйдут." : "Долото вращается ровно, колебания погасли.";
    };
    loop(root, draw);
    root.querySelectorAll(".ia-sl input").forEach((i) => i.addEventListener("change", () => {}));
  })();
})();
