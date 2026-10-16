// Форум DrillHarmony: редактор сообщений (панель форматирования, просмотр, картинки), цитаты, подтверждения.
(() => {
  const wrap = (ta, a, z, ph = "") => {
    const s = ta.selectionStart, e = ta.selectionEnd, sel = ta.value.slice(s, e) || ph;
    ta.setRangeText(a + sel + z, s, e, "end");
    ta.setSelectionRange(s + a.length, s + a.length + sel.length); ta.focus(); ta.dispatchEvent(new Event("input"));
  };
  const lines = (ta, fn) => {
    let s = ta.selectionStart, e = ta.selectionEnd;
    s = ta.value.lastIndexOf("\n", s - 1) + 1;
    const nl = ta.value.indexOf("\n", e); e = nl < 0 ? ta.value.length : nl;
    const out = ta.value.slice(s, e).split("\n").map(fn).join("\n");
    ta.setRangeText(out, s, e, "end"); ta.setSelectionRange(s, s + out.length); ta.focus(); ta.dispatchEvent(new Event("input"));
  };
  const block = (ta, text) => {
    const s = ta.selectionStart, before = ta.value.slice(0, s);
    const pre = before && !before.endsWith("\n\n") ? (before.endsWith("\n") ? "\n" : "\n\n") : "";
    ta.setRangeText(pre + text + "\n", s, ta.selectionEnd, "end"); ta.focus(); ta.dispatchEvent(new Event("input"));
  };
  const ACT = {
    h: (ta) => lines(ta, (l) => "## " + l.replace(/^#+\s*/, "")),
    b: (ta) => wrap(ta, "**", "**", "жирный текст"),
    i: (ta) => wrap(ta, "*", "*", "курсив"),
    s: (ta) => wrap(ta, "~~", "~~", "текст"),
    ul: (ta) => lines(ta, (l) => "- " + l.replace(/^\s*([-*•]|\d+[.)])\s+/, "")),
    ol: (ta) => { let n = 0; lines(ta, (l) => ++n + ". " + l.replace(/^\s*([-*•]|\d+[.)])\s+/, "")); },
    quote: (ta) => lines(ta, (l) => "> " + l),
    code: (ta) => wrap(ta, "`", "`", "код"),
    pre: (ta) => { const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd); block(ta, "```\n" + (sel || "R = 1718,9 / DLS") + "\n```"); },
    table: (ta) => block(ta, "| Параметр | Значение |\n|---|---|\n| Зенит, ° | 45 |\n| Азимут, ° | 120 |"),
    hr: (ta) => block(ta, "---"),
    link: (ta) => {
      const u = prompt("Адрес ссылки (https://…)", "https://"); if (!u || !/^https?:\/\/\S+$/.test(u)) return;
      const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd);
      ta.setRangeText("[" + (sel || "текст ссылки") + "](" + u + ")", ta.selectionStart, ta.selectionEnd, "end"); ta.focus(); ta.dispatchEvent(new Event("input"));
    },
    img: (ta, ed) => ed.querySelector(".f-file").click(),
  };
  const csrf = (ed) => (ed.closest("form") || document).querySelector('input[name="csrf"]')?.value || "";
  const upload = async (ed, files) => {
    const ta = ed.querySelector("textarea");
    for (const f of files) {
      if (!/^image\/(jpeg|png|webp|gif)$/.test(f.type)) { alert("Подходят JPG, PNG, WebP и GIF."); continue; }
      const mark = "![Загрузка " + f.name.replace(/[\[\]]/g, "") + "…]()";
      block(ta, mark);
      const fd = new FormData(); fd.append("file", f); fd.append("csrf", csrf(ed));
      try {
        const r = await fetch(ed.dataset.upload, { method: "POST", body: fd, credentials: "same-origin" });
        const j = await r.json();
        ta.value = ta.value.replace(mark, j.md || ""); if (!j.md) alert(j.error || "Не удалось загрузить картинку.");
      } catch (e) { ta.value = ta.value.replace(mark, ""); alert("Не удалось загрузить картинку."); }
      ta.dispatchEvent(new Event("input"));
    }
  };
  document.querySelectorAll(".f-ed").forEach((ed) => {
    const ta = ed.querySelector("textarea"), view = ed.querySelector(".f-view"), cnt = ed.querySelector(".f-count"), drop = ed.querySelector(".f-drop");
    const count = () => (cnt.textContent = ta.value.length ? ta.value.length + " / 20000" : "");
    ta.addEventListener("input", count); count();
    // высота поля по тексту
    const grow = () => { ta.style.height = "auto"; ta.style.height = Math.min(window.innerHeight * 0.7, Math.max(ta.scrollHeight + 2, 160)) + "px"; };
    ta.addEventListener("input", grow); grow();
    ed.querySelectorAll(".f-tools button").forEach((b) => b.addEventListener("click", () => { if (!view.hidden) setTab("write"); ACT[b.dataset.act]?.(ta, ed); }));
    ta.addEventListener("keydown", (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase(), m = { b: "b", "и": "b", i: "i", "ш": "i", k: "link", "л": "link" }[k];
      if (m) { e.preventDefault(); ACT[m](ta, ed); }
      if (k === "enter") { e.preventDefault(); ta.form?.requestSubmit(); }
    });
    const setTab = async (t) => {
      ed.querySelectorAll(".f-tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === t));
      ed.querySelector(".f-tools").classList.toggle("off", t === "view");
      if (t === "view") {
        view.style.minHeight = ta.offsetHeight + "px"; view.hidden = false; ta.hidden = true; view.innerHTML = "<p class='f-muted'>Готовим просмотр…</p>";
        const fd = new FormData(); fd.append("body", ta.value); fd.append("csrf", csrf(ed));
        try { const r = await fetch(ed.dataset.preview, { method: "POST", body: fd, credentials: "same-origin" }); view.innerHTML = (await r.text()) || "<p class='f-muted'>Пока пусто.</p>"; }
        catch (e) { view.innerHTML = "<p class='f-muted'>Просмотр недоступен.</p>"; }
      } else { view.hidden = true; ta.hidden = false; ta.focus(); }
    };
    ed.querySelectorAll(".f-tabs button").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));
    const file = ed.querySelector(".f-file");
    if (file) {
      file.addEventListener("change", () => { upload(ed, [...file.files]); file.value = ""; });
      ta.addEventListener("paste", (e) => { const fs = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith("image/")); if (fs.length) { e.preventDefault(); upload(ed, fs); } });
      const area = ed.querySelector(".f-ed-area");
      area.addEventListener("dragover", (e) => { if ([...e.dataTransfer.types].includes("Files")) { e.preventDefault(); drop.hidden = false; } });
      area.addEventListener("dragleave", (e) => { if (!area.contains(e.relatedTarget)) drop.hidden = true; });
      area.addEventListener("drop", (e) => { drop.hidden = true; const fs = [...e.dataTransfer.files]; if (fs.length) { e.preventDefault(); upload(ed, fs); } });
    }
  });
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-confirm]");
    if (b && !confirm(b.dataset.confirm)) { e.preventDefault(); return; }
    const q = e.target.closest("[data-quote]");
    if (q) {
      const ta = document.querySelector("#reply textarea"); if (!ta) return;
      const body = q.dataset.body.split("\n").filter((l) => !l.startsWith(">")).slice(0, 8).map((l) => "> " + l).join("\n");
      ta.value += (ta.value ? "\n\n" : "") + "> **" + q.dataset.quote + "** писал(а):\n" + body + "\n\n";
      ta.dispatchEvent(new Event("input")); ta.focus(); ta.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  });
  document.querySelectorAll("form.f-form").forEach((f) => f.addEventListener("submit", () => {
    const b = f.querySelector('button[type="submit"]'); if (b) setTimeout(() => (b.disabled = true), 0);
  }));
})();
