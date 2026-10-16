// DrillHarmony · Просмотрщик LAS в браузере. Файл читается локально и никуда не отправляется.
// Поддержка: LAS 1.2 и 2.0, секции ~V ~W ~C ~A, WRAP YES/NO, NULL, кодировки UTF-8 и Windows-1251.
(() => {
  const root = document.getElementById("lv");
  if (!root) return;
  const $ = (s) => root.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const fmt = (v, d) => (v == null || !isFinite(v) ? "—" : (+v).toFixed(d).replace(".", ",").replace(/^-/, "−"));
  const css = (n, d) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || d;
  const COLORS = ["#f5a524", "#5ec8d8", "#ff7a6b", "#9b8cff", "#5fd18b"];

  // ---------- что за кривая: по мнемонике ----------
  const KIND = [
    ["gr", /^(GR|GRC|GRD|GRS|SGR|CGR|GK|GAM|GAMMA|GR_?API|ГК)/i, 0, 150, false],
    ["res", /^(RT|RD|RS|RXO|ILD|ILM|LLD|LLS|MSFL|RES|RPD|RPS|RAD|RAS|AT\d|AF\d|UES|УЭС|КС)/i, 0.2, 2000, true],
    ["nphi", /^(NPHI|NPOR|TNPH|NEU|NKT|CNC|NPSS|PHIN)/i, 0.45, -0.15, false],
    ["rhob", /^(RHOB|RHOZ|DEN|ZDEN|GGKP|DENS)/i, 1.95, 2.95, false],
    ["pef", /^(PE|PEF|PEFZ)/i, 0, 10, false],
    ["cal", /^(CALI|CAL|DCAL|HCAL|KAV|ДС)/i, 100, 400, false],
    ["sp", /^(SP|ПС)/i, -100, 100, false],
    ["dt", /^(DT|DTC|AC|DTCO)/i, 140, 40, false],
    ["rop", /^(ROP|ROPA|MSP)/i, 0, 60, false],
  ];
  const kindOf = (m) => KIND.find(([, re]) => re.test(m));

  // ---------- разбор LAS ----------
  const parse = (text) => {
    const lines = text.split(/\r?\n/);
    let sec = "", wrap = false, nul = -999.25;
    const curves = [], well = {}, data = [];
    const tokens = [];
    for (const raw of lines) {
      const ln = raw.replace(/\t/g, " ");
      if (/^\s*#/.test(ln) || !ln.trim()) continue;
      if (/^\s*~/.test(ln)) { sec = ln.trim()[1].toUpperCase(); continue; }
      if (sec === "A") { for (const t of ln.trim().split(/\s+/)) tokens.push(t); continue; }
      const m = ln.match(/^\s*([^.]+?)\s*\.(\S*)\s+(.*?)\s*:\s*(.*)$/) || ln.match(/^\s*([^.]+?)\s*\.(\S*)\s*(.*?)\s*$/);
      if (!m) continue;
      const mn = m[1].trim(), unit = m[2] || "", val = (m[3] || "").trim(), desc = (m[4] || "").trim();
      if (sec === "V" && /^WRAP$/i.test(mn)) wrap = /^YES/i.test(val);
      if (sec === "W") { well[mn.toUpperCase()] = { unit, val, desc }; if (/^NULL$/i.test(mn)) nul = parseFloat(val.replace(",", ".")); }
      if (sec === "C") curves.push({ m: mn, unit, desc });
    }
    if (!curves.length) throw new Error("В файле нет секции ~C с описанием кривых");
    const n = curves.length, cols = curves.map(() => []);
    for (let i = 0; i + n <= tokens.length; i += n) for (let k = 0; k < n; k++) {
      const v = parseFloat(tokens[i + k].replace(",", "."));
      cols[k].push(!isFinite(v) || Math.abs(v - nul) < 1e-6 ? null : v);
    }
    void wrap;
    if (!cols[0].length) throw new Error("В секции ~A нет данных");
    return { well, curves: curves.map((c, i) => ({ ...c, v: cols[i] })), nul };
  };
  const decode = async (file) => {
    const buf = await file.arrayBuffer();
    let t = new TextDecoder("utf-8").decode(buf);
    if ((t.match(/�/g) || []).length > 3) { try { t = new TextDecoder("windows-1251").decode(buf); } catch (e) {} }
    return t;
  };

  // ---------- учебный файл ----------
  const sample = () => {
    let s = "~Version information\n VERS.   2.0 : CWLS LAS 2.0\n WRAP.   NO  : One line per depth step\n~Well information\n STRT.M  2400.0 :\n STOP.M  2560.0 :\n STEP.M  0.2 :\n NULL.   -999.25 :\n WELL.   УЧЕБНАЯ 1205 : Well\n FLD .   УЧЕБНОЕ : Field\n COMP.   DRILLHARMONY : Company\n~Curve information\n DEPT.M     : Measured depth\n GR  .GAPI  : Gamma ray\n RD  .OHMM  : Deep resistivity\n RS  .OHMM  : Shallow resistivity\n NPHI.V/V   : Neutron porosity\n RHOB.G/CC  : Bulk density\n PEF .B/E   : Photoelectric factor\n CALI.MM    : Caliper\n~A\n";
    let seed = 9; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5;
    const L = [[2400, 2440, [105, 3.5, 0.34, 2.52, 3.2, 228]], [2440, 2446, [36, 80, 0.12, 2.16, 1.8, 216]], [2446, 2478, [40, 42, 0.21, 2.31, 1.9, 216]], [2478, 2490, [110, 3.2, 0.35, 2.54, 3.3, 232]], [2490, 2496, [22, 180, 0.04, 2.66, 5.0, 216]], [2496, 2561, [100, 4, 0.33, 2.5, 3.1, 226]]];
    for (let d = 2400; d <= 2560.0001; d += 0.2) {
      const p = L.find(([a, b]) => d >= a && d < b)[2];
      const row = [d.toFixed(1), (p[0] + r() * 6).toFixed(2), (p[1] * (1 + r() * 0.08)).toFixed(3), (p[1] * 0.7 * (1 + r() * 0.1)).toFixed(3), (p[2] + r() * 0.02).toFixed(4), (p[3] + r() * 0.03).toFixed(4), (p[4] + r() * 0.2).toFixed(3), (p[5] + Math.abs(r()) * 3).toFixed(1)];
      if (d > 2552) { row[4] = "-999.25"; row[5] = "-999.25"; row[6] = "-999.25"; }
      s += row.join("  ") + "\n";
    }
    return s;
  };

  // ---------- состояние ----------
  let L = null, tracks = [], top = 0, span = 100, hover = null;
  const cv = $("#lv-cv"), ctx = cv.getContext("2d");
  const curveOpt = (sel) => '<option value="">—</option>' + L.curves.slice(1).map((c, i) => `<option value="${i + 1}"${sel === i + 1 ? " selected" : ""}>${esc(c.m)}${c.unit ? " · " + esc(c.unit) : ""}</option>`).join("");
  const range = (c) => {
    const k = kindOf(c.m); if (k) return { min: k[2], max: k[3], log: k[4] };
    const v = c.v.filter((x) => x != null).sort((a, b) => a - b); if (!v.length) return { min: 0, max: 1, log: false };
    const lo = v[Math.floor(v.length * 0.02)], hi = v[Math.floor(v.length * 0.98)];
    return { min: lo, max: hi === lo ? lo + 1 : hi, log: false };
  };
  const autoTracks = () => {
    const by = (k) => L.curves.findIndex((c, i) => i > 0 && kindOf(c.m) && kindOf(c.m)[0] === k);
    const T = [];
    const t1 = [by("gr"), by("cal"), by("sp")].filter((i) => i > 0).slice(0, 3); if (t1.length) T.push(t1);
    const res = L.curves.map((c, i) => [c, i]).filter(([c, i]) => i > 0 && kindOf(c.m) && kindOf(c.m)[0] === "res").map(([, i]) => i).slice(0, 3); if (res.length) T.push(res);
    const t3 = [by("nphi"), by("rhob")].filter((i) => i > 0); if (t3.length) T.push(t3);
    const t4 = [by("pef"), by("dt")].filter((i) => i > 0); if (t4.length) T.push(t4);
    const used = new Set(T.flat());
    const rest = L.curves.map((c, i) => i).filter((i) => i > 0 && !used.has(i));
    while (T.length < 4 && rest.length) T.push([rest.shift()]);
    tracks = T.slice(0, 5).map((t) => t.map((i) => ({ i, ...range(L.curves[i]) })));
  };
  const load = (text, name) => {
    try { L = parse(text); } catch (e) { $("#lv-msg").textContent = "Не удалось прочитать файл: " + e.message; return; }
    const d = L.curves[0].v.filter((x) => x != null);
    top = Math.min(...d); span = Math.min(Math.max(...d) - top, 150);
    autoTracks();
    const w = L.well, g = (k) => (w[k] ? w[k].val || w[k].desc : "");
    $("#lv-msg").innerHTML = `<b>${esc(name)}</b> · ${esc(g("WELL") || "скважина не указана")}${g("FLD") ? " · " + esc(g("FLD")) : ""} · ${L.curves.length} кривых, ${L.curves[0].v.length} строк, ${fmt(Math.min(...d), 1)}–${fmt(Math.max(...d), 1)} ${esc(L.curves[0].unit || "")}`;
    $("#lv-work").hidden = false;
    drawEditor(); draw(); drawTable();
  };

  // ---------- редактор дорожек ----------
  const drawEditor = () => {
    $("#lv-ed").innerHTML = [0, 1, 2, 3, 4].map((ti) => `<fieldset><legend>Дорожка ${ti + 1}</legend>` + [0, 1, 2].map((ci) => { const c = tracks[ti] && tracks[ti][ci]; return `<div class="lv-row"><select data-t="${ti}" data-c="${ci}" aria-label="Дорожка ${ti + 1}, кривая ${ci + 1}">${curveOpt(c ? c.i : null)}</select>${c ? `<input data-t="${ti}" data-c="${ci}" data-k="min" value="${fmt(c.min, 2)}" aria-label="мин"><input data-t="${ti}" data-c="${ci}" data-k="max" value="${fmt(c.max, 2)}" aria-label="макс"><label class="lv-log"><input type="checkbox" data-t="${ti}" data-c="${ci}" data-k="log"${c.log ? " checked" : ""}>лог</label>` : ""}</div>`; }).join("") + "</fieldset>").join("");
  };
  $("#lv-ed").addEventListener("change", (e) => {
    const el = e.target, ti = +el.dataset.t, ci = +el.dataset.c; if (isNaN(ti)) return;
    tracks[ti] = tracks[ti] || [];
    if (el.tagName === "SELECT") { tracks[ti][ci] = el.value ? { i: +el.value, ...range(L.curves[+el.value]) } : null; tracks[ti] = tracks[ti].filter(Boolean); }
    else if (el.dataset.k === "log") tracks[ti][ci].log = el.checked;
    else { const v = parseFloat(el.value.replace(",", ".").replace("−", "-")); if (isFinite(v)) tracks[ti][ci][el.dataset.k] = v; }
    tracks = tracks.filter((t) => t && t.length);
    drawEditor(); draw();
  });

  // ---------- планшет ----------
  const xOf = (c, v, x0, w) => { const t = c.log ? (Math.log10(Math.max(v, 1e-4)) - Math.log10(Math.max(c.min, 1e-4))) / (Math.log10(c.max) - Math.log10(Math.max(c.min, 1e-4))) : (v - c.min) / (c.max - c.min); return x0 + Math.max(-0.02, Math.min(1.02, t)) * w; };
  const geom = () => { const r = cv.getBoundingClientRect(), HEAD = 16 + 30 * Math.max(1, ...tracks.map((t) => t.length)); return { W: r.width, H: r.height, DW: 64, HEAD, y0: HEAD + 4, ph: r.height - HEAD - 8 }; };
  const draw = () => {
    if (!L) return;
    const r = cv.getBoundingClientRect(), dpr = devicePixelRatio || 1;
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const { W, H, DW, y0, ph } = geom(), ink = css("--ink", "#eef3f5"), mut = css("--muted", "#9fb0b6"), line = css("--line", "#1f3038"), mono = css("--mono", "monospace");
    ctx.clearRect(0, 0, W, H);
    const D = L.curves[0].v, bot = top + span, Y = (d) => y0 + (d - top) / span * ph;
    const tw = (W - DW) / Math.max(1, tracks.length);
    ctx.font = "11px " + mono; ctx.textAlign = "right"; ctx.textBaseline = "middle";
    const step = span > 400 ? 50 : span > 150 ? 20 : span > 60 ? 10 : 5;
    for (let d = Math.ceil(top / step) * step; d <= bot; d += step) { const y = Y(d); ctx.strokeStyle = line; ctx.beginPath(); ctx.moveTo(DW, y); ctx.lineTo(W, y); ctx.stroke(); ctx.fillStyle = mut; ctx.fillText(String(Math.round(d * 10) / 10).replace(".", ","), DW - 8, y); }
    ctx.textBaseline = "alphabetic";
    // индексы видимого окна
    let i0 = 0, i1 = D.length - 1; while (i0 < D.length && (D[i0] == null || D[i0] < top - 1)) i0++; while (i1 > 0 && (D[i1] == null || D[i1] > bot + 1)) i1--;
    const stride = Math.max(1, Math.floor((i1 - i0) / (ph * 2)));
    tracks.forEach((tr, ti) => {
      const x0 = DW + ti * tw + 6, w = tw - 12;
      ctx.strokeStyle = line; ctx.strokeRect(DW + ti * tw + 0.5, y0, tw, ph);
      tr.forEach((c, ci) => {
        const cu = L.curves[c.i], col = COLORS[ci], hy = 6 + ci * 30;
        ctx.fillStyle = col; ctx.font = "600 11px " + mono; ctx.textAlign = "left"; ctx.fillText(cu.m + (cu.unit ? ", " + cu.unit : ""), x0, hy + 6);
        ctx.fillStyle = mut; ctx.font = "10px " + mono; ctx.fillText(fmt(c.min, 2), x0, hy + 19); ctx.textAlign = "right"; ctx.fillText(fmt(c.max, 2), x0 + w, hy + 19);
        ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0, hy + 24); ctx.lineTo(x0 + w, hy + 24); ctx.stroke();
        ctx.save(); ctx.beginPath(); ctx.rect(DW + ti * tw, y0, tw, ph); ctx.clip();
        ctx.lineWidth = 1.4; ctx.beginPath(); let pen = false;
        for (let k = i0; k <= i1; k += stride) { const v = cu.v[k], d = D[k]; if (v == null || d == null) { pen = false; continue; } const x = xOf(c, v, x0, w), y = Y(d); pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y); pen = true; }
        ctx.stroke(); ctx.restore(); ctx.lineWidth = 1;
      });
    });
    if (hover != null && hover >= top && hover <= bot) { const y = Y(hover); ctx.strokeStyle = ink; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(DW, y); ctx.lineTo(W, y); ctx.stroke(); ctx.globalAlpha = 1; }
    $("#lv-range").textContent = fmt(top, 1) + " – " + fmt(bot, 1) + " " + (L.curves[0].unit || "");
  };
  const nearest = (d) => { const D = L.curves[0].v; let b = 0, bd = Infinity; for (let k = 0; k < D.length; k++) { const e = Math.abs(D[k] - d); if (e < bd) { bd = e; b = k; } } return b; };
  cv.addEventListener("pointermove", (e) => {
    if (!L) return; const r = cv.getBoundingClientRect(), { y0, ph } = geom(), d = top + (e.clientY - r.top - y0) / ph * span; hover = d;
    const k = nearest(d);
    $("#lv-ro").innerHTML = `<b>${fmt(L.curves[0].v[k], 2)}</b> ` + tracks.flat().map((c) => `<span style="color:var(--ink)">${esc(L.curves[c.i].m)} ${fmt(L.curves[c.i].v[k], 3)}</span>`).join(" ");
    draw();
  });
  cv.addEventListener("wheel", (e) => {
    if (!L) return; e.preventDefault();
    const D = L.curves[0].v.filter((x) => x != null), lo = Math.min(...D), hi = Math.max(...D);
    if (e.ctrlKey || e.metaKey) span = Math.max(5, Math.min(hi - lo, span * Math.exp(e.deltaY * 0.002)));
    else top = Math.max(lo, Math.min(hi - span, top + e.deltaY / 400 * span));
    draw();
  }, { passive: false });
  let drag = null;
  cv.addEventListener("pointerdown", (e) => { drag = [e.clientY, top]; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener("pointerup", () => (drag = null));
  cv.addEventListener("pointermove", (e) => { if (!drag || !L) return; const { ph } = geom(), D = L.curves[0].v.filter((x) => x != null); top = Math.max(Math.min(...D), Math.min(Math.max(...D) - span, drag[1] - (e.clientY - drag[0]) / ph * span)); draw(); });
  root.querySelectorAll("[data-span]").forEach((b) => b.onclick = () => { if (!L) return; const D = L.curves[0].v.filter((x) => x != null); span = b.dataset.span === "all" ? Math.max(...D) - Math.min(...D) : +b.dataset.span; top = Math.max(Math.min(...D), Math.min(top, Math.max(...D) - span)); draw(); });

  // ---------- таблица кривых ----------
  const drawTable = () => {
    $("#lv-tab").innerHTML = "<table><thead><tr><th>Мнемоника</th><th>Единица</th><th>Описание</th><th>Мин.</th><th>Макс.</th><th>Пусто</th></tr></thead><tbody>" + L.curves.map((c) => { const v = c.v.filter((x) => x != null); return `<tr><td><code>${esc(c.m)}</code></td><td>${esc(c.unit)}</td><td>${esc(c.desc)}</td><td>${fmt(Math.min(...v), 3)}</td><td>${fmt(Math.max(...v), 3)}</td><td>${c.v.length - v.length}</td></tr>`; }).join("") + "</tbody></table>";
  };

  // ---------- загрузка ----------
  const file = $("#lv-file"), drop = $("#lv-drop");
  file.onchange = async () => { if (file.files[0]) load(await decode(file.files[0]), file.files[0].name); };
  ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("on"); }));
  ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("on"); }));
  drop.addEventListener("drop", async (e) => { const f = e.dataTransfer.files[0]; if (f) load(await decode(f), f.name); });
  $("#lv-sample").onclick = () => load(sample(), "учебный-пример.las");
  $("#lv-png").onclick = () => { const a = document.createElement("a"); a.href = cv.toDataURL("image/png"); a.download = "planshet-drillharmony.png"; a.click(); };
  addEventListener("resize", draw);
  new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
})();
