// DrillHarmony · Калькулятор «Сколько стоит скрытое НПВ».
// Все цифры — допущения пользователя; расчёт идёт в браузере.
(() => {
  const root = document.getElementById("np");
  if (!root) return;
  const $ = (id) => document.getElementById(id);
  const F = (x, d = 0) => (isFinite(x) ? x.toLocaleString("ru-RU", { minimumFractionDigits: d, maximumFractionDigits: d }) : "—");
  const money = (x) => (Math.abs(x) >= 1e6 ? F(x / 1e6, 1) + " млн ₽" : F(Math.round(x / 1000)) + " тыс. ₽");
  const FIELDS = ["n", "rate", "days", "cn", "ca", "cnorm", "trip", "tex", "oth", "rec", "price"];
  const v = (id) => { const x = parseFloat(String($("np-" + id).value).replace(/\s/g, "").replace(",", ".")); return isFinite(x) ? x : 0; };
  // параметры из ссылки
  try {
    const q = new URLSearchParams(location.search);
    FIELDS.forEach((k) => { if (q.has(k)) $("np-" + k).value = q.get(k); });
  } catch (e) {}
  root.querySelectorAll(".ia-sl input").forEach((t) => {
    const o = t.parentElement.querySelector("output");
    const u = () => (o.textContent = (+t.value).toFixed(+(t.dataset.d || 0)).replace(".", ",") + (t.dataset.u || ""));
    u(); t.addEventListener("input", u);
  });
  let last = null;
  const run = () => {
    const n = Math.max(0, v("n")), rate = Math.max(0, v("rate")), days = Math.min(366, Math.max(0, v("days")));
    const hConn = Math.max(0, v("cn") * (v("ca") - v("cnorm")) / 60);
    const hTrip = Math.max(0, v("trip") * v("tex") / 100);
    const hOth = Math.max(0, v("oth"));
    const hDay = hConn + hTrip + hOth;
    const hYear = hDay * days;                         // на одну буровую
    const loss = hYear / 24 * rate * n;                // ₽ в год по всем буровым
    const rec = v("rec") / 100, save = loss * rec;
    const cost = v("price") * 12 * n;
    const be = loss > 0 ? cost / loss : NaN;           // доля, которую нужно вернуть, чтобы окупить
    const set = (id, x) => ($(id).textContent = x);
    set("np-o-h", F(hDay, 2)); set("np-o-hy", F(hYear)); set("np-o-d", F(hYear / 24, 1));
    set("np-o-loss", money(loss)); set("np-o-l1", money(n > 0 ? loss / n : 0)); set("np-o-save", money(save)); set("np-o-cost", money(cost));
    set("np-o-be", isFinite(be) ? F(be * 100, 1) : "—");
    set("np-o-roi", cost > 0 && save > 0 ? F(save / cost, 1) : "—");
    set("np-o-pay", cost > 0 && save > 0 ? F(cost / (save / 12), 1) : "—");
    const roiBox = $("np-o-roi").closest(".ia-o");
    roiBox.classList.toggle("ok", save > cost); roiBox.classList.toggle("warn", save > 0 && save <= cost);
    // сутки буровой: доли скрытого НПВ
    const seg = [["Наращивания", hConn, "c"], ["СПО сверх норматива", hTrip, "t"], ["Ожидания и прочее", hOth, "o"]];
    $("np-day").innerHTML = seg.map(([nm, h, c]) => `<i class="np-${c}" style="width:${Math.min(100, h / 24 * 100)}%" title="${nm}: ${F(h, 2)} ч"></i>`).join("") + `<span>${F(hDay / 24 * 100, 1)} % суток</span>`;
    $("np-leg").innerHTML = seg.map(([nm, h, c]) => `<li><i class="np-${c}"></i>${nm}<b>${F(h, 2)} ч/сут</b><small>${hDay > 0 ? F(h / hDay * 100) : 0} %</small></li>`).join("");
    // экономия против стоимости
    const mx = Math.max(save, cost, 1);
    $("np-cmp").innerHTML = `<div><span>Возврат ${F(rec * 100)} % скрытого НПВ</span><i class="np-sv" style="width:${save / mx * 100}%"></i><b>${money(save)}</b></div><div><span>Tempo на ${F(n)} ${n % 10 === 1 && n % 100 !== 11 ? "буровую" : "буровых"}</span><i class="np-cs" style="width:${cost / mx * 100}%"></i><b>${money(cost)}</b></div>`;
    $("np-verdict").textContent = !(loss > 0) ? "Введите данные: потери пока не видны." :
      be > 1 ? "При таких цифрах скрытое НПВ меньше стоимости мониторинга. Проверьте норматив и цену." :
      `Tempo окупается, если сократить скрытое НПВ всего на ${F(be * 100, 1)} %. Сократить его на ${F(rec * 100)} %, значит, можно вернуть ${money(save - cost)} в год сверх стоимости.`;
    last = { n, rate, days, hDay, hYear, loss, save, cost, be, rec };
    // ссылка с параметрами
    try { const q = new URLSearchParams(); FIELDS.forEach((k) => q.set(k, $("np-" + k).value)); history.replaceState(null, "", "?" + q.toString()); } catch (e) {}
  };
  root.addEventListener("input", run);
  $("np-send").addEventListener("click", (e) => {
    if (!last) return;
    const m = `Расчёт скрытого НПВ: ${F(last.n)} буровых, сутки ${F(last.rate)} ₽, ${F(last.hDay, 2)} ч/сут скрытого НПВ на буровую, потери ${money(last.loss)} в год. Хотим пилот Tempo, чтобы проверить на фактических данных.`;
    e.currentTarget.href = "../../?lead=pilot&msg=" + encodeURIComponent(m) + "#contact";
  });
  $("np-print").addEventListener("click", () => window.print());
  $("np-link").addEventListener("click", async (e) => {
    try { await navigator.clipboard.writeText(location.href); e.currentTarget.textContent = "Ссылка скопирована"; } catch (err) { prompt("Ссылка на расчёт:", location.href); }
  });
  run();
})();
