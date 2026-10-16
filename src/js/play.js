// DrillHarmony · Игра «Посади горизонталь за 60 секунд».
// Своя упрощённая модель: слайд даёт 8°/30 м, ротор — небольшое падение,
// кровля пласта известна только по проекту, фактическая — по ГК.
(() => {
  const root = document.getElementById("pg");
  if (!root) return;
  const cv = document.getElementById("pg-cv"), ctx = cv.getContext("2d");
  const $ = (id) => document.getElementById(id);
  const R = Math.PI / 180, DUR = 60, SPEED = 12, DLS = 8, ROT = -0.6, THICK = 5;
  const F = (x, d = 0) => x.toFixed(d).replace(".", ",");
  let W = 0, H = 0, dpr = 1, st = null, raf = 0, slide = 0, lastT = 0;
  const css = (n, f) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || f;
  const col = () => ({ bg: css("--bg", "#0b0f13"), ink: css("--ink", "#e8edf2"), mut: css("--muted", "#8b97a3"), line: css("--line", "#24303a"), amb: css("--amber", "#f0a63a"), bad: css("--bad", "#ff8a6b"), ok: css("--ok", "#5fd18b"), mono: css("--mono", "monospace") });
  const best = () => { try { return +localStorage.getItem("dh-play-best") || 0; } catch (e) { return 0; } };
  const saveBest = (x) => { try { localStorage.setItem("dh-play-best", String(x)); } catch (e) {} };

  const size = () => {
    const r = cv.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); draw();
  };
  const pats = {};
  const pat = (k) => {
    if (pats[k]) return pats[k];
    const o = document.createElement("canvas"); o.width = o.height = 14; const g = o.getContext("2d");
    if (k === "sh") { g.fillStyle = "rgba(130,140,150,.10)"; g.fillRect(0, 0, 14, 14); g.strokeStyle = "rgba(150,160,170,.22)"; g.lineWidth = 1; g.beginPath(); g.moveTo(1, 4.5); g.lineTo(8, 4.5); g.moveTo(6, 11.5); g.lineTo(13, 11.5); g.stroke(); }
    else { g.fillStyle = "rgba(240,166,58,.55)"; [[3, 3], [10, 6], [5, 11]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 1, 0, 7); g.fill(); }); }
    return (pats[k] = ctx.createPattern(o, "repeat"));
  };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const reset = () => {
    const plan = 72;                                      // кровля по проекту, м ниже точки старта
    st = { t: 0, md: 0, inc: rnd(46, 54), tvd: 0, vs: 0, path: [], plan, top0: plan + rnd(-5, 5), dip: rnd(-1, 1),
           landMd: null, landInc: null, inZone: 0, after: 0, maxDls: 0, over: false, run: false, hit: null };
    st.path.push({ vs: 0, tvd: 0, gr: 105, inc: st.inc });
  };
  const top = (vs) => st.top0 + vs * Math.tan(st.dip * R);  // фактическая кровля (глубже — положительно)
  const zone = (p) => p.tvd >= top(p.vs) && p.tvd <= top(p.vs) + THICK;
  const gr = (p) => { const t = top(p.vs); const d = p.tvd < t ? t - p.tvd : p.tvd > t + THICK ? p.tvd - t - THICK : -1; return d < 0 ? 40 + Math.random() * 4 : Math.min(118, 72 + d * 11) + Math.random() * 4; };

  const step = (dt) => {
    const dmd = SPEED * dt;
    const rate = slide ? slide * DLS / 30 : ROT / 30;
    st.inc = Math.max(0, Math.min(100, st.inc + rate * dmd + (Math.random() - 0.5) * 0.02));
    st.md += dmd; st.tvd += Math.cos(st.inc * R) * dmd; st.vs += Math.sin(st.inc * R) * dmd;
    const p = { vs: st.vs, tvd: st.tvd, gr: 0, inc: st.inc };
    p.gr = gr(p); st.path.push(p);
    const inz = zone(p);
    if (inz && st.landMd == null) { st.landMd = st.md; st.landInc = st.inc; }
    if (st.landMd != null) { st.after += dmd; if (inz) st.inZone += dmd; }
    if (st.tvd > top(st.vs) + THICK + 12) { st.hit = "Ствол ушёл под пласт: подошва пройдена."; finish(); }
    if (st.inc < 30 && st.md > 200) { st.hit = "Зенит упал, ствол уходит вниз."; finish(); }
  };
  const score = () => {
    if (st.landMd == null) return { s: 0, zone: 0, land: 0 };
    const zp = st.after > 0 ? st.inZone / st.after : 0;
    const land = Math.max(0, 1 - Math.abs(90 - st.landInc) / 12);   // вход с зенитом около 90° — лучший
    return { s: Math.round((zp * 0.7 + land * 0.3) * 100), zone: zp, land };
  };
  const grade = (s) => s >= 90 ? "Уровень: ведущий инженер ННБ" : s >= 75 ? "Уровень: уверенный инженер ННБ" : s >= 50 ? "Уровень: инженер ННБ, есть куда расти" : s >= 25 ? "Уровень: стажёр" : "Пласт пока не поймали";
  const finish = () => {
    st.run = false; st.over = true; cancelAnimationFrame(raf); slide = 0;
    const r = score(), b = best();
    if (r.s > b) saveBest(r.s);
    $("pg-res").hidden = false; $("pg-start").hidden = true;
    $("pg-sc").textContent = r.s;
    $("pg-gr").textContent = grade(r.s);
    $("pg-det").innerHTML = (st.hit ? `<p class="pg-hit">${st.hit}</p>` : "") +
      `<ul><li>Вход в пласт: ${st.landMd == null ? "не вошли" : "зенит " + F(st.landInc, 1) + "°"}</li><li>В пласте: ${F(r.zone * 100)} % горизонтали</li><li>Кровля оказалась ${st.top0 > st.plan ? "ниже" : "выше"} проекта на ${F(Math.abs(st.top0 - st.plan), 1)} м, падение пласта ${F(st.dip, 1)}°</li><li>Ваш рекорд: ${Math.max(r.s, b)}</li></ul>` +
      `<p class="pg-tip">${r.zone < 0.6 && st.landMd != null ? "Совет: следите за ГК. Если гамма растёт, ствол подходит к глинам кровли или подошвы." : st.landMd == null ? (st.tvd < top(st.vs) ? "Ствол прошёл над пластом: ГК так и не упал, значит, кровля оказалась ниже проекта. Если на проектной глубине ГК высокий, снижайтесь слайдом на падение." : "Совет: набирайте раньше. С 50° до 90° при 8°/30 м нужно не меньше 50 м по вертикали.") : "Отлично. В реальной скважине ещё мешают отставание замера от долота и реактивный момент, их можно отработать в SlideX."}</p>`;
    $("pg-share").dataset.s = r.s;
    draw();
  };
  const loop = (t) => {
    const dt = Math.min(0.05, (t - lastT) / 1000 || 0); lastT = t;
    if (st.run) {
      st.t += dt; const sub = 4;
      for (let i = 0; i < sub && st.run; i++) step(dt / sub);
      if (st.t >= DUR && st.run) finish();
    }
    draw(); hud();
    if (st.run) raf = requestAnimationFrame(loop);
  };
  const start = () => {
    reset(); st.run = true; $("pg-start").hidden = true; $("pg-res").hidden = true; root.classList.add("on");
    lastT = performance.now(); cancelAnimationFrame(raf);
    const rr = root.getBoundingClientRect(); if (rr.top < 0 || rr.bottom > innerHeight) root.scrollIntoView({ block: innerWidth < 700 ? "start" : "center", behavior: "smooth" }); raf = requestAnimationFrame(loop);
  };
  const hud = () => {
    const s = st.path[st.path.length - 1];
    $("pg-t").textContent = F(Math.max(0, DUR - st.t)) + " с";
    $("pg-inc").textContent = F(st.inc, 1) + "°";
    $("pg-plan").textContent = F(st.plan - st.tvd, 1) + " м";
    $("pg-grv").textContent = F(s.gr) + " API";
    $("pg-grv").className = s.gr < 55 ? "ok" : "";
    $("pg-mode").textContent = slide > 0 ? "Слайд: набор" : slide < 0 ? "Слайд: падение" : "Ротор";
    $("pg-zone").textContent = st.landMd == null ? "—" : F(st.after ? st.inZone / st.after * 100 : 0) + " %";
  };
  const draw = () => {
    if (!st || !W) return;
    const c = col(), narrow = W < 560;
    ctx.clearRect(0, 0, W, H);
    // окно: по горизонтали 320 м (на телефоне 200), по вертикали от −10 до 100 м
    const span = narrow ? 200 : 320, x0 = Math.max(0, st.vs - span * 0.62), sx = W / span;
    const y0 = -6, y1 = 92, sy = (H - 40) / (y1 - y0);
    const X = (vs) => (vs - x0) * sx, Y = (tvd) => 10 + (tvd - y0) * sy;
    // пройденная часть разреза — фактическая геология
    const bx = X(st.vs);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, Math.max(0, bx), H); ctx.clip();
    ctx.fillStyle = pat("sh"); ctx.fillRect(0, 0, W, H);
    ctx.beginPath(); for (let px = 0; px <= W; px += 8) { const v = x0 + px / sx; ctx.lineTo(px, Y(top(v))); } for (let px = W; px >= 0; px -= 8) { const v = x0 + px / sx; ctx.lineTo(px, Y(top(v) + THICK)); }
    ctx.closePath(); ctx.fillStyle = "rgba(240,166,58,.20)"; ctx.fill(); ctx.fillStyle = pat("sd"); ctx.fill();
    ctx.strokeStyle = "rgba(240,166,58,.65)"; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
    // впереди только проект
    const fog = narrow ? "впереди проект" : "впереди только проект"; ctx.font = "11px " + c.mono; if (bx + 12 + ctx.measureText(fog).width < W - 6) { ctx.fillStyle = c.mut; ctx.textAlign = "left"; ctx.fillText(fog, bx + 12, 22); }
    ctx.setLineDash([6, 5]); ctx.strokeStyle = c.mut; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, Y(st.plan)); ctx.lineTo(W, Y(st.plan)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, Y(st.plan + THICK)); ctx.lineTo(W, Y(st.plan + THICK)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = c.mut; ctx.font = "11px " + c.mono; ctx.textAlign = "right";
    ctx.fillText("кровля по проекту", W - 8, Y(st.plan) - 5); ctx.fillText("подошва по проекту", W - 8, Y(st.plan + THICK) + 14);
    // шкала TVD
    ctx.textAlign = "left";
    for (let d = 0; d <= 80; d += 20) { ctx.fillStyle = c.mut; ctx.fillText(String(d), 4, Y(d) + 4); ctx.strokeStyle = "rgba(128,128,128,.12)"; ctx.beginPath(); ctx.moveTo(28, Y(d)); ctx.lineTo(W, Y(d)); ctx.stroke(); }
    // ствол, окрашенный по ГК
    ctx.lineWidth = 3.5; ctx.lineCap = "round";
    for (let i = 1; i < st.path.length; i++) {
      const a = st.path[i - 1], b = st.path[i]; if (X(b.vs) < -10) continue;
      ctx.strokeStyle = b.gr < 55 ? c.amb : "#9aa6b1"; ctx.beginPath(); ctx.moveTo(X(a.vs), Y(a.tvd)); ctx.lineTo(X(b.vs), Y(b.tvd)); ctx.stroke();
    }
    // долото и направление
    const bt = st.path[st.path.length - 1], dx = Math.sin(st.inc * R), dy = Math.cos(st.inc * R);
    ctx.fillStyle = slide ? c.amb : c.ink; ctx.beginPath(); ctx.arc(X(bt.vs), Y(bt.tvd), 5, 0, 7); ctx.fill();
    ctx.strokeStyle = c.ink; ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(X(bt.vs), Y(bt.tvd)); ctx.lineTo(X(bt.vs + dx * 40), Y(bt.tvd + dy * 40)); ctx.stroke(); ctx.setLineDash([]);
    // ГК внизу
    const gh = 22, gy = H - gh - 2;
    ctx.fillStyle = "rgba(128,128,128,.08)"; ctx.fillRect(0, gy, W, gh);
    ctx.strokeStyle = c.amb; ctx.lineWidth = 1.2; ctx.beginPath();
    let f = true; for (const p of st.path) { const px = X(p.vs); if (px < 0) continue; const py = gy + gh - Math.min(1, p.gr / 130) * gh; f ? ctx.moveTo(px, py) : ctx.lineTo(px, py); f = false; } ctx.stroke();
    ctx.fillStyle = c.mut; ctx.fillText("ГК", 4, gy + 14);
  };

  // управление: удержание кнопок, стрелки, W/S
  const hold = (el, v) => {
    let down = false;
    const on = (e) => { e.preventDefault(); if (!st.run) return; down = true; slide = v; el.classList.add("on"); };
    const off = () => { if (!down) return; down = false; if (slide === v) slide = 0; el.classList.remove("on"); };
    el.addEventListener("pointerdown", on); ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => el.addEventListener(ev, off));
    el.addEventListener("contextmenu", (e) => e.preventDefault());
  };
  hold($("pg-up"), 1); hold($("pg-dn"), -1);
  const keys = { ArrowUp: 1, KeyW: 1, ArrowDown: -1, KeyS: -1 };
  addEventListener("keydown", (e) => { if (!(e.code in keys) || !st || !st.run) return; e.preventDefault(); slide = keys[e.code]; });
  addEventListener("keyup", (e) => { if (e.code in keys && slide === keys[e.code]) slide = 0; });
  $("pg-go").addEventListener("click", start); $("pg-again").addEventListener("click", start);
  $("pg-share").addEventListener("click", async (e) => {
    const t = `Посадил горизонталь на ${e.currentTarget.dataset.s} из 100. Попробуй: https://drillharmony.com/play/`;
    try { if (navigator.share) await navigator.share({ text: t }); else { await navigator.clipboard.writeText(t); e.currentTarget.textContent = "Скопировано"; } } catch (err) {}
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden && st && st.run) { st.run = false; cancelAnimationFrame(raf); $("pg-start").hidden = false; $("pg-go").textContent = "Начать заново"; } });
  reset(); $("pg-best").textContent = best() ? "Ваш рекорд: " + best() : "";
  addEventListener("resize", size); new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  size(); hud();
})();
