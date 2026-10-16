// DrillHarmony · Новые калькуляторы: MSE, гидравлика долота, посадка на цель, ВЗД, вес на крюке («метла»).
// Один файл на все пять: расчёт выбирается по атрибуту data-calc у блока .calc.
// Зависит от общих N() и F() (518f08db58.js).
(() => {
  const box = document.querySelector(".calc[data-calc]");
  if (!box || window.dhOK === false) return;
  const kind = box.dataset.calc, set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  const g = 9.80665, R = Math.PI / 180;
  const C = {};

  // ---------- MSE (Teale): MSE = WOB/A + 2π·N·T/(A·ROP) ----------
  C.mse = () => {
    const D = N("d") / 1000, wob = N("wob") * 1000 * g, rpm = N("rpm"), T = N("tq") * 1000, rop = N("rop") / 3600, ucs = N("ucs");
    const ok = D > 0 && wob >= 0 && rpm >= 0 && T >= 0 && rop > 0, A = Math.PI / 4 * D * D;
    const ax = wob / A / 1e6, rot = 2 * Math.PI * (rpm / 60) * T / (A * rop) / 1e6, mse = ax + rot;
    const eff = ucs > 0 ? ucs / mse * 100 : NaN;
    set("o_mse", ok ? F(mse, 0) : "—"); set("o_ax", ok ? F(ax, 1) : "—"); set("o_rot", ok ? F(rot, 0) : "—");
    set("o_share", ok ? F(rot / mse * 100, 0) : "—"); set("o_eff", ok && isFinite(eff) ? F(Math.min(eff, 100), 0) : "—");
    set("o_v", !ok ? "—" : !(ucs > 0) ? "задайте прочность породы" : eff >= 25 ? "долото работает эффективно" : eff >= 12 ? "есть потери: проверьте режим" : "мало: энергия уходит не в разрушение породы");
  };

  // ---------- гидравлика долота ----------
  C.bith = () => {
    const q = N("q") / 1000, rho = N("rho") * 1000, D = N("d") / 1000, n1 = N("n1"), d1 = N("d1"), n2 = N("n2"), d2 = N("d2"), cd = 0.95;
    const a32 = (n, d) => (n > 0 && d > 0 ? n * Math.PI / 4 * Math.pow(d / 32 * 0.0254, 2) : 0);
    const A = a32(n1, d1) + a32(n2, d2), ok = A > 0 && q > 0 && rho > 0;
    const v = q / A, dp = rho * v * v / (2 * cd * cd), P = dp * q, Abit = Math.PI / 4 * D * D;
    const hsi = (P / 745.7) / (Abit / 0.00064516), F_ = rho * q * v * cd;
    set("o_tfa", ok ? F(A * 1e6, 0) : "—"); set("o_tfai", ok ? F(A / 0.00064516, 3) : "—"); set("o_v", ok ? F(v, 1) : "—");
    set("o_dp", ok ? F(dp / 1e6, 2) : "—"); set("o_hsi", ok && D > 0 ? F(hsi, 2) : "—"); set("o_kw", ok ? F(P / 1000, 0) : "—"); set("o_if", ok ? F(F_ / 1000, 2) : "—");
    set("o_vv", !ok ? "—" : v < 60 ? "мало: струя слабая, долото может сальниковать" : v > 140 ? "много: проверьте износ насадок и давление насосов" : "в обычном диапазоне");
  };

  // ---------- посадка на цель: набор с постоянной интенсивностью ----------
  C.land = () => {
    const i1 = N("i1"), i2 = N("i2"), dtvd = N("dtvd"), cap = N("cap"), unc = N("unc");
    const ok = i2 > i1 && i1 >= 0 && i2 <= 100 && dtvd > 0 && cap > 0;
    const s = (a) => Math.sin(a * R), c = (a) => Math.cos(a * R), K = 30 * 180 / Math.PI;   // R = K / DLS
    const need = K * (s(i2) - s(i1)) / dtvd;                                              // °/30 м, чтобы сесть сразу
    const Rr = K / cap, arcV = Rr * (s(i2) - s(i1)), hold = (dtvd - arcV) / Math.max(1e-6, c(i1));
    const arcL = (i2 - i1) / cap * 30, md = arcL + Math.max(0, hold);
    const hi = K * (s(i2) - s(i1)) / Math.max(1, dtvd - unc), lo = K * (s(i2) - s(i1)) / (dtvd + unc);
    set("o_need", ok ? F(need, 2) : "—"); set("o_hold", ok ? (hold >= 0 ? F(hold, 1) : "—") : "—"); set("o_md", ok && hold >= 0 ? F(md, 1) : "—");
    set("o_hi", ok ? F(hi, 2) : "—"); set("o_lo", ok ? F(lo, 2) : "—");
    set("o_hd", ok && hold >= 0 ? F(Math.max(0, hold) * s(i1) + Rr * (c(i1) - c(i2)), 1) : "—");
    set("o_v", !ok ? "—" : need > cap ? "не хватит: нужно " + F(need, 2) + "°/30 м, компоновка даёт " + F(cap, 2) : hi > cap ? "впритык: если кровля выше на " + F(unc, 1) + " м, не хватит" : "есть запас: держите зенит " + F(Math.max(0, hold), 1) + " м, потом набор");
  };

  // ---------- ВЗД: момент и обороты по перепаду ----------
  C.motor = () => {
    const dp0 = N("dp0"), dp = N("dp"), dmax = N("dmax"), tmax = N("tmax"), rpm0 = N("rpm0"), srpm = N("srpm"), mu = N("mub"), D = N("d") / 1000;
    const diff = dp - dp0, ok = dmax > 0 && tmax > 0 && rpm0 > 0 && diff >= 0, x = diff / dmax;
    const T = tmax * x, rpm = rpm0 * Math.max(0, 1 - 0.28 * Math.pow(x, 1.6)), stall = x >= 1.3;
    const wob = mu > 0 && D > 0 ? 3 * T * 1000 / (mu * D) / (1000 * g) : NaN;          // T ≈ μ·WOB·D/3
    set("o_diff", ok ? F(diff, 2) : "—"); set("o_load", ok ? F(x * 100, 0) : "—"); set("o_t", ok ? F(T, 1) : "—");
    set("o_rpm", ok ? F(stall ? 0 : rpm, 0) : "—"); set("o_bit", ok ? F((stall ? 0 : rpm) + srpm, 0) : "—"); set("o_wob", ok && isFinite(wob) ? F(wob, 1) : "—");
    set("o_v", !ok ? "—" : stall ? "срыв двигателя: долото встало, снимите нагрузку" : x > 1 ? "выше паспортного максимума, близко к срыву" : x > 0.8 ? "близко к максимуму, запас мал" : x < 0.15 ? "нагрузка почти не доходит" : "рабочий режим");
  };

  // ---------- вес на крюке: подъём, спуск, вращение (мягкая нить) ----------
  C.hook = () => {
    const kop = N("kop"), bur = N("bur"), inc = N("inc"), md = N("md"), qa = N("q"), rho = N("rho"), mu = N("mu"), fact = N("pu"), blk = N("blk");
    const ok = md > 0 && bur > 0 && qa > 0 && rho > 0 && inc >= 0 && inc <= 95;
    if (!ok) { ["o_rot", "o_pu", "o_so", "o_dr", "o_mu"].forEach((i) => set(i, "—")); set("o_v", "—"); return; }
    const r = window.dhHook(kop, bur, inc, md, qa, rho, mu, blk);
    set("o_rot", F(r.rot, 1)); set("o_pu", F(r.pu, 1)); set("o_so", F(r.so, 1)); set("o_dr", F(r.pu - r.rot, 1));
    let muFit = NaN;
    if (fact > 0) { let lo = 0, hi = 0.8; for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; window.dhHook(kop, bur, inc, md, qa, rho, m, blk).pu < fact ? lo = m : hi = m; } muFit = (lo + hi) / 2; }
    set("o_mu", isFinite(muFit) && fact > r.rot ? F(muFit, 2) : "—");
    set("o_v", !(fact > 0) ? "введите фактический вес при подъёме" : fact <= r.rot ? "фактический вес ниже веса при вращении, проверьте ввод" : muFit > 0.4 ? "трение высокое: очистка ствола, сальник, уступы?" : muFit > mu + 0.05 ? "трение выше расчётного, следите за трендом" : "трение в норме");
  };
  // модель мягкой нити для веса на крюке (т): вертикаль → набор → наклонный участок
  window.dhHook = (kop, bur, inc, md, qa, rho, mu, blk) => {
    const bf = 1 - rho / 7.85, w = qa * g * bf, ds = 5, st = [];
    let m = 0, i = 0;
    while (m < md) { st.push([m, i]); m += ds; if (m > kop && i < inc) i = Math.min(inc, i + bur / 30 * ds); }
    st.push([md, i]);
    const run = (sgn, muAx) => {                                                         // sgn: +1 подъём, −1 спуск, 0 вращение
      let F_ = 0;
      for (let k = st.length - 1; k > 0; k--) {
        const [m2, i2] = st[k], [m1, i1] = st[k - 1], dL = m2 - m1, I = (i1 + i2) / 2 * R, dI = (i2 - i1) * R;
        const N_ = Math.abs(F_ * dI + w * Math.sin(I) * dL);
        F_ = F_ + w * Math.cos(I) * dL + sgn * muAx * N_;
      }
      return F_ / 1000 / g + blk;
    };
    return { rot: run(0, 0), pu: run(1, mu), so: run(-1, mu), st };
  };

  window.calc = () => C[kind] && C[kind]();
  window.calc();
})();
