/* The Brazalete band (2026-11-20): one shared piece of "plumbing" for all three devices (verbs, agreement, pronouns).
   It plays a looping band in time, adds and removes instruments as the player gets answers right or wrong, counts a streak, flashes a combo ring,
   makes a clashing sound on a miss, shouts the answer in NZ's voice on the beat, and plays a dramatic ending.

   A device never touches the music. It only tells the band three things:
     Band.beginQuestion({ onTimeout })      a new question has appeared (the beat dots start counting)
     Band.resolve({ correct, form })        the player answered (right or wrong), or time ran out
     Band.finishRound()                     the round is over (the ending plays)
   Everything the player sees (instrument boxes, beat dots, combo ring, big shouted word, settings) is built by the Band.mount* functions into elements the page provides,
   so a page can place each piece wherever its layout wants. All pictures are replaceable image slots (see /brazalete/art/README.md).

   Ported from the clickable timed-mode sketch (products/the-scene/sketches/brazalete-timed-mode-sketch-2026-11-19.html in the vault). Decisions behind it:
   vault specs "Brazalete Website Redesign, Combo Ring and Agreement Device — Decisions 2026-11-20", sections 4d and 5. */
(() => {
  'use strict'; // Catch accidental global variables.

  /* ---------- Settings that never change ---------- */
  const PACE_BEATS = { relaxed: 48, normal: 32, quick: 24 };   // how many beats a player gets per question (NZ, 2026-11-20: Normal is about 32 beats, 19 seconds at 100 BPM)
  const POCKET_BEATS = 8;                                       // answering within the first eight beats (the first lap of the dots) is "in the pocket"
  const BAND_ORDER = [['salsa', 'Salsa'], ['reggaeton', 'Reggaeton'], ['cumbia', 'Cumbia'], ['bachata', 'Bachata'], ['flamenco', 'Flamenco']];   // planned versions; the unbuilt ones show as "coming"
  const MIX_KEY = 'aerolex.brazalete.band.mix.v1';              // where this browser remembers each instrument's volume

  /* The addresses of the music, the voice files and the art. They come from config.js so they can move to separate hosting. */
  const cfg = () => Object.assign({ music: '/brazalete/audio/music/', shouts: '/brazalete/audio/shouts/', art: '/brazalete/art/instruments/' }, window.BRAZALETE_AUDIO || {});

  /* ---------- State ---------- */
  const S = {
    ac: null, master: null, limiter: null,                      // the browser's audio context, the master volume, and a limiter so the full band never clips
    bands: {}, cur: '', list: [],                               // loaded bands by key, the active band's key, and the keys of the bands that exist
    BEAT: 0.6, loopSec: 19.2, t0: 0, chordPcs: [],              // seconds per beat, loop length, the audio-clock time of the first beat, each bar's chord notes
    layers: [], size: 1, solo: null,                            // the active band's instrument list, how many are playing, and the one soloed (if any)
    sched: null,                                                // what the music is doing: null (silent), 'stems' (the groove), 'outro' (the ending)
    mix: {}, muted: false, comboStep: 3, pace: 'normal',        // volumes, the Music switch, "a new instrument every N right answers", and the player's speed
    streak: 0, best: 0, asked: 0, right: 0, pocket: 0, times: [],// the round's score
    q: null, ending: false, roundOn: false, switching: false,   // the current question, and what the band is busy with
    shoutBuf: {}, shoutsLoaded: false, shoutIR: null,           // NZ's recorded shouts by verb form
    timerId: 0, pulseId: 0, outroTimers: [], listeners: {}, ui: {}
  };
  try { S.mix = JSON.parse(localStorage.getItem(MIX_KEY) || '{}') || {}; } catch { S.mix = {}; } // Volumes are optional; carry on if storage is blocked.
  const saveMix = () => { try { localStorage.setItem(MIX_KEY, JSON.stringify(S.mix)); } catch { /* storage blocked: the volumes just reset next visit */ } };
  const mk = (id, b = S.cur) => (id[0] === '_' || !b) ? id : b + '/' + id;      // volume names are per band; names starting with "_" (master, shouts) are shared
  const level = (id, b = S.cur) => { const v = S.mix[mk(id, b)]; return v === undefined ? 1 : v; };

  /* A tiny event system so a page can listen: Band.on('streak', fn) and so on. */
  const emit = (name, data) => (S.listeners[name] || []).forEach(fn => { try { fn(data); } catch (e) { console.error(e); } });

  /* ---------- Audio context ---------- */
  function ensureAudio() {
    if (S.ac) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    try { S.ac = new AC({ sampleRate: 32000 }); } catch { S.ac = new AC(); }   // 32000 Hz is what the music was made at, and it keeps the decoded audio small in memory
    S.master = S.ac.createGain();
    const lim = S.ac.createDynamicsCompressor();                                // a limiter: the full band and the big finish never clip
    lim.threshold.value = -8; lim.knee.value = 6; lim.ratio.value = 12; lim.attack.value = 0.003; lim.release.value = 0.2;
    S.master.connect(lim); lim.connect(S.ac.destination); S.limiter = lim;
    applyMaster();
  }
  /* Unlocks sound. Browsers (Safari and iPhones especially) only let audio start inside the click itself, but the music loads AFTER the click, so each page calls this the instant a Start button is pressed (2026-11-21). */
  function unlock() { ensureAudio(); if (S.ac.state === 'suspended') S.ac.resume(); }
  function applyMaster() { if (S.master) S.master.gain.value = S.muted ? 0 : 0.7 * level('_master'); }   // the Music switch only mutes; the timing keeps running

  /* ---------- Loading a band ---------- */
  async function decodeFile(url) {
    const r = await fetch(url); if (!r.ok) throw new Error('missing ' + url);
    return S.ac.decodeAudioData(await r.arrayBuffer());
  }
  /* Reads bands.json (which versions exist) once. */
  async function listBands() {
    if (S.list.length) return S.list;
    try { const r = await fetch(cfg().music + 'bands.json'); if (r.ok) S.list = await r.json(); } catch { /* no music reachable: the page shows a message */ }
    return S.list;
  }
  /* Loads one band: its manifest, every layer's loop, and a volume gate and trim per layer. Progress is announced as 'loading'. */
  function loadBand(key) {
    const b = S.bands[key] || (S.bands[key] = {});
    if (b.ready) return Promise.resolve(b);
    if (b.loading) return b.loading;
    b.loading = (async () => {
      ensureAudio();
      const base = cfg().music + key + '/';
      if (!b.m) b.m = await (await fetch(base + 'manifest.json')).json();
      const m = b.m; let done = 0; b.bufs = {};
      emit('loading', { band: key, label: m.label, done: 0, total: m.layers.length });
      await Promise.all(m.layers.map(async l => { b.bufs[l.id] = await decodeFile(base + l.file + '.mp3'); done++; emit('loading', { band: key, label: m.label, done, total: m.layers.length }); }));
      b.out = S.ac.createGain(); b.out.connect(S.master); b.gate = {}; b.trim = {}; b.an = {}; b.loopSrcs = []; b.outSrcs = []; b.outs = null; b.outP = null;
      m.layers.forEach((l, i) => {
        const g = S.ac.createGain(), t = S.ac.createGain();
        g.gain.value = i < S.size ? 1 : 0; t.gain.value = level(l.id, key); g.connect(t); t.connect(b.out); b.gate[l.id] = g; b.trim[l.id] = t;   // the gate is opened by right answers, the trim by the volume slider
        const an = S.ac.createAnalyser(); an.fftSize = 512; t.connect(an); b.an[l.id] = an;                                                         // the analyser lets each instrument box flash with its own sound
      });
      b.ready = true; emit('loading', { band: key, label: m.label, done: m.layers.length, total: m.layers.length, finished: true });
      return b;
    })();
    b.loading.then(() => { b.loading = null; }, () => { b.loading = null; });
    return b.loading;
  }
  /* The ending's audio loads quietly in the background once the band is ready, so Finish answers at once. */
  function loadOutro(key) {
    const b = S.bands[key]; if (!b || !b.ready) return Promise.resolve();
    if (b.outP) return b.outP;
    b.outs = {}; const base = cfg().music + key + '/';
    b.outP = Promise.all(b.m.layers.filter(l => l.outro).map(async l => { try { b.outs[l.id] = await decodeFile(base + l.outro + '.mp3'); } catch { /* a missing ending layer is simply left out */ } }));
    return b.outP;
  }
  /* Makes a loaded band the active one: tempo, chords, instrument list and boxes switch over. */
  function activate(key) {
    const b = S.bands[key], m = b.m; S.cur = key;
    S.layers = m.layers.map(l => ({ id: l.id, name: l.name, verb: l.verb }));
    S.BEAT = 60 / m.bpm; S.loopSec = m.loop_seconds; S.chordPcs = m.chord_pcs;
    if (S.size > S.layers.length) S.size = S.layers.length;
    S.solo = null; drawInstruments(); setLayers(); drawSettings(); loadOutro(key);
    emit('band', { key, label: m.label, bpm: m.bpm, layers: S.layers.length });
  }
  /* Frees a band that is no longer playing (its decoded audio is the biggest thing in memory). */
  function freeBand(key) {
    const b = S.bands[key]; if (!b || !b.ready) return;
    try { b.out.disconnect(); } catch { /* already disconnected */ }
    b.ready = false; b.bufs = b.outs = b.outP = b.out = b.gate = b.trim = b.an = null; b.loopSrcs = []; b.outSrcs = [];
  }
  function startLoops(b, t0) {                                  // start every layer's loop at the same moment; the gates decide which ones are heard
    b.loopSrcs = b.m.layers.map(l => { const s = S.ac.createBufferSource(); s.buffer = b.bufs[l.id]; s.loop = true; if (s.buffer.duration > b.m.loop_seconds) s.loopEnd = b.m.loop_seconds; s.connect(b.gate[l.id]); s.start(t0); return s; });   // loopEnd trims any MP3 padding so the loop stays exact
  }
  const nextBarTime = () => { const bar = 4 * S.BEAT; return S.t0 + Math.ceil((S.ac.currentTime + 0.08 - S.t0) / bar) * bar; };   // the next bar line of the active band

  /* Which instruments are audible: the first S.size of them (the ones the player has earned), or only the soloed one. */
  const gateFor = (l, i) => S.solo ? (l.id === S.solo ? 1 : 0) : (i < S.size ? 1 : 0);
  function setLayers() {
    if (S.ac) Object.values(S.bands).forEach(b => { if (b.ready && b.gate) b.m.layers.forEach((l, i) => b.gate[l.id].gain.setTargetAtTime(gateFor(l, i), S.ac.currentTime, 0.05)); });
    document.querySelectorAll('.band-ibox').forEach((c, i) => {
      const l = S.layers[i], on = S.solo ? !!l && l.id === S.solo : i < S.size;
      if (on && !c.classList.contains('on') && S.sched === 'stems') { c.classList.add('just'); setTimeout(() => c.classList.remove('just'), 1100); }   // a member who has just joined does a little entrance (band picture)
      if (!on && c.classList.contains('on') && S.sched === 'stems') { c.classList.add('leaving'); setTimeout(() => c.classList.remove('leaving'), 1400); }   // ...and one who drops out steps back into the shadow (club night)
      c.classList.toggle('on', on); c.classList.toggle('solo', !!S.solo && l && l.id === S.solo);
    });
    syncPanel(); emit('size', { size: S.size, total: S.layers.length, solo: S.solo });
  }
  function applyLevels() { if (!S.ac) return; Object.entries(S.bands).forEach(([k, b]) => { if (b.ready && b.trim) b.m.layers.forEach(l => b.trim[l.id].gain.setTargetAtTime(level(l.id, k), S.ac.currentTime, 0.02)); }); applyMaster(); }

  /* ---------- Starting, stopping and switching ---------- */
  /* Starts the active band's loops (browsers only allow this after a click). Returns false if no band is loaded. */
  function startMusic() {
    ensureAudio(); if (S.ac.state === 'suspended') S.ac.resume();
    const b = S.cur && S.bands[S.cur];
    if (!b || !b.ready) return false;
    if (S.sched === 'outro') stopOutro();
    if (S.sched !== 'stems') { S.t0 = S.ac.currentTime + 0.1; startLoops(b, S.t0); S.sched = 'stems'; }
    loadShouts(); startPulse(); return true;
  }
  function stopMusic() {
    if (S.paused) resume();                                                                  // leaving while paused: unfreeze the clock first
    cancelQuestion(); S.outroTimers.forEach(clearTimeout); S.outroTimers = [];
    const b = S.cur && S.bands[S.cur];
    if (b && b.ready) { [...(b.outSrcs || []), ...(b.loopSrcs || [])].forEach(s => { try { s.stop(); } catch { /* already stopped */ } }); b.outSrcs = []; b.loopSrcs = []; }
    S.sched = null; S.ending = false; S.roundOn = false; S.solo = null; setLayers(); stopPulse();
  }
  /* Switching versions while playing: the new band starts at the next bar line, the old one stops there, and tempo, chords and boxes switch at that moment. */
  async function switchBand(key) {
    if (S.switching || key === S.cur) return;
    S.switching = true;
    try {
      const nb = await loadBand(key), old = S.cur ? S.bands[S.cur] : null;
      if (S.sched === 'stems' && old && old.ready) {
        const T = nextBarTime(), oldKey = S.cur;
        old.out.gain.cancelScheduledValues(0); old.out.gain.setValueAtTime(1, Math.max(S.ac.currentTime, T - 0.012)); old.out.gain.linearRampToValueAtTime(0, T + 0.02);   // a tiny fade so the cut does not click
        old.loopSrcs.forEach(s => { try { s.stop(T + 0.05); } catch { /* already stopped */ } });
        startLoops(nb, T);
        await new Promise(res => setTimeout(res, Math.max(0, (T - S.ac.currentTime) * 1000)));
        S.t0 = T; activate(key); setTimeout(() => freeBand(oldKey), 600);
      } else { const oldKey = S.cur; activate(key); if (oldKey) freeBand(oldKey); }       // nothing is playing, so the swap can be immediate
    } catch { emit('error', { message: 'Could not load that version.' }); }
    S.switching = false;
  }
  /* Loads the first band and makes it active. Called when the player first presses Play with the band. */
  async function load(key) {
    ensureAudio();
    const list = await listBands();
    if (!list.length) { emit('error', { message: 'The music could not be reached.' }); return false; }
    const first = key && list.includes(key) ? key : (list.includes('salsa') ? 'salsa' : list[0]);
    try { await loadBand(first); activate(first); return true; }
    catch { emit('error', { message: 'The music could not be loaded.' }); return false; }
  }

  /* ---------- Right answers, misses and the streak ---------- */
  const bandUp = () => { if (S.size < S.layers.length) { S.size++; setLayers(); const l = S.layers[S.size - 1]; return l.name + ' ' + l.verb; } setLayers(); return null; };   // a new instrument joins
  const bandDown = () => { const was = S.size; S.size = Math.max(1, S.size - 1); setLayers(); return was > S.size ? S.layers[was - 1].name : null; };                          // the newest instrument drops out
  /* One short synthesized sound (used for the small drum fill and the miss sound). */
  function tone(type, f0, f1, t, dur, vol, dest) {
    const o = S.ac.createOscillator(), g = S.ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(dest || S.master); o.start(t); o.stop(t + dur + 0.02);
  }
  const playFill = () => { if (!S.ac) return; const t = S.ac.currentTime + 0.02; [0, 0.08, 0.16, 0.24].forEach((d, i) => tone('sine', 300 - i * 30, 160, t + d, 0.1, 0.5)); };   // a small drum fill when the player is right
  /* The miss sound: a short cluster that clashes with the song's A minor (A, B-flat and E-flat sounding together), landing on the next beat. */
  function stab() {
    if (!S.ac) return;
    const T = S.sched ? S.t0 + Math.max(0, Math.ceil((S.ac.currentTime + 0.04 - S.t0) / S.BEAT)) * S.BEAT : S.ac.currentTime + 0.02;   // on the beat if the music is playing
    [220, 233.08, 311.13, 110].forEach(f => tone('sawtooth', f, null, T, 0.5, 0.11, S.limiter));
  }

  /* ---------- NZ's voice: the verb shouted on the beat ---------- */
  async function loadShouts() {
    if (S.shoutsLoaded) return; S.shoutsLoaded = true;
    try {
      const base = cfg().shouts, r = await fetch(base + 'manifest.json'); if (!r.ok) throw new Error('none'); const m = await r.json();
      for (const [form, list] of Object.entries(m)) {                                    // each verb form has several layers of NZ's voice
        S.shoutBuf[form] = [];
        for (const info of list) S.shoutBuf[form].push({ buf: await S.ac.decodeAudioData(await (await fetch(base + info.file)).arrayBuffer()), onset: info.onset, f0: info.f0, layer: info.layer || info.voice });
      }
    } catch { /* no voice files: the word still appears on screen, silently */ }
  }
  const shiftTo = (f0, pc) => { const m = 69 + 12 * Math.log2(f0 / 440), cur = ((m % 12) + 12) % 12; let d = pc - cur; d = (((d + 6) % 12) + 12) % 12 - 6; return d * 100; };   // cents to move a voice so it lands on a chord note, the short way round
  const roomIR = () => { if (S.shoutIR) return S.shoutIR; const n = Math.floor(S.ac.sampleRate * 0.9), b = S.ac.createBuffer(2, n, S.ac.sampleRate); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (S.ac.sampleRate * 0.22)); } return S.shoutIR = b; };   // a small made-up room so the group sits in the band
  /* Shouts a verb form on the next half beat. With NZ's recordings (verb "ir" so far) it sings six layers retuned to the chord; for any other verb it only shows the word. */
  function shout(form) {
    if (!S.ac || S.sched !== 'stems') return;
    const step = S.BEAT * 0.5, k = Math.ceil((S.ac.currentTime + 0.04 - S.t0) / step), when = S.t0 + Math.max(0, k) * step;
    const voices = S.shoutBuf[form];
    if (voices && voices.length) {
      const bars = Math.max(1, Math.round(S.loopSec / (4 * S.BEAT))), bar = Math.floor(((when - S.t0) / (4 * S.BEAT)) % bars), pcs = S.chordPcs[bar % S.chordPcs.length];
      const out = S.ac.createGain(); out.gain.value = 0.8 * level('_shouts');
      const wet = S.ac.createGain(), conv = S.ac.createConvolver(); wet.gain.value = 0.12; conv.buffer = roomIR();
      out.connect(S.limiter); out.connect(wet); wet.connect(conv); conv.connect(S.limiter);
      const PAN = { 'sung-bass': 0, 'sung-low': -0.4, 'sung-mid': 0.4, 'sung-high': -0.2, pass1: 0.2, shout: 0 }, takes = {};
      voices.forEach(v => { takes[v.layer] = (takes[v.layer] || 0) + 1; });
      voices.forEach(v => {
        let tgt = pcs[0]; pcs.forEach(pc => { if (Math.abs(shiftTo(v.f0, pc)) < Math.abs(shiftTo(v.f0, tgt))) tgt = pc; });   // the chord note closest to where this layer already is
        const s = S.ac.createBufferSource(); s.buffer = v.buf; const cents = shiftTo(v.f0, tgt) + (Math.random() * 6 - 3); s.detune.value = cents; const rate = Math.pow(2, cents / 1200);
        const pan = S.ac.createStereoPanner ? S.ac.createStereoPanner() : null, env = S.ac.createGain();
        const st = Math.max(S.ac.currentTime, when - v.onset / rate + Math.random() * 0.008), dur = Math.min(v.buf.duration / rate, 1.2), g = 1 / Math.sqrt(takes[v.layer]);
        env.gain.setValueAtTime(g, st); env.gain.setValueAtTime(g, st + Math.max(0.05, dur - 0.06)); env.gain.linearRampToValueAtTime(0, st + dur);
        if (pan) { pan.pan.value = PAN[v.layer] || 0; s.connect(pan); pan.connect(env); } else s.connect(env);
        env.connect(out); s.start(st); s.stop(st + dur + 0.02);
      });
    }
    showShout(form, (when - S.ac.currentTime) * 1000);                                    // the big word, popping up when the shout lands (every verb, voiced or not)
  }
  function showShout(form, delayMs) {
    setTimeout(() => { const el = S.ui.shout; if (!el) return; el.textContent = '¡' + form.toUpperCase() + '!'; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }, Math.max(0, delayMs));
  }

  /* ---------- One question at a time ---------- */
  function cancelQuestion() { clearInterval(S.timerId); S.timerId = 0; if (S.q) S.q.running = false; }
  /* A new question has appeared. The beat dots start counting; if the player runs out of beats, onTimeout is called. opts.beats overrides the speed setting (the agreement page uses 24). */
  function beginQuestion(opts = {}) {
    if (!S.ac) return; cancelQuestion();
    S.q = { startAt: S.ac.currentTime, beats: opts.beats || PACE_BEATS[S.pace] || 32, running: true, onTimeout: opts.onTimeout };
    paintDots(0); clearInterval(S.timerId);
    S.timerId = setInterval(() => { // A plain timer (not animation frames) so it also runs in background tabs.
      if (!S.q || !S.q.running) return;
      const beats = (S.ac.currentTime - S.q.startAt) / S.BEAT; paintDots(beats);
      if (beats >= S.q.beats) { S.q.running = false; clearInterval(S.timerId); emit('timeout', {}); if (S.q.onTimeout) S.q.onTimeout(); }
    }, 40);
    emit('question', { beats: S.q.beats });
  }
  const beatsElapsed = () => S.q ? (S.ac.currentTime - S.q.startAt) / S.BEAT : 0;
  /* The player answered (or time ran out). Updates the streak and the band, plays the right sound, shouts the form, and tells the page what happened. */
  function resolve({ correct, form, timedOut }) {
    const beats = beatsElapsed(); cancelQuestion();
    S.asked++; if (form) shout(form);                                                    // the right form is shouted on a miss too, so the player hears it
    const info = { correct: !!correct, timedOut: !!timedOut, joined: null, dropped: null, inPocket: false, streak: 0 };
    if (correct) {
      S.right++; S.streak++; S.best = Math.max(S.best, S.streak); S.times.push(beats * S.BEAT); info.inPocket = beats <= POCKET_BEATS; if (info.inPocket) S.pocket++;
      playFill();
      if (S.streak % S.comboStep === 0) info.joined = bandUp();                          // "a new instrument every 1, 3 or 5 right answers in a row"
    } else { S.streak = 0; info.dropped = bandDown(); stab(); }                          // a miss resets the streak and the newest instrument drops out
    info.streak = S.streak; paintRing(); paintDots(beats, true);
    emit('resolved', info); return info;
  }

  /* ---------- A round: start, ending ---------- */
  /* Starts a fresh round: drums only, a one-bar count-in, then onReady() (the page shows its first question). */
  function startRound(onReady) {
    if (!startMusic()) return false;
    cancelQuestion(); S.size = 1; S.streak = 0; S.best = 0; S.asked = 0; S.right = 0; S.pocket = 0; S.times = []; S.roundOn = true; S.ending = false; S.solo = null;
    setLayers(); paintRing(); emit('round', { started: true });
    const go = () => { if (S.paused) { setTimeout(go, 200); return; } if (S.roundOn && onReady) onReady(); };   // (waits while the game is paused)
    setTimeout(go, S.BEAT * 4 * 1000);                                                     // one bar of drums to set the tempo
    return true;
  }
  /* Pause (NZ, 2026-11-22: opening Settings freezes the game, music and everything). Suspending the audio clock stops the music AND the beat timer,
     because the timer reads that same clock; resuming carries on exactly where it stopped, still in time. */
  function pause() { if (!S.ac || S.paused) return; S.paused = true; S.ac.suspend(); emit('pause', { paused: true }); }
  function resume() { if (!S.paused) return; S.paused = false; if (S.ac) S.ac.resume(); emit('pause', { paused: false }); }
  function stopOutro() {
    S.outroTimers.forEach(clearTimeout); S.outroTimers = [];
    const b = S.cur && S.bands[S.cur];
    if (b && b.ready) { [...(b.outSrcs || []), ...(b.loopSrcs || [])].forEach(s => { try { s.stop(); } catch { /* already stopped */ } }); b.outSrcs = []; b.loopSrcs = []; }
    if (S.sched === 'outro' || S.sched === 'stems') S.sched = null;
    S.ending = false;
  }
  /* The ending, shortened on 2026-11-22 (NZ: "it should end in the next 2-4 seconds"). The recorded ending is four bars of build, a big hit on beat 16, then about
     four seconds of ring-out. Now it jumps straight into the LAST bar of that build (one bar of crescendo), lands the hit, holds it a moment and fades out fast.
     It starts on the next beat instead of waiting for a particular bar line, so the whole finish takes about 3 to 4 seconds. Only the earned instruments play (opts.preview plays them all). */
  const END_BUILD_BEATS = 4;                                                                 // how much of the recorded build is kept: one bar (4 beats) before the hit
  const END_HOLD_SEC = 0.3, END_FADE_SEC = 0.7;                                              // after the hit: let it ring this long, then fade to silence over this long
  const nextBeatTime = () => S.t0 + Math.ceil((S.ac.currentTime + 0.08 - S.t0) / S.BEAT) * S.BEAT;   // the next beat of the groove, so the ending still starts in time
  async function finishRound(opts = {}) {
    if (S.ending) return;
    S.ending = true; cancelQuestion();
    const b = S.cur && S.bands[S.cur];
    const summary = () => ({ asked: S.asked, right: S.right, best: S.best, pocket: S.pocket, average: S.times.length ? S.times.reduce((a, c) => a + c, 0) / S.times.length : null });
    if (S.sched !== 'stems' || !b || !b.ready) { S.ending = false; S.roundOn = false; emit('fin', summary()); return; }
    emit('ending', { stage: 'loading' });
    await loadOutro(S.cur);
    if (!S.ending || S.sched !== 'stems') return;                                           // the player started again while the ending was loading
    const T = nextBeatTime();                                                                // the ending starts on the next beat (no more waiting for a bar line)
    const skip = (16 - END_BUILD_BEATS) * S.BEAT;                                            // where in the recording to start: one bar before its big hit on beat 16
    const hit = T + END_BUILD_BEATS * S.BEAT;                                                // when the big hit lands
    const fadeFrom = hit + END_HOLD_SEC, endAt = fadeFrom + END_FADE_SEC;                    // the short ring-out, then silence
    b.loopSrcs.forEach(s => { try { s.stop(T); } catch { /* already stopped */ } });          // the groove stops on that beat...
    const open = opts.preview ? b.m.layers : b.m.layers.slice(0, S.size), openIds = new Set(open.map(l => l.id));
    b.outSrcs = b.m.layers.filter(l => b.outs[l.id] && openIds.has(l.id)).map(l => {        // ...and the ending starts into each earned layer's volume
      const s = S.ac.createBufferSource(); s.buffer = b.outs[l.id];
      const env = S.ac.createGain();                                                         // a volume envelope per layer, so the ring-out can be faded instead of playing for 4 more seconds
      env.gain.setValueAtTime(1, T); env.gain.setValueAtTime(1, fadeFrom); env.gain.linearRampToValueAtTime(0, endAt);
      s.connect(env); env.connect(b.trim[l.id]);
      s.start(T, skip); s.stop(endAt + 0.05);                                                // start partway into the recording; stop once it has faded out
      return s;
    });
    S.sched = 'outro';
    const ms = t => Math.max(0, (t - S.ac.currentTime) * 1000);
    emit('ending', { stage: 'wait', seconds: ms(T) / 1000 });
    S.outroTimers = [
      setTimeout(() => emit('ending', { stage: 'build' }), ms(T)),
      setTimeout(() => { showShout('fin', 0); if (!opts.preview) emit('fin', summary()); }, ms(hit)),                 // the last hit: a big word and the score
      setTimeout(() => { S.sched = null; S.ending = false; S.roundOn = false; b.outSrcs = []; b.loopSrcs = []; setLayers(); emit('ending', { stage: 'done' }); }, ms(endAt))
    ];
  }

  /* ---------- What the player sees: beat dots, combo ring, instrument boxes, big word, settings ---------- */
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };

  /* Eight beat dots. Lap one is "in the pocket": the dots light up one by one. After that they go soft while one calm dot keeps circling. */
  function mountTimer(host) {
    host.classList.add('band-timer'); host.innerHTML = '';
    const dots = el('div', 'band-dots'); for (let i = 0; i < 8; i++) dots.append(el('i', 'band-dot'));
    host.append(dots, el('div', 'band-lap', ''));
    S.ui.timer = host; paintDots(0);
  }
  /* The look of each of the 8 dots for a given moment: 'lit', 'now', 'soft' or '' (off). Shared by the dot row and by the lights built into the device (2026-11-22). */
  function dotStates(beats, finished) {
    const b = Math.floor(beats), lap = Math.floor(beats / 8);
    return Array.from({ length: 8 }, (_, i) => finished ? 'lit' : lap === 0 ? (i < b ? 'lit' : i === b ? 'now' : '') : (i === (b % 8) ? 'now' : 'soft'));
  }
  function paintDots(beats, finished) {
    const states = dotStates(beats, finished), lap = Math.floor(beats / 8), total = S.q ? Math.round(S.q.beats / 8) : 4;
    const lapText = finished ? '' : (S.q ? 'lap ' + Math.min(total, lap + 1) + ' of ' + total : '');
    emit('beat', { states, lapText, finished: !!finished });                                // a page can draw the dots anywhere it likes (the verb page puts them inside the device)
    const host = S.ui.timer; if (!host) return;
    host.querySelectorAll('.band-dot').forEach((d, i) => { d.className = 'band-dot' + (states[i] ? ' ' + states[i] : ''); });
    host.querySelector('.band-lap').textContent = lapText;
  }
  /* The combo ring (the "star ring" look NZ chose): a glowing ring around the streak, with rays and sparks that grow with the streak. */
  function mountRing(host) { host.classList.add('band-ring'); host.innerHTML = '<div class="ring-rays"></div><div class="ring-core"><b>0</b></div><div class="ring-name">NO STREAK</div>'; S.ui.ring = host; paintRing(); }
  function paintRing() {
    const host = S.ui.ring; if (!host) return;
    const n = S.streak, lvl = n >= 30 ? ['EN FUEGO', '#ff4fd8', 8, '1.6s', 20] : n >= 12 ? ['ON A ROLL', '#ffca28', 5, '4s', 12] : n >= 3 ? ['WARMING UP', '#4fc3f7', 2, '8s', 6] : n >= 1 ? ['BUILDING', '#7fd6a4', 0, '12s', 4] : ['NO STREAK', '#9bb7c9', 0, '0s', 0];
    host.style.setProperty('--rc', lvl[1]); host.style.setProperty('--spin', lvl[3]); host.style.setProperty('--ray', lvl[4] + 'deg');
    host.querySelector('.ring-core b').textContent = n; host.querySelector('.ring-name').textContent = lvl[0];
    host.querySelectorAll('.ring-spark').forEach(s => s.remove());
    for (let i = 0; i < lvl[2]; i++) { const a = i / lvl[2] * Math.PI * 2, sp = el('span', 'ring-spark'); sp.style.left = (50 + 52 * Math.cos(a)) + '%'; sp.style.top = (50 + 52 * Math.sin(a)) + '%'; sp.style.animationDelay = (i * .13) + 's'; host.append(sp); }
    host.classList.remove('hit'); void host.offsetWidth; if (n) host.classList.add('hit');
    const combo = S.ui.combo;                                                                // the separate combo number (verb page, 2026-11-22), in the same colour as the ring
    if (combo) {
      combo.style.setProperty('--rc', lvl[1]); combo.querySelector('.combo-num').textContent = n; combo.querySelector('.combo-name').textContent = lvl[0];
      combo.classList.remove('hit'); void combo.offsetWidth; if (n) combo.classList.add('hit'); // restart the little "pop" each time the streak changes
    }
  }
  /* The combo number on its own, away from the ring (NZ, 2026-11-22: the ring glows behind the device, the number sits to the right). */
  function mountCombo(host) { host.classList.add('band-combo'); host.innerHTML = '<span class="combo-label">COMBO</span><b class="combo-num">0</b><span class="combo-name">NO STREAK</span>'; S.ui.combo = host; paintRing(); }
  /* The big shouted word. */
  function mountShout(host) { host.classList.add('band-shout'); S.ui.shout = host; }

  /* The instrument boxes: one per instrument group in the active band. Dim until it joins; yellow border flashes with its own sound; click for volume and solo. */
  let artManifest = null;                                                                  // which finished pictures exist (art/instruments/manifest.json); null until read
  async function readArtManifest() { if (artManifest) return artManifest; try { const r = await fetch(cfg().art + 'manifest.json'); artManifest = r.ok ? await r.json() : {}; } catch { artManifest = {}; } return artManifest; }
  function artHtml(layerId) {
    const file = artManifest && (artManifest[S.cur + '/' + layerId] || artManifest[layerId]);
    if (file) return '<img alt="" src="' + cfg().art + file + '">';                          // a finished picture from the art slot
    return window.BandArt ? window.BandArt.svg(S.cur, layerId) : '';                        // otherwise the placeholder drawing
  }
  /* opts.stage = true draws "the band picture" instead of a grid of boxes (NZ, 2026-11-22): the whole band on one stage, every member dim until they join,
     then in colour and moving to the beat. The members are the same buttons as the boxes, so volume, solo and the flash-with-the-sound all still work. */
  /* More options (club night, 2026-11-22): opts.scenery = false draws only the musicians (the club draws its own scenery); opts.spots(n) gives each member's spot;
     opts.memberArt(band, id) can return a finished musician picture (or null for the placeholder drawing). */
  function mountInstruments(host, opts = {}) { S.ui.stage = !!opts.stage; S.ui.stageOpts = opts; host.classList.add(S.ui.stage ? 'band-picture' : 'band-instruments'); S.ui.grid = host; drawInstruments(); }

  /* Finished band pictures are a replaceable slot too: art/band/manifest.json can give, per version, a backdrop picture and a picture plus a position for each member
     (see /brazalete/art/README.md). Without it, the placeholder stage below is used: plain CSS scenery with the instrument drawings standing on it. */
  let bandArt = null;
  const bandArtBase = () => cfg().art.replace(/instruments\/?$/, 'band/');                  // art/band/ sits next to art/instruments/
  async function readBandArt() { if (bandArt) return bandArt; try { const r = await fetch(bandArtBase() + 'manifest.json'); bandArt = r.ok ? await r.json() : {}; } catch { bandArt = {}; } return bandArt; }
  /* Where each member stands on the placeholder stage, in percent of the picture. The first instruments to join stand front and centre, so a small band already looks
     like a band; later ones fill the rows behind, smaller and higher up, as if further back on the stage. */
  function stageSpots(n) {
    const rows = [4, 5, 5, 5, 6], spots = [];                                                // members per row, front row first (4+5+5+5+6 = 25)
    rows.forEach((count, r) => {
      const order = Array.from({ length: count }, (_, i) => i).sort((a, b) => Math.abs(a - (count - 1) / 2) - Math.abs(b - (count - 1) / 2));   // centre spots first, then outwards
      order.forEach(i => spots.push({ x: 8 + (i + 0.5) * (84 / count) + (r % 2 ? 2 : -2), y: 86 - r * 15.5, w: 21 - r * 2, z: 10 - r }));          // x across, y up the stage, w = size, z = who is drawn in front
    });
    while (spots.length < n) spots.push({ x: 50, y: 20, w: 10, z: 1 });                     // more than 25 members: extras stand at the back (no version has this yet)
    return spots;
  }
  async function drawInstruments() {
    const host = S.ui.grid; if (!host) return; await readArtManifest(); if (S.ui.stage) await readBandArt(); host.innerHTML = ''; closePanel();
    host.style.setProperty('--beat', S.BEAT + 's');                                          // the members move once per beat of this version's tempo
    const so = S.ui.stageOpts || {};                                                         // the page's stage options (the club passes its own spots and pictures)
    const art = S.ui.stage && bandArt && bandArt[S.cur] ? bandArt[S.cur] : null, spots = so.spots ? so.spots(S.layers.length) : stageSpots(S.layers.length);
    let into = host;
    if (S.ui.stage && so.scenery !== false) {                                                // the scenery behind the band (not when the club draws its own)
      const scene = el('div', 'bp-scene' + (art && art.backdrop ? ' has-art' : ''));
      scene.innerHTML = art && art.backdrop ? '<img class="bp-backdrop" alt="" src="' + bandArtBase() + art.backdrop + '">' : '<div class="bp-wall"></div><div class="bp-curtain l"></div><div class="bp-curtain r"></div><div class="bp-floor"></div><div class="bp-spot"></div>';
      host.append(scene); into = scene;
    }
    S.layers.forEach((l, i) => {
      const m = art && art.members && art.members[l.id], own = so.memberArt ? so.memberArt(S.cur, l.id, i) : null;
      const pic = own || (m && m.file ? '<img alt="" src="' + bandArtBase() + m.file + '">' : artHtml(l.id));   // the club's musician picture, else the band-picture slot, else the instrument drawing
      const b = el('button', 'band-ibox' + (S.ui.stage ? ' band-member move-' + (i % 4) : ''), (S.ui.stage ? '<span class="bm-fig">' + pic + '</span>' : pic) + '<span class="iname"></span><span class="isolo">solo</span>');
      b.type = 'button'; b.dataset.id = l.id; b.title = l.name + ': click for volume and solo'; b.querySelector('.iname').textContent = l.name; b.addEventListener('click', () => openPanel(l.id, b));
      if (S.ui.stage) { const p = m && m.x !== undefined ? { x: m.x, y: m.y, w: m.w || 16, z: m.z || 5 } : spots[i]; b.style.cssText = '--x:' + p.x + ';--y:' + p.y + ';--w:' + p.w + ';z-index:' + p.z; }   // where this member stands
      into.append(b);
    });
    if (!host.parentNode.querySelector('.band-panel')) { const p = el('div', 'band-panel', '<div class="ptitle"></div><label>Volume <span class="pval"></span><input type="range" min="0" max="200" step="1" class="pvol"></label><div class="pbtns"><button type="button" class="psolo">Solo</button><button type="button" class="pclose">Close</button></div>'); p.hidden = true; host.after(p); p.querySelector('.pvol').addEventListener('input', e => { if (!S.panelId) return; S.mix[mk(S.panelId)] = e.target.value / 100; applyLevels(); saveMix(); syncPanel(); }); p.querySelector('.psolo').addEventListener('click', () => { if (S.panelId) toggleSolo(S.panelId); }); p.querySelector('.pclose').addEventListener('click', closePanel); }
    setLayers();
  }
  function closePanel() { S.panelId = null; const p = document.querySelector('.band-panel'); if (p) p.hidden = true; document.querySelectorAll('.band-ibox.sel').forEach(b => b.classList.remove('sel')); }
  function syncPanel() {
    const p = document.querySelector('.band-panel'); if (!p || !S.panelId) return;
    const v = Math.round(level(S.panelId) * 100); p.querySelector('.pvol').value = v; p.querySelector('.pval').textContent = v + '%';
    const on = S.solo === S.panelId; p.querySelector('.psolo').setAttribute('aria-pressed', String(on)); p.querySelector('.psolo').textContent = on ? 'Solo on (click to stop)' : 'Solo';
  }
  function openPanel(id, box) { if (S.panelId === id) { closePanel(); return; } closePanel(); S.panelId = id; box.classList.add('sel'); const p = document.querySelector('.band-panel'); p.hidden = false; const l = S.layers.find(x => x.id === id); p.querySelector('.ptitle').textContent = l ? l.name : id; syncPanel(); }
  /* Solo: listen to one instrument alone (starts the music if it is silent, so the player can judge its volume). */
  function toggleSolo(id) { if (S.sched === 'outro') return; ensureAudio(); if (S.ac.state === 'suspended') S.ac.resume(); if (S.solo === id) S.solo = null; else { S.solo = id; if (!S.sched) startMusic(); } setLayers(); }
  /* The yellow border: each frame, every box reads the loudness of its instrument; a note makes the border flash, then it fades. */
  const pulseRef = {}, pulseBuf = new Float32Array(512);
  function startPulse() {
    if (S.ui.grid && S.ac) { S.ui.grid.style.setProperty('--beat-delay', Math.max(0, S.t0 - S.ac.currentTime).toFixed(3) + 's'); S.ui.grid.classList.add('playing'); }   // the band picture starts moving on the first beat
    if (S.pulseId) return;
    S.pulseId = setInterval(() => { // A plain timer (about 30 times a second), so it also runs in background tabs.
      const b = S.cur ? S.bands[S.cur] : null; if (!b || !b.ready || !b.an) return;
      if (S.sched === 'stems') { const n = Math.floor((S.ac.currentTime - S.t0) / S.BEAT); if (n >= 0 && n !== S.lastTick) { S.lastTick = n; emit('tick', { n, beat: S.BEAT, downbeat: n % 4 === 0 }); } }   // one signal per beat of the music (the club pulses with it, 2026-11-22)
      document.querySelectorAll('.band-ibox').forEach(box => {
        const id = box.dataset.id, an = b.an[id]; if (!an) return;
        an.getFloatTimeDomainData(pulseBuf); let s = 0; for (let i = 0; i < pulseBuf.length; i++) s += pulseBuf[i] * pulseBuf[i];
        const r = Math.sqrt(s / pulseBuf.length), key = S.cur + '/' + id, ref = pulseRef[key] = Math.max((pulseRef[key] || 0) * 0.995, r);
        const g = ref > 0.002 ? Math.min(1, r / (ref * 0.6)) : 0, v = Math.max(g, (+box.dataset.g || 0) * 0.86);
        box.dataset.g = v; box.style.setProperty('--glow', v.toFixed(2));                    // CSS turns this number into the yellow border and glow
      });
    }, 33);
  }
  function stopPulse() { clearInterval(S.pulseId); S.pulseId = 0; if (S.ui.grid) S.ui.grid.classList.remove('playing');document.querySelectorAll('.band-ibox').forEach(b => { b.dataset.g = 0; b.style.setProperty('--glow', '0'); }); }

  /* Settings the player can change: the version, the speed, and how many right answers bring in a new instrument. */
  function mountSettings(host) {
    host.classList.add('band-settings'); host.innerHTML = '';
    const mkSel = (label, id, opts, value, onChange) => { const w = el('label', 'bs-field'); w.append(el('span', '', label)); const s = el('select'); s.id = id; opts.forEach(([v, t, dis]) => { const o = el('option'); o.value = v; o.textContent = t; if (dis) o.disabled = true; s.append(o); }); s.value = value; s.addEventListener('change', () => onChange(s.value)); w.append(s); return w; };
    host.append(
      mkSel('Version', 'band-version', BAND_ORDER.map(([k, t]) => [k, S.list.includes(k) ? t : t + ' (coming)', !S.list.includes(k)]), S.cur || 'salsa', v => switchBand(v)),
      mkSel('Speed', 'band-pace', [['relaxed', 'Relaxed'], ['normal', 'Normal'], ['quick', 'Quick']], S.pace, v => { S.pace = v; emit('settings', {}); }),
      mkSel('New instrument every', 'band-step', [['1', '1 right answer'], ['3', '3 right answers'], ['5', '5 right answers']], String(S.comboStep), v => { S.comboStep = +v; emit('settings', {}); }),
      (() => { const w = el('label', 'bs-field bs-check'); const c = el('input'); c.type = 'checkbox'; c.checked = !S.muted; c.addEventListener('change', () => { S.muted = !c.checked; applyMaster(); }); w.append(c, el('span', '', 'Music')); return w; })()
    );
    S.ui.settings = host;
  }
  function drawSettings() { if (S.ui.settings) mountSettings(S.ui.settings); }

  /* ---------- What a page can use ---------- */
  window.Band = {
    unlock, load, listBands, startMusic, stopMusic, startRound, finishRound, beginQuestion, resolve, cancelQuestion, switchBand, shout, pause, resume,
    mountTimer, mountRing, mountCombo, mountInstruments, mountShout, mountSettings,
    setPace: p => { if (PACE_BEATS[p]) { S.pace = p; emit('settings', {}); } }, setComboStep: n => { if ([1, 3, 5].includes(n)) { S.comboStep = n; emit('settings', {}); } },
    on: (name, fn) => { (S.listeners[name] = S.listeners[name] || []).push(fn); },
    get state() { return { streak: S.streak, best: S.best, asked: S.asked, right: S.right, pocket: S.pocket, size: S.size, total: S.layers.length, band: S.cur, playing: S.sched, roundOn: S.roundOn, paused: !!S.paused, pace: S.pace, comboStep: S.comboStep, beat: S.BEAT, audio: S.ac ? S.ac.state : 'none' }; },
    PACE_BEATS
  };
})();
