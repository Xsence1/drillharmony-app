// DrillHarmony · Наглядные модели для калькуляторов: анимация того, что считает формула.
// Каждая модель читает те же поля, что и калькулятор, и перерисовывается при вводе.
(() => {
  if (!window.DH3D) return;
  const { inp, canvas2d, view, W, F: fmt, RM } = DH3D;
  const models = [];
  const reg = (id, make) => { const el = document.getElementById(id); if (el) models.push(Object.assign({ el, vis: true }, make(el))); };
  const n = (id, d) => { const v = inp(id); return isFinite(v) ? v : d; };
  const lerp = (a, b, t) => a + (b - a) * t, cl = (x, a, b) => Math.max(a, Math.min(b, x));
  const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); };
  const txt = (ctx, s, x, y, col, font, al) => { ctx.fillStyle = col; ctx.font = font; ctx.textAlign = al || "left"; ctx.fillText(s, x, y); };
  const txtb = (ctx, s, x, y, col, font, al) => { ctx.font = font; const w = ctx.measureText(s).width, a = al || "left", x0 = a === "right" ? x - w : a === "center" ? x - w / 2 : x; ctx.fillStyle = DH3D.C().panel; ctx.globalAlpha = 0.9; ctx.fillRect(x0 - 3, y - 11, w + 6, 15); ctx.globalAlpha = 1; txt(ctx, s, x, y, col, font, al); };

  // ---------- скорость в затрубье: поток частиц в кольцевом зазоре ----------
  reg("iv-av", (el) => {
    const get = canvas2d(el.querySelector("canvas"));
    const P = Array.from({ length: 140 }, () => ({ y: Math.random(), r: Math.random(), s: 0.6 + Math.random() * 0.8 }));
    return { draw(t, dt) {
      const { ctx, W: w, H: h, c } = get(), q = n("q", 32), D = n("dh", 215.9), d = n("dp", 127);
      const A = Math.PI / 4 * (D * D - d * d) / 1e6, v = A > 0 ? q / 1000 / A : 0;         // м/с
      const cx = w * 0.27, top = 24, bot = h - 30, Rw = Math.min(w * 0.17, (bot - top) * 0.5), Rp = Rw * d / D;
      // продольный разрез
      const x0 = w * 0.55, x1 = w - 30, mid = (x0 + x1) / 2, half = (x1 - x0) / 2, ph = half * d / D;
      ctx.fillStyle = c.line; ctx.fillRect(x0 - 8, top, 8, bot - top); ctx.fillRect(x1, top, 8, bot - top);
      ctx.fillStyle = c.panel; ctx.strokeStyle = c.mut; rr(ctx, mid - ph, top, ph * 2, bot - top, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = c.cy;
      P.forEach((p) => {
        // профиль скорости: максимум в середине зазора, ноль у стенок
        const side = p.r < 0.5 ? -1 : 1, f = (p.r % 0.5) * 2, prof = 4 * f * (1 - f);
        p.y -= dt * v * 0.35 * p.s * (0.3 + prof * 1.2); if (p.y < 0) p.y += 1;
        const x = side < 0 ? lerp(x0, mid - ph, f) : lerp(mid + ph, x1, f);
        ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(x, top + p.y * (bot - top), 2.2, 0, 7); ctx.fill();
      });
      ctx.globalAlpha = 1;
      // поперечное сечение
      const cy = (top + bot) / 2;
      ctx.fillStyle = "rgba(94,200,216,.22)"; ctx.beginPath(); ctx.arc(cx, cy, Rw, 0, 7); ctx.fill();
      ctx.strokeStyle = c.mut; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = c.panel; ctx.beginPath(); ctx.arc(cx, cy, Rp, 0, 7); ctx.fill(); ctx.stroke(); ctx.lineWidth = 1;
      txt(ctx, "Ø " + fmt(D, 1) + " мм", cx, cy - Rw - 8, c.mut, "11px " + c.mono, "center");
      txt(ctx, "Ø " + fmt(d, 0), cx, cy + 4, c.mut, "11px " + c.mono, "center");
      txt(ctx, "площадь " + fmt(A * 1e4, 0) + " см²", cx, bot + 18, c.ink, "600 12px " + c.mono, "center");
      txt(ctx, w < 520 ? fmt(v * 60, 0) + " м/мин" : fmt(v, 2) + " м/с · " + fmt(v * 60, 0) + " м/мин", mid, bot + 18, c.amb, "700 13px " + c.mono, "center");
      const ok = v * 60 >= 50;
      txt(ctx, ok ? (w < 520 ? "достаточно" : "достаточно для выноса шлама в вертикали") : (w < 520 ? "мало" : "мало: шлам может оседать"), mid, top - 8, ok ? c.ok : c.bad, "11px " + c.mono, "center");
    } };
  });

  // ---------- барит: ёмкость, мешки и плотность ----------
  reg("iv-bar", (el) => {
    const get = canvas2d(el.querySelector("canvas"));
    let shown = 0, key = "";
    return { draw(t, dt) {
      const { ctx, W: w, H: h, c } = get(), V = n("v", 120), r1 = n("r1", 1.15), r2 = n("r2", 1.25), rb = n("rb", 4.2);
      const m = rb > r2 && r2 > r1 ? V * rb * (r2 - r1) / (rb - r2) : 0, dV = m / rb, k = [V, r1, r2, rb].join();
      if (k !== key) { key = k; shown = 0; }
      shown = Math.min(1, shown + dt / 2.2);
      const e = RM ? 1 : 1 - Math.pow(1 - shown, 3);
      const tx = w < 520 ? 14 : w * 0.12, tw = w < 520 ? w * 0.5 : w * 0.42, ty = 30, th = h - 70, fill0 = 0.62, fill = fill0 * (V + dV * e) / V;
      // ёмкость
      ctx.strokeStyle = c.mut; ctx.lineWidth = 2; rr(ctx, tx, ty, tw, th, 8); ctx.stroke(); ctx.lineWidth = 1;
      const rho = lerp(r1, r2, e), col = `hsl(${lerp(200, 30, cl((rho - 1) / 1, 0, 1))},45%,${lerp(42, 36, e)}%)`;
      const ly = ty + th * (1 - Math.min(0.97, fill));
      ctx.fillStyle = col; ctx.globalAlpha = 0.75; ctx.fillRect(tx + 2, ly, tw - 4, ty + th - ly - 2); ctx.globalAlpha = 1;
      // волна
      ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.beginPath();
      for (let x = 0; x <= tw - 4; x += 4) ctx.lineTo(tx + 2 + x, ly + Math.sin(x / 14 + t * 2) * 2); ctx.stroke();
      // мешки падают
      const bags = Math.ceil(m), shownBags = Math.min(bags, Math.floor(e * bags));
      for (let i = 0; i < Math.min(shownBags, 60); i++) {
        const per = w < 520 ? 5 : 10, bx = tx + tw + (w < 520 ? 12 : 30) + (i % per) * 18, by = h - 40 - Math.floor(i / per) * 18;
        ctx.fillStyle = c.amb; rr(ctx, bx, by, 14, 14, 3); ctx.fill();
      }
      if (!RM && e < 1) { const fy = ty + (t * 160 % (ly - ty)); ctx.fillStyle = c.amb; rr(ctx, tx + tw / 2 - 7, fy, 14, 14, 3); ctx.fill(); }
      txt(ctx, fmt(rho, 3) + " г/см³", tx + tw / 2, ly + 28, "#fff", "700 18px " + c.mono, "center");
      txt(ctx, fmt(V + dV * e, 1) + " м³", tx + tw / 2, ty + th - 12, "rgba(255,255,255,.8)", "12px " + c.mono, "center");
      const lx = tx + tw + (w < 520 ? 12 : 30);
      if (w < 520) {
        txt(ctx, "барит " + fmt(m * e, 1) + " т", lx, 40, c.ink, "600 13px " + c.mono);
        txt(ctx, bags + " МКР по 1 т", lx, 58, c.ink, "12px " + c.mono);
        txt(ctx, "+" + fmt(dV, 1) + " м³ объёма", lx, 76, c.mut, "12px " + c.mono);
      } else {
        txt(ctx, "барит: " + fmt(m * e, 1) + " т · " + bags + " МКР по 1 т", lx, 40, c.ink, "600 13px " + c.mono);
        txt(ctx, "прирост объёма " + fmt(dV, 1) + " м³, проверьте запас места в ёмкостях", lx, 60, c.mut, "12px " + c.mono);
      }
      if (bags > 60) txt(ctx, "показаны первые 60", lx, 94, c.mut, "11px " + c.mono);
    } };
  });

  // ---------- плавучесть: колонна на крюке в воздухе и в растворе ----------
  reg("iv-buo", (el) => {
    const get = canvas2d(el.querySelector("canvas"));
    return { draw(t) {
      const { ctx, W: w, H: h, c } = get(), rho = n("rho", 1.18), rs = n("rs", 7.85), Wt = n("w", 85), k = 1 - rho / rs;
      const cols = [[w * 0.28, "В воздухе", Wt, false], [w * 0.68, "В растворе", Wt * k, true]];
      cols.forEach(([x, name, wt, mud], i) => {
        const top = 60, bot = h - 40, sway = RM ? 0 : Math.sin(t * 1.4 + i) * 1.5;
        if (mud) { ctx.fillStyle = "rgba(160,120,70,.28)"; ctx.fillRect(x - 70, top + 30, 140, bot - top - 30); txt(ctx, "раствор " + fmt(rho, 2) + " г/см³", x, bot + 18, c.mut, "11px " + c.mono, "center"); }
        // крюк и динамометр
        ctx.strokeStyle = c.mut; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, 14); ctx.lineTo(x, top - 18); ctx.stroke();
        ctx.fillStyle = c.panel; rr(ctx, x - 48, top - 18, 96, 30, 8); ctx.fill(); ctx.strokeStyle = mud ? c.amb : c.mut; ctx.stroke();
        txt(ctx, fmt(wt, 1) + " т", x, top + 2, mud ? c.amb : c.ink, "700 15px " + c.mono, "center");
        // колонна
        ctx.strokeStyle = c.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x, top + 12); ctx.lineTo(x + sway, bot); ctx.stroke(); ctx.lineWidth = 1;
        for (let y = top + 30; y < bot; y += 22) { ctx.fillStyle = c.ink; ctx.fillRect(x - 5 + sway * (y - top) / (bot - top), y, 10, 4); }
        txt(ctx, name, x, 12, c.mut, "600 12px " + c.mono, "center");
        if (mud) {                                                                    // стрелки выталкивающей силы
          for (let y = top + 60; y < bot - 20; y += 50) { const a = (t * 30 + y) % 18; ctx.strokeStyle = c.cy; ctx.beginPath(); ctx.moveTo(x + 22, y + 18 - a * 0.3); ctx.lineTo(x + 22, y - a * 0.3); ctx.lineTo(x + 17, y + 6 - a * 0.3); ctx.moveTo(x + 22, y - a * 0.3); ctx.lineTo(x + 27, y + 6 - a * 0.3); ctx.stroke(); }
        }
      });
      txt(ctx, w < 520 ? "Kп = " + fmt(k, 3) + " · −" + fmt(Wt * (1 - k), 1) + " т" : "Kп = 1 − " + fmt(rho, 2) + " / " + fmt(rs, 2) + " = " + fmt(k, 3) + " · облегчение " + fmt(Wt * (1 - k), 1) + " т", w / 2, h - 8, c.ink, "600 12px " + c.mono, "center");
    } };
  });

  // ---------- гидростатика: столб раствора и пластовое давление ----------
  const column = (el, mode) => {
    const get = canvas2d(el.querySelector("canvas"));
    return { draw(t) {
      const { ctx, W: w, H: h, c } = get();
      const rho = n("rho", 1.18), tvd = n("tvd", 2400);
      const nw = w < 520, top = 26, bot = h - 34, x0 = nw ? 56 : 70, x1 = w - (nw ? 14 : 30), wx = nw ? 30 : 54;
      const Ph = 0.00981 * rho * tvd;
      let extra = 0, Pp = null, label2 = "";
      if (mode === "hyd") Pp = n("pp", 26);
      if (mode === "ecd") extra = n("dp", 2.1);
      if (mode === "kill") { extra = n("p", 2.4); }
      const Pmax = Math.max(Ph + extra, Pp || 0) * 1.15, X = (p) => x0 + wx + (nw ? 18 : 36) + (p / Pmax) * (x1 - x0 - wx - (nw ? 22 : 46)), Y = (z) => top + z / tvd * (bot - top);
      // ствол со столбом
      const grd = ctx.createLinearGradient(0, top, 0, bot); grd.addColorStop(0, "rgba(160,120,70,.25)"); grd.addColorStop(1, "rgba(160,120,70,.6)");
      ctx.fillStyle = grd; ctx.fillRect(x0, top, wx, bot - top); ctx.strokeStyle = c.mut; ctx.strokeRect(x0 + 0.5, top + 0.5, wx, bot - top);
      if (mode === "ecd" && !RM) {                                                     // циркуляция: вниз по трубам, вверх по затрубу
        ctx.fillStyle = c.cy;
        for (let i = 0; i < 14; i++) { const f = ((t * 0.18 + i / 14) % 1); ctx.beginPath(); ctx.arc(x0 + wx / 2, Y(f * tvd), 2.4, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(x0 + 9, Y((1 - f) * tvd), 2.2, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(x0 + wx - 9, Y((1 - f) * tvd), 2.2, 0, 7); ctx.fill(); }
      }
      // оси
      ctx.strokeStyle = c.line; ctx.beginPath(); ctx.moveTo(X(0), top); ctx.lineTo(X(0), bot); ctx.lineTo(x1, bot); ctx.stroke();
      [0, 0.5, 1].forEach((f) => txt(ctx, fmt(tvd * f, 0) + " м", x0 - 6, Y(tvd * f) + 4, c.mut, "11px " + c.mono, "right"));
      [0, 0.5, 1].forEach((f) => txt(ctx, fmt(Pmax * f, 0), X(Pmax * f), bot + 16, c.mut, "11px " + c.mono, "center"));
      txt(ctx, "давление, МПа", x1, bot + 30, c.mut, "11px " + c.mono, "right");
      const grow = RM ? 1 : cl((t % 6) / 2.2, 0, 1);
      // гидростатика
      ctx.strokeStyle = c.amb; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(Ph * grow), Y(tvd * grow)); ctx.stroke();
      if (extra) { ctx.strokeStyle = mode === "ecd" ? c.cy : c.bad; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(X(mode === "kill" ? extra : 0), Y(0)); ctx.lineTo(X((mode === "kill" ? extra : 0) + (Ph + (mode === "ecd" ? extra : 0) - (mode === "kill" ? 0 : 0)) * grow), Y(tvd * grow)); ctx.stroke(); ctx.setLineDash([]); }
      ctx.lineWidth = 1;
      const dotAt = (p, col, s, dy = -8) => { const al = X(p) > (x0 + x1) / 2 ? "right" : "left"; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X(p), Y(tvd), 5, 0, 7); ctx.fill(); txtb(ctx, s, X(p) + (al === "left" ? 10 : -10), Y(tvd) + dy, col, "600 12px " + c.mono, al); };
      if (grow >= 1) {
        dotAt(Ph, c.amb, (nw ? "гидр. " : "гидростатика ") + fmt(Ph, 2), mode === "hyd" && Pp > Ph ? 16 : mode === "hyd" ? -26 : -10);
        if (mode === "hyd") { ctx.strokeStyle = c.bad; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(X(Pp), top); ctx.lineTo(X(Pp), bot); ctx.stroke(); ctx.setLineDash([]); dotAt(Pp, c.bad, "пласт " + fmt(Pp, 2), Pp > Ph ? -26 : -10); label2 = Ph >= Pp ? "репрессия " + fmt(Ph - Pp, 2) + " МПа" : "депрессия " + fmt(Pp - Ph, 2) + (nw ? " МПа" : " МПа, риск ГНВП"); }
        if (mode === "ecd") { dotAt(Ph + extra, c.cy, (nw ? "цирк. " : "при циркуляции ") + fmt(Ph + extra, 2), -26); label2 = "ЭЦП " + fmt(rho + extra / (0.00981 * tvd), 3) + " г/см³" + (nw ? "" : " — на " + fmt(extra / (0.00981 * tvd), 3) + " выше статики"); }
        if (mode === "kill") { dotAt(Ph + extra, c.bad, (nw ? "пласт " : "пласт " + fmt(Ph, 2) + " + " + fmt(extra, 2) + " = ") + fmt(Ph + extra, 2), -26); label2 = (nw ? "ρглуш " : "раствор глушения ") + fmt(rho + extra / (0.00981 * tvd), 3) + " г/см³" + (nw ? "" : " уравновесит пласт без давления на устье"); }
      }
      if (mode === "kill") { ctx.fillStyle = c.bad; rr(ctx, x0 - 4, top - 18, Math.max(wx + 8, 64), 14, 4); ctx.fill(); txt(ctx, "Pтр " + fmt(extra, 2), x0 + Math.max(wx + 8, 64) / 2 - 4, top - 7, "#fff", "600 10px " + c.mono, "center"); }
      txt(ctx, label2, x1, top + (mode === "kill" ? 14 : 4), Ph >= (Pp || 0) || mode !== "hyd" ? c.ink : c.bad, "600 12px " + c.mono, "right");
    } };
  };
  reg("iv-hyd", (el) => column(el, "hyd"));
  reg("iv-ecd", (el) => column(el, "ecd"));
  reg("iv-kill", (el) => column(el, "kill"));

  // ---------- критические обороты: изгибная форма пролёта при вращении ----------
  reg("iv-crit", (el) => {
    const tv = view(el.querySelector("canvas"), { radius: 9, pitch: 0.25, yaw: -0.4, auto: false });
    let ang = 0;
    tv.render = (t) => {
      const c = t.c, rpm = n("rpm", 100), span = n("span", 10), od = n("cod", 172) / 1000, id = n("cid", 71) / 1000;
      // собственная частота пролёта (шарнирные опоры): f = π/(2L²)·√(EI/m)
      const E = 207e9, I = Math.PI / 64 * (od ** 4 - id ** 4), m = 7850 * Math.PI / 4 * (od * od - id * id);
      const fN = Math.PI / (2 * span * span) * Math.sqrt(E * I / m), ob = document.getElementById("o_bha"), fromCalc = ob && parseFloat(ob.textContent.replace(/\s/g, "").replace(",", "."));
      const rpmC = fromCalc > 0 ? fromCalc : fN * 60, ratio = rpm / rpmC;
      const amp = Math.min(1.6, 0.12 / Math.max(0.04, Math.abs(1 - ratio * ratio)));       // резонансная кривая
      ang += (RM ? 0 : rpm / 60 * 2 * Math.PI * 0.016 * 0.25);
      const L = span, N = 48, pts = [], RH = 0.9;                                    // RH — стенка ствола, условно
      t.target = [0, 0, -L / 2]; t.radius = L * 0.62;
      for (let z = 0; z <= L + 1e-6; z += L / 8) t.ring([0, 0, -z], [1, 0, 0], [0, 1, 0], RH, RH, { color: c.mut, width: 1, alpha: 0.35 });
      const hit = amp * 0.6 > RH * 0.95;
      for (let i = 0; i <= N; i++) { const z = i / N, a = Math.min(RH, amp * 0.6) * Math.sin(Math.PI * z); pts.push([a * Math.cos(ang), a * Math.sin(ang), -z * L]); }
      t.line([[0, 0, 0], [0, 0, -L]], { color: c.mut, width: 1, dash: [4, 4] });
      t.line(pts, { color: hit || (ratio > 0.85 && ratio < 1.15) ? c.bad : c.amb, width: 9 });
      if (hit) t.dot(pts[N / 2], 9, c.bad);
      [0, N].forEach((i) => { t.ring(pts[i], [1, 0, 0], [0, 1, 0], 0.35, 0.35, { color: c.ink, width: 3 }); });
      t.label(pts[0], "центратор", c.mut, 16, -6); t.label(pts[N], "центратор", c.mut, 16, 6);
      t.text(12, 20, t.W < 520 ? "Критические ≈ " + fmt(rpmC, 0) + " · план " + fmt(rpm, 0) + " об/мин" : "Пролёт " + fmt(span, 1) + " м · критические ≈ " + fmt(rpmC, 0) + " об/мин · плановые " + fmt(rpm, 0), c.ink, "600 12px " + c.mono);
      t.text(12, 38, ratio > 0.85 && ratio < 1.15 ? "резонанс: прогиб растёт, удары о стенку" : ratio < 0.85 ? "ниже резонанса, запас " + fmt((1 - ratio) * 100, 0) + " %" : "выше резонанса, проходите зону быстро", ratio > 0.85 && ratio < 1.15 ? c.bad : c.ok, "12px " + c.mono);
      t.text(12, t.H - 12, t.W < 520 ? "Прогиб увеличен" : "Прогиб показан увеличенным · упрощённая модель пролёта на шарнирах", c.mut);
    };
    tv.anim = () => {};
    return { draw() {}, tv };
  });

  // ---------- объём скважины и lag time: 3D ствол и пачка, идущая к устью ----------
  reg("iv-vol", (el) => {
    const tv = view(el.querySelector("canvas"), { radius: 1800, pitch: 0.12, yaw: -0.6, auto: false });
    let t0 = performance.now();
    tv.render = (t) => {
      const c = t.c, md = n("md", 3000), lc = n("lc", 1200), dc = n("dc", 224.4), dh = n("dh", 215.9) * (1 + n("kv", 10) / 100), od = n("od", 127), id = n("id", 108.6), q = n("q", 30) / 1000;
      const Ah = (x) => Math.PI / 4 * (x / 1000) ** 2, Va = (Ah(dc) - Ah(od)) * lc + (Ah(dh) - Ah(od)) * Math.max(0, md - lc), Vp = Ah(id) * md;
      const lag = Va / q, down = Vp / q, cyc = lag + down;
      t.target = [0, 0, -md / 2]; t.radius = md * 0.62;
      const rS = 0.06 * md, sc = rS / (dh / 2);
      // колонна и ствол как цилиндры кольцами
      for (let z = 0; z <= md; z += md / 30) { const r = (z < lc ? dc : dh) / 2 * sc; t.ring([0, 0, -z], [1, 0, 0], [0, 1, 0], r, r, { color: z < lc ? c.mut : "rgba(160,120,70,.7)", width: 1, alpha: 0.5 }); }
      t.line([[0, 0, 0], [0, 0, -md]], { color: c.ink, width: 4, alpha: 0.6 });
      t.line([[-dc / 2 * sc, 0, -lc], [dc / 2 * sc, 0, -lc]], { color: c.ink, width: 2 }); t.label([dc / 2 * sc, 0, -lc], "башмак " + fmt(lc, 0) + " м", c.mut, 8, 4);
      // пачка: вниз по трубам, затем вверх по затрубу; анимация — полный цикл за 9 с
      const T = RM ? 0.62 : ((performance.now() - t0) / 9000) % 1, f = T * cyc;
      let z, inAnn;
      if (f < down) { z = md * f / down; inAnn = false; } else { const g = (f - down) / lag; z = md * (1 - g); inAnn = true; }
      const pr = inAnn ? (dh / 2 * 0.75) * sc : 0;
      t.dot([pr, 0, -z], 8, inAnn ? c.amb : c.cy, c.ink);
      t.label([pr, 0, -z], inAnn ? "пачка в затрубе" : "внутри труб", inAnn ? c.amb : c.cy, 12, 4, "600 12px " + c.mono);
      if (t.W < 520) { t.text(12, 20, "До долота " + fmt(down / 60, 0) + " мин · вынос " + fmt(lag / 60, 0) + " мин", c.ink, "600 12px " + c.mono); t.text(12, 38, "Цикл " + fmt(cyc / 60, 0) + " мин · анимация ускорена", c.mut); }
      else { t.text(12, 20, "Прокачка до долота " + fmt(down / 60, 0) + " мин · вынос " + fmt(lag / 60, 0) + " мин · цикл " + fmt(cyc / 60, 0) + " мин", c.ink, "600 12px " + c.mono);
      t.text(12, 38, "Голубая точка внутри труб, оранжевая в затрубье · анимация ускорена", c.mut); }
    };
    tv.anim = () => {};
    return { draw() {}, tv };
  });

  // ---------- общий цикл ----------
  if (!models.length) return;
  const io = "IntersectionObserver" in window ? new IntersectionObserver((es) => es.forEach((e) => { const m = models.find((x) => x.el === e.target); if (m) m.vis = e.isIntersecting; })) : null;
  models.forEach((m) => io && io.observe(m.el));
  let last = performance.now();
  const loop = (now) => {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    models.forEach((m) => { if (m.vis && !m.tv) m.draw(now / 1000, dt); });
  };
  requestAnimationFrame(loop);
  const redraw = () => models.forEach((m) => (m.tv ? m.tv.invalidate() : m.draw(performance.now() / 1000, 0)));
  document.querySelectorAll(".calc .ci input").forEach((i) => i.addEventListener("input", redraw));
})();
