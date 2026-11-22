/* The verb page's one-screen stage (NZ, 2026-11-22). Three small jobs that need to know exactly where the device is drawn:
   1. The combo ring is sized to the Brazalete and centred on its middle button, glowing BEHIND it.
   2. The eight beat dots become eight small lights built into the device's frame, lighting up on the beat like a clock face.
   3. The verb window at the top of the device opens the verb list when tapped (the old big verb button above the device is gone).
   The device redraws itself completely after every turn of a dial, so this file watches for each redraw and puts the lights back.
   Decisions: vault specs "Brazalete Website Redesign, Combo Ring and Agreement Device — Decisions 2026-11-20", section 6. */
(() => {
  'use strict'; // Catch accidental global variables.
  const $ = id => document.getElementById(id);
  const device = $('device'), wrap = $('device-wrap'), ring = $('band-ring');
  if (!device || !wrap) return;                                                             // not the verb page

  /* Where the device's middle is, in the drawing's own units (from the device drawing: centre 220,195; the outer mood ring has radius 190). */
  const CX = 220, CY = 195, R_OUTER = 190;
  const SVG_NS = 'http://www.w3.org/2000/svg';

  /* Three looks for the beat lights, so NZ can compare them side by side. Each is a circle of 8 lights: how far from the middle, and how big.
     hub  = around the centre button (the confirm button), where the eyes already are
     seam = in the thin gap between the person ring and the mood ring, like rivets in the frame
     rim  = just outside the outer edge of the device */
  const LIGHT_LOOKS = { hub: { r: 44.5, size: 3.6 }, seam: { r: 149, size: 4.6 }, rim: { r: 214, size: 6 } };
  const params = new URLSearchParams(location.search);
  let look = LIGHT_LOOKS[params.get('lights')] ? params.get('lights') : 'seam';            // NZ picked "seam" (2026-11-22); ?lights=hub or ?lights=rim still shows the other looks for comparing
  let lastStates = Array(8).fill('');                                                       // what the lights showed last, so a redraw does not blank them

  /* Builds the 8 lights into the device drawing (after each redraw). Light 1 sits at 12 o'clock and they go round clockwise, like the beats of a bar. */
  function addLights() {
    const svg = device.querySelector('.device-svg');
    if (!svg || svg.querySelector('.beat-lights') || svg.classList.contains('adj-svg')) return;   // already there, or not the verb device
    const { r, size } = LIGHT_LOOKS[look];
    const g = document.createElementNS(SVG_NS, 'g'); g.setAttribute('class', 'beat-lights look-' + look); g.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;                                         // start at the top, go clockwise
      const c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('cx', (CX + r * Math.cos(a)).toFixed(2)); c.setAttribute('cy', (CY + r * Math.sin(a)).toFixed(2)); c.setAttribute('r', size);
      c.setAttribute('class', 'beat-light' + (lastStates[i] ? ' ' + lastStates[i] : ''));
      g.append(c);
    }
    svg.append(g);                                                                           // drawn last, so the lights sit on top of the rings
  }
  function paintLights(states) {
    lastStates = states;
    device.querySelectorAll('.beat-light').forEach((c, i) => c.setAttribute('class', 'beat-light' + (states[i] ? ' ' + states[i] : '')));
  }

  /* Sizes the combo ring to the device and centres it on the middle button. */
  function placeRing() {
    const svg = device.querySelector('.device-svg'); if (!svg || !ring) return;
    const vb = (svg.getAttribute('viewBox') || '0 0 440 462').split(/\s+/).map(Number);     // the drawing's own coordinate box
    const box = svg.getBoundingClientRect(), home = wrap.getBoundingClientRect();
    if (!box.width) return;                                                                  // hidden: nothing to line up with yet
    const scale = box.width / vb[2];                                                         // screen pixels per drawing unit
    const size = (R_OUTER / 0.86) * 2 * scale;                                               // the ring's bright band starts just outside the device's outer edge (see verb-stage.css)
    ring.style.width = ring.style.height = size + 'px';
    ring.style.left = (box.left - home.left + (CX - vb[0]) * scale - size / 2) + 'px';
    ring.style.top = (box.top - home.top + (CY - vb[1]) * scale - size / 2) + 'px';
  }

  /* The verb window: the strip at the top of the device that names the verb. In Explore, tapping it opens the verb list. During a quiz it only shows the given verb. */
  /* NZ, 2026-11-22: the slot shows only the verb, big and centred (no "verbo"), and it is EMPTY until a verb is loaded. In Explore a tap opens the verb list;
     during a quiz a tap opens the four-verb square (verb-play.js), so the player first loads the right verb, then conjugates it. */
  function wireVerbWindow() {
    const win = device.querySelector('.gadget-intake'); if (!win) return;
    const band = document.body.classList.contains('band-mode'), canTap = !band || (window.BandPlay && BandPlay.choosing);
    win.classList.add('verb-window');
    const hint = win.querySelector('.intake-hint'); if (hint) hint.textContent = '';      // empty slot (the game's own text says "drop a verb here")
    win.classList.toggle('empty', !!hint);
    win.classList.toggle('can-change', !!canTap);
    const word = (win.querySelector('.intake-word') || {}).textContent || '';
    if (canTap) { win.setAttribute('role', 'button'); win.tabIndex = 0; win.setAttribute('aria-label', word ? 'Verb: ' + word + '. Tap to change the verb' : 'Empty verb slot. Tap to load a verb'); }
    else { win.removeAttribute('role'); win.removeAttribute('tabindex'); win.removeAttribute('aria-label'); }
  }
  const openVerbs = () => {
    if (!document.body.classList.contains('band-mode')) $('verb-button').click();          // Explore: the hidden verb button still opens the list
    else if (window.BandPlay && BandPlay.choosing) BandPlay.openPicker();                  // quiz: the four-verb square
  };
  device.addEventListener('click', e => { if (e.target.closest('.verb-window.can-change')) openVerbs(); });
  device.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest && e.target.closest('.verb-window.can-change')) { e.preventDefault(); e.stopPropagation(); openVerbs(); } }, true);   // keyboard: Enter on the window opens the list instead of confirming

  /* No scrolling, ever (NZ, 2026-11-22). The style sheet already sizes the device from the screen height, but how tall the question line is depends on the question
     (one line or two on a phone). So if the page still comes out taller than the screen, the device is shrunk just enough to fit.
     fresh = true starts again from the style sheet's size (screen resized, band switched on or off); otherwise it only ever shrinks, so the device does not
     keep changing size from one question to the next. */
  let fitting = false;
  function fitScreen(fresh) {
    const dev = device.querySelector('.device'); if (!dev || fitting) return;
    fitting = true;
    if (fresh) wrap.style.removeProperty('--fit-w');                                       // back to the style sheet's own size
    const overNow = () => document.documentElement.scrollHeight - window.innerHeight;
    for (let i = 0; i < 4; i++) {                                                            // a few small steps; each one removes about the extra height
      const over = overNow();
      if (over <= 2) break;                                                                  // a pixel or two is rounding, not a real scroll
      const before = wrap.style.getPropertyValue('--fit-w'), w = dev.getBoundingClientRect().width;
      wrap.style.setProperty('--fit-w', Math.max(240, Math.floor(w - over * 1.05)) + 'px');   // the drawing is nearly square, so narrower by N px is about N px shorter
      placeRing();                                                                           // the ring shrinks with the device
      if (overNow() >= over) {                                                               // shrinking didn't help (something else is too tall): undo and stop, rather than shrinking the device to nothing
        if (before) wrap.style.setProperty('--fit-w', before); else wrap.style.removeProperty('--fit-w');
        break;
      }
    }
    fitting = false; placeRing();
  }
  const refit = () => requestAnimationFrame(() => fitScreen(true));

  /* After every redraw of the device: lights back in, ring lined up, window wired. */
  function afterDraw() { addLights(); placeRing(); wireVerbWindow(); }
  new MutationObserver(afterDraw).observe(device, { childList: true });
  new ResizeObserver(placeRing).observe(wrap);
  new MutationObserver(() => { afterDraw(); refit(); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });   // entering or leaving the band changes the window, the ring and the space
  ['band-prompt', 'band-results', 'band-menu', 'bp-hint-text', 'bp-bank'].forEach(id => { const el = $(id); if (el) new MutationObserver(() => requestAnimationFrame(() => fitScreen(false))).observe(el, { attributes: true, attributeFilter: ['hidden'] }); });   // a card appeared or went
  const qText = $('bp-text'); if (qText) new MutationObserver(() => requestAnimationFrame(() => fitScreen(false))).observe(qText, { childList: true, characterData: true, subtree: true });   // a new question (maybe a longer one)
  const grow = new ResizeObserver(() => requestAnimationFrame(() => fitScreen(false)));    // the question card or the combo row grew (a long feedback line, a big shouted word wrapping)
  ['band-prompt', 'band-side', 'band-row'].forEach(id => { const el = $(id); if (el) grow.observe(el); });
  window.addEventListener('resize', () => { placeRing(); refit(); });
  afterDraw(); refit();

  /* The band tells every page where the beat is; here it lights the device's frame. */
  if (window.Band) Band.on('beat', s => paintLights(s.states));

  /* For comparing the light looks without reloading: BandStage.lights('seam'). */
  window.BandStage = { lights: name => { if (!LIGHT_LOOKS[name]) return; look = name; device.querySelectorAll('.beat-lights').forEach(g => g.remove()); addLights(); }, placeRing };
})();
