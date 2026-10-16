// DrillHarmony · Траектория из таблицы: минимальная кривизна, 3D, разрез, план и расстояние до соседа.
// Данные вставляются из Excel и обрабатываются только в браузере.
(() => {
  const root = document.getElementById("tt");
  if (!root || !window.DH3D) return;
  const { view, canvas2d, mc, F: fmt, W: Wv } = DH3D;
  const $ = (s) => root.querySelector(s), R = Math.PI / 180;
  const SAMPLE1 = "MD\tINC\tAZ\n0\t0\t0\n300\t0,3\t120\n600\t0,5\t130\n800\t3\t140\n900\t9\t142\n1000\t15\t143\n1100\t21\t144\n1200\t27\t145\n1300\t33\t145\n1500\t33,5\t146\n1800\t34\t146\n2100\t34\t147\n2300\t42\t148\n2450\t58\t149\n2550\t74\t149\n2620\t86\t150\n2700\t89\t150\n3000\t89,5\t151\n3300\t90\t151";
  const SAMPLE2 = "MD\tINC\tAZ\n0\t0\t0\n500\t0,3\t200\n1000\t0,5\t210\n1500\t0,6\t215\n2000\t0,8\t220\n2500\t0,9\t220";
  // разбор вставленного текста: табуляция, «;», пробелы; запятая или точка
  const parseTab = (txt) => {
    const rows = [];
    for (const line of txt.split(/\r?\n/)) {
      const parts = line.trim().split(/[\t;]+|\s{1,}/).filter(Boolean);
      if (parts.length < 3) continue;
      const v = parts.slice(0, 3).map((p) => parseFloat(p.replace(",", ".")));
      if (v.some((x) => !isFinite(x))) continue;
      rows.push({ md: v[0], inc: v[1], az: ((v[2] % 360) + 360) % 360 });
    }
    rows.sort((a, b) => a.md - b.md);
    return rows;
  };
  const compute = (st, tie) => {
    if (!st.length) return [];
    const out = [{ ...st[0], tvd: tie.tvd, n: tie.n, e: tie.e, dls: 0 }];
    for (let i = 1; i < st.length; i++) {
      const a = st[i - 1], b = st[i], r = mc(a.md, a.inc, a.az, b.md, b.inc, b.az), p = out[i - 1];
      out.push({ ...b, tvd: p.tvd + r.dv, n: p.n + r.dn, e: p.e + r.de, dls: b.md > a.md ? r.b / R / (b.md - a.md) * 30 : 0 });
    }
    return out;
  };
  // точка ствола на произвольной глубине (интерполяция по дуге упрощённо — линейно между станциями)
  const dense = (pts, step = 10) => {
    const o = [];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], n = Math.max(1, Math.ceil((b.md - a.md) / step));
      for (let k = 0; k < n; k++) { const f = k / n; o.push({ md: a.md + (b.md - a.md) * f, tvd: a.tvd + (b.tvd - a.tvd) * f, n: a.n + (b.n - a.n) * f, e: a.e + (b.e - a.e) * f }); }
    }
    if (pts.length) o.push(pts[pts.length - 1]);
    return o;
  };
  let A = [], B = [], vsAz = 0, sep = null;
  const v = (id) => parseFloat(String($("#" + id).value).replace(",", ".")) || 0;
  const run = () => {
    const t = { tvd: v("tt-tvd"), n: 0, e: 0 };
    A = compute(parseTab($("#tt-a").value), t);
    B = compute(parseTab($("#tt-b").value), { tvd: v("tt-tvd2"), n: v("tt-n2"), e: v("tt-e2") });
    const last = A[A.length - 1];
    vsAz = $("#tt-vsauto").checked && last ? ((Math.atan2(last.e, last.n) / R) + 360) % 360 : v("tt-vs");
    if ($("#tt-vsauto").checked) $("#tt-vs").value = fmt(vsAz, 1);
    // минимальное расстояние между стволами
    sep = null;
    if (A.length > 1 && B.length > 1) {
      const da = dense(A), db = dense(B); let best = Infinity, ia = 0, ib = 0;
      for (let i = 0; i < da.length; i += 1) for (let j = 0; j < db.length; j += 1) { const d = Math.hypot(da[i].n - db[j].n, da[i].e - db[j].e, da[i].tvd - db[j].tvd); if (d < best) { best = d; ia = i; ib = j; } }
      sep = { d: best, a: da[ia], b: db[ib] };
    }
    const vs = (p) => p.n * Math.cos(vsAz * R) + p.e * Math.sin(vsAz * R);
    const o = (id, x) => ($("#" + id).textContent = x);
    if (last) {
      o("tt-o-md", fmt(last.md, 1)); o("tt-o-tvd", fmt(last.tvd, 2)); o("tt-o-hd", fmt(Math.hypot(last.n, last.e), 2));
      o("tt-o-dls", fmt(Math.max(...A.map((p) => p.dls)), 2)); o("tt-o-sep", sep ? fmt(sep.d, 1) : "—"); o("tt-o-sepmd", sep ? fmt(sep.a.md, 0) : "—");
    }
    $("#tt-tab").innerHTML = A.length ? "<table><thead><tr><th>MD, м</th><th>Зенит, °</th><th>Азимут, °</th><th>TVD, м</th><th>С+/Ю−, м</th><th>В+/З−, м</th><th>VS, м</th><th>DLS, °/30 м</th></tr></thead><tbody>" + A.map((p) => `<tr><td>${fmt(p.md, 2)}</td><td>${fmt(p.inc, 2)}</td><td>${fmt(p.az, 2)}</td><td>${fmt(p.tvd, 2)}</td><td>${fmt(p.n, 2)}</td><td>${fmt(p.e, 2)}</td><td>${fmt(vs(p), 2)}</td><td>${fmt(p.dls, 2)}</td></tr>`).join("") + "</tbody></table>" : "<p>Вставьте хотя бы две строки: глубина, зенит, азимут.</p>";
    $("#tt-msg").textContent = A.length < 2 ? "Нужно минимум две станции." : "Станций: " + A.length + (B.length > 1 ? " · соседний ствол: " + B.length : "") + ". Расчёт методом минимальной кривизны.";
    tv.invalidate(); draw2();
  };
  // 3D
  const tv = view($("#tt-cv"), { radius: 1500, pitch: 0.35, yaw: -0.8, auto: false });
  const w = (p) => Wv(p.n, p.e, p.tvd);
  tv.render = (t) => {
    if (A.length < 2) return; const c = t.c, all = A.concat(B);
    const mx = Math.max(...all.map((p) => Math.max(Math.abs(p.n), Math.abs(p.e), p.tvd)), 100);
    t.target = Wv((Math.max(...all.map((p) => p.n)) + Math.min(...all.map((p) => p.n))) / 2, (Math.max(...all.map((p) => p.e)) + Math.min(...all.map((p) => p.e))) / 2, mx / 2); t.radius = mx * 0.75;
    t.grid(0, mx * 0.5, mx / 5, { alpha: 0.5 }); t.compass(0, mx * 0.15);
    t.line(A.map(w), { color: c.amb, width: 3 }); t.label(w(A[A.length - 1]), "ствол", c.amb, 8, 4);
    if (B.length > 1) { t.line(B.map(w), { color: c.cy, width: 2.5 }); t.label(w(B[B.length - 1]), "соседний", c.cy, 8, 4); }
    if (sep) { t.line([w(sep.a), w(sep.b)], { color: c.bad, width: 2, dash: [5, 4] }); t.label(w(sep.a), fmt(sep.d, 1) + " м", c.bad, 8, -8, "700 12px " + c.mono); }
    t.text(12, t.H - 12, "Перетащите — повернуть · колесо — масштаб", c.mut);
  };
  // разрез и план
  const g2 = canvas2d($("#tt-2d"));
  const draw2 = () => {
    if (A.length < 2) return;
    const { ctx, W, H, c } = g2(), narrow = W < 620, gap = 30;
    const vs = (p) => p.n * Math.cos(vsAz * R) + p.e * Math.sin(vsAz * R);
    const panel = (x, y, w, h, title, pts, fx, fy, invY) => {
      ctx.strokeStyle = c.line; ctx.strokeRect(x + .5, y + .5, w, h); ctx.fillStyle = c.mut; ctx.font = "11px " + c.mono; ctx.textAlign = "left"; ctx.fillText(title, x, y - 6);
      const xs = pts.flat().map(fx), ys = pts.flat().map(fy); let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const s = Math.min((w - 30) / Math.max(1, x1 - x0), (h - 30) / Math.max(1, y1 - y0)), ox = x + 15 + ((w - 30) - (x1 - x0) * s) / 2, oy = y + 15 + ((h - 30) - (y1 - y0) * s) / 2;
      const X = (p) => ox + (fx(p) - x0) * s, Y = (p) => invY ? oy + (y1 - fy(p)) * s : oy + (fy(p) - y0) * s;
      pts.forEach((arr, k) => { if (arr.length < 2) return; ctx.strokeStyle = k ? c.cy : c.amb; ctx.lineWidth = 2.5; ctx.beginPath(); arr.forEach((p, i) => (i ? ctx.lineTo(X(p), Y(p)) : ctx.moveTo(X(p), Y(p)))); ctx.stroke(); ctx.lineWidth = 1; ctx.fillStyle = k ? c.cy : c.amb; const q = arr[arr.length - 1]; ctx.beginPath(); ctx.arc(X(arr[0]), Y(arr[0]), 3.5, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(X(q), Y(q), 3, 0, 7); ctx.fill(); });
      ctx.fillStyle = c.mut; ctx.font = "10px " + c.mono; ctx.textAlign = "right"; ctx.fillText("масштаб 1:1", x + w - 6, y + h - 6);
    };
    if (narrow) {
      const h = (H - gap * 2) / 2;
      panel(10, gap, W - 20, h, "Вертикальный разрез по азимуту " + fmt(vsAz, 0) + "°", [A, B], vs, (p) => p.tvd, false);
      panel(10, gap * 2 + h, W - 20, h, "План: север вверх", [A, B], (p) => p.e, (p) => p.n, true);
    } else {
      const w = (W - gap * 3) / 2;
      panel(gap, gap, w, H - gap * 2, "Вертикальный разрез по азимуту " + fmt(vsAz, 0) + "°", [A, B], vs, (p) => p.tvd, false);
      panel(gap * 2 + w, gap, w, H - gap * 2, "План: север вверх", [A, B], (p) => p.e, (p) => p.n, true);
    }
  };
  $("#tt-go").onclick = run;
  $("#tt-sample").onclick = () => { $("#tt-a").value = SAMPLE1; $("#tt-b").value = SAMPLE2; $("#tt-n2").value = "-395"; $("#tt-e2").value = "300"; run(); };
  $("#tt-csv").onclick = () => {
    if (!A.length) return; const vs = (p) => p.n * Math.cos(vsAz * R) + p.e * Math.sin(vsAz * R), f = (x) => x.toFixed(3).replace(".", ",");
    const csv = "﻿MD;Зенит;Азимут;TVD;С+/Ю-;В+/З-;VS;DLS °/30м\r\n" + A.map((p) => [p.md, p.inc, p.az, p.tvd, p.n, p.e, vs(p), p.dls].map(f).join(";")).join("\r\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); a.download = "trajectory-drillharmony.csv"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  ["tt-vs", "tt-vsauto"].forEach((id) => $("#" + id).addEventListener("change", run));
  addEventListener("resize", draw2);
  new MutationObserver(draw2).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  $("#tt-a").value = SAMPLE1; run();
})();
