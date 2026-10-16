// Оформление результатов калькулятора: цвет вывода (норма/внимание). Без анимации чисел.
(() => {
  const u = document.querySelector(".calc"), l = true, m = document.querySelectorAll(".calc-lead");
  if (m.length && !l && "IntersectionObserver" in window) {
    document.documentElement.classList.add("dh-anim");
    const e = new IntersectionObserver((t) => t.forEach((s) => {
      s.isIntersecting && (s.target.classList.add("in"), e.unobserve(s.target));
    }), { threshold: 0.2 });
    m.forEach((t) => e.observe(t));
  }
  if (!u) return;
  const f = (e, t) => {
    e.classList.remove("ok", "warn", "info"), !(!t || t === "—") && e.classList.add(/вне допуска|No-Go|мало|близко к|два близких|неустойчив|нет модели|проверьте|не меньше|не хватит/i.test(t) ? "warn" : /занижает|завышает/.test(t) ? "info" : "ok");
  }, h = (e) => {
    const t = /^([−-]?)(\d+)(?:,(\d+))?$/.exec(e);
    return t ? { v: (t[1] ? -1 : 1) * parseFloat(t[2] + "." + (t[3] || "0")), d: (t[3] || "").length } : null;
  }, v = (e, t) => {
    const s = Math.abs(e).toFixed(t);
    return (e < 0 && +s != 0 ? "−" : "") + s.replace(".", ",");
  };
  u.querySelectorAll(".co").forEach((e, t) => {
    const s = e.querySelector("b");
    if (!s) return;
    e.style.setProperty("--i", t);
    const b = e.classList.contains("verdict");
    let c = s.textContent, o = h(c), i = 0, p = null;
    b && f(e, c);
    const w = (n) => {
      p = n, s.textContent = n;
    }, L = (n, r, a) => {
      cancelAnimationFrame(i);
      const M = performance.now(), x = (g) => {
        const d = Math.min(1, (g - M) / a), q = 1 - Math.pow(1 - d, 3), y = n + (r.v - n) * q;
        o = { v: y, d: r.d }, w(d < 1 ? v(y, r.d) : c), d < 1 ? i = requestAnimationFrame(x) : o = r;
      };
      i = requestAnimationFrame(x);
    };
    if (new MutationObserver(() => {
      const n = s.textContent;
      if (n === p || n === c) return;
      const r = o;
      c = n;
      const a = h(n);
      e.classList.remove("upd"), e.offsetWidth, e.classList.add("upd"), b && f(e, n), !l && a && r && Math.abs(a.v - r.v) > 1e-12 ? L(r.v, a, 420) : (cancelAnimationFrame(i), o = a);
    }).observe(s, { childList: true, characterData: true, subtree: true }), !l && e.classList.contains("key") && o) {
      const n = o;
      w(v(0, n.d)), setTimeout(() => L(0, n, 900), 300 + t * 60);
    }
  });
})();
