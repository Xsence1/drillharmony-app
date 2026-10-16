// Демо-карточка Tempo на главной: учебная модель бурения горизонтального участка.
// Значения считаются здесь же — это не данные реальной буровой.
(() => {
  const box = document.getElementById("live");
  if (!box) return;
  const $ = (id) => document.getElementById(id);
  const f = (v, d) => v.toLocaleString("ru-RU", { minimumFractionDigits: d, maximumFractionDigits: d });
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const rop = [];
  let md = 2781.4, inc = 88.3, az = 145.0, t = 0, r = 12;
  for (let i = 0; i < 60; i++) { r = Math.max(4, Math.min(24, r + (rnd() - 0.47) * 2.2)); rop.push(r); }
  const draw = () => {
    const W = 260, H = 60, mx = Math.max(...rop) + 2, mn = Math.min(...rop) - 2;
    const pts = rop.map((v, i) => [(i / (rop.length - 1)) * W, H - 4 - ((v - mn) / (mx - mn)) * (H - 10)]);
    const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join("");
    $("lv-l").setAttribute("d", d);
    $("lv-a").setAttribute("d", d + `L${W} ${H}L0 ${H}Z`);
    $("lv-md").textContent = f(md, 1) + " м";
    $("lv-inc").textContent = f(inc, 1) + "°";
    $("lv-az").textContent = f(az, 1) + "°";
    $("lv-rop").textContent = f(rop[rop.length - 1], 1) + " м/ч";
  };
  const step = () => {
    t++;
    r = Math.max(4, Math.min(24, r + (rnd() - 0.48) * 2.4));
    rop.push(r); rop.shift();
    md += r / 3600 * 8;                 // модельное время ускорено в 8 раз
    if (t % 12 === 0) { inc = Math.max(87.2, Math.min(90.4, inc + (rnd() - 0.5) * 0.4)); az = az + (rnd() - 0.5) * 0.3; }
    draw();
  };
  draw();
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let vis = true;
  "IntersectionObserver" in window && new IntersectionObserver((e) => (vis = e[0].isIntersecting)).observe(box);
  setInterval(() => vis && !document.hidden && step(), 1000);
})();

// Кнопка «Все новости» и «Смотреть демо»
(() => {
  const b = document.querySelector(".news-all");
  b && b.addEventListener("click", () => {
    const n = document.getElementById("news"), open = !n.classList.contains("all");
    n.classList.toggle("all", open);
    b.setAttribute("aria-expanded", String(open));
    b.textContent = open ? "Свернуть" : "Все новости";
  });
  const d = document.querySelector("[data-demo]");
  d && d.addEventListener("click", (e) => {
    const v = document.querySelector("#slidex .film video");
    if (!v) return;
    e.preventDefault();
    v.scrollIntoView({ behavior: "smooth", block: "center" });
    const play = () => v.play().catch(() => {});
    v.readyState >= 1 ? play() : (v.addEventListener("loadedmetadata", play, { once: true }), v.load());
  });
})();
