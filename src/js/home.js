// Главная страница DrillHarmony: карточки продуктов, Etude, видео, форма заявки.
// Исходник собран из прежнего home-скрипта; герой-анимация заменена демо-карточкой Tempo (live.js).
const PRODUCTS = [{ id: "slidex", name: "SlideX", kind: "Тренажёр инженера ННБ", status: "Ранний доступ. Релиз: 31 окт 2026", color: "var(--amber)", link: "slidex/", app: "https://slidex.drillharmony.com", cta: "Открыть SlideX", text: "16 учебных билетов на пяти скважинах: ствол до 3 434 м, компоновка из 135 позиций каталога, реактивный момент и слайды по замерам. Преподаватель получает оценку по 10 аварийным критериям и разбор каждой попытки.", points: ["Сборка КНБК, ориентирование, замеры", "ГНВП, прихваты, вибрации, сбои телесистемы", "Антиколлизия ISCWSA, гидравлика, «метла»", "ИИ-наставник, экзамены, сертификаты"], solutions: ["safe", "fast"] }, { id: "tempo", name: "Tempo", kind: "Онлайн-мониторинг бурения", status: "Ранний доступ. Релиз: 30 ноя 2026", color: "var(--amber)", link: "tempo/", app: "https://tempo.drillharmony.com", cta: "Открыть Tempo", text: "Данные с буровой в реальном времени для всех служб: операции буровой, скрытое НПВ, траектория и подсказки ННБ, суточный рапорт.", points: ["Все данные станций ГТИ и ННБ: растворы, долота, хроматограф", "Операции, наращивания и СПО, баланс времени считаются автоматически", "Скрытое НПВ: часы сверх норматива и на чём", "Помощник ННБ: долото, интенсивность, следующий слайд"], solutions: ["data", "fast"] }, { id: "etude", name: "Etude", kind: "Проектирование траекторий", status: "Ранний доступ. Релиз: 1 кв 2027", color: "var(--amber)", link: "etude/", app: "https://etude.drillharmony.com", cta: "Открыть Etude", text: "Проектирование траекторий и контроль сближения стволов по кусту и месторождению. Проекты переносятся из EDM XML: на 25 реальных траекториях совпадение с исходной программой до 0,5 мм.", points: ["Типовые профили, решатель «на цель»", "Антиколлизия ISCWSA, модели приборов OWSG", "План/факт, прогноз на долото", "ГСК-2011, СК-42, МСК; обмен с EDM XML в обе стороны"], solutions: ["calc", "safe"] }], LEAD_OPTIONS = [["slidex", "SlideX — тренажёр"], ["tempo", "Tempo — мониторинг бурения"], ["etude", "Etude — проектирование"], ["etude-personal", "Etude — личный доступ"], ["pilot", "Пилот Tempo на 30 дней"], ["several", "Несколько программ"], ["onprem", "Установка на сервер компании"], ["personal", "Личный доступ к SlideX"], ["other", "Другое"]], CLIPS = [["pad", "Траектории", "Куст в 3D: четыре ствола и цели"], ["collision", "Антиколлизия", "Эллипсоиды ошибок по ISCWSA"], ["rig", "Буровая 3D", "Бригада наращивает трубу"], ["hydraulics", "Гидравлика", "Давление на стояке и окно ЭЦП"], ["nnb", "Вагончик ННБ", "Рабочее место инженера"], ["console", "Пульт", "Ориентирование отклонителя"]], TICKER = ["Проектирование", "Антиколлизия", "Данные с буровой", "Мониторинг", "Баланс времени", "Слайдшит", "КНБК", "Ориентирование", "Замеры", "ГНВП", "Прихваты", "Телеметрия"], EM = "media/etude/", ETUDE_CARDS = [["Профили и автоподбор", "Типовые профили J, S, горизонтальные; решатель «на цель». Автоподбор траектории и всего куста с учётом соседей и ограничений.", "04-avtopodbor"], ["Антиколлизия", "Эллипсы неопределённости по ISCWSA, модели приборов OWSG и заказчика; коэффициент разделения и вероятность пересечения; матрица сближений по месторождению.", "02-3d-sblizhenie"], ["План/факт", "Фактические замеры, контроль качества, отклонение от проекта и прогноз на долото.", "03-prognoz-na-doloto"], ["Факт с буровой", "Запись станции ГТИ из файла: режимы, трение по факту, прогноз нагрузок до забоя и тренд трения.", "06-zapis-gti"], ["Нагрузки и гидравлика", "Вес на крюке, момент, изгиб; давление на стояке, ЭЦП, очистка ствола; управление скважиной.", "07-nagruzki-i-moment"], ["Колонны и КНБК", "Прочность обсадных колонн по API 5C3 и ГОСТ 632, износ; компоновка низа бурильной колонны; цементирование.", "08-obsadnye-kolonny"], ["Сроки и стоимость", "График «глубина — сутки» по нормам подрядчика и стоимость скважины; сравнение вариантов проекта.", "09-sroki-stroitelstva"], ["Проверка программы", "Проект сверяется со всеми расчётами до выдачи на буровую, программа на бурение выгружается в Word.", "05-proverka-programmy"], ["ИИ-помощник", "Встроенный помощник DrillHarmony, российские и зарубежные модели или локальная модель. Отвечает по руководству, запускает расчёты и открывает окна по просьбе словами. Считает программа.", "01-ii-otkryvaet-plan-fakt"], ["На кусту без связи", "Ствол берётся на куст: работа без интернета, правки уходят на сервер при связи.", "12-rabota-bez-svyazi"], ["Совместная работа", "Обсуждение, подписи «разработал — проверил — утвердил», версии проекта.", ""], ["Данные и обмен", "EDM XML, Excel; отчёты в PDF, Excel и Word; установка на сервер заказчика.", "10-programma-na-burenie"]], ETUDE_CLIPS = [["3d", "Антиколлизия", "Весь куст в 3D, опасное сближение"], ["ai", "ИИ-помощник", "Спросите словами, Etude пересчитает"], ["auto", "Автоподбор", "Сотни профилей, лучшие находятся за секунды"], ["offline", "На кусту", "Работа без связи, правки уходят на сервер"]], PIMG = { slidex: "media/cards/slidex.jpg", tempo: "media/cards/tempo.jpg", etude: "media/cards/etude.jpg" }, $ = (e) => document.getElementById(e), esc = (e) => String(e).replace(/[&<>"]/g, (e2) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[e2]);
$("prods").innerHTML = PRODUCTS.map((e) => `<article class="prod2"><a class="pimg" href="${e.link}" tabindex="-1" aria-hidden="true"><img src="${PIMG[e.id]}" alt="" loading="lazy" width="760" height="420"></a><div class="pbody"><h3>${esc(e.name)}<small>${esc(e.kind)}</small></h3>
  <p>${esc(e.text)}</p><ul>${e.points.map((e2) => `<li>${esc(e2)}</li>`).join("")}</ul><a class="more" href="${e.link}">Подробнее</a></div></article>`).join(""), $("reel").innerHTML = CLIPS.map(([e, t, a]) => `<figure class="clip" data-r><video muted loop playsinline preload="none" poster="media/clips/${e}.jpg" data-src="media/clips/${e}.mp4"></video><figcaption><small>${esc(t)}</small>${esc(a)}</figcaption></figure>`).join(""), $("f-product").innerHTML = LEAD_OPTIONS.map(([e, t]) => `<option value="${e}">${esc(t)}</option>`).join(""), document.querySelectorAll("[data-open]").forEach((e) => {
  const t = PRODUCTS.find((t2) => t2.id === e.dataset.open);
  t && t.app && (e.href = t.app, e.target = "_blank", e.rel = "noopener");
});
try {
  const e = new URLSearchParams(location.search).get("lead");
  e && LEAD_OPTIONS.some((t) => t[0] === e) && ($("f-product").value = e);
  const m = new URLSearchParams(location.search).get("msg");
  m && !$("f-message").value && ($("f-message").value = m.slice(0, 1500));
} catch (e) {
}
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-lead]");
  t && ($("f-product").value = t.dataset.lead);
}), $("f-names").textContent = PRODUCTS.map((e) => e.name).join(" · ");
const ETUDE_GROUPS = [["Траектория", [0, 1, 2]], ["Расчёты", [4, 5, 6]], ["Факт и проверка", [3, 7, 11]], ["Работа в команде", [8, 9, 10]]];
$("efeats").innerHTML = ETUDE_GROUPS.map(([e, t]) => `<div class="egroup"><div class="eg-h">${esc(e)}</div>${t.map((e2) => {
  const [t2, a, o] = ETUDE_CARDS[e2];
  return `<div class="eitem${o ? " shot" : ""}"${o ? ` data-shot="${o}" tabindex="0" role="button" aria-label="${esc(t2)}: снимок экрана"` : ""}><b>${esc(t2)}${o ? '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="M4 7h3l2-2h6l2 2h3v12H4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>' : ""}</b><p>${esc(a)}</p></div>`;
}).join("")}</div>`).join(""), (() => {
  const e = $("etabs"), t = $("eclip");
  let a = -1, o = false;
  e.innerHTML = ETUDE_CLIPS.map(([e2, t2, a2], o2) => `<button class="etab" type="button" role="tab" data-i="${o2}" aria-selected="false"><small>${esc(t2)}</small><b>${esc(a2)}</b></button>`).join("");
  const s = (s2) => {
    a = (s2 + ETUDE_CLIPS.length) % ETUDE_CLIPS.length;
    const n = ETUDE_CLIPS[a][0];
    e.querySelectorAll(".etab").forEach((e2, t2) => {
      e2.setAttribute("aria-selected", t2 === a), e2.style.animation = "none", e2.offsetWidth, e2.style.animation = "";
    }), t.classList.add("fade"), setTimeout(() => {
      t.src = `${EM}clips/${n}.mp4`, t.poster = `${EM}clips/${n}.jpg`, o && t.play().catch(() => {
      }), t.classList.remove("fade");
    }, 250);
  };
  t.addEventListener("loadedmetadata", () => {
    const a2 = e.querySelector('[aria-selected="true"]');
    a2 && a2.style.setProperty("--dur", t.duration + "s");
  }), t.addEventListener("ended", () => s(a + 1)), e.addEventListener("click", (e2) => {
    const t2 = e2.target.closest(".etab");
    t2 && s(+t2.dataset.i);
  }), new IntersectionObserver((e2) => e2.forEach((e3) => {
    o = e3.isIntersecting, o ? a < 0 ? s(0) : t.play().catch(() => {
    }) : t.pause();
  }), { threshold: 0.3 }).observe(t), t.poster = `${EM}clips/${ETUDE_CLIPS[0][0]}.jpg`;
})(), (() => {
  const e = $("vdlg"), t = $("vplayer"), a = $("vimg"), o = $("vcap");
  document.addEventListener("click", (s2) => {
    const n = $("evideo");
    if (s2.target.closest("[data-video]")) {
      s2.preventDefault(), n.scrollIntoView({ behavior: "smooth", block: "center" });
      const e2 = () => n.play().catch(() => {
      });
      return void (n.readyState >= 1 ? e2() : (n.addEventListener("loadedmetadata", e2, { once: true }), n.load()));
    }
    const r = s2.target.closest("[data-shot]");
    var i, c;
    r && (i = r.dataset.shot, c = r.querySelector("b").textContent, t.pause(), t.hidden = true, a.hidden = false, a.src = EM + i + ".webp", a.alt = c, o.textContent = c + " · снимок экрана Etude на учебных данных", e.open || e.showModal());
  }), document.addEventListener("keydown", (e2) => {
    const t2 = e2.target.closest && e2.target.closest("[data-shot]");
    !t2 || "Enter" !== e2.key && " " !== e2.key || (e2.preventDefault(), t2.click());
  });
  const s = [$("evideo"), $("evideo2")];
  s.forEach((e2) => e2.addEventListener("play", () => s.forEach((t2) => t2 !== e2 && t2.pause()))), $("vx").onclick = () => e.close(), e.addEventListener("click", (t2) => {
    t2.target === e && e.close();
  }), e.addEventListener("close", () => t.pause());
})(), (() => {
  const e = matchMedia("(prefers-reduced-motion: reduce)").matches;
  addEventListener("scroll", () => {
    const e2 = document.documentElement;
    $("prog").style.transform = `scaleX(${e2.scrollTop / Math.max(1, e2.scrollHeight - e2.clientHeight)})`;
  }, { passive: true });
  const t = new IntersectionObserver((a2) => a2.forEach((a3) => {
    a3.isIntersecting && (a3.target.classList.add("in"), a3.target.querySelectorAll("[data-count]").forEach((t2) => e || ((e2) => {
      const t3 = +e2.dataset.count, a4 = performance.now(), o2 = (s2) => {
        const n2 = Math.min(1, (s2 - a4) / 1200);
        e2.textContent = Math.round(t3 * (1 - Math.pow(1 - n2, 3))), n2 < 1 && requestAnimationFrame(o2);
      };
      requestAnimationFrame(o2);
    })(t2)), t.unobserve(a3.target));
  }), { threshold: 0.12 });
  document.querySelectorAll("[data-r]").forEach((e2, a2) => {
    e2.classList.contains("clip") && (e2.style.transitionDelay = a2 % 3 * 0.12 + "s"), t.observe(e2);
  });
  const a = new IntersectionObserver((t2) => t2.forEach((t3) => {
    const a2 = t3.target;
    t3.isIntersecting ? (a2.src || (a2.src = a2.dataset.src), e || a2.play().catch(() => {
    })) : a2.pause();
  }), { threshold: 0.35 });
  document.querySelectorAll(".clip video").forEach((e2) => a.observe(e2)), document.querySelectorAll(".prod").forEach((e2) => e2.addEventListener("pointermove", (t2) => {
    const a2 = e2.getBoundingClientRect();
    e2.style.setProperty("--mx", t2.clientX - a2.left + "px"), e2.style.setProperty("--my", t2.clientY - a2.top + "px");
  }));
})(), (() => {
  const e = $("theme"), t = document.documentElement, a = () => e.setAttribute("aria-label", "light" === t.dataset.theme ? "Включить тёмную тему" : "Включить светлую тему");
  e.addEventListener("click", () => {
    t.dataset.theme = "light" === t.dataset.theme ? "dark" : "light", a();
    try {
      localStorage.setItem("dh-theme", t.dataset.theme);
    } catch (e2) {
    }
    dispatchEvent(new Event("themechange"));
  }), a();
})();
const LEAD_URLS = ["lead.php", "https://slidex.drillharmony.com/api/lead"], LEAD_MAIL = "info@drillharmony.com";
$("lead").addEventListener("submit", async (e) => {
  e.preventDefault();
  const t = $("f-msg"), a = $("f-send"), o = { name: $("f-name").value.trim(), company: $("f-company").value.trim(), email: $("f-email").value.trim(), phone: $("f-phone").value.trim(), product: $("f-product").selectedOptions[0].textContent, message: $("f-message").value.trim(), website: $("f-website").value, consent: $("f-consent").checked, source: location.hostname + "/#contact" }, s = (e2, a2) => {
    t.hidden = false, t.className = "msg " + (a2 ? "ok" : "err"), t.textContent = e2;
  };
  if (o.name.length < 2 || !(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(o.email) || o.phone.replace(/\D/g, "").length >= 10)) return s("Укажите имя и e-mail или телефон, чтобы мы могли с вами связаться.", false);
  if (!o.consent) return s("Отметьте согласие на обработку персональных данных.", false);
  a.disabled = true, a.textContent = "Отправляем…";
  let n = false, r = "";
  for (const e2 of LEAD_URLS) try {
    const t2 = await fetch(e2, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(o) }), a2 = await t2.json().catch(() => ({}));
    if (t2.ok && a2.ok) {
      if (n = true, false !== a2.mail) break;
      continue;
    }
    if (400 === t2.status || 429 === t2.status) {
      r = a2.error;
      break;
    }
  } catch (e3) {
  }
  a.disabled = false, a.textContent = "Отправить", n ? (s("Спасибо, заявка отправлена. Ответим в течение рабочего дня.", true), e.target.reset()) : s(r || `Не удалось отправить заявку. Напишите на ${LEAD_MAIL}.`, false);
});
