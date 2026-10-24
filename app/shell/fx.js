// DrillHarmony · эффекты интерфейса: переходы между экранами, стеклянный фон, 3D-наклон, счёт цифр,
// 3D-сцена буровой на главном экране и панель ввода над клавиатурой (ползунок, ±, «Далее»).
// Всё отключается в «Ещё» → «Анимации» и при системной настройке «уменьшить движение».
(() => {
  const D = document.documentElement, ls = (window.dhApp || {}).ls;
  const fxOn = () => { try { const v = localStorage.getItem("dh-fx"); if (v != null) return v !== "0"; } catch (e) {} return !matchMedia("(prefers-reduced-motion: reduce)").matches; };
  D.classList.toggle("fx", fxOn());
  window.dhFx = { on: fxOn, set(v) { try { localStorage.setItem("dh-fx", v ? "1" : "0"); } catch (e) {} D.classList.toggle("fx", v); } };
  const tick = (ms = 8) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };
  window.dhFx.tick = tick;

  // ---------- переходы между экранами ----------
  const leave = (go) => { if (!D.classList.contains("fx")) return go(); D.classList.add("leaving"); setTimeout(go, 150); };
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button) return;
    const a = e.target.closest("a[href]");
    if (!a || a.target || a.hasAttribute("download") || a.classList.contains("ext") || a.hasAttribute("data-inapp") || a.hasAttribute("data-back")) return;
    const u = new URL(a.href, location.href);
    if (u.origin !== location.origin || (u.pathname === location.pathname && u.hash)) return;
    e.preventDefault(); tick(6); leave(() => { location.href = u.href; });
  });
  window.addEventListener("pageshow", () => D.classList.remove("leaving"));

  document.addEventListener("DOMContentLoaded", () => {
    // живой фон: два мягких пятна света за стеклом
    if (!document.querySelector(".aurora")) { const a = document.createElement("div"); a.className = "aurora"; a.setAttribute("aria-hidden", "true"); a.innerHTML = "<i></i><i></i><i></i>"; document.body.prepend(a); }
    // назад — тоже с переходом
    document.querySelectorAll("[data-back]").forEach((b) => b.addEventListener("click", () => D.classList.add("leaving"), true));

    // ---------- 3D-наклон стеклянных карточек под пальцем ----------
    const TILT = ".tile, .tile2, .it, .slide, .chip, .btn, .actbar button, .he a, .sc, .cb, .qc, .cbtn, .game-b, .wcard";
    let cur = null;
    document.addEventListener("pointerdown", (e) => {
      const el = e.target.closest(TILT); if (!el || !D.classList.contains("fx")) return;
      cur = el; const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty("--rx", (-y * 10).toFixed(1) + "deg"); el.style.setProperty("--ry", (x * 12).toFixed(1) + "deg");
      el.style.setProperty("--mx", ((x + 0.5) * 100).toFixed(0) + "%"); el.style.setProperty("--my", ((y + 0.5) * 100).toFixed(0) + "%");
      el.classList.add("pressed");
    }, { passive: true });
    // круг от точки касания на кнопках и строках
    document.addEventListener("pointerdown", (e) => {
      const el = e.target.closest(".prow, .wcard, .lrow, .rc, .sbtn, .cb, .qc, .cbtn, .st-h, .r, .btn, .row, .act-pri, .game-b, .tabs button, .actbar button"); if (!el || !D.classList.contains("fx")) return;
      const r = el.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2.2, rp = document.createElement("i"); rp.className = "rip";
      rp.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
      if (getComputedStyle(el).position === "static") el.style.position = "relative"; el.style.overflow = "hidden"; el.appendChild(rp); setTimeout(() => rp.remove(), 650);
    }, { passive: true });
    const up = () => { if (cur) { cur.classList.remove("pressed"); cur = null; } };
    ["pointerup", "pointercancel", "pointerleave", "scroll"].forEach((ev) => document.addEventListener(ev, up, { passive: true, capture: true }));

    // ---------- цифры результата «докручиваются» до нового значения ----------
    const num = (s) => { const m = /^([−-]?)(\d[\d\s]*)(?:,(\d+))?$/.exec(String(s).trim()); return m ? { v: (m[1] ? -1 : 1) * parseFloat(m[2].replace(/\s/g, "") + "." + (m[3] || "0")), d: (m[3] || "").length } : null; };
    const fmt = (v, d) => (v < 0 ? "−" : "") + Math.abs(v).toFixed(d).replace(".", ",");
    document.querySelectorAll(".calc .co > b").forEach((b) => {
      let last = num(b.textContent), busy = false, raf = 0;
      new MutationObserver(() => {
        if (busy) return;
        if (window.__dhSamp) { last = num(b.textContent); return; }   /* прогон для графика: без вспышек и докрутки */
        const txt = b.textContent, n = num(txt), co = b.parentElement;
        co.classList.remove("flash"); void co.offsetWidth; co.classList.add("flash");
        if (!D.classList.contains("fx") || !n || !last || n.v === last.v) { last = n; return; }
        const from = last.v, to = n.v, t0 = performance.now(), dur = 260; last = n;
        cancelAnimationFrame(raf);
        const step = (t) => {
          const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
          busy = true; b.textContent = k < 1 ? fmt(from + (to - from) * e, n.d) : txt; busy = false;
          if (k < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      }).observe(b, { childList: true, characterData: true, subtree: true });
    });

    hero();
    keypad();
  });

  // ---------- 3D-сцена: вышка, пласты, ствол с долотом, снег ----------
  function hero() {
    const cv = document.getElementById("hero3d"); if (!cv) return;
    const g = cv.getContext("2d"); let W = 0, H = 0, dpr = 1, rot = 0.6, drag = null, vis = true, t0 = performance.now();
    const css = (n) => getComputedStyle(D).getPropertyValue(n).trim();
    const size = () => { dpr = Math.min(2, window.devicePixelRatio || 1); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; };
    size(); addEventListener("resize", size);
    // ствол: вертикаль, набор, горизонталь в пласте (условные метры сцены)
    const pts = [[0, 0, 0]]; let x = 0, y = 0, z = 0;
    for (let i = 1; i <= 80; i++) { const s = i / 80, inc = Math.min(88, Math.max(0, (s - 0.3) / 0.38 * 88)) * Math.PI / 180, az = 0.5;
      const L = 2.4; x += L * Math.sin(inc) * Math.cos(az); z += L * Math.sin(inc) * Math.sin(az); y -= L * Math.cos(inc); pts.push([x, y, z]); }
    const flakes = Array.from({ length: 70 }, () => [Math.random() * 160 - 80, Math.random() * 90, Math.random() * 160 - 80, 0.3 + Math.random() * 0.7]);
    const P = (p, cx, cy, sc) => {      // поворот вокруг вертикали, наклон камеры, перспектива
      const c = Math.cos(rot), s = Math.sin(rot); let X = p[0] * c - p[2] * s, Z = p[0] * s + p[2] * c, Y = p[1];
      const ct = Math.cos(0.42), st = Math.sin(0.42); const Y2 = Y * ct - Z * st, Z2 = Y * st + Z * ct;
      const f = 230 / (230 + Z2); return [cx + X * sc * f, cy - Y2 * sc * f, f];
    };
    cv.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, r: rot }; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener("pointermove", (e) => { if (drag) rot = drag.r + (e.clientX - drag.x) / 90; });
    cv.addEventListener("pointerup", () => { drag = null; }); cv.addEventListener("pointercancel", () => { drag = null; });
    if ("IntersectionObserver" in window) new IntersectionObserver((en) => { vis = en[0].isIntersecting; }).observe(cv);
    const frame = (now) => {
      requestAnimationFrame(frame);
      if (!vis || document.hidden || !W) return;
      const t = (now - t0) / 1000, fx = D.classList.contains("fx"); if (fx && !drag) rot += 0.0035;
      const amb = css("--amber") || "#f2a541", teal = css("--teal") || "#4cc9b0", ink = css("--ink") || "#fff", light = D.dataset.theme === "light";
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
      const cx = cv.dataset.cx ? +cv.dataset.cx : W * 0.62, cy = cv.dataset.cx ? H * 0.42 : H * 0.3, sc = cv.dataset.cx ? H / 120 : Math.min(W, H * 2) / 190;
      // пласты: полупрозрачные плиты
      const layer = (y, col, a) => { const q = [[-70, y, -70], [70, y, -70], [70, y, 70], [-70, y, 70]].map((p) => P(p, cx, cy, sc));
        g.beginPath(); q.forEach(([X, Y], i) => (i ? g.lineTo(X, Y) : g.moveTo(X, Y))); g.closePath(); g.fillStyle = col; g.globalAlpha = a; g.fill(); g.globalAlpha = 1; };
      layer(0, light ? "#9fb3c4" : "#2a3a48", 0.35); layer(-58, light ? "#c9a66b" : "#5a4524", 0.22); layer(-66, amb, 0.16); layer(-74, light ? "#c9a66b" : "#5a4524", 0.22);
      // сетка земли
      g.strokeStyle = ink; g.globalAlpha = 0.08; g.lineWidth = 1;
      for (let i = -70; i <= 70; i += 14) { let a = P([i, 0, -70], cx, cy, sc), b = P([i, 0, 70], cx, cy, sc); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
        a = P([-70, 0, i], cx, cy, sc); b = P([70, 0, i], cx, cy, sc); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
      g.globalAlpha = 1;
      // вышка: решётчатая ферма
      const tw = (h, w) => [[-w, h, -w], [w, h, -w], [w, h, w], [-w, h, w]];
      const lv = [0, 8, 16, 24, 32, 40].map((h) => tw(h, 6 - h * 0.11));
      g.strokeStyle = amb; g.lineWidth = 1.2;
      for (let k = 0; k < lv.length; k++) for (let i = 0; i < 4; i++) {
        const a = P(lv[k][i], cx, cy, sc), b = P(lv[k][(i + 1) % 4], cx, cy, sc); g.globalAlpha = 0.85; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
        if (k < lv.length - 1) { const c = P(lv[k + 1][i], cx, cy, sc), d = P(lv[k + 1][(i + 1) % 4], cx, cy, sc);
          g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(c[0], c[1]); g.stroke(); g.globalAlpha = 0.35; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(d[0], d[1]); g.stroke(); } }
      g.globalAlpha = 1;
      // огонь на кронблоке
      const top = P([0, 41, 0], cx, cy, sc), bl = 0.6 + 0.4 * Math.sin(t * 3);
      const gr = g.createRadialGradient(top[0], top[1], 0, top[0], top[1], 14); gr.addColorStop(0, "rgba(255,90,60," + (0.9 * bl) + ")"); gr.addColorStop(1, "rgba(255,90,60,0)");
      g.fillStyle = gr; g.beginPath(); g.arc(top[0], top[1], 14, 0, 7); g.fill();
      // ствол со свечением и долото, бегущее по стволу
      const sp = pts.map((p) => P(p, cx, cy, sc));
      g.lineCap = "round"; g.strokeStyle = teal; g.lineWidth = 5; g.globalAlpha = 0.18; g.beginPath(); sp.forEach(([X, Y], i) => (i ? g.lineTo(X, Y) : g.moveTo(X, Y))); g.stroke();
      g.lineWidth = 2; g.globalAlpha = 1; g.beginPath(); sp.forEach(([X, Y], i) => (i ? g.lineTo(X, Y) : g.moveTo(X, Y))); g.stroke();
      const k = fx ? (((t * 0.12) % 1) + 1) % 1 : 1, bi = Math.max(0, Math.min(sp.length - 1, Math.floor(k * (sp.length - 1)))), bp = sp[bi];
      const gb = g.createRadialGradient(bp[0], bp[1], 0, bp[0], bp[1], 10); gb.addColorStop(0, amb); gb.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gb; g.beginPath(); g.arc(bp[0], bp[1], 10, 0, 7); g.fill(); g.fillStyle = amb; g.beginPath(); g.arc(bp[0], bp[1], 2.6, 0, 7); g.fill();
      // снег
      if (fx) { g.fillStyle = light ? "#7d8fa0" : "#dfe8ef";
        flakes.forEach((f) => { f[1] -= 0.18 * f[3]; f[0] += Math.sin(t + f[3] * 9) * 0.05; if (f[1] < 0) f[1] = 90; const q = P(f, cx, cy, sc); g.globalAlpha = 0.5 * f[3] * q[2]; g.beginPath(); g.arc(q[0], q[1], 1.3 * q[2], 0, 7); g.fill(); });
        g.globalAlpha = 1; }
    };
    requestAnimationFrame(frame);
  }

  // ---------- панель над клавиатурой: ползунок, −/+, «Далее» ----------
  function keypad() {
    const fields = [...document.querySelectorAll(".calc .ci input, .pf-grid input")];
    const bar = document.createElement("div"); bar.className = "kpad"; bar.hidden = true;
    bar.innerHTML = '<div class="ks" hidden><div class="ks-h"><span class="ks-t"></span><b class="ks-v"></b></div><canvas class="ks-c" aria-hidden="true"></canvas><p class="ks-n" hidden>Этот параметр на результат не влияет</p></div>' +
      '<div class="kp-row"><button type="button" data-k="-" aria-label="Меньше">−</button><div class="kp-track" role="slider" aria-label="Ползунок значения"><i class="kp-fill"></i><b class="kp-thumb"></b><span class="kp-val"></span></div><button type="button" data-k="+" aria-label="Больше">+</button>' +
      '<button type="button" class="kp-g" data-k="sens" aria-label="График" aria-pressed="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h18"/><path d="M4 16c3-1 4-9 8-9s5 6 8 4"/></svg></button><button type="button" class="kp-next" data-k="next">Далее</button></div>';
    document.body.appendChild(bar);
    let inp = null, rng = null;
    const parse = (v) => { const t = String(v).replace(",", ".").replace(/\s/g, ""); return t === "" ? NaN : +t; };
    const decs = (s) => { const m = /[.,](\d+)/.exec(String(s)); return m ? Math.min(4, m[1].length) : 0; };
    const range = (i) => {                // разумный диапазон по единице и подписи поля
      const lab = i.closest("label"), u = (lab && lab.dataset.u) || "", name = ((lab && lab.querySelector("span")) || {}).textContent || "";
      const v = parse(i.value), d0 = parse(i.dataset.def != null ? i.dataset.def : i.value), base = Math.max(Math.abs(isFinite(v) ? v : 0), Math.abs(isFinite(d0) ? d0 : 0)) || 1;
      const d = Math.max(decs(i.dataset.def || ""), decs(i.value));
      let lo = 0, hi = base * 2.5;
      if (/^°$/.test(u) && /азимут|toolface|поправка/i.test(name)) { lo = /поправка/i.test(name) ? -30 : 0; hi = /поправка/i.test(name) ? 30 : 360; }
      else if (/^°$/.test(u) && /зенит|наклон|dip/i.test(name)) { lo = 0; hi = /dip/i.test(name) ? 90 : 120; }
      else if (/^%/.test(u)) { lo = 0; hi = Math.max(100, base * 1.5); }
      else if (/г\/см³/.test(u)) { lo = 0.8; hi = Math.max(2.6, base * 1.3); }
      if (isFinite(v) && v < lo) lo = v; if (isFinite(v) && v > hi) hi = v;
      const st = Math.pow(10, -d) * (hi - lo > 2000 && d === 0 ? 10 : 1);
      return { lo, hi, st, d };
    };
    const put = (val) => {
      const r = rng; let v = Math.round(Math.min(r.hi, Math.max(r.lo, val)) / r.st) * r.st;
      inp.value = v.toFixed(r.d).replace(".", ",");
      const ev = new Event("input", { bubbles: true }); ev.dhUser = true; inp.dispatchEvent(ev); draw(); sdraw();
    };
    /* ---- график чувствительности: как главный результат зависит от параметра в фокусе ---- */
    const ks = bar.querySelector(".ks"), kc = bar.querySelector(".ks-c"), kg = bar.querySelector(".kp-g");
    let sOn = true; try { sOn = localStorage.getItem("dh-sens") !== "0"; } catch (e) {}
    let tgt = null, pts = null;
    const rnum = (t) => { const x = String(t || "").replace(/−/g, "-").replace(/[\s\u00a0\u202f]/g, "").replace(",", "."); return /^-?\d+(\.\d+)?$/.test(x) ? +x : NaN; };
    const outs = () => [...document.querySelectorAll(".calc .cout .co")].filter((c) => c.offsetParent && c.querySelector(":scope > b"));
    const pick = () => { const o = outs().filter((c) => isFinite(rnum(c.querySelector(":scope > b").textContent)));
      return (tgt && o.includes(tgt)) ? tgt : o.find((c) => c.classList.contains("key")) || o[0] || null; };
    const sample = () => {
      pts = null; if (!inp || !inp.closest(".calc")) return; const co = pick(); if (!co) return; tgt = co;
      const b = co.querySelector(":scope > b"), keep = inp.value, N = 48, r = rng; window.__dhSamp = true;
      pts = [];
      for (let j = 0; j <= N; j++) { const x = r.lo + (r.hi - r.lo) * j / N; inp.value = String(+x.toFixed(6)).replace(".", ",");
        inp.dispatchEvent(new Event("input", { bubbles: true })); pts.push([x, rnum(b.textContent)]); }
      inp.value = keep; inp.dispatchEvent(new Event("input", { bubbles: true }));
      setTimeout(() => { window.__dhSamp = false; }, 0);
      document.querySelectorAll(".calc .co.ks-on").forEach((c) => c.classList.remove("ks-on")); co.classList.add("ks-on");
    };
    const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    const sdraw = () => {
      const show = sOn && !!pts && pts.filter((p) => isFinite(p[1])).length > 2;
      ks.hidden = !show; document.body.classList.toggle("ks-show", show); kg.hidden = !inp || !inp.closest(".calc") || !pts; kg.setAttribute("aria-pressed", String(sOn));
      if (!show) return;
      const co = tgt, b = co.querySelector(":scope > b"), u = ((co.querySelector(":scope > small") || {}).textContent || "").split(" ")[0];
      ks.querySelector(".ks-t").textContent = co.querySelector(":scope > span").textContent + (u ? ", " + u : "");
      ks.querySelector(".ks-v").textContent = b.textContent;
      const W = kc.clientWidth, H = kc.clientHeight, dpr = Math.min(3, devicePixelRatio || 1);
      if (kc.width !== Math.round(W * dpr) || kc.height !== Math.round(H * dpr)) { kc.width = Math.round(W * dpr); kc.height = Math.round(H * dpr); }
      const g = kc.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
      const ys = pts.map((p) => p[1]).filter(isFinite); let y0 = Math.min(...ys), y1 = Math.max(...ys);
      const flat = y1 - y0 <= Math.abs(y1) * 1e-6 + 1e-12; const kn = ks.querySelector(".ks-n"); kn.hidden = !flat; kn.textContent = outs().length > 1 ? "На этот результат не влияет. Нажмите другой результат вверху" : "Этот параметр на результат не влияет"; kc.style.opacity = flat ? ".35" : "1";
      if (flat) { y0 -= 1; y1 += 1; } const pad = (y1 - y0) * 0.12; y0 -= pad; y1 += pad;
      const L = 4, R = W - 4, T = 6, B = H - 16;
      const X = (x) => L + (R - L) * (x - rng.lo) / (rng.hi - rng.lo || 1), Y = (y) => B - (B - T) * (y - y0) / (y1 - y0 || 1);
      const ac = css("--amber") || "#f5a524", mu = css("--muted") || "#9fb0b6", ln = css("--line") || "#1f3038";
      g.strokeStyle = ln; g.lineWidth = 1; g.beginPath(); for (let k = 1; k < 4; k++) { const yy = T + (B - T) * k / 4; g.moveTo(L, yy); g.lineTo(R, yy); } g.stroke();
      const seg = []; let cur = []; pts.forEach((p) => { if (isFinite(p[1])) cur.push(p); else if (cur.length) { seg.push(cur); cur = []; } }); if (cur.length) seg.push(cur);
      seg.forEach((sg) => {
        const gr = g.createLinearGradient(0, T, 0, B); gr.addColorStop(0, ac + "55"); gr.addColorStop(1, ac + "00");
        g.beginPath(); sg.forEach((p, i) => (i ? g.lineTo : g.moveTo).call(g, X(p[0]), Y(p[1]))); g.lineTo(X(sg[sg.length - 1][0]), B); g.lineTo(X(sg[0][0]), B); g.closePath(); g.fillStyle = gr; g.fill();
        g.beginPath(); sg.forEach((p, i) => (i ? g.lineTo : g.moveTo).call(g, X(p[0]), Y(p[1]))); g.strokeStyle = ac; g.lineWidth = 2; g.lineJoin = "round"; g.stroke();
      });
      const xv = parse(inp.value), yv = rnum(b.textContent);
      g.font = "600 10px " + (css("--mono") || "monospace"); g.fillStyle = mu; g.textBaseline = "alphabetic";
      const fx2 = (v) => String(+v.toFixed(rng.d)).replace(".", ",");
      g.textAlign = "left"; g.fillText(fx2(rng.lo), L, H - 3); g.textAlign = "right"; g.fillText(fx2(rng.hi), R, H - 3);
      if (isFinite(xv) && xv >= rng.lo && xv <= rng.hi) {
        const cx = X(xv); g.strokeStyle = mu; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(cx, T); g.lineTo(cx, B); g.stroke(); g.setLineDash([]);
        if (isFinite(yv) && !flat) { const cy = Math.max(T, Math.min(B, Y(yv))); g.shadowColor = ac; g.shadowBlur = 10; g.fillStyle = ac; g.beginPath(); g.arc(cx, cy, 4.5, 0, 7); g.fill(); g.shadowBlur = 0;
          g.fillStyle = css("--bg") || "#080d10"; g.beginPath(); g.arc(cx, cy, 2, 0, 7); g.fill(); }
      }
    };
    let cdrag = false;
    const cat = (e) => { const r = kc.getBoundingClientRect(); put(rng.lo + (rng.hi - rng.lo) * Math.max(0, Math.min(1, (e.clientX - r.left - 4) / (r.width - 8)))); };
    kc.addEventListener("pointerdown", (e) => { if (!inp) return; cdrag = true; kc.setPointerCapture(e.pointerId); cat(e); });
    kc.addEventListener("pointermove", (e) => { if (cdrag) cat(e); });
    kc.addEventListener("pointerup", () => { cdrag = false; tick(5); }); kc.addEventListener("pointercancel", () => { cdrag = false; });
    /* нажатие на карточку результата при открытом графике выбирает, что рисовать; фокус и клавиатура остаются */
    const cout = document.querySelector(".calc .cout");
    if (cout) {
      cout.addEventListener("pointerdown", (e) => { if (!document.body.classList.contains("kp-on") || ks.hidden) return; e.preventDefault(); });
      cout.addEventListener("click", (e) => { const c = e.target.closest(".co"); if (!c || !document.body.classList.contains("kp-on") || ks.hidden) return;
        if (!isFinite(rnum((c.querySelector(":scope > b") || {}).textContent))) return; tgt = c; sample(); sdraw(); tick(4); });
    }
    const draw = () => {
      if (!inp) return; const v = parse(inp.value), k = isFinite(v) ? (v - rng.lo) / (rng.hi - rng.lo || 1) : 0;
      bar.style.setProperty("--k", Math.max(0, Math.min(1, k)).toFixed(4));
      const lab = inp.closest("label"); bar.querySelector(".kp-val").textContent = (inp.value || "—") + (lab && lab.dataset.u ? " " + lab.dataset.u.split(",")[0] : "");
    };
    const place = () => {
      const vv = window.visualViewport; if (!vv || bar.hidden) return;
      bar.style.transform = `translateY(${-(innerHeight - vv.height - vv.offsetTop)}px)`;
      requestAnimationFrame(() => { if (!inp || bar.hidden) return;      /* поле не должно прятаться под панелью с графиком */
        const top = bar.getBoundingClientRect().top, r = inp.getBoundingClientRect(), lab = inp.closest("label"), rt = lab ? lab.getBoundingClientRect().top : r.top;
        if (r.bottom > top - 8) window.scrollBy({ top: r.bottom - top + 14, behavior: "smooth" }); else { const ab = document.querySelector(".abar"), hb = ab ? ab.getBoundingClientRect().bottom : 0; if (rt < hb + 8) window.scrollBy({ top: rt - hb - 12, behavior: "smooth" }); } });
    };
    if (window.visualViewport) { visualViewport.addEventListener("resize", place); visualViewport.addEventListener("scroll", place); }
    const vis = () => fields.filter((f) => !f.closest("label[hidden]") && f.offsetParent);
    fields.forEach((f) => {
      f.addEventListener("focus", () => { inp = f; rng = range(f); bar.hidden = false; document.body.classList.add("kp-on"); draw(); sample(); sdraw(); place();
        bar.querySelector(".kp-next").textContent = vis().indexOf(f) < vis().length - 1 ? "Далее" : "Готово"; });
      f.addEventListener("blur", () => setTimeout(() => { if (document.activeElement !== inp) { bar.hidden = true; document.body.classList.remove("kp-on", "ks-show"); document.querySelectorAll(".calc .co.ks-on").forEach((c) => c.classList.remove("ks-on")); } }, 120));
      f.addEventListener("input", () => { const lab = f.closest("label"); if (!lab) return; const v = f.value.trim();
        const bad = v !== "" && !isFinite(parse(v)); lab.classList.toggle("bad", bad); if (bad) { lab.classList.remove("shake"); void lab.offsetWidth; lab.classList.add("shake"); }
        lab.classList.toggle("chg", f.dataset.def != null && f.value !== f.dataset.def); if (f === inp && !window.__dhSamp) { draw(); sdraw(); } });
      const lab = f.closest("label"); if (lab && f.dataset.def != null) lab.classList.toggle("chg", f.value !== f.dataset.def);
    });
    // кнопки панели не забирают фокус у поля, клавиатура остаётся
    bar.addEventListener("pointerdown", (e) => e.preventDefault());
    let rep = 0;
    const bump = (s) => { if (!inp) return; const v = parse(inp.value); put((isFinite(v) ? v : rng.lo) + s * rng.st); tick(4); };
    bar.querySelectorAll("[data-k]").forEach((b) => {
      const k = b.dataset.k;
      if (k === "sens") return b.addEventListener("click", () => { sOn = !sOn; try { localStorage.setItem("dh-sens", sOn ? "1" : "0"); } catch (e) {} if (sOn && !pts) sample(); sdraw(); place(); tick(4); });
      if (k === "next") return b.addEventListener("click", () => { const v = vis(), n = v.indexOf(inp); n >= 0 && n < v.length - 1 ? v[n + 1].focus() : inp && inp.blur(); tick(6); });
      const s = k === "+" ? 1 : -1;
      b.addEventListener("pointerdown", () => { bump(s); let d = 380; const go = () => { bump(s); d = Math.max(40, d * 0.8); rep = setTimeout(go, d); }; rep = setTimeout(go, d); });
      ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => b.addEventListener(ev, () => clearTimeout(rep)));
    });
    const tr = bar.querySelector(".kp-track"); let tdrag = false;
    const at = (e) => { const r = tr.getBoundingClientRect(); put(rng.lo + (rng.hi - rng.lo) * Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))); };
    tr.addEventListener("pointerdown", (e) => { if (!inp) return; tdrag = true; tr.setPointerCapture(e.pointerId); at(e); });
    tr.addEventListener("pointermove", (e) => { if (tdrag) at(e); });
    tr.addEventListener("pointerup", () => { tdrag = false; tick(5); }); tr.addEventListener("pointercancel", () => { tdrag = false; });
  }
})();
