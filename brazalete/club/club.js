/* Brazalete Club Night (NZ, 2026-11-22): "Play with the band" happens at an open-air Caribbean music club at night that COMES ALIVE as the player answers correctly.
   Salsa plays in a courtyard club by the lagoon, reggaeton at a beach party. Musicians step onto the stage as they are earned, and the whole scene climbs through
   five energy stages: 1 Quiet night, 2 Warm, 3 Lively, 4 Party, 5 En fuego. Lights switch on and brighten, the screen pulses on the beat, each new stage has a
   big moment (string lights cascading on, a stage wash, the neon sign and confetti, fireworks), and a miss cools it down one stage.
   Design contract: vault products/the-scene/specs "Brazalete Club Night — Design Contract 2026-11-22".

   Every picture is a replaceable art slot (prompts and sizes: _art-src/club-night/ART-PROMPTS.md in this repo). Until a picture exists, a simple stand-in
   drawn with CSS is shown, so the whole effect can be tuned before any art is made. The lights, beams, neon sign, sparkles, confetti and fireworks are
   always drawn by code, so they can glow, pulse and change colour.
   The club only listens to the shared band (band.js); it never changes the music or the scoring. */
(() => {
  'use strict'; // Catch accidental global variables.
  if (!window.Band) return;                                                                  // the band is needed for everything here

  /* ---------- Settings ---------- */
  const ART = '/brazalete/art/club/';                                                       // where the finished pictures live (made by _tools/club-art.py)
  const RIGHTS_PER_STAGE = 2;                                                                // one stage up for every 2 right answers (Claude's proposal in the contract; NZ to confirm)
  const STAGES = ['Quiet night', 'Warm', 'Lively', 'Party', 'En fuego'];                    // the five energy stages, lowest first
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');                       // people who switch off motion get the light changes but no pulsing, sweeping or particles
  const narrow = () => innerWidth < 1024;                                                     // phones and tablets: the stacked layout with lighter effects

  /* The two scenes: which art slot is which piece, the neon sign's words, and the colours of the lights. Musician pictures are named M-<version>-NN-<layer>. */
  const SCENES = {
    salsa: { neon: 'Club Salsa', bulbs: ['#ffd27a', '#ffb347', '#fff1b8'], wash: '#ffb347', beam: '#fff0c2', hot: ['#ff5f6d', '#ffc371', '#ffe66d', '#ff8a5c'],
      pieces: { backdrop: 'S01-salsa-backdrop', left: 'S02-salsa-courtyard-left', stage: 'S03-salsa-stage', palmL: 'S04-salsa-palm-left', palmR: 'S05-salsa-palm-right', plantsL: 'S06-salsa-flowers-left', plantsR: 'S07-salsa-flowers-right', light: 'S08-salsa-lantern' } },
    reggaeton: { neon: 'La Playa', bulbs: ['#ff4fd8', '#4fc3ff', '#b46bff'], wash: '#ff4fd8', beam: '#d7b8ff', hot: ['#ff4fd8', '#4fc3ff', '#b46bff', '#5dfdcb'],
      pieces: { backdrop: 'R01-reggaeton-backdrop', left: 'R02-reggaeton-beach-left', stage: 'R03-reggaeton-stage', palmL: 'R04-reggaeton-palm-left', palmR: 'R05-reggaeton-palm-right', plantsL: 'R06-reggaeton-plants-left', plantsR: 'R07-reggaeton-plants-right', light: 'R08-reggaeton-torch' } }
  };
  const PEDESTAL = 'P01-glass-pedestal';

  /* ---------- State ---------- */
  const C = { on: false, scene: 'salsa', stage: 0, rights: 0, files: new Set(), parts: [], raf: 0, fireworksAt: 0, beatAt: 0 };

  /* ---------- Building the scene ---------- */
  const root = document.createElement('div');
  root.id = 'club'; root.className = 'club e0 v-salsa'; root.setAttribute('aria-hidden', 'true'); root.hidden = true;
  root.innerHTML =
    '<div class="club-frame">' +                                                             // the 1920×1080 scene, scaled to cover the screen
      '<div class="cl cl-backdrop"></div><div class="cl cl-shimmer"></div><div class="cl cl-left"></div>' +
      '<div class="cl cl-palm l"></div><div class="cl cl-palm r"></div>' +
    '</div>' +
    '<svg class="club-strings" aria-hidden="true"></svg>' +                                  // the string lights (positioned in screen pixels)
    '<div class="club-lights"></div>' +                                                      // the lanterns / torches
    '<div class="club-stage"><div class="cs-art"></div><div class="cs-wash"></div><div class="cs-band"></div></div>' +   // the stage with its musicians
    '<div class="club-beams"><i></i><i></i><i></i></div>' +                                  // spotlight beams (Party and up)
    '<div class="club-neon"><span></span></div>' +                                           // the neon sign
    '<div class="club-front"><div class="cl-plants l"></div><div class="cl-plants r"></div></div>' +   // foreground plants in the bottom corners
    '<div class="club-pedestal"></div>' +                                                    // the glowing glass base under the Brazalete
    '<canvas class="club-fx"></canvas>' +                                                    // sparkles, confetti, fireworks
    '<div class="club-pulse"></div><div class="club-flash"></div>';                          // the beat pulse and the stage-change / miss flashes
  document.body.prepend(root);
  const $q = s => root.querySelector(s);
  const frame = $q('.club-frame'), stageEl = $q('.club-stage'), bandHost = $q('.cs-band'), strings = $q('.club-strings'), lightsEl = $q('.club-lights');
  const canvas = $q('.club-fx'), ctx = canvas.getContext('2d'), pulse = $q('.club-pulse'), flash = $q('.club-flash'), neon = $q('.club-neon');

  /* Which finished pictures exist (written by the art script). Missing list = all stand-ins. */
  const filesReady = fetch(ART + 'manifest.json').then(r => r.ok ? r.json() : { files: [] }).then(m => { C.files = new Set(m.files || []); }).catch(() => {});
  const has = name => C.files.has(name + '.webp');
  const img = name => '<img alt="" src="' + ART + name + '.webp">';

  /* Fills every piece with its picture, or with the stand-in drawing (the CSS class "standin" draws it). */
  function paintPieces() {
    const sc = SCENES[C.scene], p = sc.pieces;
    const fill = (el, name) => { if (!el) return; const ok = has(name); el.classList.toggle('standin', !ok); el.innerHTML = ok ? img(name) : el.dataset.standin || ''; };
    fill($q('.cl-backdrop'), p.backdrop); fill($q('.cl-left'), p.left); fill($q('.cs-art'), p.stage);
    root.querySelectorAll('.cl-palm').forEach(el => fill(el, el.classList.contains('l') ? p.palmL : p.palmR));
    root.querySelectorAll('.cl-plants').forEach(el => fill(el, el.classList.contains('l') ? p.plantsL : p.plantsR));
    fill($q('.club-pedestal'), PEDESTAL);
    neon.querySelector('span').textContent = sc.neon;
    root.style.setProperty('--bulb', sc.bulbs[0]); root.style.setProperty('--wash', sc.wash); root.style.setProperty('--beam', sc.beam);
    layout();
  }
  /* Stand-in drawings: plain shapes in the scene's colours (see club.css). The palms and plants are small inline drawings. */
  const PALM = '<svg viewBox="0 0 200 300" class="si-palm"><path d="M96 300 C100 220 112 150 108 70" stroke="#2b1d14" stroke-width="13" fill="none" stroke-linecap="round"/>' +
    ['M108 70 C70 40 30 52 8 86', 'M108 70 C80 20 40 10 18 22', 'M108 70 C120 20 160 8 188 28', 'M108 70 C150 44 182 60 196 96', 'M108 70 C100 30 110 6 128 0', 'M108 70 C70 70 46 96 40 130', 'M108 70 C146 76 166 104 168 140']
      .map(d => '<path d="' + d + '" stroke="#174a34" stroke-width="16" fill="none" stroke-linecap="round"/>').join('') + '</svg>';
  const PLANTS = '<svg viewBox="0 0 200 200" class="si-plants">' + ['M0 200 C30 120 70 90 120 80', 'M0 200 C20 140 20 90 40 40', 'M0 200 C60 150 120 150 190 170', 'M0 200 C50 110 110 60 160 50']
      .map((d, i) => '<path d="' + d + '" stroke="' + ['#1e6b45', '#145236', '#2a8a57', '#18603e'][i] + '" stroke-width="26" fill="none" stroke-linecap="round"/>').join('') +
      '<circle cx="70" cy="120" r="16" fill="var(--flower,#ff4f6d)"/><circle cx="118" cy="146" r="12" fill="var(--flower2,#ff9a3c)"/><circle cx="40" cy="80" r="10" fill="var(--flower,#ff4f6d)"/></svg>';
  root.querySelectorAll('.cl-palm').forEach(el => { el.dataset.standin = PALM; });
  root.querySelectorAll('.cl-plants').forEach(el => { el.dataset.standin = PLANTS; });
  $q('.cl-backdrop').dataset.standin = '<i class="si-moon"></i><i class="si-hills"></i><i class="si-water"></i><i class="si-floor"></i>';
  $q('.cl-left').dataset.standin = '<i class="si-wall"></i><i class="si-arch a1"></i><i class="si-arch a2"></i><i class="si-bloom b1"></i><i class="si-bloom b2"></i><i class="si-fire"></i>';
  $q('.cs-art').dataset.standin = '<i class="si-roof"></i><i class="si-col c1"></i><i class="si-col c2"></i><i class="si-riser r3"></i><i class="si-riser r2"></i><i class="si-riser r1"></i><i class="si-spk s1"></i><i class="si-spk s2"></i>';
  $q('.club-pedestal').dataset.standin = '<i class="si-disc d1"></i><i class="si-disc d2"></i>';

  /* ---------- Where things go ---------- */
  /* The stage on the scene (1920×1080): right side, x 1160–1920, y 330–837 (a 1.5:1 picture). On a phone or tablet it fills the empty slot the page leaves for it. */
  const STAGE_ON_FRAME = { x: 1160 / 1920, y: 330 / 1080, w: 760 / 1920, h: 507 / 1080 };
  /* The musicians' spots on the stage's three risers, in percent of the stage. w is the musician's height as a share of the stage height (club.css turns it into a size).
     The first ones to join stand front and right of centre, where the device never covers them; later ones fill the rest. */
  function spots(n) {
    const wide = !narrow(), L = wide ? 26 : 0;                                               // on a laptop the device covers the stage's left quarter, so nobody stands there
    const rows = [{ count: 9, y: 90, h: 40, x0: 8 + L, x1: 94, z: 30 }, { count: 8, y: 73, h: 35, x0: 12 + L, x1: 92, z: 20 }, { count: 8, y: 58, h: 30, x0: 15 + L, x1: 88, z: 10 }];
    const out = [];
    rows.forEach(r => {
      const xs = Array.from({ length: r.count }, (_, i) => r.x0 + (r.x1 - r.x0) * (i / (r.count - 1)));
      const mid = wide ? 66 : 50; xs.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));  // the middle of the visible stage first, then outwards
      xs.forEach(x => out.push({ x, y: r.y, w: r.h, z: r.z }));
    });
    while (out.length < n) out.push({ x: 50, y: 58, w: 28, z: 5 });
    return out;
  }
  /* A finished musician picture, if one exists: M-<version>-<NN>-<layer>. */
  const memberArt = (band, id, i) => { const name = 'M-' + band + '-' + String(i + 1).padStart(2, '0') + '-' + id; return has(name) ? img(name) : null; };

  /* Places the stage, the lights, the neon sign, the beams and the pedestal in screen pixels. Runs on every resize and layout change. */
  function layout() {
    if (!C.on) return;
    let s;
    const slot = document.getElementById('band-row');
    if (narrow() && slot && slot.offsetHeight) { const r = slot.getBoundingClientRect(); s = { x: r.left, y: r.top, w: r.width, h: r.height }; }   // phone/tablet: the empty slot above the question
    else { const f = frame.getBoundingClientRect(); s = { x: f.left + STAGE_ON_FRAME.x * f.width, y: f.top + STAGE_ON_FRAME.y * f.height, w: STAGE_ON_FRAME.w * f.width, h: STAGE_ON_FRAME.h * f.height }; }
    Object.assign(stageEl.style, { left: s.x + 'px', top: s.y + 'px', width: s.w + 'px', height: s.h + 'px' });
    stageEl.style.setProperty('--sh', s.h + 'px');                                          // the musicians are sized from the stage height
    C.stageBox = s;
    // The neon sign above the stage, the beams from the stage's roof.
    if (narrow()) Object.assign(neon.style, { left: (s.x + 8) + 'px', top: (s.y + 6) + 'px', fontSize: Math.max(12, s.h * 0.15) + 'px', transform: 'none' });   // phone: tucked in the stage window's top-left corner
    else Object.assign(neon.style, { left: (s.x + s.w * 0.5) + 'px', top: (s.y - s.h * 0.02) + 'px', fontSize: Math.max(14, s.h * 0.13) + 'px', transform: '' });   // laptop: above the stage roof
    const beams = $q('.club-beams'); Object.assign(beams.style, { left: s.x + 'px', top: (s.y + s.h * 0.12) + 'px', width: s.w + 'px', height: (innerHeight - s.y) + 'px' });
    drawStrings(s); placeLights(s); placePedestal();
    sizeCanvas();
  }
  /* String lights: two or three sagging strands of bulbs. On a laptop they run from the courtyard (left) to the stage roof; on a phone they hang across the top of the stage. */
  function drawStrings(s) {
    const W = innerWidth, H = innerHeight, f = frame.getBoundingClientRect();
    const lines = narrow()
      ? [[s.x, s.y + s.h * 0.1, s.x + s.w, s.y + s.h * 0.1, s.h * 0.18], [s.x, s.y + s.h * 0.02, s.x + s.w * 0.55, s.y + s.h * 0.2, s.h * 0.1]]
      : [[f.left + f.width * 0.30, f.top + f.height * 0.22, s.x + s.w * 0.10, s.y + s.h * 0.08, H * 0.10],
         [f.left + f.width * 0.34, f.top + f.height * 0.34, s.x + s.w * 0.08, s.y + s.h * 0.24, H * 0.07],
         [s.x + s.w * 0.06, s.y + s.h * 0.05, s.x + s.w * 0.98, s.y + s.h * 0.04, s.h * 0.10]];
    strings.setAttribute('viewBox', '0 0 ' + W + ' ' + H); strings.setAttribute('width', W); strings.setAttribute('height', H);
    let out = '', k = 0;
    lines.forEach(([x1, y1, x2, y2, sag]) => {
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + sag;                                     // the lowest point of the sag
      out += '<path d="M' + x1 + ' ' + y1 + ' Q' + mx + ' ' + my + ' ' + x2 + ' ' + y2 + '" class="str-wire"/>';
      const n = Math.max(6, Math.round(Math.hypot(x2 - x1, y2 - y1) / (narrow() ? 22 : 34)));  // a bulb about every 34 px
      for (let i = 1; i < n; i++) {
        const t = i / n, x = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * mx + t * t * x2, y = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * my + t * t * y2 + 5;   // a point along the curve, hanging a little below the wire
        out += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (narrow() ? 3 : 4.5) + '" class="bulb" style="--i:' + (k++) + '"/>';
      }
    });
    strings.innerHTML = out; C.bulbCount = k;
  }
  /* Four lanterns (salsa) or tiki torches (reggaeton): two on the courtyard / beach hut, two at the sides of the stage. */
  function placeLights(s) {
    const f = frame.getBoundingClientRect(), sc = SCENES[C.scene], pic = has(sc.pieces.light) ? img(sc.pieces.light) : '<i class="si-lamp"></i>';
    const pts = narrow()
      ? [[s.x + s.w * 0.04, s.y + s.h * 0.45], [s.x + s.w * 0.96, s.y + s.h * 0.45]]
      : [[f.left + f.width * 0.12, f.top + f.height * 0.40], [f.left + f.width * 0.30, f.top + f.height * 0.46], [s.x + s.w * 0.04, s.y + s.h * 0.40], [s.x + s.w * 0.96, s.y + s.h * 0.40]];
    const size = narrow() ? 26 : Math.max(46, f.height * 0.075);
    lightsEl.innerHTML = pts.map(([x, y], i) => '<span class="lamp' + (C.scene === 'reggaeton' ? ' torch' : '') + '" style="left:' + x + 'px;top:' + y + 'px;--s:' + size + 'px;--i:' + i + '">' + pic + '</span>').join('');
  }
  /* The glass pedestal sits under the Brazalete's middle. */
  function placePedestal() {
    const ped = $q('.club-pedestal'), svg = document.querySelector('#device .device-svg');
    if (!svg) { ped.style.display = 'none'; return; }
    const r = svg.getBoundingClientRect(); if (!r.width) { ped.style.display = 'none'; return; }
    const vb = (svg.getAttribute('viewBox') || '0 0 440 462').split(/\s+/).map(Number), k = r.width / vb[2];
    const cx = r.left + (220 - vb[0]) * k, w = 2 * 236 * k;                                  // centred on the device's middle, a little wider than it
    Object.assign(ped.style, { display: '', left: (cx - w / 2) + 'px', top: (r.top + (195 - vb[1] + 120) * k) + 'px', width: w + 'px', height: (w * 0.3) + 'px' });   // tucked under the device's lower half, so only its glowing rim shows below
  }

  /* ---------- The five energy stages ---------- */
  function setStage(n, why) {
    n = Math.max(0, Math.min(STAGES.length - 1, n));
    const up = n > C.stage, down = n < C.stage;
    C.stage = n;
    root.classList.remove('e0', 'e1', 'e2', 'e3', 'e4'); root.classList.add('e' + n);
    root.dataset.stage = STAGES[n];
    if (up) bigMoment(n);
    if (down || why === 'miss') hit(flash, 'miss');                                          // a short flicker as the club cools down
    kick();
  }
  /* Each new stage gets its own moment. */
  function bigMoment(n) {
    hit(flash, 'up');                                                                        // a warm flash
    if (n === 1) { root.classList.remove('cascade'); void root.offsetWidth; root.classList.add('cascade'); }   // the string lights switch on one after another
    if (n === 3) { neonOn(); confetti(narrow() ? 60 : 140); }                                // the neon sign flickers on, confetti bursts
    if (n === 4) { confetti(narrow() ? 70 : 160); firework(); setTimeout(firework, 350); setTimeout(firework, 700); }   // fireworks over the water
  }
  function neonOn() { neon.classList.remove('flicker'); void neon.offsetWidth; neon.classList.add('flicker'); }
  function hit(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }   // restart a one-off CSS animation

  /* ---------- Effects: sparkles, confetti, fireworks (one canvas) ---------- */
  function sizeCanvas() {
    const dpr = Math.min(narrow() ? 1 : 1.5, devicePixelRatio || 1);
    if (canvas.width !== Math.round(innerWidth * dpr)) { canvas.width = Math.round(innerWidth * dpr); canvas.height = Math.round(innerHeight * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  function confetti(count) {
    if (reduceMotion.matches) return;
    const cols = SCENES[C.scene].hot.concat(['#ffffff', '#5dfdcb']);
    for (let i = 0; i < count; i++) C.parts.push({ t: 'c', x: rnd(0, innerWidth), y: rnd(-innerHeight * 0.3, -10), vx: rnd(-1.2, 1.2), vy: rnd(2, 5), r: rnd(0, 6.3), vr: rnd(-0.2, 0.2), w: rnd(6, 11), h: rnd(3, 6), c: pick(cols), life: 1 });
    kick();
  }
  function firework() {
    if (reduceMotion.matches) return;
    const s = C.stageBox || { x: innerWidth * 0.5, w: innerWidth * 0.4 };
    const x = narrow() ? rnd(innerWidth * 0.1, innerWidth * 0.9) : rnd(innerWidth * 0.42, innerWidth * 0.95);   // over the water, away from the device
    C.parts.push({ t: 'r', x, y: innerHeight * 0.75, vy: -rnd(9, 12), ty: rnd(innerHeight * 0.08, innerHeight * (narrow() ? 0.2 : 0.32)), c: pick(SCENES[C.scene].hot) });
    void s; kick();
  }
  function burst(x, y, c) { const n = narrow() ? 40 : 70; for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = rnd(1.5, 5.5); C.parts.push({ t: 'f', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, c, life: 1 }); } }
  /* The animation loop runs only while something is moving, so a quiet page costs nothing. */
  function kick() { if (!C.raf && C.on && !C.paused) C.raf = requestAnimationFrame(frameTick); }
  function frameTick(now) {
    C.raf = 0;
    const W = innerWidth, H = innerHeight; ctx.clearRect(0, 0, W, H);
    // Sparkles drift around the lights from Lively up (fewer on phones), and fireworks go off by themselves at En fuego.
    if (C.stage >= 2 && !reduceMotion.matches && C.parts.filter(p => p.t === 's').length < (narrow() ? 12 : 30) * (C.stage - 1) / 3 + 4) {
      const s = C.stageBox || { x: W * 0.6, y: H * 0.3, w: W * 0.35, h: H * 0.4 };
      C.parts.push({ t: 's', x: rnd(narrow() ? 0 : W * 0.05, W), y: rnd(s.y - 40, s.y + s.h), vy: -rnd(0.15, 0.5), ph: rnd(0, 6.3), life: 1, c: pick(SCENES[C.scene].bulbs) });
    }
    if (C.stage === 4 && !reduceMotion.matches && now - C.fireworksAt > (narrow() ? 2600 : 1500)) { C.fireworksAt = now; firework(); }
    const next = [];
    for (const p of C.parts) {
      if (p.t === 'c') { p.x += p.vx; p.y += p.vy; p.r += p.vr; p.vx *= 0.995; if (p.y > H + 20) continue; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2))); ctx.restore(); }
      else if (p.t === 'r') { p.y += p.vy; p.vy *= 0.985; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, 7); ctx.fill(); if (p.y <= p.ty) { burst(p.x, p.y, p.c); continue; } }
      else if (p.t === 'f') { p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.vx *= 0.985; p.life -= 0.012; if (p.life <= 0) continue; ctx.globalAlpha = p.life; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
      else if (p.t === 's') { p.y += p.vy; p.ph += 0.05; p.life -= 0.004; if (p.life <= 0 || C.stage < 2) continue; ctx.globalAlpha = Math.max(0, Math.sin(p.ph)) * p.life * 0.9; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, 1.8, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
      next.push(p);
    }
    C.parts = next;
    if (C.on && !C.paused && (C.parts.length || C.stage >= 2)) C.raf = requestAnimationFrame(frameTick);  // keep going only while there is something to draw
  }

  /* ---------- The beat ---------- */
  Band.on('tick', t => {
    if (!C.on || reduceMotion.matches) return;
    pulse.classList.remove('beat', 'down'); void pulse.offsetWidth; pulse.classList.add('beat'); if (t.downbeat) pulse.classList.add('down');   // the screen breathes on every beat, harder on the first beat of the bar
    if (C.stage >= 3) root.classList.toggle('alt', t.n % 2 === 0);                           // Party and up: the bulbs blink in alternating groups
  });

  /* Paused (Settings open): every animation and particle freezes where it is, and carries on when the game resumes. */
  Band.on('pause', p => { C.paused = p.paused; root.classList.toggle('paused', p.paused); if (p.paused) { cancelAnimationFrame(C.raf); C.raf = 0; } else kick(); });

  /* ---------- Listening to the band ---------- */
  Band.on('round', () => { C.rights = 0; setStage(0); });                                   // a new round starts on a quiet night
  Band.on('resolved', info => {
    if (!C.on) return;
    if (info.correct) { C.rights++; if (C.rights >= RIGHTS_PER_STAGE) { C.rights = 0; setStage(C.stage + 1); } else hit(flash, 'ok'); }
    else { C.rights = 0; setStage(C.stage - 1, 'miss'); }                                   // a miss or a timeout cools the club down one stage
  });
  Band.on('fin', () => { if (!C.on) return; confetti(narrow() ? 80 : 200); firework(); setTimeout(firework, 250); setTimeout(firework, 500); hit(flash, 'up'); });   // the big hit of the finish
  Band.on('band', b => { if (SCENES[b.key] && b.key !== C.scene) { C.scene = b.key; root.classList.remove('v-salsa', 'v-reggaeton'); root.classList.add('v-' + b.key); filesReady.then(paintPieces); } });   // switching version switches the scene

  /* The club shows only while "Play with the band" is on; Explore keeps the watery page. */
  function show(on) {
    if (on === C.on) return;
    C.on = on; root.hidden = !on; document.body.classList.toggle('club-on', on);
    if (on) { filesReady.then(() => { paintPieces(); requestAnimationFrame(layout); }); setStage(0); }
    else { cancelAnimationFrame(C.raf); C.raf = 0; C.parts = []; ctx.clearRect(0, 0, canvas.width, canvas.height); }
  }
  new MutationObserver(() => show(document.body.classList.contains('band-mode'))).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  addEventListener('resize', () => requestAnimationFrame(layout));
  const dev = document.getElementById('device'); if (dev) new MutationObserver(() => requestAnimationFrame(placePedestal)).observe(dev, { childList: true });   // the device redraws: keep the pedestal under it
  const wrap = document.getElementById('device-wrap'); if (wrap) new ResizeObserver(() => requestAnimationFrame(layout)).observe(wrap);

  /* What other scripts can use: where the musicians go, and the stage options for Band.mountInstruments. For testing: Club.stage(n) jumps to a stage. */
  window.Club = { bandHost, stageOptions: { stage: true, scenery: false, spots, memberArt }, get stage() { return C.stage; }, setStage: n => setStage(n), layout, STAGES };
})();
