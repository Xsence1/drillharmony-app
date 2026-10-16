// DrillHarmony · Слайд-шит на одну свечу: сколько слайдить и куда ставить отклонитель,
// чтобы прийти от текущего направления к нужному. Векторный расчёт по дуге окружности.
(() => {
  const root = document.getElementById("ia-ss");
  if (!root || !window.DH3D) return;
  const { view, F: fmt, bindSliders } = DH3D;
  const $ = (s) => root.querySelector(s), v = (id) => +$("#" + id).value, R = Math.PI / 180;
  const norm = (a) => ((a % 360) + 360) % 360;
  const frame = (I, A) => ({
    t: [Math.sin(I * R) * Math.cos(A * R), Math.sin(I * R) * Math.sin(A * R), Math.cos(I * R)],
    h: [Math.cos(I * R) * Math.cos(A * R), Math.cos(I * R) * Math.sin(A * R), -Math.sin(I * R)],
    r: [-Math.sin(A * R), Math.cos(A * R), 0],
  });
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const add = (a, b, k = 1) => a.map((x, i) => x + b[i] * k);
  const toW = (p) => [p[1], p[0], -p[2]];                                       // N,E,Down → экран

  let S = null, prog = 1, playing = false;
  const calc = () => {
    const I1 = v("ss-i1"), A1 = v("ss-a1"), I2 = v("ss-i2"), A2 = v("ss-a2"), cap = v("ss-cap"), L = v("ss-len"), ra = v("ss-ra");
    const f1 = frame(I1, A1), t2 = frame(I2, A2).t;
    const cb = Math.max(-1, Math.min(1, dot(f1.t, t2))), beta = Math.acos(cb) / R;   // нужный поворот, °
    const d = add(t2, f1.t, -cb);
    const tf = beta > 1e-4 ? norm(Math.atan2(dot(d, f1.r), dot(d, f1.h)) / R) : 0;
    const Ls = beta / cap * 30;                                                  // длина слайда, м
    const fit = Ls <= L;
    const slideL = Math.min(Ls, L), rotL = L - slideL;
    // траектория свечи: слайд по дуге (в плоскости t1–направление toolface), потом ротор по прямой
    const n = [Math.cos(tf * R), Math.sin(tf * R)], dir = add(f1.h.map((x) => x * n[0]), f1.r, n[1]);
    const k = cap / 30 * R;                                                      // кривизна, рад/м
    const pts = [[0, 0, 0]];
    let p = [0, 0, 0], t = f1.t;
    for (let s = 0.5; s <= L + 1e-6; s += 0.5) {
      const sl = Math.min(s, slideL);
      t = s <= slideL ? add(f1.t.map((x) => x * Math.cos(k * sl)), dir, Math.sin(k * sl)) : t;
      p = add(p, t, 0.5); pts.push(p.slice());
    }
    const Iend = Math.acos(Math.max(-1, Math.min(1, t[2]))) / R, Aend = norm(Math.atan2(t[1], t[0]) / R);
    S = { I1, A1, I2, A2, beta, tf, set: norm(tf + ra), Ls, slideL, rotL, fit, pts, L, Iend, Aend, ra, cap, dls: beta / L * 30 };
    const o = (id, x) => ($("#" + id).textContent = x);
    o("ss-o-set", fmt(S.set, 0)); o("ss-o-tf", fmt(tf, 0)); o("ss-o-ls", fmt(slideL, 1)); o("ss-o-rot", fmt(rotL, 1));
    o("ss-o-pct", fmt(slideL / L * 100, 0)); o("ss-o-dls", fmt(S.dls, 2)); o("ss-o-ie", fmt(Iend, 2)); o("ss-o-ae", fmt(Aend, 2));
    $("#ss-o-ls").parentElement.classList.toggle("warn", !fit);
    $("#ss-msg").textContent = !fit
      ? "За одну свечу не успеть: нужно " + fmt(Ls, 1) + " м слайда при способности компоновки " + fmt(cap, 1) + "°/30 м. Слайдите всю свечу и продолжите на следующей или пересмотрите цель."
      : beta < 0.05 ? "Направление уже совпадает с нужным, бурите ротором."
      : "Выставьте отклонитель на " + fmt(S.set, 0) + "° (" + fmt(tf, 0) + "° с упреждением " + fmt(ra, 0) + "° на реактивный момент), слайд " + fmt(slideL, 1) + " м, затем " + fmt(rotL, 1) + " м ротором.";
    drawBar(); tv.invalidate();
  };
  let viewSet = false;

  // полоса свечи: слайд и ротор
  const drawBar = () => {
    const b = $("#ss-bar");
    b.innerHTML = `<span class="sl" style="width:${(S.slideL / S.L * 100).toFixed(1)}%">слайд ${fmt(S.slideL, 1)} м · TF ${fmt(S.set, 0)}°</span><span class="ro">ротор ${fmt(S.rotL, 1)} м</span><i style="left:${(prog * 100).toFixed(1)}%"></i>`;
  };

  // 3D
  const tv = view($("#ss-cv"), { radius: 22, pitch: 0.35, yaw: -1.0, auto: false });
  // отклонение за свечу — доли метра, поэтому боковой сдвиг показываем увеличенным
  const EX = 8;
  const exag = (p, t1) => { const a = dot(p, t1); return add(t1.map((x) => x * a), add(p, t1, -a), EX); };
  tv.render = (t) => {
    if (!S) return;
    const c = t.c, f1 = frame(S.I1, S.A1), L = S.L;
    const P0 = S.pts; S.pts = P0.map((p) => exag(p, f1.t));
    t.target = toW(S.pts[Math.floor(S.pts.length / 2)]); t.radius = L * 0.75;
    t.line([toW(f1.t.map((x) => -x * L * 0.6)), [0, 0, 0]], { color: c.mut, width: 5, alpha: 0.6 });               // пробуренный ствол
    t.line([[0, 0, 0], toW(f1.t.map((x) => x * L))], { color: c.mut, width: 1.2, dash: [4, 4] });                    // если бурить ротором
    t.label(toW(f1.t.map((x) => x * L)), "без слайда", c.mut, 6, 4, "11px " + c.mono);
    const t2 = exag(frame(S.I2, S.A2).t, f1.t);
    t.arrow(toW(S.pts[S.pts.length - 1]), toW(add(S.pts[S.pts.length - 1], t2, L * 0.35)), { color: c.ok, width: 2, dash: [5, 4] });
    if (t.W >= 560) t.label(toW(add(S.pts[S.pts.length - 1], t2, L * 0.35)), "нужное направление", c.ok, 8, -10, "11px " + c.mono);
    const nSl = Math.round(S.slideL / 0.5), upto = Math.round(prog * (S.pts.length - 1));
    const done = S.pts.slice(0, upto + 1);
    t.line(S.pts.slice(0, nSl + 1).map(toW), { color: c.amb, width: 2, alpha: 0.35 });
    t.line(S.pts.slice(nSl).map(toW), { color: c.cy, width: 2, alpha: 0.35 });
    t.line(done.slice(0, Math.min(done.length, nSl + 1)).map(toW), { color: c.amb, width: 5 });
    if (done.length > nSl + 1) t.line(done.slice(nSl).map(toW), { color: c.cy, width: 5 });
    const bit = toW(S.pts[upto]); t.dot(bit, 6, c.ink);
    // циферблат отклонителя в начале свечи
    const g = L * 0.12; t.ring([0, 0, 0], toW(f1.h), toW(f1.r), g, g, { color: c.ink, width: 1.2, alpha: 0.7 });
    const m = add(f1.h.map((x) => x * Math.cos(S.tf * R)), f1.r, Math.sin(S.tf * R));
    t.arrow([0, 0, 0], toW(m.map((x) => x * g)), { color: c.amb, width: 3, head: 7 });
    t.label(toW(f1.h.map((x) => x * g * 1.3)), "верх", c.mut, -12, 0, "600 11px " + c.mono);
    t.text(12, t.H - 12, t.W < 560 ? "оранжевое слайд, голубое ротор" : "оранжевое слайд, голубое ротор · боковой сдвиг ×" + EX, c.mut);
    S.pts = P0;
  };
  const play = () => {
    prog = 0; playing = true; const t0 = performance.now();
    tv.anim = () => { prog = Math.min(1, (performance.now() - t0) / 3500); drawBar(); if (prog >= 1) { tv.anim = null; playing = false; } };
  };
  $("#ss-go").onclick = play;
  bindSliders(root, () => { prog = 1; calc(); });
  calc();
})();
