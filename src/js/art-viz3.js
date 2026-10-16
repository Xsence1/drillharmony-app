// DrillHarmony · Модели к статьям: уход бокового ствола, спуск обсадной колонны, шаблон слайд-шита.
(() => {
  // ---------- шаблон слайд-шита (CSV для Excel) ----------
  const csvBtn = document.getElementById("rp-csv");
  if (csvBtn) csvBtn.onclick = () => {
    const head = ["Дата", "Время", "Свеча", "Глубина от, м", "Глубина до, м", "Режим (слайд/ротор)", "Длина, м", "TF выставлен, °", "TF факт, °", "Нагрузка, т", "Перепад ВЗД, МПа", "Расход, л/с", "Обороты ротора, об/мин", "МСП, м/ч", "Замер: глубина, м", "Зенит, °", "Азимут, °", "Интенсивность факт, °/30 м", "Примечание"];
    const row = ["", "", "1", "2400", "2408", "слайд", "=E2-D2", "30", "", "", "", "", "0", "", "", "", "", "", ""];
    const csv = "﻿" + [head, row].map((r) => r.map((x) => '"' + String(x).replace(/"/g, '""') + '"').join(";")).join("\r\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); a.download = "slide-sheet-drillharmony.csv"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  if (!window.DH3D) return;
  const { view, canvas2d, bindSliders, F: fmt, RM, W: Wv } = DH3D;
  const R = Math.PI / 180;
  const T = (ctx, s, x, y, col, font, al) => { ctx.fillStyle = col; ctx.font = font; ctx.textAlign = al || "left"; ctx.fillText(s, x, y); };

  // ---------- боковой ствол: расхождение стволов ----------
  (() => {
    const root = document.getElementById("ia-side"); if (!root) return;
    const $ = (s) => root.querySelector(s), v = (id) => +$("#" + id).value;
    const tv = view($("#sd-cv"), { radius: 40, pitch: 0.3, yaw: -0.9, auto: !RM }), get = canvas2d($("#sd-ch"));
    let S = null;
    const calc = () => {
      const I = v("sd-i"), tf = v("sd-tf"), dls = v("sd-dls"), D = v("sd-d") / 1000;
      const t = [Math.sin(I * R), 0, Math.cos(I * R)], h = [Math.cos(I * R), 0, -Math.sin(I * R)], r = [0, 1, 0];
      const n = h.map((x, i) => x * Math.cos(tf * R) + r[i] * Math.sin(tf * R)), k = dls / 30 * R;
      const old = [], neu = [], dist = [];
      let sep = null;
      for (let s = 0; s <= 90; s += 0.5) {
        const po = t.map((x) => x * s);
        const pn = k > 0 ? t.map((x, i) => x * Math.sin(k * s) / k + n[i] * (1 - Math.cos(k * s)) / k) : po;
        old.push(po); neu.push(pn);
        const d = Math.hypot(...pn.map((x, i) => x - po[i])); dist.push([s, d]);
        if (sep == null && d >= D) sep = s;
      }
      const at = (m) => dist[Math.round(m / 0.5)][1];
      S = { old, neu, dist, D, sep };
      $("#sd-o-sep").textContent = sep == null ? "> 90" : fmt(sep, 1);
      $("#sd-o-30").textContent = fmt(at(30), 2); $("#sd-o-60").textContent = fmt(at(60), 2);
      tv.invalidate(); draw2();
    };
    const w = (p) => Wv(p[0], p[1], p[2]);
    tv.render = (t) => {
      if (!S) return; const c = t.c; t.target = w(S.old[90]); t.radius = 40;
      t.line([w([-S.old[40][0], 0, -S.old[40][2]]), [0, 0, 0]].map((p, i) => (i ? p : p)), { color: c.mut, width: 6, alpha: 0.6 });
      t.line(S.old.map(w), { color: c.mut, width: 6, alpha: 0.45 }); t.label(w(S.old[180]), "старый ствол", c.mut, -96, 16);
      t.line(S.neu.map(w), { color: c.amb, width: 4 }); t.label(w(S.neu[180]), "новый ствол", c.amb, 10, -10);
      if (S.sep != null) { const p = S.neu[Math.round(S.sep / 0.5)]; t.dot(w(p), 6, c.ok); t.label(w(p), "стенки разошлись", c.ok, 8, 12); }
      t.dot([0, 0, 0], 6, c.bad); t.label([0, 0, 0], "точка зарезки", c.bad, 8, -8);
      t.text(12, t.H - 12, "Перетащите — повернуть", c.mut);
    };
    const draw2 = () => {
      if (!S) return; const { ctx, W, H, c } = get(), x0 = 46, w2 = W - 60, y0 = 20, h = H - 42, mx = Math.max(S.D * 3, ...S.dist.map((d) => d[1])), X = (s) => x0 + s / 90 * w2, Y = (d) => y0 + h - d / mx * h;
      ctx.strokeStyle = c.line; ctx.strokeRect(x0 + .5, y0 + .5, w2, h);
      T(ctx, "Расстояние между осями стволов, м", x0, y0 - 6, c.mut, "11px " + c.mono);
      ctx.strokeStyle = c.ok; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(x0, Y(S.D)); ctx.lineTo(x0 + w2, Y(S.D)); ctx.stroke(); ctx.setLineDash([]);
      T(ctx, "диаметр ствола", x0 + 6, Y(S.D) - 5, c.ok, "10px " + c.mono);
      ctx.strokeStyle = c.amb; ctx.lineWidth = 2; ctx.beginPath(); S.dist.forEach(([s, d], i) => (i ? ctx.lineTo(X(s), Y(d)) : ctx.moveTo(X(s), Y(d)))); ctx.stroke(); ctx.lineWidth = 1;
      [0, 30, 60, 90].forEach((s) => T(ctx, s + " м", X(s), y0 + h + 14, c.mut, "10px " + c.mono, "center"));
    };
    bindSliders(root, calc); calc(); addEventListener("resize", draw2);
  })();

  // ---------- спуск обсадной колонны ----------
  (() => {
    const root = document.getElementById("ia-cas"); if (!root) return;
    const $ = (s) => root.querySelector(s), v = (id) => +$("#" + id).value, get = canvas2d($("#cs-cv"));
    const g = 9.80665, BLK = 25, KOP = 1800, BUR = 4, INC = 89;
    let prog = 1, S = null;
    // вес на крюке при спуске, когда башмак колонны на глубине L (т)
    const slackAt = (L, lat, mu, q, rho, fl) => {
      const st = []; let m = 0, i = 0; const ds = 10;
      while (m < L) { st.push([m, i]); m += ds; if (m > KOP && i < INC) i = Math.min(INC, i + BUR / 30 * ds); }
      st.push([L, i]);
      let F = 0;
      for (let k = st.length - 1; k > 0; k--) {
        const [m2, i2] = st[k], [m1, i1] = st[k - 1], dL = m2 - m1, I = (i1 + i2) / 2 * R, dI = (i2 - i1) * R;
        const fromShoe = L - m2, floated = fromShoe < fl;
        // в плавучей секции внутри воздух: вес = сталь − вытесненный раствор по наружному объёму
        const steel = q * g, od = 0.1397, vol = Math.PI / 4 * od * od, w = floated ? steel - rho * 1000 * g * vol : steel * (1 - rho / 7.85);
        const N = Math.abs(F * dI + w * Math.sin(I) * dL);
        F = F + w * Math.cos(I) * dL - mu * N;
      }
      return F / 1000 / g + BLK;
    };
    const calc = () => {
      const lat = v("cs-lat"), mu = v("cs-mu"), q = v("cs-q"), rho = v("cs-rho"), fl = v("cs-fl");
      const TD = KOP + (INC / BUR) * 30 + lat, pts = [];
      let stop = null, mn = Infinity;
      for (let L = 100; L <= TD; L += Math.max(20, TD / 120)) { const so = slackAt(L, lat, mu, q, rho, Math.min(fl, L)); pts.push([L, so]); mn = Math.min(mn, so); if (stop == null && so <= BLK + 0.5) stop = L; }
      const end = slackAt(TD, lat, mu, q, rho, fl); pts.push([TD, end]); if (stop == null && end <= BLK + 0.5) stop = TD;
      S = { pts, TD, stop, end, mn };
      $("#cs-o-so").textContent = fmt(end, 1); $("#cs-o-min").textContent = fmt(mn, 1); $("#cs-o-stop").textContent = stop == null ? "дойдёт" : fmt(stop, 0);
      $("#cs-o-so").parentElement.classList.toggle("warn", stop != null);
      $("#cs-msg").textContent = stop != null ? "Колонна остановится на " + fmt(stop, 0) + " м: вес на крюке упал до веса талевой системы. Нужны меры: плавучая секция, центраторы с низким трением, подготовка ствола." : end - BLK < 10 ? "Колонна дойдёт, но запас всего " + fmt(end - BLK, 1) + " т, любая посадка остановит спуск. Продумайте меры заранее." : "Колонна дойдёт до забоя с запасом " + fmt(end - BLK, 1) + " т на крюке.";
      prog = 1; draw();
    };
    const draw = () => {
      if (!S) return; const { ctx, W, H, c } = get(), x0 = 56, y0 = 22, w = W - 76, h = H - 50;
      const mx = Math.max(...S.pts.map((p) => p[1])) * 1.05, X = (wt) => x0 + wt / mx * w, Y = (L) => y0 + L / S.TD * h;
      ctx.strokeStyle = c.line; ctx.strokeRect(x0 + .5, y0 + .5, w, h);
      T(ctx, "Вес на крюке при спуске, т", x0, y0 - 8, c.mut, "11px " + c.mono);
      ctx.fillStyle = "rgba(255,90,70,.12)"; ctx.fillRect(x0, y0, X(BLK) - x0, h);
      ctx.strokeStyle = c.bad; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(X(BLK), y0); ctx.lineTo(X(BLK), y0 + h); ctx.stroke(); ctx.setLineDash([]);
      T(ctx, "талевая система " + BLK + " т", X(BLK) + 6, y0 + h - 8, c.bad, "10px " + c.mono);
      const n = Math.max(2, Math.floor(prog * S.pts.length));
      ctx.strokeStyle = c.amb; ctx.lineWidth = 2.5; ctx.beginPath(); S.pts.slice(0, n).forEach(([L, wt], i) => (i ? ctx.lineTo(X(wt), Y(L)) : ctx.moveTo(X(wt), Y(L)))); ctx.stroke(); ctx.lineWidth = 1;
      const last = S.pts[n - 1]; ctx.fillStyle = c.amb; ctx.beginPath(); ctx.arc(X(last[1]), Y(last[0]), 5, 0, 7); ctx.fill();
      [[KOP, "зарезка"], [KOP + INC / BUR * 30, "начало горизонтали"]].forEach(([L, s]) => { ctx.strokeStyle = c.line; ctx.beginPath(); ctx.moveTo(x0, Y(L)); ctx.lineTo(x0 + w, Y(L)); ctx.stroke(); T(ctx, s, x0 + w - 4, Y(L) - 4, c.mut, "10px " + c.mono, "right"); });
      [0, 0.5, 1].forEach((f) => T(ctx, fmt(S.TD * f, 0) + " м", x0 - 6, Y(S.TD * f) + 4, c.mut, "10px " + c.mono, "right"));
      [0, mx / 2, mx].forEach((wt) => T(ctx, fmt(wt, 0), X(wt), y0 + h + 14, c.mut, "10px " + c.mono, "center"));
    };
    $("#cs-go").onclick = () => { prog = 0; const t0 = performance.now(); const step = (now) => { prog = Math.min(1, (now - t0) / 3000); draw(); if (prog < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); };
    bindSliders(root, calc); calc(); addEventListener("resize", draw);
    new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  })();
})();
