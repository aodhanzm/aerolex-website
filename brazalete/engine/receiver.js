/* =============================================================================
   GADGET LAB — THE RECEIVER DISC  (NZ, 2026-09-21)

   The object-pronoun device. A second, smaller disc that MIRRORS the person
   circle on the conjugator: the same six sextants in the same places and the
   same colours, so "yo" on the gadget sits exactly where "me" sits here. The
   learner already knows the map; the disc only relabels it.

   A switch on top says what the little word IS:
     VÍCTIMA   — the thing the action happens to     (lo / la / los / las)
     RECEPTOR  — someone who gets something          (le / les)
     REFLEXIVO — the doer does it to themself        (se) — added 2026-09-21
   The test for RECEPTOR is "something TO someone" (locked 2026-09-21). Only
   the third person changes between the two modes; me / te / nos / os are the
   same word either way, which is exactly what Spanish does.

   In VÍCTIMA mode the two third-person sextants split down the middle into
   masculine and feminine halves (blue / pink, the gender colours the adjective
   dials already use), because lo/la must agree with the noun it replaces.

   The centre is the CONFIRM button, like the conjugator's hub. What it sends
   is a word of its own, so the next-open-space rule puts it in the sentence
   BEFORE the verb — the placement rule is enforced by the machine, not told.

   API (all the lab needs):
     mount(host)            draw into this element and wire its clicks
     show(bool) / visible   the disc only appears in the object-pronoun unit
     set(person, gender)    choose a cell        setMode('vic'|'rec')
     toggleMode()           flip the switch      step(±1)  walk the cells
     form / colour / mode   what the hub holds right now
     combosFor(text)        every {mode, person, gender} that makes this word
     gate(part)             tutorial hook: may 'switch'|'sextant'|'hub' be used?
     onSet(part)            tutorial hook: something changed
     onEject()              lab hook: the hub was pressed
     focused                lab sets this so the keyboard's target is visible
   ============================================================================= */

