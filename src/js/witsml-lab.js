// DrillHarmony · Лаборатория WITSML: планшет, приборы, мнемоники и шаблоны ННБ.
// Всё считается в браузере на учебной модели горизонтального участка.
// Модель и код — собственные; физика каротажа упрощена для наглядности.
(() => {
  const root = document.getElementById("wl");
  if (!root) return;
  const $ = (s) => root.querySelector(s), $$ = (s) => [...root.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const fmt = (v, d) => (v == null || !isFinite(v) ? "—" : (+v).toFixed(d).replace(".", ",").replace(/^-/, "−"));
  const NULL = -999.25;                                     // nullValue в заголовке log
  const store = { get(k, d) { try { const v = localStorage.getItem("dh-wl-" + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
                  set(k, v) { try { localStorage.setItem("dh-wl-" + k, JSON.stringify(v)); } catch (e) {} } };

  // ---------------- 1. Каналы: что означает кривая ----------------
  // k — внутренний ключ (он же типичная мнемоника), u — единица WITSML, ru — подпись,
  // min/max — шкала по умолчанию, log — логарифмическая шкала, al — частые синонимы.
  const CATS = { drill: "Бурение (станция ГТИ)", dir: "Инклинометрия и ориентирование", mech: "Механика и вибрации",
                 tel: "Телеметрия", gr: "Гамма-каротаж", res: "Сопротивление", nuc: "Радиоактивный каротаж" };
  const CH = [
    ["DEPT", "Глубина по стволу (индекс)", "m", "м", "drill", 0, 0, 1, ["MD", "DMEA", "DEPTH", "GLUB", "MDEPTH"]],
    ["BDEP", "Глубина долота", "m", "м", "drill", 0, 0, 1, ["DBTM", "BITDEPTH", "BIT_MD", "GLUB_DOL"]],
    ["ROP", "Механическая скорость", "m/h", "м/ч", "drill", 0, 60, 1, ["ROPA", "ROP5", "MSP", "VMEX", "ROP_AVG"]],
    ["WOB", "Нагрузка на долото", "t", "т", "drill", 0, 25, 1, ["WOBA", "SWOB", "NAGR", "WOB_SURF"]],
    ["RPM", "Обороты ротора / СВП", "rpm", "об/мин", "drill", 0, 120, 0, ["RPMA", "SRPM", "TDRPM", "OBOR"]],
    ["TQ", "Момент на роторе / СВП", "kN.m", "кН·м", "drill", 0, 30, 1, ["TQA", "STOR", "TORQ", "MOM"]],
    ["SPP", "Давление на стояке", "MPa", "МПа", "drill", 0, 30, 1, ["SPPA", "PRES", "DAVL", "PUMP_P"]],
    ["FLWI", "Расход на входе", "L/s", "л/с", "drill", 0, 50, 1, ["MFIA", "FLOW", "RASH", "Q_IN"]],
    ["HKLD", "Вес на крюке", "t", "т", "drill", 0, 200, 1, ["HKLA", "HOOK", "VES", "HKL"]],
    ["INC", "Зенитный угол", "dega", "°", "dir", 85, 95, 2, ["INCL", "SINC", "ZEN", "INCLIN"]],
    ["AZI", "Азимут", "dega", "°", "dir", 0, 360, 1, ["AZIM", "SAZC", "AZ", "AZIMUTH"]],
    ["GTF", "Гравитационный toolface", "dega", "°", "dir", 0, 360, 0, ["TFG", "SGTF", "GTFA", "TF_GRAV"]],
    ["MTF", "Магнитный toolface", "dega", "°", "dir", 0, 360, 0, ["TFM", "SMTF", "MTFA", "TF_MAG"]],
    ["DLS", "Интенсивность искривления", "dega/30m", "°/30 м", "dir", 0, 8, 2, ["SDLS", "DOGLEG", "INT"]],
    ["TVD", "Глубина по вертикали", "m", "м", "dir", 2280, 2300, 2, ["DVER", "TVDM", "ABSV"]],
    ["TEMP", "Температура прибора", "degC", "°C", "mech", 60, 100, 1, ["TEMPDH", "TMP", "TEMP_DH"]],
    ["SHK", "Удары (пиковое ускорение)", "g", "g", "mech", 0, 40, 1, ["SHOCK", "SHKPK", "AXSHK", "SHOCK_PK"]],
    ["VIBL", "Поперечные вибрации", "g", "g", "mech", 0, 10, 1, ["LATVIB", "VIBX", "LVIB", "LAT_VIB"]],
    ["SSLP", "Stick-slip, размах оборотов", "%", "%", "mech", 0, 150, 0, ["STICK", "SSI", "RPMV", "SS_IDX"]],
    ["PULSE", "Амплитуда импульса", "kPa", "кПа", "tel", 0, 200, 0, ["PAMP", "SIGAMP", "PPAMP", "SIG_AMP"]],
    ["DQ", "Качество декодирования", "%", "%", "tel", 0, 100, 0, ["DECQ", "SYNC", "QUAL", "DEC_Q"]],
    ["BITR", "Скорость передачи", "bit/s", "бит/с", "tel", 0, 6, 1, ["BAUD", "BPS", "TRATE", "TX_RATE"]],
    ["GR", "Гамма-каротаж", "gAPI", "API", "gr", 0, 150, 1, ["GRC", "GRAM", "GAM", "GAMMA", "GK", "GAMMA_API"]],
    ["GRU", "Гамма верх (азимутальный)", "gAPI", "API", "gr", 0, 150, 1, ["GR_UP", "GRUP", "AGRU", "GAMMA_UP"]],
    ["GRD", "Гамма низ (азимутальный)", "gAPI", "API", "gr", 0, 150, 1, ["GR_DN", "GRDN", "AGRD", "GAMMA_DN"]],
    ["RPD", "Сопротивление, фаза, глубокий", "ohm.m", "Ом·м", "res", 0.2, 200, 2, ["RES_DEEP", "RD", "RDEEP", "PHD"]],
    ["RPS", "Сопротивление, фаза, мелкий", "ohm.m", "Ом·м", "res", 0.2, 200, 2, ["RES_SHAL", "RS", "RSHAL", "PHS"]],
    ["RAD", "Сопротивление, затухание, глубокий", "ohm.m", "Ом·м", "res", 0.2, 200, 2, ["ATD", "RATD", "ATTD"]],
    ["NPHI", "Нейтронная пористость", "v/v", "д. ед.", "nuc", 0.45, -0.15, 3, ["NPOR", "NEU", "NKT", "NEU_POR"]],
    ["RHOB", "Объёмная плотность", "g/cm3", "г/см³", "nuc", 1.95, 2.95, 3, ["DEN", "GGKP", "DEN_BULK"]],
    ["DRHO", "Поправка плотности", "g/cm3", "г/см³", "nuc", -0.25, 0.25, 3, ["DCOR", "DEN_CORR"]],
    ["PEF", "Фотоэлектрический индекс", "b/e", "б/э", "nuc", 0, 10, 2, ["PE", "PE_FACT"]],
    ["CALI", "Каверномер (по плотностному)", "mm", "мм", "nuc", 180, 260, 1, ["CAL", "DCAL", "KAV", "CALIPER"]],
  ].map(([k, n, u, ru, cat, min, max, d, al]) => ({ k, n, u, ru, cat, min, max, d, log: cat === "res", al }));
  const C = Object.fromEntries(CH.map((c) => [c.k, c]));
  const COLORS = ["#f5a524", "#5ec8d8", "#ff7a6b", "#9b8cff", "#5fd18b"];

  // ---------------- 2. Источники: как кривые названы на сервере ----------------
  // [мнемоника на сервере, единица, описание, что это на самом деле, перевод единиц]
  const SRC = {
    std: { n: "Типовые мнемоники (LAS / WITSML)", curves: CH.filter((c) => c.k !== "MTF" && c.k !== "RAD").map((c) => [c.k, c.u, c.n, c.k]) },
    svc: { n: "Пример: сервисная компания А", curves: [
      ["DEPTH", "m", "Measured depth", "DEPT"], ["ROP_AVG", "m/h", "ROP average", "ROP"], ["SWOB", "t", "Surface WOB", "WOB"],
      ["SRPM", "rpm", "Surface RPM", "RPM"], ["INCLIN", "dega", "Inclination", "INC"], ["AZIMUTH", "dega", "Azimuth corrected", "AZI"],
      ["TF", "dega", "Toolface (gravity above 5 deg inclination)", "GTF"], ["GAMMA_API", "gAPI", "Gamma ray, corrected", "GR"],
      ["GAMMA_UP", "gAPI", "Azimuthal gamma, top sector", "GRU"], ["GAMMA_DN", "gAPI", "Azimuthal gamma, bottom sector", "GRD"],
      ["RES_1", "ohm.m", "Phase resistivity, short spacing", "RPS"], ["RES_2", "ohm.m", "Phase resistivity, long spacing", "RPD"],
      ["NEU_POR", "%", "Neutron porosity, limestone matrix", "NPHI"], ["DEN_BULK", "kg/m3", "Bulk density", "RHOB"],
      ["DEN_CORR", "kg/m3", "Density correction", "DRHO"], ["PE_FACT", "b/e", "Photoelectric factor", "PEF"],
      ["CALIPER", "mm", "Density caliper", "CALI"], ["SHOCK_PK", "g", "Peak shock", "SHK"], ["LAT_VIB", "g", "Lateral vibration RMS", "VIBL"],
      ["SS_IDX", "%", "Stick-slip index", "SSLP"], ["TEMP_DH", "degC", "Downhole temperature", "TEMP"],
      ["SIG_AMP", "kPa", "Pulse amplitude", "PULSE"], ["DEC_Q", "%", "Decode quality", "DQ"], ["TX_RATE", "bit/s", "Telemetry rate", "BITR"],
    ] },
    rus: { n: "Пример: станция ГТИ + телесистема (транслит)", curves: [
      ["GLUB", "m", "Глубина забоя", "DEPT"], ["GLUB_DOL", "m", "Глубина долота", "BDEP"], ["MSP", "m/h", "Мех. скорость", "ROP"],
      ["NAGR", "t", "Нагрузка на долото", "WOB"], ["VES", "t", "Вес на крюке", "HKLD"], ["OBOR", "rpm", "Обороты ротора", "RPM"],
      ["MOM", "kN.m", "Момент на роторе", "TQ"], ["DAVL", "MPa", "Давление на входе", "SPP"], ["RASH", "L/s", "Расход на входе", "FLWI"],
      ["ZEN", "dega", "Зенит", "INC"], ["AZ", "dega", "Азимут", "AZI"], ["UGOL_UST", "dega", "Угол установки отклонителя", "GTF"],
      ["INT", "dega/30m", "Интенсивность", "DLS"], ["GK", "gAPI", "Гамма-каротаж", "GR"], ["UES_D", "ohm.m", "УЭС, дальний зонд", "RPD"],
      ["UES_B", "ohm.m", "УЭС, ближний зонд", "RPS"], ["NKT", "v/v", "Нейтронный каротаж (пористость)", "NPHI"],
      ["GGKP", "g/cm3", "ГГК-П, плотность", "RHOB"], ["TEMP", "degC", "Температура в приборе", "TEMP"], ["VIBR", "g", "Вибрации", "VIBL"],
    ] },
  };
  const CONV = { "%>v/v": 0.01, "kg/m3>g/cm3": 0.001, "ft>m": 0.3048, "ft/h>m/h": 0.3048, "kPa>MPa": 0.001, "API>gAPI": 1 };
  const conv = (from, to) => (from === to ? 1 : CONV[from + ">" + to] ?? null);

  // ---------------- 3. Учебная модель: пласт и бурение ----------------
  let seed = 41; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 0.75;
  const erf = (x) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)), y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x < 0 ? -y : y; };
  const PHI = (x) => 0.5 * (1 + erf(x / Math.SQRT2));
  // слои по относительной глубине r (м от кровли коллектора); пласты чуть восстают по ходу ствола
  const LAY = [
    [-1e9, 0, { GR: 105, RT: 3.5, NPHI: 0.34, RHOB: 2.52, PEF: 3.2, ROP: 12, cav: 9 }],   // глина-покрышка
    [0, 1.6, { GR: 36, RT: 80, NPHI: 0.12, RHOB: 2.16, PEF: 1.8, ROP: 24, cav: 0 }],      // песчаник с газом
    [1.6, 6, { GR: 40, RT: 42, NPHI: 0.21, RHOB: 2.31, PEF: 1.9, ROP: 22, cav: 0 }],      // песчаник с нефтью
    [6, 7.6, { GR: 110, RT: 3.2, NPHI: 0.35, RHOB: 2.54, PEF: 3.3, ROP: 11, cav: 7 }],    // глинистый прослой
    [7.6, 8.5, { GR: 22, RT: 180, NPHI: 0.04, RHOB: 2.66, PEF: 5.0, ROP: 5, cav: 0 }],    // плотный известняк
    [8.5, 1e9, { GR: 100, RT: 4, NPHI: 0.33, RHOB: 2.5, PEF: 3.1, ROP: 12, cav: 6 }],     // глина
  ];
  const TOP0 = 2288.5, DIP = 0.009;                 // кровля по вертикали и восстание, м/м
  const rel = (tvd, md) => tvd - (TOP0 - (md - 2600) * DIP);
  const prop = (r, s, key, logm) => {
    let v = 0;
    for (const [a, b, p] of LAY) { const w = PHI((b - r) / s) - PHI((a - r) / s); if (w > 1e-6) v += w * (logm ? Math.log(p[key]) : p[key]); }
    return logm ? Math.exp(v) : v;
  };
  // расстояния от датчика до долота, м
  const OFF = { dir: 16.2, GR: 14.5, RES: 12.9, NUC: 19.8 };

  // траектория: точки каждые 0,25 м {md, inc, tvd}; ведём слайдами, держа ствол в коллекторе
  const path = [{ md: 2500, inc: 90.4, tvd: 2291.6, az: 145.2 }];
  let mode = "rot", segLeft = 18, slideTF = 0;
  const tvdAt = (md) => { const i = Math.max(0, Math.min(path.length - 1, Math.round((md - 2500) / 0.25))); return path[i]; };
  const growPath = (toMd) => {
    while (path[path.length - 1].md < toMd) {
      const p = path[path.length - 1], md = p.md + 0.25;
      let inc = p.inc;
      if (mode === "slide") inc += (Math.cos(slideTF * Math.PI / 180) * 3.2 / 30) * 0.25;    // ВЗД 3,2°/30 м
      else inc += (-0.25 + gauss() * 0.4) / 30 * 0.25;                                        // ротор: лёгкий спад
      const tvd = p.tvd + 0.25 * Math.cos(((p.inc + inc) / 2) * Math.PI / 180);
      path.push({ md, inc, tvd, az: p.az + gauss() * 0.01 });
    }
  };

  // запись по глубине: {md, v:{key:value}}, значения каротажа — на глубине своего датчика
  const rows = [];
  let bit = 2500, simT = 0, dqDrop = 0, gtfSet = 20;
  const sample = (bitMd) => {
    growPath(bitMd);
    const P = tvdAt(bitMd), lay = LAY.find(([a, b]) => { const r = rel(P.tvd, bitMd); return r >= a && r < b; })[2];
    const slide = mode === "slide";
    const v = {};
    v.DEPT = bitMd; v.BDEP = bitMd;
    const rop = Math.max(1, lay.ROP * (slide ? 0.55 : 1) * (1 + gauss() * 0.12));
    v.ROP = rop; v.WOB = (slide ? 11.5 : 7.5) + gauss() * 0.8; v.RPM = slide ? 0 : 60 + gauss() * 2;
    v.TQ = slide ? NULL : 13 + gauss() * 1.2 + (lay.RT > 100 ? 4 : 0); v.SPP = 17.8 + (slide ? 1.6 : 0.9) + gauss() * 0.25;
    v.FLWI = 32 + gauss() * 0.3; v.HKLD = (slide ? 83 : 96) + gauss() * 1.5;
    const S = tvdAt(bitMd - OFF.dir);
    v.INC = S.inc + gauss() * 0.03; v.AZI = S.az + gauss() * 0.05; v.TVD = S.tvd;
    const S2 = tvdAt(bitMd - OFF.dir - 9.6);
    v.DLS = Math.abs(S.inc - S2.inc) / 9.6 * 30;
    v.GTF = slide ? ((gtfSet + gauss() * 10) % 360 + 360) % 360 : NULL;
    v.MTF = NULL;                                       // на зените ~90° магнитный toolface не используют
    v.TEMP = 78 + (bitMd - 2500) * 0.004 + gauss() * 0.2;
    const hard = lay.RT > 100;
    v.SHK = Math.max(0, (hard ? 14 : 3.5) + gauss() * (hard ? 5 : 1.5)); v.VIBL = Math.max(0, (hard ? 4.5 : 1.2) + gauss() * 0.5);
    v.SSLP = slide ? 0 : Math.max(0, (hard ? 95 : 35) + gauss() * 12);
    if (dqDrop > 0) dqDrop--; else if (rnd() < 0.01) dqDrop = 24;
    v.PULSE = Math.max(10, (dqDrop ? 45 : 92) + gauss() * 8); v.DQ = Math.min(100, Math.max(0, (dqDrop ? 61 : 98) + gauss() * 2)); v.BITR = 1.5;
    // каротаж
    const at = (off) => { const m = bitMd - off, Q = tvdAt(m); return rel(Q.tvd, m); };
    const rg = at(OFF.GR), rr = at(OFF.RES), rn = at(OFF.NUC);
    v.GR = prop(rg, 0.3, "GR") + gauss() * 2;
    v.GRU = prop(rg - 0.45, 0.22, "GR") + gauss() * 3.5; v.GRD = prop(rg + 0.45, 0.22, "GR") + gauss() * 3.5;
    v.RPD = prop(rr, 1.2, "RT", 1) * (1 + gauss() * 0.03); v.RPS = prop(rr, 0.35, "RT", 1) * 0.72 * (1 + gauss() * 0.04);
    v.RAD = prop(rr, 1.6, "RT", 1) * (1 + gauss() * 0.05);
    const cav = prop(rn, 0.3, "cav");
    v.NPHI = prop(rn, 0.3, "NPHI") + gauss() * 0.008 + cav * 0.002; v.RHOB = prop(rn, 0.25, "RHOB") + gauss() * 0.012 - cav * 0.004;
    v.DRHO = gauss() * 0.012 + cav * 0.006; v.PEF = prop(rn, 0.25, "PEF") + gauss() * 0.08; v.CALI = 216 + cav * 1.1 + Math.abs(gauss()) * 1.2;
    return { md: bitMd, v, rop, slide };
  };
  const advance = (dm) => {
    let left = dm;
    while (left > 0) {
      const step = Math.min(left, 0.25 - ((bit - 2500) % 0.25) || 0.25);
      bit = +(bit + step).toFixed(4); left -= step; segLeft -= step;
      if (segLeft <= 0) {
        if (mode === "rot") {
          // геонавигатор держит ствол в коллекторе: цель по глубине медленно «гуляет»,
          // чтобы ствол подходил то к газовой шапке, то к глинистой подошве
          const P = tvdAt(bit - OFF.dir), r = rel(P.tvd, bit), want = 3.2 + 2.8 * Math.sin((bit - 2500) / 55);
          const incWant = 90 + Math.atan(DIP) * 180 / Math.PI + (r - want) * 0.9;   // глубже цели — поднимаем зенит
          if (Math.abs(P.inc - incWant) > 0.25) { mode = "slide"; segLeft = Math.min(9, 2 + Math.abs(P.inc - incWant) / 3.2 * 30); gtfSet = P.inc < incWant ? 10 + gauss() * 15 : 190 + gauss() * 15; slideTF = gtfSet; }
          else segLeft = 6 + rnd() * 6;
        } else { mode = "rot"; segLeft = 14 + rnd() * 10; }
      }
      if (Math.abs(((bit - 2500) / 0.25) - Math.round((bit - 2500) / 0.25)) < 1e-6) rows.push(sample(bit));
    }
  };
  advance(260);                                          // история до начала показа: 2500→2760 м

  // ---------------- 4. Состояние интерфейса ----------------
  const TEMPL = {
    slide: { n: "Слайд и ориентирование", t: [[["ROP"], ["WOB"]], [["RPM"], ["TQ"]], [["INC"], ["DLS"]], [["GTF"]], [["SPP"], ["FLWI"]]], g: ["GTF", "INC", "AZI", "DLS", "ROP", "WOB", "SPP", "RPM"] },
    geo: { n: "Геонавигация: ГК + УЭС", t: [[["GR"], ["GRU"], ["GRD"]], [["RPD"], ["RPS"]], [["INC"]], [["TVD"]]], g: ["GR", "GRU", "GRD", "RPD", "RPS", "INC", "TVD", "ROP"] },
    nuc: { n: "Радиоактивный каротаж", t: [[["GR"], ["CALI"]], [["NPHI"], ["RHOB"]], [["PEF"], ["DRHO"]], [["RPD"]]], g: ["GR", "NPHI", "RHOB", "PEF", "DRHO", "CALI", "RPD", "TEMP"] },
    mech: { n: "Механика и вибрации", t: [[["WOB"], ["TQ"]], [["RPM"], ["SSLP"]], [["SHK"], ["VIBL"]], [["TEMP"]], [["HKLD"]]], g: ["WOB", "TQ", "RPM", "SSLP", "SHK", "VIBL", "TEMP", "HKLD"] },
    tel: { n: "Телеметрия и сигнал", t: [[["PULSE"], ["SPP"]], [["DQ"]], [["BITR"]], [["FLWI"]]], g: ["PULSE", "DQ", "BITR", "SPP", "FLWI", "TEMP", "INC", "GR"] },
  };
  TEMPL.my = store.get("my", { n: "Мой шаблон", t: TEMPL.geo.t.map((tr) => tr.map((c) => c.slice())), g: TEMPL.geo.g.slice() });
  TEMPL.my.n = "Мой шаблон";
  let src = store.get("src", "svc"); if (!SRC[src]) src = "svc";
  let tpl = store.get("tpl", "geo"); if (!TEMPL[tpl]) tpl = "geo";
  let userAl = store.get("al", {});                     // {KEY: ["SYN1",...]} — синонимы, добавленные пользователем
  let maps = store.get("maps", {});                     // {src: {serverMnem: channelKey | ""}}
  let playing = true, speed = 4, win = 60, hoverMd = null;

  const aliasesOf = (c) => [c.k, ...c.al, ...(userAl[c.k] || [])].map((s) => s.toUpperCase());
  const autoMap = (m) => { const M = m.toUpperCase(); const c = CH.find((c) => aliasesOf(c).includes(M)); return c ? c.k : ""; };
  const mapping = () => {                               // serverMnem -> {key, how}
    const out = {}, man = maps[src] || {};
    for (const [m] of SRC[src].curves) {
      if (m in man) out[m] = { key: man[m], how: man[m] ? "man" : "none" };
      else { const k = autoMap(m); out[m] = { key: k, how: k ? "auto" : "none" }; }
    }
    return out;
  };
  // канал -> откуда берём данные: {m: мнемоника на сервере, truth: что в кривой на самом деле, f: множитель единиц}
  const binding = () => {
    const mp = mapping(), b = {};
    for (const [m, u, , truth] of SRC[src].curves) {
      const k = mp[m].key; if (!k || b[k]) continue;
      b[k] = { m, u, truth, f: conv(u, C[k].u) };
    }
    return b;
  };
  let BIND = binding();
  const valueOf = (row, k) => {
    const b = BIND[k]; if (!b) return null;
    const raw = row.v[b.truth]; if (raw == null || raw === NULL) return null;
    const truthU = C[b.truth].u, srvU = b.u;
    const inSrv = raw / (conv(srvU, truthU) || 1);       // как значение лежит на сервере (в единицах сервера)
    return b.f == null ? inSrv : inSrv * b.f;            // нет перевода единиц — оставляем как есть
  };

  // ---------------- 5. Планшет ----------------
  const cv = $("#wl-cv"), ctx = cv.getContext("2d");
  const css = (n, d) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || d;
  const xOf = (c, v, x0, w) => {
    let t = c.log ? (Math.log10(Math.max(v, 1e-3)) - Math.log10(c.min)) / (Math.log10(c.max) - Math.log10(c.min)) : (v - c.min) / (c.max - c.min);
    return x0 + Math.max(-0.02, Math.min(1.02, t)) * w;
  };
  const drawPlot = () => {
    const r = cv.getBoundingClientRect(), dpr = devicePixelRatio || 1;
    if (!r.width) return;
    if (cv.width !== Math.round(r.width * dpr) || cv.height !== Math.round(r.height * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = r.width, H = r.height, ink = css("--ink", "#eef3f5"), mut = css("--muted", "#9fb0b6"), line = css("--line", "#1f3038"), mono = css("--mono", "monospace"), bg = css("--panel", "#101b21");
    ctx.clearRect(0, 0, W, H);
    const T = TEMPL[tpl].t, HEAD = 18 + 30 * Math.max(...T.map((tr) => tr.filter((c) => c[0]).length), 1), DW = W < 520 ? 66 : 74;
    const tw = (W - DW) / T.length, y0 = HEAD + 4, ph = H - y0 - 4;
    const top = bit - win * 0.92, bot = bit + win * 0.08, yOf = (md) => y0 + ((md - top) / (bot - top)) * ph;
    // сетка глубин
    ctx.font = "11px " + mono; ctx.textAlign = "right"; ctx.textBaseline = "middle";
    const step = win > 100 ? 10 : 5;
    for (let d = Math.ceil(top / step) * step; d < bot; d += step) {
      const y = yOf(d); ctx.strokeStyle = line; ctx.globalAlpha = d % (step * 2) ? 0.5 : 1; ctx.beginPath(); ctx.moveTo(DW, y); ctx.lineTo(W, y); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.fillStyle = mut; ctx.fillText(d.toFixed(0), DW - 13, y);
    }
    // слайды на дорожке глубин
    for (const rw of rows) if (rw.slide && rw.md >= top && rw.md <= bot) { ctx.fillStyle = "rgba(245,165,36,.45)"; ctx.fillRect(DW - 5, yOf(rw.md - 0.25), 4, Math.max(1, yOf(rw.md) - yOf(rw.md - 0.25))); }
    ctx.textAlign = "left"; ctx.fillStyle = mut; ctx.fillText("MD, м", 4, 10);
    const vis = rows.filter((rw) => rw.md >= top - 25 && rw.md <= bot + 1);
    T.forEach((tr, ti) => {
      ctx.save(); ctx.beginPath(); ctx.rect(DW, 0, W - DW, H); ctx.clip();
      const x0 = DW + ti * tw + 6, w = tw - 12;
      ctx.strokeStyle = line; ctx.strokeRect(DW + ti * tw + 0.5, y0, tw, ph);
      if (C[tr[0] && tr[0][0]] && C[tr[0][0]].log) {                 // декады лог-шкалы
        for (const dec of [0.2, 2, 20, 200, 1, 10, 100]) { const x = xOf(C[tr[0][0]], dec, x0, w); ctx.globalAlpha = String(dec)[0] === "1" ? 0.6 : 0.25; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + ph); ctx.stroke(); }
        ctx.globalAlpha = 1;
      }
      const curves = tr.filter((c) => c && c[0] && C[c[0]]);
      // заливки: песчаник по ГК, перекрытие нейтрон-плотность (газ)
      const has = (k) => curves.some((c) => c[0] === k);
      ctx.save(); ctx.beginPath(); ctx.rect(DW, y0, W - DW, ph); ctx.clip();
      if (has("GR") && BIND.GR) {
        ctx.fillStyle = "rgba(245,200,70,.16)"; ctx.beginPath(); let first = true;
        const cut = xOf(C.GR, 70, x0, w);
        let yl = 0;
        for (const rw of vis) { const v = valueOf(rw, "GR"); if (v == null) continue; const y = yOf(rw.md - OFF.GR), x = Math.min(cut, xOf(C.GR, v, x0, w)); first ? (ctx.moveTo(cut, y), ctx.lineTo(x, y), first = false) : ctx.lineTo(x, y); yl = y; }
        ctx.lineTo(cut, yl); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "rgba(245,200,70,.4)"; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(cut, y0); ctx.lineTo(cut, y0 + ph); ctx.stroke(); ctx.setLineDash([]);
      }
      if (has("NPHI") && has("RHOB") && BIND.NPHI && BIND.RHOB) {
        for (const rw of vis) {
          const n = valueOf(rw, "NPHI"), d = valueOf(rw, "RHOB"); if (n == null || d == null) continue;
          const xn = xOf(C.NPHI, n, x0, w), xd = xOf(C.RHOB, d, x0, w);
          if (xd < xn) { ctx.fillStyle = "rgba(255,90,70,.35)"; ctx.fillRect(xd, yOf(rw.md - OFF.NUC - 0.25), xn - xd, Math.max(1, ph / win * 0.25 + 0.5)); }
        }
      }
      ctx.restore();
      curves.forEach((c, ci) => {
        const ch = C[c[0]], col = COLORS[ci % COLORS.length], b = BIND[c[0]];
        // заголовок кривой
        const hy = 6 + ci * 30;
        ctx.fillStyle = col; ctx.font = "600 11px " + mono; ctx.textAlign = "left";
        ctx.fillText((b ? b.m : c[0]) + (b && b.m !== c[0] ? " → " + c[0] : ""), x0, hy + 6);
        ctx.fillStyle = mut; ctx.font = "10px " + mono;
        ctx.fillText(fmt(ch.min, ch.min % 1 ? 2 : 0), x0, hy + 19); ctx.textAlign = "right"; ctx.fillText(fmt(ch.max, ch.max % 1 ? 2 : 0) + " " + ch.ru, x0 + w, hy + 19);
        ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0, hy + 24); ctx.lineTo(x0 + w, hy + 24); ctx.stroke();
        if (!b) { ctx.fillStyle = mut; ctx.textAlign = "center"; ctx.fillText("нет кривой", x0 + w / 2, y0 + 20 + ci * 14); return; }
        const off = ["GR", "GRU", "GRD"].includes(c[0]) ? OFF.GR : ["RPD", "RPS", "RAD"].includes(c[0]) ? OFF.RES : ch.cat === "nuc" ? OFF.NUC : ["INC", "AZI", "DLS", "TVD", "GTF", "MTF"].includes(c[0]) ? OFF.dir : 0;
        // реальная кривая лежит на глубине датчика truth-канала
        const toff = (() => { const t = b.truth; return ["GR", "GRU", "GRD"].includes(t) ? OFF.GR : ["RPD", "RPS", "RAD"].includes(t) ? OFF.RES : C[t].cat === "nuc" ? OFF.NUC : ["INC", "AZI", "DLS", "TVD", "GTF", "MTF"].includes(t) ? OFF.dir : 0; })();
        ctx.save(); ctx.beginPath(); ctx.rect(DW, y0, W - DW, ph); ctx.clip();
        ctx.strokeStyle = col; ctx.lineWidth = c[0] === "GTF" ? 0 : 1.6; ctx.beginPath(); let pen = false;
        for (const rw of vis) {
          const v = valueOf(rw, c[0]); const y = yOf(rw.md - toff);
          if (v == null) { pen = false; continue; }
          const x = xOf(ch, v, x0, w);
          if (c[0] === "GTF" || c[0] === "MTF") { ctx.fillStyle = col; ctx.fillRect(x - 1.5, y - 1.5, 3, 3); continue; }
          pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y); pen = true;
        }
        ctx.stroke(); ctx.lineWidth = 1; ctx.restore();
        void off;
      });
      ctx.restore();
    });
    // долото и датчики
    const yb = yOf(bit);
    ctx.fillStyle = css("--amber", "#f5a524"); ctx.beginPath(); ctx.moveTo(DW - 2, yb); ctx.lineTo(DW - 12, yb - 6); ctx.lineTo(DW - 12, yb + 6); ctx.fill();
    ctx.strokeStyle = ctx.fillStyle; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(DW, yb); ctx.lineTo(W, yb); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = "600 10.5px " + mono; ctx.textAlign = "right"; ctx.fillText("долото " + fmt(bit, 1), W - 6, yb - 6);
    // датчики: метки в дорожке глубин, без наложения друг на друга
    const sens = [["ГК", OFF.GR], ["УЭС", OFF.RES], ["ИНКЛ", OFF.dir], ["ННК", OFF.NUC]].map(([n, o]) => ({ n, y: yOf(bit - o) })).sort((a, b) => a.y - b.y);
    for (let i = 1; i < sens.length; i++) if (sens[i].y - sens[i - 1].y < 11) sens[i].ly = (sens[i - 1].ly ?? sens[i - 1].y) + 11;
    ctx.font = "600 9.5px " + mono; ctx.textAlign = "left";
    sens.forEach((p) => { const ly = p.ly ?? p.y; ctx.fillStyle = css("--amber", "#f5a524"); ctx.fillRect(DW - 10, p.y - 0.75, 10, 1.5); ctx.fillStyle = ink; ctx.fillText(p.n, 3, ly + 3); ctx.strokeStyle = mut; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.moveTo(3 + ctx.measureText(p.n).width + 2, ly); ctx.lineTo(DW - 10, p.y); ctx.stroke(); ctx.globalAlpha = 1; });
    // курсор
    if (hoverMd != null && hoverMd > top && hoverMd < bot) {
      const y = yOf(hoverMd); ctx.strokeStyle = ink; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.moveTo(DW, y); ctx.lineTo(W, y); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.fillStyle = bg; ctx.fillRect(0, y - 9, DW - 2, 18); ctx.fillStyle = ink; ctx.textAlign = "right"; ctx.font = "600 11px " + mono; ctx.fillText(fmt(hoverMd, 1), DW - 6, y);
    }
  };
  const readout = $("#wl-ro");
  cv.addEventListener("pointermove", (e) => {
    const r = cv.getBoundingClientRect(), T = TEMPL[tpl].t, HEAD = 18 + 30 * Math.max(...T.map((tr) => tr.filter((c) => c[0]).length), 1), y0 = HEAD + 4, ph = r.height - y0 - 4;
    const top = bit - win * 0.92, bot = bit + win * 0.08, md = top + ((e.clientY - r.top - y0) / ph) * (bot - top);
    hoverMd = md;
    const keys = [...new Set(T.flat().map((c) => c[0]).filter(Boolean))];
    readout.innerHTML = "<b>MD " + fmt(md, 1) + " м</b> " + keys.map((k) => {
      const b = BIND[k]; if (!b) return "";
      const t = b.truth, toff = ["GR", "GRU", "GRD"].includes(t) ? OFF.GR : ["RPD", "RPS", "RAD"].includes(t) ? OFF.RES : C[t].cat === "nuc" ? OFF.NUC : ["INC", "AZI", "DLS", "TVD", "GTF", "MTF"].includes(t) ? OFF.dir : 0;
      const rw = rows.find((x) => Math.abs(x.md - toff - md) < 0.13);
      return "<span>" + esc(k) + " " + (rw ? fmt(valueOf(rw, k), C[k].d) : "—") + "</span>";
    }).join("");
    playing || drawPlot();
  });
  cv.addEventListener("pointerleave", () => { hoverMd = null; readout.innerHTML = "Наведите на планшет, и он покажет значения на глубине."; playing || drawPlot(); });

  // ---------------- 6. Приборы (без анимаций: значения меняются сразу) ----------------
  const gbox = $("#wl-gauges");
  const ARC = 157.08;
  const gaugeHTML = (k, i) => {
    const c = C[k]; if (!c) return "";
    const dial = ["GTF", "MTF", "AZI"].includes(k);
    return `<button type="button" class="wl-g" data-i="${i}" data-k="${k}"><span class="wl-gh"><span>${esc(c.n)}</span><code></code></span>` +
      (dial ? `<svg class="wl-ga wl-dial" viewBox="0 0 120 120" aria-hidden="true"><circle class="bg" cx="60" cy="60" r="46"/>${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<line class="tk${a % 90 ? "" : " big"}" x1="60" y1="14" x2="60" y2="${a % 90 ? 20 : 24}" transform="rotate(${a} 60 60)"/>`).join("")}<text x="60" y="36">${k === "AZI" ? "С" : "верх"}</text><line class="nd" x1="60" y1="60" x2="60" y2="20"/><circle class="hub" cx="60" cy="60" r="5"/></svg>`
        : `<svg class="wl-ga" viewBox="0 0 120 70" aria-hidden="true"><path class="bg" d="M10 62A50 50 0 0 1 110 62"/><path class="fg" d="M10 62A50 50 0 0 1 110 62" stroke-dasharray="0 ${ARC}"/><line class="nd" x1="60" y1="62" x2="60" y2="20"/><circle class="hub" cx="60" cy="62" r="4"/></svg>`) +
      `<b>—</b><small>${esc(c.ru)}</small><svg class="wl-sp" viewBox="0 0 100 22" preserveAspectRatio="none" aria-hidden="true"><polyline points=""/></svg><em></em></button>`;
  };
  const buildGauges = () => { gbox.innerHTML = TEMPL[tpl].g.map(gaugeHTML).join(""); updGauges(); };
  const updGauges = () => {
    const last = rows[rows.length - 1];
    gbox.querySelectorAll(".wl-g").forEach((el) => {
      const k = el.dataset.k, c = C[k], b = BIND[k];
      el.querySelector("code").textContent = b ? (b.m === k ? k : b.m + " → " + k) : k + " · не назначен";
      el.classList.toggle("off", !b);
      const v = last && b ? valueOf(last, k) : null;
      el.querySelector("b").textContent = v == null ? "—" : fmt(v, c.d);
      el.querySelector("em").textContent = !b ? "назначьте кривую на вкладке «Мнемоники»" : v == null ? (k === "GTF" ? "пусто: ротор, отклонитель вращается" : k === "TQ" ? "пусто: слайд, ротор стоит" : "пусто (nullValue)") : b.f == null ? "единицы не совпадают: " + b.u + " ≠ " + c.u : b.f !== 1 ? "перевод " + b.u + " → " + c.u : "глубина датчика " + fmt(last.md - (["GR", "GRU", "GRD"].includes(b.truth) ? OFF.GR : ["RPD", "RPS", "RAD"].includes(b.truth) ? OFF.RES : C[b.truth].cat === "nuc" ? OFF.NUC : C[b.truth].cat === "dir" ? OFF.dir : 0), 1) + " м";
      el.classList.toggle("warn", !!b && b.f == null);
      const fg = el.querySelector(".fg"), nd = el.querySelector(".nd");
      if (fg) {
        const t = v == null ? 0 : Math.max(0, Math.min(1, c.log ? (Math.log10(v) - Math.log10(c.min)) / (Math.log10(c.max) - Math.log10(c.min)) : (v - c.min) / (c.max - c.min)));
        fg.setAttribute("stroke-dasharray", (t * ARC).toFixed(1) + " " + ARC);
        nd.setAttribute("transform", "rotate(" + (-90 + 180 * t).toFixed(1) + " 60 62)");
      } else if (nd) nd.setAttribute("transform", "rotate(" + (v == null ? 0 : v).toFixed(1) + " 60 60)"), el.classList.toggle("nul", v == null);
      // тренд за последние 40 строк
      const pts = rows.slice(-40).map((rw) => valueOf(rw, k)).filter((x) => x != null);
      const mn = Math.min(...pts), mx = Math.max(...pts), R = mx - mn || 1;
      el.querySelector(".wl-sp polyline").setAttribute("points", pts.map((p, i) => (i / Math.max(1, pts.length - 1) * 100).toFixed(1) + "," + (20 - (p - mn) / R * 18).toFixed(1)).join(" "));
    });
  };
  gbox.addEventListener("click", (e) => {
    const g = e.target.closest(".wl-g"); if (!g) return;
    const k = g.dataset.k, c = C[k], b = BIND[k];
    $("#wl-gi").innerHTML = `<b>${esc(c.n)}</b> — канал <code>${k}</code>, единица WITSML <code>${esc(c.u)}</code>. ` +
      (b ? `На сервере кривая называется <code>${esc(b.m)}</code> (${esc(b.u)}). Частые синонимы: ${aliasesOf(c).slice(1, 6).map((s) => "<code>" + esc(s) + "</code>").join(", ")}.` : "Кривая не назначена: откройте вкладку «Мнемоники» и выберите, какая мнемоника сервера это.");
  });

  // ---------------- 7. Мнемоники и назначение ----------------
  const chOptions = (sel) => `<option value="">— не назначено —</option>` + Object.entries(CATS).map(([ck, cn]) => `<optgroup label="${esc(cn)}">` + CH.filter((c) => c.cat === ck).map((c) => `<option value="${c.k}"${c.k === sel ? " selected" : ""}>${c.k} — ${esc(c.n)}</option>`).join("") + "</optgroup>").join("");
  const drawMap = () => {
    const mp = mapping();
    let ok = 0, bad = 0;
    $("#wl-map").innerHTML = `<table><thead><tr><th>Мнемоника на сервере</th><th>Единица</th><th>Описание из заголовка</th><th>Это канал</th><th></th></tr></thead><tbody>` +
      SRC[src].curves.map(([m, u, d, truth]) => {
        const x = mp[m], c = C[x.key], f = c ? conv(u, c.u) : 1;
        const right = x.key === truth; x.key && (right ? ok++ : bad++);
        const st = !x.key ? '<span class="st no">нет</span>' : x.how === "auto" ? '<span class="st au">авто</span>' : '<span class="st mn">вручную</span>';
        const unit = c && f == null ? ` <span class="st no" title="Единицы не переводятся">${esc(u)} ≠ ${esc(c.u)}</span>` : c && f !== 1 ? ` <span class="st au">×${String(f).replace(".", ",")}</span>` : "";
        return `<tr data-m="${esc(m)}"><td><code>${esc(m)}</code></td><td><code>${esc(u)}</code>${unit}</td><td>${esc(d)}</td><td><select aria-label="Канал для ${esc(m)}">${chOptions(x.key)}</select></td><td>${st}</td></tr>`;
      }).join("") + "</tbody></table>";
    const total = SRC[src].curves.length, none = total - ok - bad;
    $("#wl-mapsum").innerHTML = `Назначено ${ok + bad} из ${total}` + (none ? ` · без назначения: <b>${none}</b>` : "") + ` · <button type="button" class="wx-b" id="wl-check">Проверить назначение</button> <span id="wl-chk"></span>`;
    $("#wl-check").onclick = () => {
      const wrong = SRC[src].curves.filter(([m, , , t]) => mp[m].key && mp[m].key !== t).map(([m, , , t]) => `<code>${esc(m)}</code> — это ${t}`);
      const miss = SRC[src].curves.filter(([m]) => !mp[m].key).map(([m]) => `<code>${esc(m)}</code>`);
      $("#wl-chk").innerHTML = !wrong.length && !miss.length ? '<span class="st au">всё верно</span>' : (wrong.length ? "Ошибки: " + wrong.join(", ") + ". " : "") + (miss.length ? "Не назначены: " + miss.join(", ") + "." : "");
    };
  };
  $("#wl-map").addEventListener("change", (e) => {
    const tr = e.target.closest("tr[data-m]"); if (!tr) return;
    const m = tr.dataset.m, k = e.target.value;
    (maps[src] = maps[src] || {})[m] = k;
    if (k && $("#wl-learn").checked && !aliasesOf(C[k]).includes(m.toUpperCase())) (userAl[k] = userAl[k] || []).push(m.toUpperCase()), store.set("al", userAl);
    store.set("maps", maps); refresh();
  });
  $("#wl-mapreset").onclick = () => { delete maps[src]; store.set("maps", maps); refresh(); };
  $("#wl-export").onclick = () => {
    const mp = mapping(), data = { source: SRC[src].n, mapping: Object.fromEntries(Object.entries(mp).map(([m, x]) => [m, x.key || null])), userAliases: userAl };
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })); a.download = "witsml-mnemonics-" + src + ".json"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  // справочник
  const drawRef = () => {
    const q = ($("#wl-q").value || "").trim().toUpperCase();
    $("#wl-ref").innerHTML = Object.entries(CATS).map(([ck, cn]) => {
      const list = CH.filter((c) => c.cat === ck && (!q || (c.k + " " + c.n + " " + aliasesOf(c).join(" ")).toUpperCase().includes(q)));
      if (!list.length) return "";
      return `<h4>${esc(cn)}</h4><table><tbody>` + list.map((c) => `<tr><td><code class="k">${c.k}</code></td><td>${esc(c.n)}</td><td><code>${esc(c.u)}</code></td><td class="al">${c.al.map((a) => "<code>" + esc(a) + "</code>").join(" ")}${(userAl[c.k] || []).map((a) => `<code class="usr" title="Добавлено вами">${esc(a)}<button type="button" data-del="${c.k}|${esc(a)}" aria-label="Удалить синоним">×</button></code>`).join(" ")}</td><td><form data-add="${c.k}"><input placeholder="свой синоним" aria-label="Синоним для ${c.k}" maxlength="24"><button type="submit" class="wx-b">+</button></form></td></tr>`).join("") + "</tbody></table>";
    }).join("") || "<p>Ничего не найдено.</p>";
  };
  $("#wl-q").addEventListener("input", drawRef);
  $("#wl-ref").addEventListener("submit", (e) => {
    e.preventDefault(); const f = e.target.closest("form[data-add]"), v = f.querySelector("input").value.trim().toUpperCase().replace(/[^A-Z0-9_А-ЯЁ.-]/g, "");
    if (!v) return; const k = f.dataset.add;
    if (!aliasesOf(C[k]).includes(v)) (userAl[k] = userAl[k] || []).push(v), store.set("al", userAl);
    refresh(); drawRef();
  });
  $("#wl-ref").addEventListener("click", (e) => {
    const d = e.target.closest("[data-del]"); if (!d) return;
    const [k, a] = d.dataset.del.split("|"); userAl[k] = (userAl[k] || []).filter((x) => x !== a); store.set("al", userAl); refresh(); drawRef();
  });

  // ---------------- 8. Шаблоны: редактор ----------------
  const drawEditor = () => {
    const t = TEMPL[tpl];
    $("#wl-ed").innerHTML = `<div class="wl-edt">` + [0, 1, 2, 3, 4].map((ti) => `<fieldset><legend>Дорожка ${ti + 1}</legend>` + [0, 1, 2].map((ci) => `<select data-t="${ti}" data-c="${ci}" aria-label="Дорожка ${ti + 1}, кривая ${ci + 1}">${chOptions(t.t[ti] && t.t[ti][ci] ? t.t[ti][ci][0] : "").replace("— не назначено —", "—")}</select>`).join("") + "</fieldset>").join("") + `</div>` +
      `<fieldset class="wl-edg"><legend>Приборы</legend>` + [0, 1, 2, 3, 4, 5, 6, 7].map((gi) => `<select data-g="${gi}" aria-label="Прибор ${gi + 1}">${chOptions(t.g[gi] || "").replace("— не назначено —", "—")}</select>`).join("") + "</fieldset>";
  };
  $("#wl-ed").addEventListener("change", (e) => {
    const s = e.target; const base = TEMPL[tpl];
    const my = { n: "Мой шаблон", t: [0, 1, 2, 3, 4].map((ti) => (base.t[ti] || []).map((c) => c.slice())), g: base.g.slice() };
    if (s.dataset.g != null) my.g[+s.dataset.g] = s.value;
    else { const ti = +s.dataset.t, ci = +s.dataset.c; my.t[ti] = my.t[ti] || []; my.t[ti][ci] = [s.value]; }
    my.t = my.t.map((tr) => tr.filter((c) => c && c[0])).filter((tr) => tr.length);
    my.g = my.g.filter(Boolean);
    if (!my.t.length) my.t = [[["GR"]]];
    TEMPL.my = my; store.set("my", my); tpl = "my"; store.set("tpl", tpl);
    $("#wl-tpl").value = "my"; buildGauges(); drawEditor(); drawPlot(); drawXml();
  });

  // ---------------- 9. XML планшета ----------------
  const drawXml = () => {
    const mp = mapping(), keys = [...new Set(TEMPL[tpl].t.flat().map((c) => c[0]).filter(Boolean))];
    const used = SRC[src].curves.filter(([m]) => keys.includes(mp[m].key) || mp[m].key === "DEPT");
    const idx = SRC[src].curves.find(([m]) => mp[m].key === "DEPT") || ["DEPT", "m", "Measured depth", "DEPT"];
    const list = [idx, ...used.filter((c) => c !== idx)];
    const tail = rows.slice(-3);
    const val = (rw, c) => { const t = c[3], v = rw.v[t]; if (v == null || v === NULL) return String(NULL); const f = conv(c[1], C[t].u) || 1; return (v / f).toFixed(C[t].d + (f < 0.01 ? 0 : f < 1 ? 1 : 0)); };
    const xml =
`<!-- Заголовок объекта log: что за кривые и в чём они измерены -->
<logs xmlns="http://www.witsml.org/schemas/1series" version="1.4.1.1">
  <log uidWell="W-1205" uidWellbore="WB-1205-2" uid="LOG-RT-MWD">
    <nameWell>Учебная 1205</nameWell>
    <nameWellbore>1205 ствол 2</nameWellbore>
    <name>MWD реальное время</name>
    <indexType>measured depth</indexType>          <!-- индекс — глубина, а не время -->
    <startIndex uom="m">${rows[0].md.toFixed(2)}</startIndex>
    <endIndex uom="m">${bit.toFixed(2)}</endIndex>
    <indexCurve>${esc(idx[0])}</indexCurve>
    <nullValue>${NULL}</nullValue>                  <!-- так помечено «нет данных» -->
${list.map((c) => `    <logCurveInfo uid="${esc(c[0])}">
      <mnemonic>${esc(c[0])}</mnemonic>${mp[c[0]].key ? `            <!-- назначено: ${mp[c[0]].key} — ${esc(C[mp[c[0]].key].n)} -->` : "            <!-- не назначено -->"}
      <unit>${esc(c[1])}</unit>
      <curveDescription>${esc(c[2])}</curveDescription>
      <typeLogData>double</typeLogData>
    </logCurveInfo>`).join("\n")}
    <!-- Данные: строки в порядке mnemonicList -->
    <logData>
      <mnemonicList>${list.map((c) => esc(c[0])).join(",")}</mnemonicList>
      <unitList>${list.map((c) => esc(c[1])).join(",")}</unitList>
${tail.map((rw) => `      <data>${list.map((c) => (c[3] === "DEPT" ? rw.md.toFixed(2) : val(rw, c))).join(",")}</data>`).join("\n")}
    </logData>
  </log>
</logs>`;
    $("#wl-xml").innerHTML = esc(xml).replace(/&lt;!--(.*?)--&gt;/g, '<i class="cm">&lt;!--$1--&gt;</i>').replace(/&lt;(\/?)([a-zA-Z]+)/g, '&lt;$1<b class="tg">$2</b>').replace(/ ([a-zA-Z]+)=&quot;/g, ' <u class="at">$1</u>=&quot;');
  };

  // ---------------- 10. Управление ----------------
  $("#wl-src").innerHTML = Object.entries(SRC).map(([k, s]) => `<option value="${k}"${k === src ? " selected" : ""}>${esc(s.n)}</option>`).join("");
  $("#wl-tpl").innerHTML = Object.entries(TEMPL).map(([k, t]) => `<option value="${k}"${k === tpl ? " selected" : ""}>${esc(t.n)}</option>`).join("");
  $("#wl-src").onchange = (e) => { src = e.target.value; store.set("src", src); refresh(); };
  $("#wl-tpl").onchange = (e) => { tpl = e.target.value; store.set("tpl", tpl); buildGauges(); drawEditor(); drawPlot(); drawXml(); };
  $("#wl-play").onclick = (e) => { playing = !playing; e.currentTarget.textContent = playing ? "Пауза" : "Бурить"; e.currentTarget.setAttribute("aria-pressed", String(playing)); };
  $$("[data-spd]").forEach((b) => b.onclick = () => { speed = +b.dataset.spd; $$("[data-spd]").forEach((x) => x.classList.toggle("on", x === b)); });
  $$("[data-win]").forEach((b) => b.onclick = () => { win = +b.dataset.win; $$("[data-win]").forEach((x) => x.classList.toggle("on", x === b)); drawPlot(); });
  $$(".wl-tabs [data-t]").forEach((b) => b.onclick = () => {
    $$(".wl-tabs [data-t]").forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-selected", String(x === b)); });
    $$(".wl-pane").forEach((p) => p.hidden = p.id !== b.dataset.t);
    b.dataset.t === "wl-p1" && drawPlot(); b.dataset.t === "wl-p5" && drawXml(); b.dataset.t === "wl-p3" && drawRef();
  });
  const refresh = () => { BIND = binding(); drawMap(); updGauges(); drawPlot(); drawXml(); $("#wl-p3").hidden || drawRef(); };

  buildGauges(); drawEditor(); refresh();
  let last = performance.now(), vis = true, acc = 0;
  "IntersectionObserver" in window && new IntersectionObserver((e) => (vis = e[0].isIntersecting)).observe(root);
  const loop = (now) => {
    requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (!playing || !vis || document.hidden) return;
    const r = rows[rows.length - 1].rop;               // м/ч модели × ускорение
    acc += r / 3600 * dt * speed * 60;                 // speed: «минут модели в секунду»
    if (acc >= 0.25) { const n = Math.floor(acc / 0.25) * 0.25; acc -= n; advance(n); updGauges(); drawPlot(); }
  };
  requestAnimationFrame(loop);
  addEventListener("resize", drawPlot);
  new MutationObserver(drawPlot).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
})();
