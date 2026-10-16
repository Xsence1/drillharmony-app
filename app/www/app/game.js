// DrillHarmony · «Вахта»: смена на буровой. Небольшая RPG: выбираешь героя, ходишь по кусту, выполняешь задания.
// Графика рисуется на canvas (изометрия, свет, снег, пар, северное сияние), звуки синтезируются Web Audio,
// реплики озвучиваются синтезом речи на русском с заниженным тоном. Сохранение — на устройстве.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const rnd = (a, b) => a + Math.random() * (b - a), pick = (a) => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const vib = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };
  const KEY = "dh-game";

  // ===================== звук: всё синтезируется, файлов нет =====================
  let AC = null, master = null, noiseBuf = null, amb = null;
  const audio = () => {
    if (AC) { if (AC.state === "suspended") AC.resume(); return AC; }
    try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    master = AC.createGain(); master.gain.value = S.snd ? 0.8 : 0; master.connect(AC.destination);
    noiseBuf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return AC;
  };
  const env = (g, t, a, peak, dcy) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dcy); };
  const noise = (type, f, q, peak, a, dcy, delay = 0, sweep) => {
    const ac = audio(); if (!ac) return; const t = ac.currentTime + delay;
    const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true; const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (sweep) fl.frequency.exponentialRampToValueAtTime(sweep, t + a + dcy);
    const g = ac.createGain(); env(g, t, a, peak, dcy); s.connect(fl).connect(g).connect(master); s.start(t, Math.random()); s.stop(t + a + dcy + 0.05);
  };
  const tone = (type, f, peak, a, dcy, delay = 0, f2) => {
    const ac = audio(); if (!ac) return; const t = ac.currentTime + delay; const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + dcy); const g = ac.createGain(); env(g, t, a, peak, dcy); o.connect(g).connect(master); o.start(t); o.stop(t + a + dcy + 0.05);
  };
  const SFX = {
    step() { noise("bandpass", rnd(700, 1100), 0.9, 0.18, 0.005, 0.07); noise("lowpass", 300, 0.7, 0.08, 0.004, 0.05, 0.01); },
    tap() { tone("sine", 880, 0.12, 0.002, 0.06); },
    door() { const ac = audio(); if (!ac) return; const t = ac.currentTime, o = ac.createOscillator(), fl = ac.createBiquadFilter(), g = ac.createGain();
      o.type = "sawtooth"; o.frequency.setValueAtTime(95, t); o.frequency.linearRampToValueAtTime(60, t + 0.7); fl.type = "bandpass"; fl.frequency.value = 650; fl.Q.value = 6;
      const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 23; lg.gain.value = 0.06; lfo.connect(lg).connect(g.gain);
      env(g, t, 0.05, 0.12, 0.7); o.connect(fl).connect(g).connect(master); o.start(t); lfo.start(t); o.stop(t + 0.85); lfo.stop(t + 0.85); noise("lowpass", 180, 1, 0.3, 0.004, 0.18, 0.72); },
    steam() { noise("highpass", 2800, 0.6, 0.22, 0.12, 1.3); noise("bandpass", 5200, 1.5, 0.08, 0.2, 1.1, 0.1); },
    splash() { noise("lowpass", 2400, 0.8, 0.35, 0.01, 0.55, 0, 260); noise("bandpass", 900, 2, 0.1, 0.02, 0.3, 0.12); },
    knock() { tone("sine", 95, 0.5, 0.002, 0.16); noise("lowpass", 400, 1, 0.25, 0.002, 0.08); },
    crack() { noise("highpass", 1800, 0.7, 0.5, 0.001, 0.12); noise("lowpass", 160, 1, 0.4, 0.002, 0.3, 0.03); },
    jingle() { [523, 659, 784, 1046].forEach((f, i) => { tone("triangle", f, 0.16, 0.01, 0.35, i * 0.09); tone("sine", f * 2, 0.04, 0.01, 0.3, i * 0.09); }); },
    coin() { tone("square", 988, 0.06, 0.002, 0.08); tone("square", 1319, 0.06, 0.002, 0.25, 0.07); },
    bad() { tone("square", 140, 0.12, 0.005, 0.25); tone("square", 104, 0.12, 0.005, 0.3, 0.12); },
    drill() { noise("lowpass", 140, 1.2, 0.5, 0.2, 1.6); tone("sawtooth", 42, 0.1, 0.2, 1.5); tone("sawtooth", 63, 0.05, 0.2, 1.4); },
    clank() { tone("triangle", 1730, 0.15, 0.001, 0.5); tone("triangle", 2470, 0.07, 0.001, 0.35); noise("bandpass", 3000, 4, 0.1, 0.001, 0.06); },
    spoon() { tone("sine", 2100, 0.1, 0.001, 0.4); tone("sine", 3150, 0.05, 0.001, 0.3, 0.12); },
    siren() { const ac = audio(); if (!ac) return; const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.type = "sawtooth";
      for (let i = 0; i < 4; i++) { o.frequency.setValueAtTime(520, t + i * 0.7); o.frequency.linearRampToValueAtTime(880, t + i * 0.7 + 0.35); o.frequency.linearRampToValueAtTime(520, t + i * 0.7 + 0.7); }
      g.gain.value = 0.06; o.connect(g).connect(master); o.start(t); o.stop(t + 2.8); },
    snore() { [0, 1.3].forEach((d) => { noise("lowpass", 220, 3, 0.35, 0.4, 0.5, d); tone("sawtooth", 70, 0.05, 0.4, 0.5, d); }); },
    flush() { noise("lowpass", 1200, 0.7, 0.3, 0.05, 1.4, 0, 200); noise("bandpass", 400, 3, 0.15, 0.2, 1.0, 0.2); },
    wind(on) { const ac = audio(); if (!ac) return; if (amb) { try { amb.forEach((n) => n.stop()); } catch (e) {} amb = null; } if (!on) return;
      const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true; const fl = ac.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = 380; const g = ac.createGain(); g.gain.value = 0.05;
      const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.09; lg.gain.value = 0.035; lfo.connect(lg).connect(g.gain);
      const hum = ac.createOscillator(), hg = ac.createGain(), hf = ac.createBiquadFilter(); hum.type = "sawtooth"; hum.frequency.value = 49; hf.type = "lowpass"; hf.frequency.value = 160; hg.gain.value = 0.018;
      s.connect(fl).connect(g).connect(master); hum.connect(hf).connect(hg).connect(master); s.start(); lfo.start(); hum.start(); amb = [s, lfo, hum]; },
  };

  // ===================== голос: синтез речи, низкий тон и лёгкая хрипотца =====================
  const TTS = () => window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.TextToSpeech;
  let ruVoice = null; const loadVoices = () => { try { ruVoice = speechSynthesis.getVoices().find((v) => /^ru/i.test(v.lang)) || null; } catch (e) {} };
  try { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; } catch (e) {}
  const rasp = (sec, pitch) => {               // «хрип»: тихий рваный шум в полосе голоса поверх речи
    const ac = audio(); if (!ac || !S.snd) return; const t = ac.currentTime;
    const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true; const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 220 * pitch + 120; bp.Q.value = 1.4;
    const g = ac.createGain(); g.gain.value = 0; const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.type = "square"; lfo.frequency.value = 34; lg.gain.value = 0.022;
    lfo.connect(lg).connect(g.gain); s.connect(bp).connect(g).connect(master); s.start(t); lfo.start(t); s.stop(t + sec); lfo.stop(t + sec);
  };
  const say = (text, v = {}) => {
    if (!S.snd || !S.voice) return;
    const pitch = v.pitch == null ? 0.55 : v.pitch, rate = v.rate || 0.95, clean = text.replace(/[«»]/g, "");
    const tts = TTS();
    if (tts) { tts.stop && tts.stop().catch(() => {}); tts.speak({ text: clean, lang: "ru-RU", rate, pitch, volume: 1, category: "playback" }).catch(() => {}); }
    else { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(clean); u.lang = "ru-RU"; if (ruVoice) u.voice = ruVoice; u.pitch = Math.max(0.1, pitch - 0.25); u.rate = rate; speechSynthesis.speak(u); } catch (e) {} }
    if (v.rasp !== false) rasp(Math.min(9, clean.length * 0.062 / rate), pitch);
  };
  const hush = () => { const tts = TTS(); if (tts && tts.stop) tts.stop().catch(() => {}); try { speechSynthesis.cancel(); } catch (e) {} };

  // ===================== герои и жители куста =====================
  const FACE = {
    mikh: { skin: "#e2b08c", helm: "#f2a541", beard: "#8a8a8a", mus: 1, brow: 1, name: "Михалыч" },
    serg: { skin: "#f0c4a0", helm: "#2d8cff", beard: 0, glasses: 1, stub: 1, name: "Серёга" },
    lena: { skin: "#f3c9ad", helm: "#ffffff", hair: "#7a3e1c", fem: 1, name: "Лена" },
    petr: { skin: "#d9a07c", helm: "#e8463a", beard: "#5a4634", mus: 1, belly: 1, name: "Петрович" },
    valya: { skin: "#f1c3a3", cap: "#fff", hair: "#b45a3c", fem: 1, name: "Тётя Валя" },
    egor: { skin: "#e8b493", hat: "#c9b28a", beard: "#e6e6e6", mus: 1, name: "Дед Егорыч" },
    zhora: { skin: "#dca482", hat: "#3a4a3a", stub: 1, mus: 1, name: "Жора" },
    boss: { skin: "#e0a984", helm: "#e8463a", beard: "#5a4634", mus: 1, name: "Мастер Палыч" },
    radio: { skin: "#d8b494", helm: "#2d8cff", headset: 1, name: "Диспетчер" },
  };
  const VOICE = { mikh: { pitch: 0.45, rate: 0.92 }, serg: { pitch: 0.7, rate: 1.02 }, lena: { pitch: 1.05, rate: 1, rasp: false }, petr: { pitch: 0.4, rate: 0.9 },
    valya: { pitch: 0.95, rate: 1.05, rasp: false }, egor: { pitch: 0.3, rate: 0.85 }, zhora: { pitch: 0.5, rate: 1.05 }, boss: { pitch: 0.4, rate: 0.9 }, radio: { pitch: 0.6, rate: 1.1 } };
  const portrait = (k) => {
    const f = FACE[k] || FACE.mikh;
    const hair = f.hair ? `<path d="M22 44c-4 18 0 34 6 40h44c6-6 10-22 6-40" fill="${f.hair}"/>` : "";
    const helm = f.helm ? `<path d="M20 44c0-20 13-30 30-30s30 10 30 30z" fill="${f.helm}"/><rect x="14" y="41" width="72" height="7" rx="3.5" fill="${f.helm}"/><path d="M28 30c6-8 14-11 22-11" stroke="rgba(255,255,255,.5)" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="45" y="17" width="10" height="26" rx="4" fill="rgba(0,0,0,.12)"/>` : "";
    const hat = f.hat ? `<path d="M22 42c2-18 14-24 28-24s26 6 28 24z" fill="${f.hat}"/><rect x="18" y="38" width="64" height="8" rx="4" fill="${f.hat}" opacity=".85"/>` : "";
    const cap = f.cap ? `<path d="M24 40c0-14 12-20 26-20s26 6 26 20z" fill="${f.cap}"/>` : "";
    const beard = f.beard ? `<path d="M30 66c2 16 12 22 20 22s18-6 20-22c-6 6-12 8-20 8s-14-2-20-8z" fill="${f.beard}"/>` : "";
    const stub = f.stub ? `<path d="M32 70c4 10 10 13 18 13s14-3 18-13" fill="rgba(60,40,30,.25)"/>` : "";
    const mus = f.mus ? `<path d="M38 68c4-3 8-3 12-1 4-2 8-2 12 1-4 3-8 3-12 1-4 2-8 2-12-1z" fill="${f.beard || "#4a3a2c"}"/>` : "";
    const gl = f.glasses ? `<g fill="none" stroke="#1d2a36" stroke-width="2.4"><circle cx="40" cy="56" r="7"/><circle cx="60" cy="56" r="7"/><path d="M47 56h6"/></g>` : "";
    const brow = f.brow ? `<path d="M33 48l12 2M67 48l-12 2" stroke="#5a4a3c" stroke-width="3" stroke-linecap="round"/>` : `<path d="M34 49h10M56 49h10" stroke="#5a4a3c" stroke-width="2.2" stroke-linecap="round"/>`;
    const fem = f.fem ? `<path d="M36 64q2 2 4 0M60 64q2 2 4 0" stroke="rgba(220,90,90,.45)" stroke-width="3"/>` : "";
    const head = f.headset ? `<path d="M24 54a26 26 0 0 1 52 0" stroke="#222" stroke-width="4" fill="none"/><rect x="18" y="50" width="9" height="14" rx="3" fill="#222"/><path d="M24 62q6 14 20 12" stroke="#222" stroke-width="2.5" fill="none"/>` : "";
    return `<svg viewBox="0 0 100 116" aria-hidden="true"><defs><radialGradient id="sk${k}" cx="45%" cy="40%"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></radialGradient></defs>
      <path d="M8 116c4-22 20-30 42-30s38 8 42 30z" fill="${f.belly ? "#2a4a6a" : k === "valya" ? "#f4f4f4" : "#2f3d4a"}"/><path d="M38 88l12 10 12-10" fill="#f2a541" opacity=".9"/>
      ${hair}<ellipse cx="50" cy="58" rx="24" ry="27" fill="${f.skin}"/><ellipse cx="50" cy="58" rx="24" ry="27" fill="url(#sk${k})"/>
      ${stub}${beard}${brow}<circle cx="41" cy="56" r="2.6" fill="#1d2a36"/><circle cx="59" cy="56" r="2.6" fill="#1d2a36"/>${gl}${fem}
      <path d="M48 58q2 6 4 0" stroke="rgba(0,0,0,.25)" stroke-width="2" fill="none"/>${mus}<rect class="mouth" x="43" y="72" width="14" height="4" rx="2" fill="#7a2f2a"/>
      ${helm}${hat}${cap}${head}</svg>`;
  };
  const HEROES = [
    { id: "mikh", role: "Бурильщик", tag: "Сила +20 · быстрее на роторе", about: "Двадцать лет у ключа. Говорит мало, свечи наращивает быстро.", en: 100, mood: 60 },
    { id: "serg", role: "Инженер ННБ", tag: "Ориентирование проще", about: "Телеметрия, toolface и кофе. Знает, куда пойдёт ствол.", en: 80, mood: 70 },
    { id: "lena", role: "Геолог ГТИ", tag: "Внимательность · шлам и газ", about: "Видит газ раньше всех. Шлам по запаху отличает.", en: 80, mood: 80 },
    { id: "petr", role: "Буровой мастер", tag: "Авторитет · разговоры легче", about: "Тридцать вахт, три куста, один голос на всю буровую.", en: 90, mood: 55 },
  ];

  // ===================== куст: локации на изометрической сетке =====================
  const LOC = {
    rig: { n: "Буровая", ic: "🗼", x: 6, y: 2.2, w: 2.6, d: 2.6, h: 1.2, c: "#56616d" },
    nnb: { n: "Вагон ННБ", ic: "🧭", x: 2.4, y: 3.2, w: 2.4, d: 1.1, h: 1.1, c: "#2d6cdf" },
    gti: { n: "Станция ГТИ", ic: "📈", x: 9.4, y: 3.4, w: 2.4, d: 1.1, h: 1.1, c: "#e7e7e2" },
    canteen: { n: "Столовая", ic: "🍲", x: 2.4, y: 6.6, w: 2.8, d: 1.3, h: 1.2, c: "#c9483b" },
    dorm: { n: "Общежитие", ic: "🛏", x: 5.8, y: 7.6, w: 3, d: 1.2, h: 1.15, c: "#3c8f5c" },
    store: { n: "Склад", ic: "🔧", x: 9.6, y: 6.8, w: 2.2, d: 1.2, h: 1.1, c: "#4c6a3a" },
    bath: { n: "Баня", ic: "♨️", x: 2.6, y: 9.6, w: 1.6, d: 1.4, h: 1, c: "#8a5a32", wood: 1 },
    wc: { n: "Туалет", ic: "🚽", x: 9.9, y: 9.9, w: 0.7, d: 0.7, h: 1.25, c: "#9a6a3c", wood: 1 },
  };
  const DOOR = (k) => { const L = LOC[k]; return { x: L.x + L.w / 2, y: L.y + L.d + 0.55 }; };

  // ===================== состояние =====================
  const fresh = (hero) => ({ v: 1, hero, t: 8 * 60, en: 100, mood: 60, xp: 0, rub: 0, rep: 0, pos: DOOR("dorm"), q: {}, f: {}, snd: S ? S.snd : true, voice: S ? S.voice : true, done: false });
  let S = null;
  try { S = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) {}
  const prefs = (() => { try { return JSON.parse(localStorage.getItem(KEY + ":p") || "{}"); } catch (e) { return {}; } })();
  if (!S) S = { snd: prefs.snd !== false, voice: prefs.voice !== false };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); localStorage.setItem(KEY + ":p", JSON.stringify({ snd: S.snd, voice: S.voice })); } catch (e) {} };
  const H = () => HEROES.find((h) => h.id === S.hero) || HEROES[0];
  const hhmm = (m) => String(Math.floor(m / 60) % 24).padStart(2, "0") + ":" + String(Math.floor(m % 60)).padStart(2, "0");

  // ===================== задания =====================
  const ROLEQ = {
    mikh: { id: "stand", t: "Нарастить свечу", where: "rig", d: "Поймать момент три раза подряд: клинья, ключ, подъём." },
    serg: { id: "orient", t: "Сориентировать отклонитель", where: "nnb", d: "Снять toolface в вагоне ННБ и выставить отклонитель на буровой." },
    lena: { id: "cutt", t: "Отобрать шлам", where: "gti", d: "Пришёл шлам с забоя. Определить, что там: глина или песчаник." },
    petr: { id: "order", t: "Разобраться с вахтой", where: "rig", d: "На площадке бардак, бригада спорит. Навести порядок без крика." },
  };
  const QUESTS = () => [
    { id: "shift", t: "Принять смену", where: "rig", d: "Найти мастера на буровой и принять смену." },
    { id: "eat", t: "Позавтракать", where: "canteen", d: "Тётя Валя ждёт. Без завтрака на морозе не жильцы." },
    ROLEQ[S.hero],
    { id: "key", t: "Ключ на 36", where: "store", d: "Жора на складе выдаёт инструмент. Если найдёт." },
    { id: "mud", t: "Утяжелить раствор", where: "rig", d: "Довести плотность до 1,25 г/см³. Нужен ключ со склада." , need: "key" },
    { id: "wc", t: "Зов природы", where: "wc", d: "Минус тридцать восемь. Туалет на улице. Дверь, говорят, примерзает.", from: 10 * 60 + 30, opt: 1 },
    { id: "alarm", t: "Учебная тревога", where: "rig", d: "Сирена! Бегом на буровую, закрыть превентор.", from: 14 * 60, timed: 1 },
    { id: "snow", t: "Снежная битва", where: "store", d: "Жора собрал бригаду за складом. Шесть попаданий — и ты легенда куста.", from: 12 * 60, opt: 1 },
    { id: "bath", t: "Баня у Егорыча", where: "bath", d: "После смены святое дело. Егорыч уже затопил.", from: 17 * 60, opt: 1 },
    { id: "hand", t: "Сдать смену", where: "rig", d: "Передать смену ночной вахте и закрыть журнал.", from: 19 * 60 },
  ];
  const open = () => QUESTS().filter((q) => !S.q[q.id] && (!q.from || S.t >= q.from) && (q.id !== "alarm" || S.f.alarmOn));
  const goal = () => { const o = open().filter((q) => !q.opt); return o[0] || open()[0] || null; };

  // ===================== сцена =====================
  const cv = $("#scene"), g = cv.getContext("2d");
  let W = 0, Hh = 0, dpr = 1, TW = 64, TH = 32, ox = 0, oy = 0, cam = { x: 6, y: 6 };
  const snow = Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random(), z: rnd(0.4, 1), s: rnd(0.6, 1.8) }));
  const steam = [], prints = [];
  const iso = (x, y, z = 0) => [ox + (x - y) * TW / 2, oy + (x + y) * TH / 2 - z * TH];
  const resize = () => { dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; Hh = innerHeight; cv.width = W * dpr; cv.height = Hh * dpr; TW = clamp(W / 7.2, 52, 96); TH = TW / 2; };
  addEventListener("resize", resize); resize();
  const me = { x: 0, y: 0, tx: 0, ty: 0, path: null, walk: 0, face: 1 };

  const sky = (t) => {          // цвет неба по времени смены
    const h = t / 60;
    const k = [[8, "#2b1e3f", "#f08a5d"], [10, "#3a5a7c", "#b8cad8"], [15, "#4a6a88", "#c9d6e0"], [17, "#2c2348", "#f07a4a"], [18.5, "#0b1024", "#3b2a5a"], [20, "#05070f", "#0d1a2e"]];
    let a = k[0], b = k[k.length - 1]; for (let i = 0; i < k.length - 1; i++) if (h >= k[i][0] && h <= k[i + 1][0]) { a = k[i]; b = k[i + 1]; break; }
    const m = clamp((h - a[0]) / (b[0] - a[0] || 1), 0, 1), mix = (c1, c2) => { const p = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); const x = p(c1), y = p(c2); return "rgb(" + x.map((v, i) => Math.round(v + (y[i] - v) * m)).join(",") + ")"; };
    return [mix(a[1], b[1]), mix(a[2], b[2]), clamp((h - 17.2) / 1.6, 0, 1)];
  };
  const box = (x, y, w, d, h, top, left, right) => {   // изометрический блок
    const A = iso(x, y, h), B = iso(x + w, y, h), C = iso(x + w, y + d, h), Dd = iso(x, y + d, h), B0 = iso(x + w, y, 0), C0 = iso(x + w, y + d, 0), D0 = iso(x, y + d, 0);
    g.fillStyle = left; g.beginPath(); g.moveTo(...Dd); g.lineTo(...C); g.lineTo(...C0); g.lineTo(...D0); g.closePath(); g.fill();
    g.fillStyle = right; g.beginPath(); g.moveTo(...B); g.lineTo(...C); g.lineTo(...C0); g.lineTo(...B0); g.closePath(); g.fill();
    g.fillStyle = top; g.beginPath(); g.moveTo(...A); g.lineTo(...B); g.lineTo(...C); g.lineTo(...Dd); g.closePath(); g.fill();
  };
  const shade = (c, k) => { const n = parseInt(c.slice(1), 16), r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255; const f = (v) => clamp(Math.round(v * k), 0, 255); return `rgb(${f(r)},${f(gg)},${f(b)})`; };
  const person = (x, y, cfg, t, walking) => {
    const [sx, sy] = iso(x, y), s = TW / 64, bob = walking ? Math.abs(Math.sin(t * 10)) * 2.2 * s : Math.sin(t * 2) * 0.6 * s;
    g.fillStyle = "rgba(0,0,0,.28)"; g.beginPath(); g.ellipse(sx, sy, 9 * s, 4 * s, 0, 0, 7); g.fill();
    const leg = walking ? Math.sin(t * 10) * 3 * s : 0;
    g.strokeStyle = "#1c242c"; g.lineWidth = 3.4 * s; g.lineCap = "round";
    g.beginPath(); g.moveTo(sx - 2.5 * s, sy - 9 * s - bob); g.lineTo(sx - 2.5 * s + leg, sy - 1 * s); g.moveTo(sx + 2.5 * s, sy - 9 * s - bob); g.lineTo(sx + 2.5 * s - leg, sy - 1 * s); g.stroke();
    const bodyG = g.createLinearGradient(sx - 8 * s, 0, sx + 8 * s, 0); bodyG.addColorStop(0, shade(cfg.jacket, 1.15)); bodyG.addColorStop(1, shade(cfg.jacket, 0.7));
    g.fillStyle = bodyG; g.beginPath(); g.roundRect(sx - 7 * s, sy - 24 * s - bob, 14 * s, 16 * s, 5 * s); g.fill();
    g.fillStyle = "#f2e85a"; g.fillRect(sx - 7 * s, sy - 15 * s - bob, 14 * s, 2 * s);       // светоотражающая полоса
    g.fillStyle = cfg.skin || "#e2b08c"; g.beginPath(); g.arc(sx, sy - 29 * s - bob, 5.2 * s, 0, 7); g.fill();
    g.fillStyle = cfg.helm; g.beginPath(); g.arc(sx, sy - 30.5 * s - bob, 5.8 * s, Math.PI, 0); g.fill(); g.fillRect(sx - 7 * s, sy - 31 * s - bob, 14 * s, 1.8 * s);
    if (cfg.me) { g.strokeStyle = "rgba(242,165,65,.9)"; g.lineWidth = 2; g.beginPath(); g.ellipse(sx, sy, 13 * s, 6 * s, 0, 0, 7); g.stroke(); }
  };
  const JACKET = { mikh: "#2f6db3", serg: "#d9532c", lena: "#7a4fd0", petr: "#3a3a3a" }, HELM = { mikh: "#f2a541", serg: "#2d8cff", lena: "#ffffff", petr: "#e8463a" };
  const NPC = { rig: { k: "boss", x: 6.6, y: 5.3, jacket: "#3a3a3a", helm: "#e8463a" }, canteen: { k: "valya", x: 3.9, y: 8.4, jacket: "#f4f4f4", helm: "#ffffff" },
    store: { k: "zhora", x: 10.3, y: 8.5, jacket: "#4c5a3a", helm: "#3a4a3a" }, bath: { k: "egor", x: 4.4, y: 10.6, jacket: "#6a5040", helm: "#c9b28a" } };

  let last = performance.now(), T = 0;
  const frame = (now) => {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now; T += dt;
    if (!S.hero) { drawScene(dt, true); return; }
    // ходьба
    if (me.path && me.path.length) {
      const [px, py] = me.path[0], dx = px - me.x, dy = py - me.y, dist = Math.hypot(dx, dy), sp = 2.6 * dt;
      if (dist < sp) { me.x = px; me.y = py; me.path.shift(); } else { me.x += dx / dist * sp; me.y += dy / dist * sp; me.face = dx - dy >= 0 ? 1 : -1; }
      me.walk += dt; if (me.walk > 0.32) { me.walk = 0; SFX.step(); prints.push({ x: me.x, y: me.y, a: 1 }); if (prints.length > 60) prints.shift(); }
      if (!me.path.length) { me.path = null; S.pos = { x: me.x, y: me.y }; save(); if (me.cb) { const cb = me.cb; me.cb = null; cb(); } }
    }
    if (FP.on) { fpUpdate(dt); drawFP(); return; }
    cam.x += (me.x - cam.x) * Math.min(1, dt * 2.5); cam.y += (me.y - cam.y) * Math.min(1, dt * 2.5);
    drawScene(dt, false);
  };
  const drawScene = (dt, intro) => {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const t = intro ? 18.6 * 60 + Math.sin(T * 0.1) * 30 : S.t, [s1, s2, night] = sky(t);
    const cx = intro ? 6 + Math.sin(T * 0.15) * 1.2 : cam.x, cy = intro ? 6 + Math.cos(T * 0.12) * 1.2 : cam.y;
    ox = W / 2 - (cx - cy) * TW / 2; oy = Hh * 0.52 - (cx + cy) * TH / 2;
    const sg = g.createLinearGradient(0, 0, 0, Hh); sg.addColorStop(0, s1); sg.addColorStop(0.6, s2); sg.addColorStop(1, s2); g.fillStyle = sg; g.fillRect(0, 0, W, Hh);
    if (night > 0) {                                   // звёзды и северное сияние
      g.fillStyle = "#fff"; for (let i = 0; i < 60; i++) { const x = (i * 97.3 % W), y = (i * 53.7 % (Hh * 0.45)); g.globalAlpha = night * (0.3 + 0.7 * Math.abs(Math.sin(T + i))); g.fillRect(x, y, 1.4, 1.4); }
      for (let b = 0; b < 3; b++) { g.globalAlpha = night * 0.22; const ag = g.createLinearGradient(0, 0, 0, Hh * 0.5); ag.addColorStop(0, "rgba(80,255,180,0)"); ag.addColorStop(0.5, b === 1 ? "rgba(140,120,255,.9)" : "rgba(80,255,180,.9)"); ag.addColorStop(1, "rgba(80,255,180,0)");
        g.fillStyle = ag; g.beginPath(); g.moveTo(0, Hh * 0.1 + b * 30); for (let x = 0; x <= W; x += 20) g.lineTo(x, Hh * (0.12 + 0.06 * Math.sin(x / 90 + T * 0.4 + b * 2)) + b * 30); g.lineTo(W, Hh * 0.42); g.lineTo(0, Hh * 0.42); g.closePath(); g.fill(); }
      g.globalAlpha = 1;
    }
    // снежная площадка
    const N = 13, ground = night > 0.5 ? "#b8c6d6" : "#e9f0f5";
    for (let i = -1; i < N; i++) for (let j = -1; j < N; j++) {
      const a = iso(i, j), b = iso(i + 1, j), c = iso(i + 1, j + 1), d = iso(i, j + 1), v = ((i * 7 + j * 13) % 5) / 60;
      g.fillStyle = shade(ground.replace("#", "#"), 0.9 + v - night * 0.35); g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.lineTo(...c); g.lineTo(...d); g.closePath(); g.fill();
    }
    // дороги между вагонами
    g.strokeStyle = night > 0.5 ? "rgba(70,60,50,.45)" : "rgba(120,100,80,.35)"; g.lineWidth = TW * 0.32; g.lineCap = "round"; g.lineJoin = "round";
    g.beginPath(); [[3.6, 5], [7.2, 5.6], [10.6, 5], [10.6, 8.8], [7.2, 9.2], [3.4, 8.4], [3.6, 5]].forEach(([x, y], i) => { const p = iso(x, y); i ? g.lineTo(...p) : g.moveTo(...p); }); g.stroke();
    g.beginPath(); [[7.2, 9.2], [3.4, 11.4]].forEach(([x, y], i) => { const p = iso(x, y); i ? g.lineTo(...p) : g.moveTo(...p); }); g.moveTo(...iso(7.2, 9.2)); g.lineTo(...iso(10.3, 11)); g.stroke();
    // следы
    prints.forEach((p) => { p.a -= dt * 0.04; const [x, y] = iso(p.x, p.y); g.fillStyle = `rgba(90,110,130,${Math.max(0, p.a) * 0.35})`; g.beginPath(); g.ellipse(x, y, 3, 1.5, 0, 0, 7); g.fill(); });
    // объекты в порядке глубины
    const items = Object.entries(LOC).map(([k, L]) => ({ k, L, z: L.x + L.y + L.w + L.d }));
    const ppl = []; if (!intro) { ppl.push({ me: 1, z: me.x + me.y }); Object.entries(NPC).forEach(([k, n]) => ppl.push({ npc: n, k, z: n.x + n.y })); }
    [...items, ...ppl].sort((a, b) => a.z - b.z).forEach((o) => {
      if (o.L) drawLoc(o.k, o.L, night);
      else if (o.me) person(me.x, me.y, { jacket: JACKET[S.hero], helm: HELM[S.hero], skin: FACE[S.hero].skin, me: 1 }, T, !!me.path);
      else person(o.npc.x, o.npc.y, { jacket: o.npc.jacket, helm: o.npc.helm, skin: FACE[o.npc.k].skin }, T + o.z, false);
    });
    // пар из бани и дым
    if (Math.random() < 0.35) { const L = LOC.bath; steam.push({ x: L.x + 0.4, y: L.y + 0.4, z: L.h + 0.6, a: 0.7, r: rnd(4, 7) }); }
    if (Math.random() < 0.2) { const L = LOC.canteen; steam.push({ x: L.x + L.w - 0.4, y: L.y + 0.3, z: L.h + 0.5, a: 0.5, r: rnd(3, 5) }); }
    for (let i = steam.length - 1; i >= 0; i--) { const p = steam[i]; p.z += dt * 0.7; p.x += dt * 0.25; p.a -= dt * 0.22; p.r += dt * 5; if (p.a <= 0) { steam.splice(i, 1); continue; }
      const [x, y] = iso(p.x, p.y, p.z); g.fillStyle = `rgba(235,240,245,${p.a * 0.5})`; g.beginPath(); g.arc(x, y, p.r * TW / 64, 0, 7); g.fill(); }
    // снег
    g.fillStyle = "#fff"; snow.forEach((f) => { f.y += dt * 0.06 * f.z; f.x += dt * 0.012 * Math.sin(T + f.s * 5); if (f.y > 1) { f.y = 0; f.x = Math.random(); }
      g.globalAlpha = 0.35 + 0.5 * f.z; g.beginPath(); g.arc(f.x * W, f.y * Hh, f.s * f.z, 0, 7); g.fill(); }); g.globalAlpha = 1;
    // виньетка
    const vg = g.createRadialGradient(W / 2, Hh * 0.5, Hh * 0.3, W / 2, Hh * 0.5, Hh * 0.85); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, `rgba(0,0,10,${0.35 + night * 0.35})`); g.fillStyle = vg; g.fillRect(0, 0, W, Hh);
    placeTags();
  };
  const drawLoc = (k, L, night) => {
    const c = L.c, win = night > 0.3 ? `rgba(255,205,120,${0.6 + 0.4 * night})` : "rgba(160,200,230,.8)";
    if (k === "rig") {
      box(L.x, L.y, L.w, L.d, 0.5, "#6f7a86", "#3e4752", "#4c5661");                       // основание
      box(L.x + 0.3, L.y + 0.3, L.w - 0.6, L.d - 0.6, 1.0, "#808b97", "#46505b", "#56616d");
      const top = 8.5, b = [[L.x + 0.6, L.y + 0.6], [L.x + L.w - 0.6, L.y + 0.6], [L.x + L.w - 0.6, L.y + L.d - 0.6], [L.x + 0.6, L.y + L.d - 0.6]], mx = L.x + L.w / 2, my = L.y + L.d / 2;
      const at = (p, z) => { const k2 = (z - 1) / (top - 1) * 0.7; return iso(p[0] + (mx - p[0]) * k2, p[1] + (my - p[1]) * k2, z); };
      g.strokeStyle = "#f2a541"; g.lineWidth = Math.max(1.2, TW / 40);
      for (let z = 1; z < top; z += 1.25) for (let i = 0; i < 4; i++) { const a = at(b[i], z), b2 = at(b[(i + 1) % 4], z), c2 = at(b[i], Math.min(top, z + 1.25)), d2 = at(b[(i + 1) % 4], Math.min(top, z + 1.25));
        g.globalAlpha = 0.95; g.beginPath(); g.moveTo(...a); g.lineTo(...b2); g.moveTo(...a); g.lineTo(...c2); g.stroke(); g.globalAlpha = 0.45; g.beginPath(); g.moveTo(...a); g.lineTo(...d2); g.stroke(); }
      g.globalAlpha = 1;
      const tp = iso(mx, my, top + 0.3), blink = (Math.sin(T * 4) > 0) ? 1 : 0.25;
      const rg = g.createRadialGradient(tp[0], tp[1], 0, tp[0], tp[1], TW * 0.5); rg.addColorStop(0, `rgba(255,60,50,${0.9 * blink})`); rg.addColorStop(1, "rgba(255,60,50,0)");
      g.fillStyle = rg; g.beginPath(); g.arc(tp[0], tp[1], TW * 0.5, 0, 7); g.fill();
      for (let z = 2.5; z < top; z += 2.5) { const p = iso(mx, my, z); const lg = g.createRadialGradient(p[0], p[1], 0, p[0], p[1], TW * (0.3 + night * 0.5)); lg.addColorStop(0, `rgba(255,230,170,${0.5 + night * 0.5})`); lg.addColorStop(1, "rgba(255,230,170,0)"); g.fillStyle = lg; g.beginPath(); g.arc(p[0], p[1], TW * (0.3 + night * 0.5), 0, 7); g.fill(); }
      return;
    }
    const top = L.wood ? shade(c, 1.1) : "#f4f8fb";
    box(L.x, L.y, L.w, L.d, L.h, night > 0.5 ? shade(top, 0.75) : top, shade(c, 0.8 - night * 0.3), shade(c, 1 - night * 0.3));
    // снег на крыше
    if (!L.wood || k === "bath") { const a = iso(L.x, L.y, L.h + 0.06), b = iso(L.x + L.w, L.y, L.h + 0.06), c2 = iso(L.x + L.w, L.y + L.d, L.h + 0.06), d = iso(L.x, L.y + L.d, L.h + 0.06);
      g.fillStyle = night > 0.5 ? "rgba(200,215,230,.9)" : "rgba(255,255,255,.95)"; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.lineTo(...c2); g.lineTo(...d); g.closePath(); g.fill(); }
    // окна на длинной стороне
    if (k !== "wc") { const n = Math.max(1, Math.floor(L.w / 0.7)); for (let i = 0; i < n; i++) { const x0 = L.x + 0.25 + i * (L.w - 0.5) / n, x1 = x0 + 0.32;
      const p = [iso(x0, L.y + L.d, L.h * 0.75), iso(x1, L.y + L.d, L.h * 0.75), iso(x1, L.y + L.d, L.h * 0.4), iso(x0, L.y + L.d, L.h * 0.4)];
      g.fillStyle = win; g.beginPath(); g.moveTo(...p[0]); p.forEach((q) => g.lineTo(...q)); g.closePath(); g.fill();
      if (night > 0.3) { const m = iso((x0 + x1) / 2, L.y + L.d + 0.3, 0); const lg = g.createRadialGradient(m[0], m[1], 0, m[0], m[1], TW * 0.6); lg.addColorStop(0, `rgba(255,200,120,${0.25 * night})`); lg.addColorStop(1, "rgba(255,200,120,0)"); g.fillStyle = lg; g.beginPath(); g.arc(m[0], m[1], TW * 0.6, 0, 7); g.fill(); } } }
    else { const p = iso(L.x + L.w / 2, L.y + L.d, L.h * 0.8); g.fillStyle = "#3a2210"; g.font = `${TW * 0.16}px sans-serif`; g.textAlign = "center"; g.fillText("♥", p[0], p[1]); }
    if (k === "bath") { const p = iso(L.x + 0.4, L.y + 0.4, L.h); g.fillStyle = "#4a3a30"; g.fillRect(p[0] - 3, p[1] - TW * 0.35, 6, TW * 0.35); }
  };
  // метки локаций
  const tagsEl = $("#tags"); const tags = {};
  Object.entries(LOC).forEach(([k, L]) => { const b = document.createElement("button"); b.type = "button"; b.className = "tag"; b.innerHTML = `<span>${L.ic}</span>${L.n}`; b.onclick = () => goTo(k); tagsEl.appendChild(b); tags[k] = b; });
  const placeTags = () => {
    const gq = S.hero && goal();
    Object.entries(LOC).forEach(([k, L]) => { const z = k === "rig" ? 9.2 : L.h + 0.5, p = iso(L.x + L.w / 2, L.y + L.d / 2, z), el = tags[k];
      el.style.left = p[0] + "px"; el.style.top = p[1] + "px"; el.style.display = S.hero ? "" : "none";
      const has = S.hero && open().some((q) => q.where === k); el.classList.toggle("goal", !!(gq && gq.where === k));
      const qd = el.querySelector(".q"); if (has && !qd) { const i = document.createElement("i"); i.className = "q"; i.textContent = "!"; el.prepend(i); } else if (!has && qd) qd.remove(); });
  };
  cv.addEventListener("pointerdown", (e) => {        // касание здания на сцене
    if (!S.hero || $(".sheet") || FP.on) return; audio();
    let best = null, bd = 1e9; Object.entries(LOC).forEach(([k, L]) => { const p = iso(L.x + L.w / 2, L.y + L.d / 2, L.h / 2), d = Math.hypot(p[0] - e.clientX, p[1] - e.clientY); if (d < bd) { bd = d; best = k; } });
    if (best && bd < TW * 1.6) goTo(best);
  });

  // ===================== интерфейс =====================
  const ui = $("#ui"), toastEl = $("#toast");
  const toast = (m) => { toastEl.textContent = m; toastEl.classList.add("on"); clearTimeout(toastEl._t); toastEl._t = setTimeout(() => toastEl.classList.remove("on"), 2200); };
  const pop = (title, sub) => { const p = document.createElement("div"); p.className = "pop"; p.innerHTML = `<b>${esc(title)}</b>${sub ? `<span>${esc(sub)}</span>` : ""}`; document.body.appendChild(p); setTimeout(() => p.remove(), 1700); };
  const hud = () => {
    if (!S.hero) { $("#hud").classList.add("hidden"); $("#objective").classList.add("hidden"); return; }
    $("#hud").classList.remove("hidden"); $("#objective").classList.remove("hidden");
    $("#clock").innerHTML = `${hhmm(S.t)}<small>${S.t < 17 * 60 ? "день" : S.t < 19 * 60 ? "вечер" : "ночь"}</small>`;
    $("#b-en").style.width = clamp(S.en, 0, 100) + "%"; $("#b-mo").style.width = clamp(S.mood, 0, 100) + "%";
    $("#n-xp").textContent = "⭐ " + S.xp; $("#n-rub").textContent = "₽ " + S.rub.toLocaleString("ru-RU");
    const q = goal(); $("#obj-t").textContent = q ? q.t : "Свободное время"; $("#obj-d").textContent = q ? (LOC[q.where].ic + " " + LOC[q.where].n + " · " + q.d) : "Загляните в баню или общежитие";
    $("#jn").textContent = open().length || ""; $("#jn").style.display = open().length ? "" : "none";
    $("#snd").textContent = S.snd ? "🔊" : "🔇";
  };
  const gain = (o, why) => {
    const parts = [];
    if (o.xp) { S.xp += o.xp; parts.push("⭐ +" + o.xp); }
    if (o.rub) { S.rub += o.rub; parts.push("₽ +" + o.rub.toLocaleString("ru-RU")); SFX.coin(); }
    if (o.en) { S.en = clamp(S.en + o.en, 0, 100); parts.push((o.en > 0 ? "⚡ +" : "⚡ ") + o.en); }
    if (o.mood) { S.mood = clamp(S.mood + o.mood, 0, 100); parts.push((o.mood > 0 ? "😊 +" : "😊 ") + o.mood); }
    if (o.rep) S.rep += o.rep;
    if (o.min) S.t += o.min;
    save(); hud(); if (why) pop(why, parts.join("   "));
    checkTime();
  };
  const close = () => { hush(); const s = $(".sheet"); if (s) s.remove(); hud(); };
  const sheet = (html, cls = "") => { close(); const s = document.createElement("div"); s.className = "sheet glass " + cls; s.innerHTML = html; ui.appendChild(s); return s; };

  // диалог: печатает реплику, озвучивает, ждёт выбора
  const talk = (k, text, choices = ["Дальше"]) => new Promise((res) => {
    const s = sheet(`<div class="dlg"><div class="portrait">${portrait(k)}</div><div style="flex:1;min-width:0"><div class="who">${esc(FACE[k].name)}</div><div class="line"></div></div></div><div class="choices"></div>`, "speaking");
    const line = $(".line", s), ch = $(".choices", s); let i = 0, done = false;
    say(text, VOICE[k]);
    const type = () => { if (done) return; i += 2; line.innerHTML = esc(text.slice(0, i)) + '<span class="cur"></span>'; if (i < text.length) setTimeout(type, 22); else finish(); };
    const finish = () => { if (done) return; done = true; line.textContent = text; setTimeout(() => s.classList.remove("speaking"), Math.min(5000, text.length * 55));
      ch.innerHTML = choices.map((c, n) => `<button class="gbtn${n === 0 && choices.length === 1 ? " pri" : ""}" data-n="${n}">${esc(c)}</button>`).join("");
      ch.querySelectorAll("button").forEach((b) => b.onclick = () => { SFX.tap(); vib(6); res(+b.dataset.n); }); };
    line.onclick = finish; type();
  });
  const narr = async (lines, k) => { for (const l of lines) await talk(k, l); };

  // ===================== перемещение =====================
  const goTo = (k) => {
    if (S.done) return; if (FP.on && !FP.fight) fpSet(false); close(); audio(); SFX.tap();
    const d = DOOR(k), dist = Math.hypot(d.x - me.x, d.y - me.y);
    const mid = { x: (me.x + d.x) / 2 + (Math.abs(d.x - me.x) > 3 ? 0 : 0.6), y: (me.y + d.y) / 2 };
    me.path = dist < 0.3 ? [] : [[mid.x, mid.y], [d.x, d.y]];
    me.cb = () => { const m = Math.round(dist * 2.2); if (m) gain({ min: m, en: -Math.ceil(dist / 3) }); arrive(k); };
    if (!me.path.length) { me.path = null; me.cb(); me.cb = null; }
  };

  // ===================== локации и задания =====================
  const act = (ic, t, s, fn, q) => ({ ic, t, s, fn, q });
  const arrive = (k) => {
    if (S.done) return;
    if (k === "rig" || k === "store" || k === "canteen") SFX.door();
    if (k === "rig") SFX.drill();
    const L = LOC[k], list = [];
    open().filter((q) => q.where === k).forEach((q) => {
      const blocked = q.need && !S.q[q.need];
      list.push(act("❗", q.t, blocked ? "Сначала: " + QUESTS().find((x) => x.id === q.need).t : q.d, blocked ? null : () => Q[q.id](), true));
    });
    QUESTS().filter((q) => q.where === k && !S.q[q.id] && q.from && S.t < q.from).forEach((q) => list.push(act("🕐", q.t, "Будет доступно с " + hhmm(q.from), null)));
    (EXTRA[k] || []).forEach((e) => list.push(e));
    const s = sheet(`<button class="closer" aria-label="Закрыть">×</button><h2>${L.ic} ${esc(L.n)}</h2><p class="sub">${esc(DESC[k])}</p><div class="acts">${list.map((a, i) =>
      `<button class="act${a.q ? " quest" : ""}" data-i="${i}"${a.fn ? "" : " disabled"}><span class="ai">${a.ic}</span><span><b>${esc(a.t)}</b><small>${esc(a.s)}</small></span></button>`).join("")}</div>`);
    $(".closer", s).onclick = () => { SFX.tap(); close(); };
    s.querySelectorAll(".act").forEach((b) => b.onclick = () => { const a = list[+b.dataset.i]; if (a.fn) { SFX.tap(); vib(8); a.fn(); } });
  };
  const DESC = {
    rig: "Гул ротора, запах раствора и мастер, который всё видит.", nnb: "Тёплый вагон, три монитора и чайник, который никогда не остывает.",
    gti: "Газ, шлам, кривые. Здесь первыми узнают, что под долотом.", canteen: "Борщ по графику, котлеты по настроению тёти Вали.",
    dorm: "Койка, тапки и тишина. Почти.", store: "Всё есть. Где — знает только Жора.", bath: "Берёзовый веник, пар до потолка и дед Егорыч.", wc: "Деревянный домик с сердечком. На улице минус тридцать восемь.",
  };
  const EXTRA = {
    dorm: [act("😴", "Вздремнуть 40 минут", "Силы вернутся. Если сосед не храпит.", async () => { close(); fade(); SFX.snore(); await wait(1400);
      if (Math.random() < 0.4) { gain({ min: 40, en: 15, mood: -5 }, "Сосед храпел"); toast("Сосед по вагону храпит как буровой насос"); } else gain({ min: 40, en: 30, mood: 5 }, "Выспался"); })],
    canteen: [act("💪", "Армрестлинг", "Кто сильнее: ты или " + (S && S.hero === "mikh" ? "Петрович" : "Михалыч") + "?", () => armwrestle()),
      act("☕", "Чай с печеньем", "15 минут, немного сил и настроения", () => { SFX.spoon(); gain({ min: 15, en: 8, mood: 6 }, "Горячий чай"); close(); })],
    nnb: [act("💻", "Посмотреть телеметрию", "Зенит, азимут, toolface в реальном времени", async () => { await talk(S.hero === "serg" ? "serg" : "radio", pick(["Зенит восемьдесят семь и три, азимут сто сорок два. Держим пласт.", "Toolface пляшет, реактивный момент гуляет. Нормально, это ВЗД.", "Сигнал есть, импульсы чистые. Сегодня насосы не шумят."])); gain({ min: 10, xp: 5 }); close(); })],
    gti: [act("🧪", "Глянуть газовые показания", "Суммарный газ и хромотограф", async () => { await talk(S.hero === "lena" ? "lena" : "radio", pick(["Фон спокойный, ноль целых три десятых процента. Можно бурить.", "Пачка газа на ста двадцати метрах выше. Уже прошла, но я записала."])); gain({ min: 10, xp: 5 }); close(); })],
    store: [act("🧤", "Попросить новые перчатки", "Жора обещал ещё в прошлую вахту", async () => { await talk("zhora", pick(["Перчатки? Были. Вчера. Приходи завтра, может, вертолёт привезёт.", "На, держи. Только не говори никому, а то все придут."])); gain({ min: 10, mood: 3 }); close(); })],
    bath: [], wc: [], rig: [act("👀", "Посмотреть на ротор", "Просто постоять, послушать, как работает", () => { SFX.drill(); gain({ min: 10, mood: 2, xp: 2 }, "Красиво крутится"); close(); })],
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const fade = () => { const f = $("#fade"); f.classList.add("on"); setTimeout(() => f.classList.remove("on"), 900); };
  const done = (id, o, title) => { S.q[id] = 1; SFX.jingle(); vib([10, 40, 20]); gain(o, title || "Задание выполнено"); close(); setTimeout(() => { const n = goal(); if (n) toast("Дальше: " + n.t); }, 1800); };
  const fail = (o, title) => { SFX.bad(); vib(60); gain(o, title); };

  const Q = {
    async shift() {
      const boss = S.hero === "petr" ? "radio" : "boss";
      if (S.hero === "petr") { await narr(["Петрович, ночная вахта сдаёт. Забой три тысячи сто двадцать, идём по пласту. Насосы в норме, на третьем сальник подтекает."], "radio"); }
      else await narr(["Ну что, проснулся? Забой три тысячи сто двадцать, идём по пласту. Сегодня без приключений, понял меня?"], boss);
      const c = await talk(boss, "Вопросы есть?", ["Всё ясно, принял", "А премия будет?", "Где тут кофе?"]);
      if (c === 1) await talk(boss, "Будет. Если ничего не сломаешь. И если Жора ключ найдёт.");
      if (c === 2) await talk(boss, "Кофе в вагоне ННБ. Только Серёге не говори, что я сказал.");
      done("shift", { xp: 20, min: 20, mood: c === 1 ? 4 : 2 }, "Смена принята");
    },
    async eat() {
      SFX.spoon();
      const c = await talk("valya", "О, явился. Каша гречневая, котлеты, борщ. Что будешь, золотце?", ["Борщ и котлету", "Только кашу, я на диете", "Всё и добавки"]);
      if (c === 0) { await talk("valya", "Правильно. Сметану сам бери, я не нанималась."); done("eat", { en: 30, mood: 6, min: 30 }, "Сытый — значит живой"); }
      if (c === 1) { await talk("valya", "На диете он. На буровой. При минус тридцати восьми. Ешь давай, и котлету возьми."); done("eat", { en: 25, mood: 10, min: 30 }, "Тётя Валя одобряет"); }
      if (c === 2) { await talk("valya", "Вот это я понимаю. Только потом в люльку не полезь, лопнешь."); done("eat", { en: 40, mood: 4, min: 45 }, "Добавка засчитана"); }
    },
    async stand() {                        // бурильщик: тайминг ×3
      await talk("boss", "Михалыч, наращивай. Только аккуратно, ключ новый.");
      const ok = await timing(3, S.hero === "mikh" ? 0.26 : 0.18, "Наращивание свечи", "Жмите, когда метка в зелёной зоне");
      ok >= 2 ? done("stand", { xp: 40, rub: 3000, mood: 6, min: 30, en: -8 }, "Свеча наращена") : (fail({ min: 30, en: -10, mood: -8 }, "Клинья заело"), await talk("boss", "Ну кто так делает? Давай ещё раз, только без нервов."));
    },
    async orient() {                       // ННБ: снять toolface в вагоне, выставить на буровой
      if (!S.f.tfRead) {
        await talk("serg", "Так, снимаю toolface. Нужно ставить на сорок пять вправо, реактивный момент градусов двадцать.");
        S.f.tfRead = 1; save(); toast("Теперь на буровую: выставить отклонитель"); ROLEQ.serg.where = "rig"; close(); hud(); return;
      }
      const ok = await dial(45, S.hero === "serg" ? 14 : 9);
      ok ? done("orient", { xp: 50, rub: 4000, mood: 8, min: 25 }, "Отклонитель на месте") : fail({ min: 20, mood: -6, en: -5 }, "Мимо сектора");
      if (!ok) await talk("boss", "Что-то тебя повело. Подумай про реактивный момент и попробуй снова.");
    },
    async cutt() {
      await talk("lena", "Шлам с забоя. Серый, слоистый, на зубах скрипит. Вода в пробирке мутнеет. Что это?");
      const c = await talk("lena", "Ставлю отметку в журнале…", ["Песчаник, скрипит же", "Глина, мылится", "Цемент, кто-то тампонаж забыл"]);
      if (c === 0) { await talk("lena", "Скрипит — значит кварц. Песчаник. Значит, мы в пласте. Пишем."); done("cutt", { xp: 45, rub: 3000, mood: 8, min: 30 }, "Пласт подтверждён"); }
      else { fail({ min: 20, mood: -5 }, "Не то"); await talk("lena", c === 1 ? "Глина мылится, а тут скрипит. Посмотри ещё раз." : "Какой цемент, мы на трёх тысячах. Попробуй снова."); }
    },
    async order() {
      await talk("zhora", "Петрович, это не я разлил! Это Михалыч трубы мимо мостков складывал!");
      const c = await talk("petr", "Так, тишина на площадке.", ["Спокойно: сначала убираем, потом разбираемся", "Всем лишить премии!", "Сам уберу, мне не сложно"]);
      if (c === 0) { await talk("zhora", "Ну… логично. Михалыч, бери лопату, я ведро."); done("order", { xp: 45, rep: 10, mood: 6, min: 30 }, "Порядок без крика"); }
      if (c === 1) { await talk("zhora", "Ну всё, теперь до конца вахты будут дуться."); done("order", { xp: 25, rep: -5, mood: -10, min: 20 }, "Порядок навели. Но какой ценой"); }
      if (c === 2) { await talk("zhora", "Петрович с лопатой… Сфотографирую на память."); done("order", { xp: 35, rep: 6, en: -12, mood: 10, min: 40 }, "Мастер личным примером"); }
    },
    async key() {
      await talk("zhora", "Ключ на тридцать шесть? Был. Где-то. Сейчас.");
      const c = await talk("zhora", "Так… тут гайки, тут валенки, тут чей-то кот… А, вот! Распишись в трёх местах.", ["Расписаться", "А кот чей?"]);
      if (c === 1) await talk("zhora", "Котяра общий. Зовут Долото. Мышей не ловит, зато греет.");
      done("key", { xp: 10, mood: c === 1 ? 6 : 2, min: 20 }, "Ключ получен");
    },
    async mud() {
      await talk(S.hero === "petr" ? "radio" : "boss", "Плотность упала. Надо до одной целой двадцати пяти. Сыпь барит, только без фанатизма.");
      const ok = await hold(1.25, 0.015);
      ok ? done("mud", { xp: 40, rub: 2500, min: 40, en: -10 }, "Раствор в норме") : fail({ min: 25, en: -6, mood: -6 }, "Перелил барита");
    },
    async wc() {
      SFX.wind(true); await talk(S.hero, pick(["Ну, с богом. Минус тридцать восемь, ветер, а природа не ждёт.", "Если не вернусь, скажите тёте Вале, что котлеты были лучшие."]));
      toast("Дверь примёрзла! Стучите быстрее");
      const ok = await mash(14, 4.5);
      if (ok) { SFX.door(); await wait(500); SFX.flush(); await narr(["Ох… Вот это сервис. Сиденье, правда, как ледяная горка."], S.hero); done("wc", { mood: 20, min: 15, en: -3, xp: 5 }, "Миссия выполнима"); }
      else { fail({ mood: -10, min: 10 }, "Дверь победила"); toast("Попробуйте ещё раз, природа не отступает"); }
      SFX.wind(false); SFX.wind(true);
    },
    async alarm() {
      const late = S.t - S.f.alarmAt;
      if (late > 25) { fail({ rep: -10, mood: -10 }, "Опоздал на тревогу"); await talk(S.hero === "petr" ? "radio" : "boss", "Двадцать пять минут! Будь это по-настоящему, мы бы уже все были на вертолётке. Ладно, учебная. Разбор вечером."); S.q.alarm = 1; S.f.alarmOn = 0; save(); close(); return; }
      const c = await talk(S.hero === "petr" ? "radio" : "boss", "Признаки проявления! Что делаешь первым?", ["Закрываю превентор", "Бегу за телефоном снимать", "Ищу мастера"]);
      if (c === 0) { SFX.clank(); done("alarm", { xp: 60, rub: 5000, rep: 10, min: 20 }, "Превентор закрыт за 40 секунд"); }
      else { fail({ rep: -5, mood: -5, min: 15 }, c === 1 ? "Блогер на буровой" : "Мастер и так здесь"); await talk("boss", "Первым делом закрыть скважину. Запомни, как свою фамилию."); S.q.alarm = 1; S.f.alarmOn = 0; save(); }
    },
    async bath() {
      await talk("egor", "Заходи, сынок. Пар сегодня злой, как начальство. Веник замочил, берёзовый.");
      const ok = await steamGame();
      if (ok) { SFX.splash(); await talk("egor", pick(["Вот теперь ты человек. А то ходил как замёрзший пингвин.", "Эх, хорошо! На большой земле так не попаришься."])); done("bath", { en: 45, mood: 30, min: 60, xp: 15 }, "С лёгким паром!"); }
      else { SFX.splash(); fail({ en: 10, mood: -2, min: 30 }, "Не выдержал пар"); await talk("egor", "Слабоват. Окунись в сугроб и приходи ещё."); }
    },
    async snow() {
      await talk("zhora", "О, пришёл! Правила простые: в лицо не кидать, в мастера не кидать, шесть попаданий — победа. Поехали!");
      close(); fpStart(true);
    },
    async hand() {
      const c = await talk(S.hero === "petr" ? "radio" : "boss", "Ночная вахта пришла. Сдаёшь?", ["Сдаю, журнал заполнен", "Подожди, ещё не всё сделал"]);
      if (c === 1) return close();
      done("hand", { xp: 30, min: 10 }, "Смена сдана"); setTimeout(finale, 1600);
    },
  };

  // ===================== мини-игры =====================
  const timing = (n, zoneW, title, hint) => new Promise((res) => {
    const s = sheet(`<div class="mg"><h2>${esc(title)}</h2><p class="sub">${esc(hint)}</p><div class="pips">${"<i></i>".repeat(n)}</div><div class="track"><i class="zone"></i><i class="mark"></i></div><button class="gbtn pri" style="width:100%;padding:16px;font-size:17px">Сейчас!</button></div>`);
    const zone = $(".zone", s), mark = $(".mark", s), pips = s.querySelectorAll(".pips i"); let k = 0, ok = 0, x = 0, dir = 1, z0 = 0, run = true, sp = 0.9;
    const setZone = () => { z0 = rnd(0.12, 0.88 - zoneW); zone.style.left = z0 * 100 + "%"; zone.style.width = zoneW * 100 + "%"; }; setZone();
    let lt = performance.now(); const loop = (t) => { if (!run) return; const dt = (t - lt) / 1000; lt = t; x += dir * sp * dt; if (x > 1) { x = 1; dir = -1; } if (x < 0) { x = 0; dir = 1; } mark.style.left = x * 100 + "%"; requestAnimationFrame(loop); }; requestAnimationFrame(loop);
    $(".gbtn", s).onclick = () => { const hit = x >= z0 && x <= z0 + zoneW; pips[k].className = hit ? "ok" : "no"; hit ? (SFX.clank(), vib(15), ok++) : (SFX.bad(), vib(60)); k++; sp *= 1.18;
      if (k >= n) { run = false; setTimeout(() => res(ok), 450); } else setZone(); };
  });
  const dial = (target, tol) => new Promise((res) => {
    const s = sheet(`<div class="mg"><h2>Отклонитель</h2><p class="sub">Сектор: ${target}° вправо от верхней стенки. Не забудьте реактивный момент: после запуска насосов отклонитель довернёт влево на ~20°.</p>
      <div class="dial"><i class="sector"></i><span class="hs">верх</span><i class="needle"></i><i class="hub"></i></div><div class="big" id="tfv">0°</div>
      <p style="display:flex;gap:8px;justify-content:center;margin:8px 0 0"><button class="gbtn" data-d="-5">⟲ 5°</button><button class="gbtn" data-d="5">5° ⟳</button><button class="gbtn pri" id="tfok">Запустить насосы</button></p></div>`);
    const dl = $(".dial", s), nd = $(".needle", s), sec = $(".sector", s), v = $("#tfv", s); let a = 0;
    sec.style.background = `conic-gradient(from ${target - tol}deg, rgba(76,201,176,.45) 0 ${tol * 2}deg, transparent ${tol * 2}deg)`;
    const draw = () => { nd.style.transform = `rotate(${a}deg)`; v.textContent = ((a % 360) + 360) % 360 + "°"; };
    const fromXY = (e) => { const r = dl.getBoundingClientRect(); a = Math.round(Math.atan2(e.clientX - r.left - r.width / 2, -(e.clientY - r.top - r.height / 2)) * 180 / Math.PI); draw(); };
    dl.addEventListener("pointerdown", (e) => { dl.setPointerCapture(e.pointerId); fromXY(e); }); dl.addEventListener("pointermove", (e) => { if (e.buttons || e.pressure) fromXY(e); });
    s.querySelectorAll("[data-d]").forEach((b) => b.onclick = () => { a += +b.dataset.d; SFX.tap(); draw(); });
    $("#tfok", s).onclick = async () => { SFX.drill(); const start = a, end = a - 20; for (let i = 0; i <= 20; i++) { a = Math.round(start + (end - start) * i / 20); draw(); await wait(30); }
      const d = ((a - target) % 360 + 540) % 360 - 180; res(Math.abs(d) <= tol); };
    draw();
  });
  const hold = (target, tol) => new Promise((res) => {
    const lo = 1.15, hi = 1.35, k = (x) => (x - lo) / (hi - lo);
    const s = sheet(`<div class="mg"><h2>Утяжеление</h2><p class="sub">Держите кнопку, барит сыплется. Отпустите на ${String(target).replace(".", ",")} г/см³.</p><div class="big" id="rv">1,15</div>
      <div class="track"><i class="zone" style="left:${k(target - tol) * 100}%;width:${(k(target + tol) - k(target - tol)) * 100}%"></i><i class="fill"></i></div><button class="gbtn pri" id="hb" style="width:100%;padding:18px;font-size:17px">Держать, сыпать барит</button></div>`);
    const fill = $(".fill", s), rv = $("#rv", s), b = $("#hb", s); let r = lo, on = false, lt = 0, fin = false;
    const loop = (t) => { if (fin) return; if (on) { const dt = (t - lt) / 1000; r = Math.min(hi, r + dt * 0.05 * (1 + (r - lo) * 4)); } lt = t; fill.style.width = k(r) * 100 + "%"; rv.textContent = r.toFixed(3).replace(".", ","); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    b.addEventListener("pointerdown", (e) => { e.preventDefault(); on = true; lt = performance.now(); noise("bandpass", 1500, 0.5, 0.15, 0.1, 2.5); });
    const up = () => { if (!on || fin) return; on = false; fin = true; res(Math.abs(r - target) <= tol); }; b.addEventListener("pointerup", up); b.addEventListener("pointerleave", up);
  });
  const mash = (need, sec) => new Promise((res) => {
    const s = sheet(`<div class="mg"><h2>Дверь примёрзла</h2><p class="sub">Стучите быстрее! ${need} ударов за ${sec} секунды</p><div class="big" id="mc">0 / ${need}</div><button class="mash glass" id="mb">🚪</button><div class="track" style="height:10px"><i class="fill" id="mt" style="width:100%"></i></div></div>`);
    let n = 0, t0 = performance.now(), fin = false; const mc = $("#mc", s), mt = $("#mt", s);
    const loop = () => { if (fin) return; const left = 1 - (performance.now() - t0) / 1000 / sec; mt.style.width = Math.max(0, left) * 100 + "%"; if (left <= 0) { fin = true; res(false); } else requestAnimationFrame(loop); }; requestAnimationFrame(loop);
    $("#mb", s).addEventListener("pointerdown", (e) => { e.preventDefault(); if (fin) return; n++; SFX.knock(); vib(12); mc.textContent = n + " / " + need; if (n >= need) { fin = true; SFX.crack(); res(true); } });
  });
  const steamGame = () => new Promise((res) => {
    const s = sheet(`<div class="mg"><h2>Парилка</h2><p class="sub">Держите жар в зелёной зоне 8 секунд. «Поддать» — ковш на камни. Перегреете — Егорыч выгонит.</p><div class="therm"><i class="zone" style="bottom:55%;height:22%"></i><i class="fill" id="tf"></i></div><div class="big" id="tt">60°</div>
      <p style="display:flex;gap:8px;justify-content:center"><button class="gbtn pri" id="sp" style="flex:1;padding:15px">Поддать 🪣</button><button class="gbtn" id="sw" style="flex:1;padding:15px">Веником 🌿</button></p><div class="track" style="height:10px"><i class="fill" id="sg" style="width:0"></i></div></div>`);
    let temp = 60, good = 0, fin = false, lt = performance.now(); const tf = $("#tf", s), tt = $("#tt", s), sg = $("#sg", s);
    const loop = (t) => { if (fin) return; const dt = (t - lt) / 1000; lt = t; temp -= dt * 4.5; const k = (temp - 40) / 80; tf.style.height = clamp(k, 0, 1) * 100 + "%"; tt.textContent = Math.round(temp) + "°";
      if (k >= 0.55 && k <= 0.77) good += dt; sg.style.width = clamp(good / 8, 0, 1) * 100 + "%";
      if (good >= 8) { fin = true; res(true); } else if (temp > 112 || temp < 42) { fin = true; res(false); } else requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    $("#sp", s).onclick = () => { temp += 9; SFX.steam(); vib(20); }; $("#sw", s).onclick = () => { temp += 2.5; noise("bandpass", 2500, 1, 0.2, 0.01, 0.15); vib(8); };
  });

  // ===================== время, события, финал =====================
  const checkTime = () => {
    if (S.done || !S.hero) return;
    if (!S.q.alarm && !S.f.alarmOn && S.t >= 14 * 60) { S.f.alarmOn = 1; S.f.alarmAt = S.t; save(); SFX.siren(); vib([200, 100, 200]); toast("🚨 Сирена! Учебная тревога — бегом на буровую"); hud(); }
    if (S.t >= 17 * 60 && !S.f.bathTold) { S.f.bathTold = 1; save(); setTimeout(() => toast("♨️ Егорыч затопил баню"), 2400); }
    if (S.en <= 0) { S.en = 0; toast("Силы кончились. Уснули прямо в столовой…"); S.t = Math.max(S.t, 20 * 60); setTimeout(finale, 1500); return; }
    if (S.t >= 20 * 60 + 30 && !S.done) setTimeout(finale, 800);
  };
  const finale = () => {
    if (S.done) return; S.done = true; save(); close(); SFX.jingle();
    const score = S.xp + Math.round(S.rub / 100) + S.mood + S.rep * 2, done = Object.keys(S.q).length;
    const rank = score > 420 ? "Вахтовик года" : score > 300 ? "Надёжный как ротор" : score > 180 ? "Крепкий середнячок" : "Стажёр с перспективой";
    sheet(`<div class="final"><div class="portrait" style="width:96px;height:110px;margin:0 auto">${portrait(S.hero)}</div><div class="rank">${rank}</div><p class="sub">Смена окончена. ${H().role} ${FACE[S.hero].name} ${FACE[S.hero].fem ? "закрыла" : "закрыл"} журнал.</p>
      <div class="grid3"><div><b>${S.xp}</b><small>опыт</small></div><div><b>${(S.rub / 1000).toFixed(0)}к</b><small>премия, ₽</small></div><div><b>${done}</b><small>заданий</small></div></div>
      <button class="gbtn pri" id="again" style="width:100%;padding:14px">Новая смена</button></div>`);
    $("#again").onclick = () => { localStorage.removeItem(KEY); S = { snd: S.snd, voice: S.voice }; close(); showPick(); };
  };

  // журнал
  $("#jbtn").onclick = () => { SFX.tap(); const all = QUESTS();
    sheet(`<button class="closer">×</button><div class="journal"><h2>📒 Журнал смены</h2><p class="sub">${H().role} · ${FACE[S.hero].name} · ${hhmm(S.t)}</p>${all.map((q) =>
      `<div class="jq${S.q[q.id] ? " done" : ""}"><span>${S.q[q.id] ? "✅" : q.from && S.t < q.from ? "🕐" : "📍"}</span><div><b>${esc(q.t)}</b><span>${esc(LOC[q.where].n)}${q.from && S.t < q.from ? " · с " + hhmm(q.from) : ""}${q.opt ? " · по желанию" : ""}</span></div></div>`).join("")}
      <p style="display:flex;gap:8px;margin-top:12px"><button class="gbtn sm" id="vtog">${S.voice ? "🗣 Голоса: вкл" : "🗣 Голоса: выкл"}</button><button class="gbtn sm" id="restart">Начать заново</button></p></div>`);
    $(".closer").onclick = close; $("#vtog").onclick = () => { S.voice = !S.voice; save(); $("#vtog").textContent = S.voice ? "🗣 Голоса: вкл" : "🗣 Голоса: выкл"; };
    $("#restart").onclick = () => { if (confirm("Начать смену заново?")) { localStorage.removeItem(KEY); S = { snd: S.snd, voice: S.voice }; close(); showPick(); } };
  };
  $("#objective .obj").onclick = () => { const q = goal(); if (q) goTo(q.where); };
  $("#snd").onclick = () => { S.snd = !S.snd; save(); audio(); if (master) master.gain.value = S.snd ? 0.8 : 0; SFX.wind(S.snd); if (!S.snd) hush(); hud(); };

  // выбор героя
  const showPick = () => {
    hud(); let sel = null; const saved = S.hero && !S.done;
    const p = document.createElement("div"); p.className = "pick"; p.innerHTML = `<div class="logo"><b>ВАХТА</b><span>Смена на буровой · 08:00 — 20:00</span></div><div class="heroes">${HEROES.map((h, i) =>
      `<button class="hcard glass" style="--i:${i}" data-h="${h.id}"><div class="portrait">${portrait(h.id)}</div><small>${h.role}</small><b>${FACE[h.id].name}</b><p>${h.about}</p><p style="color:#ffc163">${h.tag}</p></button>`).join("")}</div>
      <button class="gbtn pri go" disabled style="opacity:.5">Выберите героя</button>${saved ? `<button class="gbtn cont">Продолжить смену · ${FACE[S.hero].name}, ${hhmm(S.t)}</button>` : ""}`;
    ui.appendChild(p);
    const go = $(".go", p);
    p.querySelectorAll(".hcard").forEach((c) => c.onclick = () => { audio(); SFX.tap(); vib(8); p.querySelectorAll(".hcard").forEach((x) => x.classList.toggle("on", x === c)); sel = c.dataset.h;
      go.disabled = false; go.style.opacity = 1; go.textContent = "Заступить на смену"; const h = HEROES.find((x) => x.id === sel); say(pick(["Ну, поехали.", "На вахту, так на вахту.", "Давай, пока чай не остыл."]), VOICE[sel]); });
    go.onclick = () => { if (!sel) return; const h = HEROES.find((x) => x.id === sel); S = Object.assign(fresh(sel), { en: h.en, mood: h.mood, snd: S.snd, voice: S.voice }); ROLEQ.serg.where = "nnb";
      me.x = S.pos.x; me.y = S.pos.y; cam.x = me.x; cam.y = me.y; save(); p.remove(); SFX.jingle(); SFX.wind(S.snd); hud(); setTimeout(() => talk(sel, pick(["Восемь утра, минус тридцать восемь. Обычный вторник на кусту.", "Так, сначала к мастеру. Потом завтрак. Потом как пойдёт."]), ["Поехали"]).then(close), 500); };
    const cont = $(".cont", p); if (cont) cont.onclick = () => { if (S.f.tfRead) ROLEQ.serg.where = "rig"; me.x = S.pos.x; me.y = S.pos.y; cam.x = me.x; cam.y = me.y; p.remove(); audio(); SFX.wind(S.snd); hud(); };
  };


  // ===================== армрестлинг: перетягивание силой пальца =====================
  const armwrestle = async () => {
    const opp = S.hero === "mikh" ? "petr" : "mikh";
    await talk(opp, pick(["Ну давай, садись. Только локоть со стола не убирай, я всё вижу.", "Руку ставь. Проиграешь — моешь кружки до конца вахты."]));
    const ok = await new Promise((res) => {
      const s = sheet(`<div class="mg"><h2>Армрестлинг</h2><p class="sub">Жмите быстро! Соперник давит без остановки.</p><div class="big" id="aw">0</div>
        <div class="track"><i class="zone" style="left:85%;width:15%"></i><i class="mark" id="am" style="left:50%"></i></div><button class="mash glass" id="ab">💪</button></div>`);
      let x = 0.5, fin = false, lt = performance.now(), n = 0; const am = $("#am", s), aw = $("#aw", s), t0 = lt, power = S.hero === "mikh" ? 0.05 : 0.04;
      const loop = (t) => { if (fin) return; const dt = (t - lt) / 1000; lt = t; x -= dt * (0.11 + (t - t0) / 1000 * 0.012); am.style.left = clamp(x, 0, 1) * 100 + "%";
        if (x >= 0.85) { fin = true; res(true); } else if (x <= 0.02) { fin = true; res(false); } else requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
      $("#ab", s).addEventListener("pointerdown", (e) => { e.preventDefault(); if (fin) return; x += power; n++; aw.textContent = n; SFX.knock(); vib(10); });
    });
    if (ok) { SFX.jingle(); await talk(opp, "Ничего себе… Это всё котлеты тёти Вали. Ладно, твоя взяла."); gain({ mood: 12, xp: 15, min: 15, en: -6 }, "Чемпион столовой"); }
    else { SFX.bad(); await talk(opp, "Ха! Рано тебе ещё. Иди кружки мой."); gain({ mood: -4, min: 15, en: -6 }, "Кружки ждут"); }
    close();
  };

  // ===================== вид от первого лица: прогулка и снежная битва =====================
  // Лучи по сетке куста (4 клетки на единицу карты), стены вагонов с окнами, спрайты людей и вышки,
  // небо по времени смены, снег. Буфер низкого разрешения растягивается на экран.
  const GR = 4, MW = 13 * GR, cells = new Int8Array(MW * MW), keys = Object.keys(LOC);
  keys.forEach((k, i) => { const L = LOC[k]; for (let x = Math.floor(L.x * GR); x < Math.ceil((L.x + L.w) * GR); x++) for (let y = Math.floor(L.y * GR); y < Math.ceil((L.y + L.d) * GR); y++) if (x >= 0 && y >= 0 && x < MW && y < MW) cells[y * MW + x] = i + 1; });
  const solid = (x, y) => x < 0.3 || y < 0.3 || x > 12.7 || y > 12.7 || cells[Math.floor(y * GR) * MW + Math.floor(x * GR)] > 0;
  const FP = { on: false, a: -Math.PI / 2, jx: 0, jy: 0, fight: null, walked: 0, near: null };
  const buf = document.createElement("canvas"), bg = buf.getContext("2d"); let RW = 300, RH = 600, zb = new Float32Array(300);
  const SNOWMEN = [[4.9, 5.4], [8.6, 10.6], [1.2, 1.2]];
  const fpEl = document.createElement("div"); fpEl.className = "fpui hidden";
  fpEl.innerHTML = `<div class="joy glass" id="joy"><i></i></div><div class="cross hidden" id="cross"></div><div class="splat" id="splat"></div>
    <div class="fpr"><button class="gbtn hidden" id="fpenter"></button><button class="gbtn pri throw hidden" id="fpthrow">❄️</button></div>
    <div class="fpscore hidden glass" id="fpscore"></div>`;
  document.body.appendChild(fpEl);
  const fpBtn = document.createElement("button"); fpBtn.className = "snd glass"; fpBtn.id = "fpbtn"; fpBtn.type = "button"; fpBtn.setAttribute("aria-label", "Вид от первого лица"); fpBtn.textContent = "👁";
  $("#hud").insertBefore(fpBtn, $("#snd"));
  const fpSet = (on) => { FP.on = on; fpEl.classList.toggle("hidden", !on); tagsEl.style.display = on ? "none" : ""; fpBtn.textContent = on ? "🗺" : "👁"; me.path = null;
    if (on) { RW = Math.round(clamp(innerWidth * 0.8, 240, 360)); RH = Math.round(RW * innerHeight / innerWidth); buf.width = RW; buf.height = RH; zb = new Float32Array(RW); toast("Левый палец — идти, правый — смотреть"); } };
  fpBtn.onclick = () => { if (FP.fight) return toast("Сначала добейте снежную битву"); audio(); SFX.tap(); fpSet(!FP.on); };
  // джойстик и обзор
  const joy = $("#joy", fpEl), knob = joy.querySelector("i"); let jid = null, jc = null, lid = null, lx = 0;
  joy.addEventListener("pointerdown", (e) => { e.stopPropagation(); jid = e.pointerId; joy.setPointerCapture(jid); const r = joy.getBoundingClientRect(); jc = [r.left + r.width / 2, r.top + r.height / 2]; jmove(e); });
  const jmove = (e) => { if (e.pointerId !== jid) return; let dx = e.clientX - jc[0], dy = e.clientY - jc[1]; const m = Math.hypot(dx, dy), R = 46; if (m > R) { dx *= R / m; dy *= R / m; }
    FP.jx = dx / R; FP.jy = dy / R; knob.style.transform = `translate(${dx}px,${dy}px)`; };
  joy.addEventListener("pointermove", jmove);
  const jend = (e) => { if (e.pointerId !== jid) return; jid = null; FP.jx = FP.jy = 0; knob.style.transform = ""; }; joy.addEventListener("pointerup", jend); joy.addEventListener("pointercancel", jend);
  cv.addEventListener("pointerdown", (e) => { if (!FP.on) return; lid = e.pointerId; lx = e.clientX; cv.setPointerCapture(lid); });
  cv.addEventListener("pointermove", (e) => { if (FP.on && e.pointerId === lid) { FP.a += (e.clientX - lx) * 0.0065; lx = e.clientX; } });
  cv.addEventListener("pointerup", (e) => { if (e.pointerId === lid) lid = null; });
  $("#fpenter", fpEl).onclick = () => { if (FP.near) { SFX.tap(); arrive(FP.near); } };
  $("#fpthrow", fpEl).onclick = () => throwBall();

  const fpUpdate = (dt) => {
    if ($(".sheet") && !FP.fight) return;
    const f = -FP.jy, st = FP.jx, sp = 1.7 * dt, ca = Math.cos(FP.a), sa = Math.sin(FP.a);
    const nx = me.x + (ca * f - sa * st) * sp, ny = me.y + (sa * f + ca * st) * sp, r = 0.18;
    const ox2 = me.x, oy2 = me.y;
    if (!solid(nx + Math.sign(nx - me.x) * r, me.y)) me.x = nx; if (!solid(me.x, ny + Math.sign(ny - me.y) * r)) me.y = ny;
    const moved = Math.hypot(me.x - ox2, me.y - oy2); FP.walked += moved; me.walk += moved;
    if (me.walk > 0.42) { me.walk = 0; SFX.step(); }
    if (FP.walked > 0.5 && !FP.fight) { const m = Math.round(FP.walked * 2.2); FP.walked = 0; S.t += m; S.en = clamp(S.en - m * 0.12, 0, 100); S.pos = { x: me.x, y: me.y }; save(); hud(); checkTime(); }
    // ближайшая дверь
    let near = null, nd = 0.95; keys.forEach((k) => { const d = DOOR(k), dd = Math.hypot(d.x - me.x, d.y - me.y); if (dd < nd) { nd = dd; near = k; } });
    FP.near = FP.fight ? null : near; const eb = $("#fpenter", fpEl); eb.classList.toggle("hidden", !FP.near); if (FP.near) eb.textContent = "Войти: " + LOC[FP.near].ic + " " + LOC[FP.near].n;
    if (FP.fight) fightUpdate(dt);
  };

  const drawFP = () => {
    const t = S.t, [s1, s2, night] = sky(t), hz = RH * 0.5, focal = RW * 0.62, eye = 0.17, ca = Math.cos(FP.a), sa = Math.sin(FP.a);
    // небо, сияние, земля
    const sg = bg.createLinearGradient(0, 0, 0, hz); sg.addColorStop(0, s1); sg.addColorStop(1, s2); bg.fillStyle = sg; bg.fillRect(0, 0, RW, hz);
    if (night > 0) { bg.fillStyle = "#fff"; for (let i = 0; i < 50; i++) { const x = ((i * 137.5 - FP.a * 80) % RW + RW) % RW, y = (i * 41.3) % (hz * 0.8); bg.globalAlpha = night * (0.4 + 0.6 * Math.abs(Math.sin(T + i))); bg.fillRect(x, y, 1, 1); }
      for (let b = 0; b < 2; b++) { bg.globalAlpha = night * 0.32; const ag = bg.createLinearGradient(0, hz * 0.05, 0, hz * 0.55); const col = b ? "150,120,255" : "90,255,190";
        ag.addColorStop(0, `rgba(${col},0)`); ag.addColorStop(0.45, `rgba(${col},.9)`); ag.addColorStop(1, `rgba(${col},0)`); bg.fillStyle = ag; bg.beginPath(); bg.moveTo(0, hz * 0.3);
        for (let x = 0; x <= RW; x += 8) bg.lineTo(x, hz * (0.18 + 0.1 * Math.sin((x - FP.a * 120) / 40 + T * 0.5 + b * 2)) + b * 12); bg.lineTo(RW, hz * 0.56); bg.lineTo(0, hz * 0.56); bg.closePath(); bg.fill(); } bg.globalAlpha = 1; }
    const gg = bg.createLinearGradient(0, hz, 0, RH); gg.addColorStop(0, shade("#b9c6d2", 0.95 - night * 0.45)); gg.addColorStop(1, shade("#f2f6f9", 1 - night * 0.5)); bg.fillStyle = gg; bg.fillRect(0, hz, RW, RH - hz);
    const fogC = s2;
    // стены
    for (let c = 0; c < RW; c++) {
      const cam = (2 * c / RW - 1) * (RW / 2 / focal), rx = ca - sa * cam, ry = sa + ca * cam;
      let mx = Math.floor(me.x * GR), my = Math.floor(me.y * GR); const dX = Math.abs(1 / rx), dY = Math.abs(1 / ry);
      let stX, stY, sX, sY, side = 0, hit = 0, steps = 0;
      if (rx < 0) { stX = -1; sX = (me.x * GR - mx) * dX; } else { stX = 1; sX = (mx + 1 - me.x * GR) * dX; }
      if (ry < 0) { stY = -1; sY = (me.y * GR - my) * dY; } else { stY = 1; sY = (my + 1 - me.y * GR) * dY; }
      while (!hit && steps++ < 120) { if (sX < sY) { sX += dX; mx += stX; side = 0; } else { sY += dY; my += stY; side = 1; } if (mx < 0 || my < 0 || mx >= MW || my >= MW) break; hit = cells[my * MW + mx]; }
      if (!hit) { zb[c] = 1e9; continue; }
      const dist = ((side ? sY - dY : sX - dX) / GR) / Math.sqrt(1 + cam * cam) * Math.sqrt(1 + cam * cam), perp = Math.max(0.05, side ? (sY - dY) / GR : (sX - dX) / GR);
      zb[c] = perp;
      const k = keys[hit - 1], L = LOC[k], wh = (k === "rig" ? 0.55 : L.h * 0.5), bot = hz + eye * focal / perp, top = bot - wh * focal / perp;
      const u = side ? me.x + perp * rx : me.y + perp * ry, uf = u - Math.floor(u * 1.4) / 1.4;
      const fog = clamp(perp / 9, 0, 0.85), base = shade(L.c, (side ? 0.75 : 1) * (1 - night * 0.45));
      bg.fillStyle = base; bg.fillRect(c, top, 1, bot - top);
      // окна: днём голубые, ночью тёплые
      if (k !== "rig" && k !== "wc" && uf > 0.18 && uf < 0.5) { bg.fillStyle = night > 0.3 ? `rgba(255,205,120,${0.75 + night * 0.25})` : "rgba(170,205,230,.9)"; bg.fillRect(c, top + (bot - top) * 0.25, 1, (bot - top) * 0.33); }
      if (L.wood) { bg.fillStyle = "rgba(0,0,0,.18)"; if (Math.floor(u * 12) % 2) bg.fillRect(c, top, 1, bot - top); }
      else { if (uf < 0.03) { bg.fillStyle = "rgba(0,0,0,.25)"; bg.fillRect(c, top, 1, bot - top); } bg.fillStyle = "rgba(0,0,0,.12)"; bg.fillRect(c, top + (bot - top) * 0.12, 1, Math.max(1, (bot - top) * 0.02)); }
      bg.fillStyle = night > 0.5 ? "rgba(190,205,222,.95)" : "rgba(246,250,252,.97)"; bg.fillRect(c, bot - (bot - top) * 0.1, 1, (bot - top) * 0.1);
      bg.fillStyle = night > 0.5 ? "rgba(205,220,235,.95)" : "rgba(255,255,255,.95)"; bg.fillRect(c, top - Math.max(1, 0.03 * focal / perp), 1, Math.max(1, 0.03 * focal / perp));
      bg.globalAlpha = fog; bg.fillStyle = fogC; bg.fillRect(c, top - 2, 1, bot - top + 2); bg.globalAlpha = 1;
    }
    // спрайты: люди, вышка, снеговики, снежки
    const sp = [];
    if (!FP.fight) Object.values(NPC).forEach((n) => sp.push({ x: n.x, y: n.y, kind: "man", c: n }));
    sp.push({ x: LOC.rig.x + LOC.rig.w / 2, y: LOC.rig.y + LOC.rig.d / 2, kind: "rig" });
    SNOWMEN.forEach(([x, y]) => sp.push({ x, y, kind: "snowman" }));
    if (FP.fight) { FP.fight.foes.forEach((f) => sp.push({ x: f.x, y: f.y, kind: "man", c: f, hit: f.hitT > 0 })); FP.fight.balls.forEach((b) => sp.push({ x: b.x, y: b.y, kind: "ball", z: b.z })); }
    sp.forEach((o) => { const dx = o.x - me.x, dy = o.y - me.y; o.d = dx * ca + dy * sa; o.l = -dx * sa + dy * ca; });
    sp.filter((o) => o.d > 0.12).sort((a, b) => b.d - a.d).forEach((o) => {
      const sx = RW / 2 + o.l / o.d * focal, gy = hz + eye * focal / o.d, s = focal / o.d, col = Math.round(sx);
      // перекрытие стенами: рисуем спрайт только в тех столбцах, где стена дальше него
      const hw = (o.kind === "rig" ? 0.6 : o.kind === "man" ? 0.09 : o.kind === "snowman" ? 0.07 : 0.04) * s + 2, c0 = Math.max(0, Math.floor(sx - hw)), c1 = Math.min(RW - 1, Math.ceil(sx + hw));
      if (c1 < 0 || c0 >= RW) return;
      bg.save(); bg.beginPath(); let run = -1, any = false;
      for (let x = c0; x <= c1 + 1; x++) { const vis = x <= c1 && zb[x] > o.d; if (vis && run < 0) run = x; if (!vis && run >= 0) { bg.rect(run, 0, x - run, RH); run = -1; any = true; } }
      if (!any) { bg.restore(); return; } bg.clip();
      const fog = clamp(o.d / 9, 0, 0.8);
      if (o.kind === "man") { const c = o.c, h = 0.19 * s, w = 0.07 * s, bob = Math.sin(T * 6 + o.x) * 0.004 * s;
        bg.fillStyle = "rgba(0,0,0,.25)"; bg.beginPath(); bg.ellipse(sx, gy, w * 1.1, w * 0.3, 0, 0, 7); bg.fill();
        bg.fillStyle = "#1c242c"; bg.fillRect(sx - w * 0.6, gy - h * 0.42, w * 0.5, h * 0.42); bg.fillRect(sx + w * 0.1, gy - h * 0.42, w * 0.5, h * 0.42);
        bg.fillStyle = o.hit ? "#ffffff" : c.jacket; bg.beginPath(); bg.roundRect(sx - w, gy - h * 0.85 + bob, w * 2, h * 0.47, w * 0.4); bg.fill();
        bg.fillStyle = "#f2e85a"; bg.fillRect(sx - w, gy - h * 0.6 + bob, w * 2, h * 0.04);
        bg.fillStyle = (FACE[c.k] || {}).skin || "#e2b08c"; bg.beginPath(); bg.arc(sx, gy - h * 0.93 + bob, w * 0.62, 0, 7); bg.fill();
        bg.fillStyle = c.helm; bg.beginPath(); bg.arc(sx, gy - h * 0.97 + bob, w * 0.7, Math.PI, 0); bg.fill(); }
      if (o.kind === "snowman") { const r = 0.05 * s; bg.fillStyle = "#f4f8fb"; [[0, r * 1.2], [r * 2.1, r * 0.9], [r * 3.6, r * 0.65]].forEach(([y, rr]) => { bg.beginPath(); bg.arc(sx, gy - rr - y, rr, 0, 7); bg.fill(); });
        bg.fillStyle = "#ff8a3a"; bg.beginPath(); bg.moveTo(sx, gy - r * 4.3); bg.lineTo(sx + r * 0.9, gy - r * 4.2); bg.lineTo(sx, gy - r * 4.1); bg.fill(); bg.fillStyle = "#e8463a"; bg.fillRect(sx - r * 0.7, gy - r * 5.1, r * 1.4, r * 0.5); }
      if (o.kind === "ball") { const r = Math.max(1.2, 0.03 * s), y = gy - (o.z || 0.1) * s; bg.fillStyle = "#fff"; bg.beginPath(); bg.arc(sx, y, r, 0, 7); bg.fill(); }
      if (o.kind === "rig") { const H = 2.6 * s, B = 0.55 * s, base = gy - 0.55 * s; bg.strokeStyle = night > 0.3 ? "#ffb04a" : "#f2a541"; bg.lineWidth = Math.max(1, s * 0.012);
        bg.beginPath(); bg.moveTo(sx - B, base); bg.lineTo(sx - B * 0.12, base - H); bg.moveTo(sx + B, base); bg.lineTo(sx + B * 0.12, base - H);
        for (let i = 1; i < 10; i++) { const y = base - H * i / 10, w2 = B * (1 - 0.88 * i / 10), y2 = base - H * (i - 1) / 10, w1 = B * (1 - 0.88 * (i - 1) / 10); bg.moveTo(sx - w2, y); bg.lineTo(sx + w2, y); bg.moveTo(sx - w1, y2); bg.lineTo(sx + w2, y); }
        bg.stroke(); const bl = Math.sin(T * 4) > 0 ? 1 : 0.3, rg = bg.createRadialGradient(sx, base - H, 0, sx, base - H, s * 0.15); rg.addColorStop(0, `rgba(255,60,50,${bl})`); rg.addColorStop(1, "rgba(255,60,50,0)"); bg.fillStyle = rg; bg.beginPath(); bg.arc(sx, base - H, s * 0.15, 0, 7); bg.fill(); }
      bg.restore();
    });
    // падающий снег поверх
    bg.fillStyle = "#fff"; snow.forEach((f) => { bg.globalAlpha = 0.4 + 0.5 * f.z; bg.fillRect(((f.x * RW - FP.a * 40 * f.z) % RW + RW) % RW, f.y * RH, f.z * 1.6, f.z * 1.6); }); bg.globalAlpha = 1;
    g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = true; g.drawImage(buf, 0, 0, cv.width, cv.height);
    g.setTransform(dpr, 0, 0, dpr, 0, 0); const vg = g.createRadialGradient(W / 2, Hh / 2, Hh * 0.25, W / 2, Hh / 2, Hh * 0.8); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, `rgba(0,0,10,${0.4 + night * 0.3})`); g.fillStyle = vg; g.fillRect(0, 0, W, Hh);
    // покачивание руки со снежком в битве
    if (FP.fight) { const bob = Math.sin(T * 8) * (Math.abs(FP.jx) + Math.abs(FP.jy)) * 6; g.fillStyle = "#2f6db3"; g.beginPath(); g.ellipse(W * 0.78, Hh * 0.98 + bob, W * 0.12, Hh * 0.12, -0.4, 0, 7); g.fill();
      g.fillStyle = "#f4f8fb"; g.beginPath(); g.arc(W * 0.74, Hh * 0.86 + bob, W * 0.05, 0, 7); g.fill(); }
  };

  // ---------- снежная битва ----------
  const VOX = ["Ах ты ж!", "Ну, держись!", "Мимо, мазила!", "В валенок попал!", "Это нечестно, я не готов!", "Жора, прикрывай!"];
  const fpStart = (fight) => {
    fpSet(true);
    if (!fight) return;
    me.x = 8.6; me.y = 11.6; FP.a = -Math.PI / 2 - 0.3;
    const mk = (x, y, k, jacket, helm) => ({ x, y, k, jacket, helm, cd: rnd(1.2, 2.4), tx: x, ty: y, hitT: 0 });
    FP.fight = { got: 0, hit: 0, balls: [], foes: [mk(8.2, 9.6, "zhora", "#4c5a3a", "#3a4a3a"), mk(9.6, 10.2, "mikh", "#2f6db3", "#f2a541"), mk(7.2, 10.4, "serg", "#d9532c", "#2d8cff")] };
    $("#cross", fpEl).classList.remove("hidden"); $("#fpthrow", fpEl).classList.remove("hidden"); $("#fpscore", fpEl).classList.remove("hidden"); score();
    fpBtn.disabled = true; toast("Шесть попаданий до победы. Пять в тебя — проигрыш");
  };
  const score = () => { const f = FP.fight; $("#fpscore", fpEl).innerHTML = `🎯 ${f.hit} / 6 &nbsp;&nbsp; ❄️ в тебя ${f.got} / 5`; };
  const throwBall = () => { const f = FP.fight; if (!f || f.cool > 0) return; f.cool = 0.45; SFX.tap(); noise("bandpass", 1200, 1, 0.12, 0.005, 0.12); vib(8);
    f.balls.push({ x: me.x + Math.cos(FP.a) * 0.25, y: me.y + Math.sin(FP.a) * 0.25, vx: Math.cos(FP.a) * 5, vy: Math.sin(FP.a) * 5, z: 0.15, vz: 0.35, mine: 1, life: 1.6 }); };
  const fightUpdate = (dt) => {
    const f = FP.fight; f.cool = Math.max(0, (f.cool || 0) - dt);
    f.foes.forEach((e) => { e.hitT = Math.max(0, e.hitT - dt);
      if (Math.hypot(e.tx - e.x, e.ty - e.y) < 0.1) { e.tx = clamp(me.x + rnd(-2.2, 2.2), 6.6, 11.6); e.ty = clamp(me.y + rnd(-2.6, -0.8), 9, 12.4); }
      const dx = e.tx - e.x, dy = e.ty - e.y, d = Math.hypot(dx, dy) || 1, nx = e.x + dx / d * 0.9 * dt, ny = e.y + dy / d * 0.9 * dt; if (!solid(nx, ny)) { e.x = nx; e.y = ny; } else { e.tx = e.x; e.ty = e.y; }
      e.cd -= dt; if (e.cd <= 0) { e.cd = rnd(1.6, 2.8); const ax = me.x - e.x, ay = me.y - e.y, dd = Math.hypot(ax, ay) || 1, er = rnd(-0.25, 0.25);
        f.balls.push({ x: e.x, y: e.y, vx: (ax / dd + er * -ay / dd) * 3.4, vy: (ay / dd + er * ax / dd) * 3.4, z: 0.16, vz: 0.25, life: 2 }); noise("bandpass", 900, 1, 0.06, 0.005, 0.1); } });
    for (let i = f.balls.length - 1; i >= 0; i--) { const b = f.balls[i]; b.x += b.vx * dt; b.y += b.vy * dt; b.vz -= 0.5 * dt; b.z = Math.max(0.02, b.z + b.vz * dt); b.life -= dt;
      let gone = b.life <= 0 || solid(b.x, b.y);
      if (!gone && b.mine) f.foes.forEach((e) => { if (!gone && Math.hypot(e.x - b.x, e.y - b.y) < 0.22) { gone = true; e.hitT = 0.35; f.hit++; SFX.splash(); vib(15); say(pick(VOX), VOICE[e.k] || VOICE.zhora); score(); } });
      if (!gone && !b.mine && Math.hypot(me.x - b.x, me.y - b.y) < 0.2) { gone = true; f.got++; SFX.splash(); vib(50); const sp = $("#splat", fpEl); sp.classList.remove("on"); void sp.offsetWidth; sp.classList.add("on"); score(); }
      if (gone) f.balls.splice(i, 1); }
    if (f.hit >= 6 || f.got >= 5) { const win = f.hit >= 6; FP.fight = null; ["#cross", "#fpthrow", "#fpscore"].forEach((q) => $(q, fpEl).classList.add("hidden")); fpBtn.disabled = false;
      if (win) done("snow", { mood: 25, xp: 30, min: 30, en: -12 }, "Легенда снежной битвы"); else { fail({ mood: 5, min: 30, en: -12 }, "Засыпали снегом"); setTimeout(() => talk("zhora", "Ха-ха! Отряхнись. В следующий раз бери снежки покрепче.").then(close), 900); } }
  };

  showPick();
  requestAnimationFrame(frame);
  document.addEventListener("visibilitychange", () => { if (document.hidden) { hush(); SFX.wind(false); } else if (S.hero && S.snd && !$(".pick")) SFX.wind(true); });
})();