const Receiver = (() => {
  'use strict';

  // ---- state ---------------------------------------------------------------
  const st = {
    publicLabels: false, // Keep the game's original disc labels unless the explorer opts in.
    variety: 'tu', // Singular Vos changes the subject label while its object pronoun stays te.
    mode: 'vic',     // which side of the switch is lit
    person: 0,       // 0-5, PERSONS order. Rests on me, so the answer (usually a
                     // third-person lo / la) is never already dialled in.
    gender: 0,       // 0 masculine / 1 feminine — only matters on a split cell
    shown: false,    // hidden outside the object-pronoun unit
    focused: false,  // true when the keyboard is driving this disc
  };
  let host = null;   // the element the disc is drawn into
  const hooks = { gate: null, onSet: null, onEject: null, tutFocus: null };

  // ---- what the disc says ------------------------------------------------------
  // The pronoun a cell holds in a mode. A split cell stores [masc, fem].
  function formAt(mode, person, gender) {
    const cell = OBJECT_PRONOUNS[mode][person];             // the entry for this sextant
    return Array.isArray(cell) ? cell[gender] : cell;        // split cells pick by gender
  }
  // Is this sextant split into two halves in this mode?
  const isSplit = (mode, person) => Array.isArray(OBJECT_PRONOUNS[mode][person]);

  // The colour a cell glows: a split half takes its GENDER colour, any other
  // sextant takes its PERSON colour — the same hue as on the conjugator.
  function colourAt(mode, person, gender) {
    return isSplit(mode, person) ? GENDERS[gender].colour : PERSONS[person].colour;
  }

  // The subject each pronoun mirrors, written small under it so the map from
  // the conjugator is always visible: yo → me, tú → te, él → lo, ella → la …
  const SUBJ = ['yo', 'tú', ['él', 'ella'], 'nos.', 'vos.', ['ellos', 'ellas']];
  const subjAt = (person, gender, split) => {
    const s = subjectAt(person); // Read the regional subject label without changing pronoun forms.
    if (!Array.isArray(s)) return s;                         // one label for most sextants
    return split ? s[gender] : 'él · ella';                  // a split half names its own gender
  };
  // For an unsplit 3rd-person cell (RECEPTOR's le / les) the label covers both.
  const subjectAt = person => st.publicLabels && person === 1 ? (st.variety === 'vos' ? 'vos' : 'tú') : st.publicLabels && person === 4 ? 'vosotros' : SUBJ[person]; // Distinguish singular Vos from the Spanish plural.
  const subjWhole = person => (person === 5 ? 'ellos · ellas' : person === 2 ? 'él · ella' : subjectAt(person)); // Use that same subject label on unsplit cells.

  // Every {mode, person, gender} that produces `text`. The lab's diagnostic
  // uses this to say WHICH part of the disc was wrong, the same way the
  // conjugator's combos say which dial was wrong.
  function combosFor(text) {
    const out = [];
    for (const m of ['vic', 'rec', 'ref']) {                 // every setting of the switch
      for (let p = 0; p < 6; p++) {                          // every sextant
        const genders = isSplit(m, p) ? [0, 1] : [0];        // halves only where split
        for (const g of genders) if (formAt(m, p, g) === text) out.push({ mode: m, person: p, gender: g, split: isSplit(m, p) });
      }
    }
    return out;
  }

  // ---- changing it ---------------------------------------------------------------
  // The tutorial may forbid a part; everything is allowed when it does not ask.
  const allowed = part => !hooks.gate || hooks.gate(part);

  function set(person, gender) {
    if (!allowed('sextant')) { SFX.locked(); return; }       // tutorial says not yet
    st.person = person;                                      // the sextant
    if (gender != null) st.gender = gender;                  // the half, when one was tapped
    SFX.click(1);                                            // the same click as a dial
    render();
    if (hooks.onSet) hooks.onSet('sextant');                 // let the tutorial check it
  }

  function setMode(mode) {
    if (mode === st.mode) return;                            // already there — nothing to do
    if (!allowed('switch')) { SFX.locked(); return; }        // tutorial says not yet
    st.mode = mode;                                          // flip the switch
    SFX.click(2);                                            // a heavier click for the switch
    render();
    if (hooks.onSet) hooks.onSet('switch');
  }
  // V walks the switch round its three settings: VÍCTIMA -> RECEPTOR -> REFLEXIVO.
  const toggleMode = () => { const ids = OBJECT_MODES.map(o => o.id); setMode(ids[(ids.indexOf(st.mode) + 1) % ids.length]); };

  // The cells in walking order for the keyboard: down the singular column,
  // then down the plural column, visiting both halves of a split sextant.
  function cells() {
    const out = [];
    for (const p of [0, 1, 2, 3, 4, 5]) {                    // me, te, (lo, la | le), nos, os, …
      if (isSplit(st.mode, p)) { out.push([p, 0]); out.push([p, 1]); }
      else out.push([p, 0]);
    }
    return out;
  }
  function step(delta) {
    const list = cells();                                    // every stop in this mode
    let i = list.findIndex(([p, g]) => p === st.person && (!isSplit(st.mode, p) || g === st.gender));
    if (i < 0) i = 0;                                        // a stale gender never strands it
    const [p, g] = list[(i + delta + list.length) % list.length]; // wrap round the ends
    set(p, g);
  }

  // ---- drawing -----------------------------------------------------------------------
  const VB = 240, CX = 120, CY = 120;                        // a square face, centred
  const R_HUB = 36, R_OUT = 112;                             // the hub, and the rim
  const f2 = n => n.toFixed(2);
  // Polar -> screen, 0deg up, clockwise — the same convention as the conjugator.
  const pc = (r, deg) => { const a = (deg - 90) * Math.PI / 180; return [CX + r * Math.cos(a), CY + r * Math.sin(a)]; };
  // A ring segment between two radii and two angles.
  function annulus(r1, r2, a1, a2) {
    const [x1, y1] = pc(r2, a1), [x2, y2] = pc(r2, a2);
    const [x3, y3] = pc(r1, a2), [x4, y4] = pc(r1, a1);
    const large = a2 - a1 > 180 ? 1 : 0;
    return `M ${f2(x1)} ${f2(y1)} A ${r2} ${r2} 0 ${large} 1 ${f2(x2)} ${f2(y2)} `
         + `L ${f2(x3)} ${f2(y3)} A ${r1} ${r1} 0 ${large} 0 ${f2(x4)} ${f2(y4)} Z`;
  }
  // The angle a sextant is centred on — IDENTICAL to the conjugator's person
  // circle: singular down the left (330/270/210), plural down the right (30/90/150).
  const centreOf = p => (PERSONS[p].col === 'S' ? 330 - PERSONS[p].row * 60 : 30 + PERSONS[p].row * 60);
  // In a split sextant, which half is which. Masculine always takes the half
  // that sits further LEFT on screen, feminine the half further right — the
  // same left/right as the adjective dial's gender circle.
  function halves(c) {
    const a = [c - 29, c], b = [c, c + 29];                  // the two 29deg halves
    const midX = h => pc(74, (h[0] + h[1]) / 2)[0];          // how far right each sits
    return midX(a) < midX(b) ? [a, b] : [b, a];              // [masc half, fem half]
  }

  const focusCls = part => (hooks.tutFocus === part ? ' tut-focus' : '');

  function svg() {
    let s = `<svg viewBox="0 0 ${VB} ${VB}" class="rx-svg${hooks.tutFocus ? ' tut-on' : ''}" role="group" aria-label="the receiver disc">`;
    // The rim: brass, like the conjugator's hardware.
    s += `<circle cx="${CX}" cy="${CY}" r="${R_OUT + 5}" class="rx-rim"/>`;
    s += `<g data-part="rsext" class="${focusCls('sextant')}">`;
    for (let p = 0; p < 6; p++) {
      const c = centreOf(p);
      if (isSplit(st.mode, p)) {
        // Two halves, masculine and feminine, each its own button.
        halves(c).forEach((h, g) => {
          const sel = p === st.person && g === st.gender;
          s += `<path d="${annulus(R_HUB, R_OUT, h[0] + (g ? 0.6 : 0), h[1] - (g ? 0 : 0.6))}" class="seg rx-seg rx-half${sel ? ' sel' : ''}" `
            + `style="--seg:${GENDERS[g].colour}" data-rx-p="${p}" data-rx-g="${g}"/>`;
          const [x, y] = pc(76, (h[0] + h[1]) / 2);          // label point in the middle of the half
          s += `<text x="${f2(x)}" y="${f2(y + 3)}" class="rx-pron small${sel ? ' sel' : ''}">${formAt(st.mode, p, g)}</text>`;
          s += `<text x="${f2(x)}" y="${f2(y + 15)}" class="rx-subj${sel ? ' sel' : ''}">${subjAt(p, g, true)}</text>`;
        });
        // A thin seam in the person's own colour keeps the pair reading as ONE
        // sextant — it is still "él", just split by gender.
        const [sx1, sy1] = pc(R_HUB, c), [sx2, sy2] = pc(R_OUT, c);
        s += `<line x1="${f2(sx1)}" y1="${f2(sy1)}" x2="${f2(sx2)}" y2="${f2(sy2)}" class="rx-seam" style="--seg:${PERSONS[p].colour}"/>`;
      } else {
        const sel = p === st.person;
        s += `<path d="${annulus(R_HUB, R_OUT, c - 29, c + 29)}" class="seg rx-seg${sel ? ' sel' : ''}" `
          + `style="--seg:${PERSONS[p].colour}" data-rx-p="${p}"/>`;
        const [x, y] = pc(75, c);                            // label point in the sextant's middle
        s += `<text x="${f2(x)}" y="${f2(y + 4)}" class="rx-pron${sel ? ' sel' : ''}">${formAt(st.mode, p, 0)}</text>`;
        s += `<text x="${f2(x)}" y="${f2(y + 17)}" class="rx-subj${sel ? ' sel' : ''}">${subjWhole(p)}</text>`;
      }
    }
    s += `</g>`;
    // The hub: shows the pronoun and ejects it. Its rim wears the chosen cell's
    // colour, exactly as the conjugator's hub wears the chosen person's.
    const form = formAt(st.mode, st.person, st.gender);
    const hue = colourAt(st.mode, st.person, st.gender);
    s += `<g data-part="rhub" class="hub hub-btn live${focusCls('hub')}" style="--hub:${hue}" role="button" aria-label="confirm ${form}">`;
    s += `<circle cx="${CX}" cy="${CY}" r="${R_HUB}" class="hub-plate"/>`;
    s += `<circle cx="${CX}" cy="${CY}" r="${R_HUB - 6}" class="hub-ring"/>`;
    s += `<text x="${CX}" y="${CY + 3}" class="hub-form" style="font-size:18px">${form}</text>`;
    s += `<text x="${CX}" y="${CY + 17}" class="hub-cap" style="font-size:6.2px">▼ CONFIRM</text>`;
    s += `</g></svg>`;
    return s;
  }

  function render() {
    if (!host) return;
    host.hidden = !st.shown;                                 // off entirely outside the unit
    if (!st.shown) return;
    host.classList.toggle('focused', st.focused);            // shows where the keyboard is
    host.dataset.mode = st.mode;                             // CSS tints the card by mode
    // Three settings do not fit three subtitles side by side in a narrow
    // column, so each button carries only its name, and the ACTIVE setting's
    // meaning is spelled out once, on its own line under the switch.
    const m = OBJECT_MODES.map(o =>
      `<button class="rx-mode${o.id === st.mode ? ' on' : ''}" data-rx-mode="${o.id}" title="${o.sub} (V)">`
      + `<span class="rx-mode-label">${o.label}</span></button>`).join('');
    const cur = OBJECT_MODES.find(o => o.id === st.mode);
    host.innerHTML =
      `<div class="gadget-name">receptor · <span class="rx-key">R</span></div>`
      + `<div class="rx-switch${focusCls('switch')}" role="radiogroup" aria-label="víctima, receptor or reflexivo">${m}</div>`
      + `<div class="rx-desc">${st.publicLabels ? ({ vic: 'direct object', rec: 'indirect object', ref: 'reflexive pronoun' })[st.mode] : cur ? cur.sub : ''}</div>` // Use scoped public role names while preserving the game caption.
      + `<div class="rx-disc">${svg()}</div>`;
  }

  // ---- wiring ------------------------------------------------------------------------
  function mount(el) {
    host = el;
    // One listener for the whole card; it survives every re-render.
    host.addEventListener('click', e => {
      const t = e.target;
      const modeBtn = t.closest('[data-rx-mode]');
      if (modeBtn) { setMode(modeBtn.dataset.rxMode); return; }         // the switch
      if (t.closest('[data-part="rhub"]')) {                            // the hub = eject
        if (!allowed('hub')) { SFX.locked(); return; }
        if (hooks.onEject) hooks.onEject();
        return;
      }
      const cell = t.closest('[data-rx-p]');
      if (cell) set(+cell.dataset.rxP, cell.dataset.rxG != null ? +cell.dataset.rxG : null); // a sextant or half
    });
    render();
  }

  return {
    configurePublic(variety) { st.publicLabels = true; st.variety = variety; render(); }, // Let the standalone page update labels without resetting the selected pronoun.
    mount, render, set, setMode, toggleMode, step, combosFor, formAt,
    show(v) { st.shown = !!v; if (!v) st.focused = false; render(); },
    // Back to the resting position a new sentence starts from.
    // `person` / `gender` let the lab start the disc on a cell that is NOT
    // the sentence's answer, so the answer is never already dialled in.
    reset(mode, person, gender) { st.mode = mode || 'vic'; st.person = person || 0; st.gender = gender || 0; render(); },
    get visible() { return st.shown; },
    get mode() { return st.mode; },
    get person() { return st.person; },
    get gender() { return st.gender; },
    get form() { return formAt(st.mode, st.person, st.gender); },
    get colour() { return colourAt(st.mode, st.person, st.gender); },
    get focused() { return st.focused; },
    // Focus only toggles a class. It must NOT redraw the disc: focus is set on
    // pointerdown, and redrawing between pointerdown and click swaps the
    // sextant under the finger for a new element, so the browser drops the
    // click — which made the first tap on the disc only "wake" it (NZ's bug,
    // 2026-09-21: "i have to click twice").
    set focused(v) { st.focused = !!v; if (host) host.classList.toggle('focused', st.focused); },
    set gate(fn) { hooks.gate = fn; },
    set onSet(fn) { hooks.onSet = fn; },
    set onEject(fn) { hooks.onEject = fn; },
    set tutFocus(v) { hooks.tutFocus = v; render(); },
  };
})();
