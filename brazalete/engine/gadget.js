/* =============================================================================
   GADGET LAB — THE GADGET
   The dial model and its SVG rendering. Owns nothing about sentences or slots;
   it takes a word in, lets the player set the dials, and hands a formed piece
   out.

   HOW A VERB IS WORKED (NZ, 2026-09-21)
     1. MOOD   — the outer ring
     2. TENSE  — the plate across the bottom (a timeline)
     3. PERSON — the inner circle, which now WRITES ALL SIX FORMS of the verb for
                 the chosen mood and tense, one per sextant
     4. CONFIRM — the centre hub shows the chosen form; tapping it sends the
                 word to the next open space in the sentence (called EJECT until
                 NZ renamed it, 2026-09-21; the code's names still say eject)

   THE SÍ / NO ANTENNAE (NZ, 2026-09-21): two small switches sticking out of
   the top right of the device. SÍ (affirmative) is on by default; flipping to
   NO makes the conjugation negative. The hub then reads "no" over the form,
   and when the word seats, the sentence's "no" space fills in by itself. For
   most verbs the form is unchanged — but a NEGATIVE COMMAND borrows the
   subjunctive (come -> no comas), so with IMP + NO the six sextants visibly
   change. That is the reason the switch belongs on the conjugator.

   Why all six forms are shown (a reversal of contract §18.5, NZ's decision):
   "we learn conjugations in groups of 6, not just one word isolated, and being
   exposed to the other pronoun conjugations as often as possible is
   important." The production now lives in steps 1 and 2 — the player has to
   know the mood and tense before the right paradigm appears at all — and step 3
   is reading that paradigm and choosing the right person out of it.

   The order is ENFORCED only inside the tutorial (see tutorial.js, which
   drives `gate`). Everywhere else each click just moves the keyboard focus to
   the next ring as a guide; the player may set the rings in any order.
   ============================================================================= */

const Gadget = (() => {
  // ---- state --------------------------------------------------------------
  const state = {
    publicForms: null, // Only the standalone explorer supplies regional forms; the game keeps its original behaviour.
    variety: 'tu', // Keep the existing game on Tú until the explorer explicitly chooses Vos.
    ending: 'ra', // Imperfect-subjunctive family shown: 'ra' (first-visit default) or 'se', flipped by the blue lever.
    leverWasOut: false, // Was the lever showing on the last drawing? Lets it unfold only when it first appears.
    word: null,           // { kind:'verb'|'adj', lemma } or null when the intake is empty
    // Remembered per kind — a real device keeps its knobs where you left them.
    // The tense dial starts at TENSE_HOME (presente), not index 0, because the
    // dial is a timeline and index 0 is pretérito, which beginner mode locks.
    dials: { verb: [0, 0, TENSE_HOME], adj: [0, 0] },
    active: 0,            // which dial the keyboard is driving
    liveReadout: true,    // debug toggle: show the form as you dial, or only on eject
    resetOnLoad: false,   // debug toggle: snap dials to the rest position when a word goes in
    // THE LENS — which moods and tenses this mission has unlocked. NZ,
    // 2026-09-21: "we don't need every tense available from Unit 0. they will
    // be added onto the options as they progress through the units, but also
    // there should be a sandbox mode (the practice dojo) where all the tenses
    // do work." So each mode hands the gadget a lens:
    //   { moods: ['ind'], tenses: ['pres'] }  — Unit 0 and the A1 missions so far
    //   null                                  — the dojo: every key live
    // Applied in dialSpecs() at read time, never by mutating MOODS/TENSES, so
    // switching modes can never strand a key locked. Locked keys stay VISIBLE
    // (dark), so the player can see what is still to come.
    lens: null,
    // The SÍ / NO antennae: false = affirmative (the default), true = negative.
    // Not a dial in `dials`, so no conjugation table or combo search had to
    // change shape; it is a switch that sits beside the three dials.
    neg: false,
    // Tutorial hooks, all null outside the tutorial:
    gate: null,           // (dialIndex) => bool — may this dial be touched right now?
    onSet: null,          // (dialIndex, stopIndex) => void — told after every change
    tutFocus: null,       // 'mood' | 'tense' | 'person' | 'hub' | 'gender' | 'number' — the part in the spotlight
    // THE CALIBRATION (NZ, 2026-10-04). The brazalete arrives with its six person sections
    // completely dark: a section only wakes when the device HEARS its Spanish. null = calibrated,
    // the normal look every other mode uses. Otherwise one number per person, in PERSONS order:
    //   0 = dark (never heard yet) · 1 = faint (pressed once, guided) · 2 = fully lit (built alone)
    calib: null,
    flash: new Set(),     // persons lit RIGHT NOW because the device just heard them (a few seconds each)
    cue: null,            // the guided round's pointer: { person } or { adj:[g,n] } — what to press next
    guard: null,          // (dialIndex, stopIndex) => bool — may this exact stop be chosen? (the guided round)
    // Which person the device itself moved to because it HEARD it (the calibration's light), or null.
    // Kept apart from a person the player chose, so the device can let go of it when the light fades
    // and Madison's own tap is what picks the person (NZ, 2026-11-12).
    remote: null,
  };
  const NEUTRAL = '#8fd3c8'; // the device's resting accent before any word is loaded
  // THE INFINITIVE RESTING STATE (NZ, combos contract §2, 2026-11-11). The person dial can point at
  // nobody: this value. A newly loaded verb starts here, so the centre reads the infinitive (comer)
  // until a sector is tapped, and tapping the chosen sector again comes back here.
  const NO_PERSON = -1;
  // The centre's colour while it shows the infinitive: plain, unlit bronze, because the infinitive
  // belongs to no person and so wears no person's colour.
  const BRONZE = '#d2aa64';
  let host = null;          // the DOM element the gadget renders into
  let onChange = null;      // lab.js subscribes so it can redraw the hand/readout

  // The order the dials are worked in, as dial indices. For a verb that is
  // mood (0) -> tense (2) -> person (1): the person index sits in the middle of
  // the stored array only because every conjugation table indexes by it, not
  // because it is worked second.
  const STEP_ORDER = { verb: [0, 2, 1], adj: [0, 1] };

  // ---- what the dials are for the current word ----------------------------
  // The clockwise loop the PERSONA stepping sweeps with the arrow keys:
  // yo -> nosotros -> vosotros -> ellos -> él -> tú -> back to yo.
  const PERSONA_LOOP = [0, 3, 4, 5, 2, 1];

  // Is this mood / tense shut by the current mission's lens?
  const moodLocked = id => !!(state.lens && state.lens.moods && !state.lens.moods.includes(id));
  // Which bottom buttons each mood allows (NZ, 2026-11-11). Indicative: all of them (null = no limit).
  // Subjunctive: present, imperfect, future. Imperative: present only. So the conditional, preterite,
  // gerund and participle can only be chosen in the indicative.
  const MOOD_TENSES = { ind: null, sub: ['pres', 'impf', 'fut'], imp: ['pres'] };
  // Is tense `t` shut by the mood the ring is on right now?
  const moodBlocks = (moodId, tenseId) => !!(MOOD_TENSES[moodId] && !MOOD_TENSES[moodId].includes(tenseId));
  const moodBlocksTense = t => { const m = MOODS[state.dials.verb[0]]; return !!m && moodBlocks(m.id, t.id); };
  const tenseLocked = t => !!(t.locked || (state.lens && state.lens.tenses && !state.lens.tenses.includes(t.id)) || moodBlocksTense(t));
  // After the mood ring turns, if the tense it was on isn't allowed in the new mood, the tense slides back
  // to PRESENTE (allowed in every mood), so the device never rests on a powered-down button.
  function settleTense() {
    if (!state.word || state.word.kind !== 'verb') return;
    if (tenseLocked(TENSES[state.dials.verb[2]])) state.dials.verb[2] = TENSE_HOME;
  }
  // Turning to the gerund or participle CLEARS the person (contract §2): those forms belong to nobody,
  // so no person stays picked behind the dark sectors. Coming back to a normal tense therefore starts
  // on the infinitive again, never on a person chosen before the detour.
  function settlePerson() {
    if (!state.word || state.word.kind !== 'verb') return;
    const t = TENSES[state.dials.verb[2]];
    if (t && t.nonFinite) { state.dials.verb[1] = NO_PERSON; state.remote = null; }
  }
  // Is the verb device resting on the infinitive right now? (A verb loaded, no person picked, and a
  // normal tense — on a gerund or participle the centre shows that form instead.)
  function resting(word, dials) {
    if (!word || word.kind !== 'verb' || dials[1] !== NO_PERSON) return false;
    const t = TENSES[dials[2]];
    return !!t && !t.nonFinite;
  }

  function dialSpecs() {
    if (!state.word) return [];
    if (state.word.kind === 'verb') return [
      { name: 'MODO',    stops: MOODS.map(m => ({ label: m.label, full: m.full, colour: m.colour, locked: moodLocked(m.id) })) },
      { name: 'PERSONA', stops: PERSONS.map(personAt).map(p => ({ label: p.short, full: p.full, col: p.col, row: p.row, colour: p.colour })) /* Use public regional labels only after explicit opt-in. */, stepOrder: PERSONA_LOOP },
      { name: 'TIEMPO',  stops: TENSES.map(t => ({ label: t.label, full: t.full, locked: tenseLocked(t), nonFinite: t.nonFinite })) },
    ];
    // Adjectives carry their colours through so the split dials can light
    // each half in its own hue: blue/pink for gender, cool/warm for number.
    return [
      { name: 'GÉNERO', stops: GENDERS.map(g => ({ label: g.short, full: g.full, colour: g.colour })) },
      { name: 'NÚMERO', stops: NUMBERS.map(n => ({ label: n.short, full: n.full, colour: n.colour })) },
    ];
  }

  function currentDials() { return state.word ? state.dials[state.word.kind] : []; }

  // The form the dials point at, or null if no such form exists (imperative
  // yo, subjunctive pretérito, a locked tense). Pure: lab.js also uses it to
  // search every combination for the diagnostic, and the renderer uses it to
  // write all six forms into the person circle.
  // `neg` is the NO antenna. It only changes the form in one place: a negative
  // command takes the present SUBJUNCTIVE (come -> no comas, coma -> no coma),
  // and like the affirmative command it has no yo form.
  function baseFormFor(word, dials, neg) { // Preserve the game's original lookup so existing sentence integration stays unchanged.
    if (!word) return null;
    if (word.kind === 'verb') {
      const v = VERBS[word.lemma];
      const mood = MOODS[dials[0]].id;
      const tense = TENSES[dials[2]];
      if (!tense || tense.locked) return null;
      // A tense the mood doesn't allow (e.g. subjunctive + conditional) has no form (NZ, 2026-11-11).
      if (moodBlocks(mood, tense.id)) return null;
      // Participio and gerundio do not change by person or mood: one form, held
      // by the hub alone (the sextants go dark — see deviceSvg).
      if (tense.nonFinite) return v.nf ? v.nf[tense.id] : null;
      // No person picked: the centre shows the infinitive itself (comer, llamarse). It exists in every
      // mood and tense the device allows, and with NO it simply reads "no comer".
      if (dials[1] === NO_PERSON) return word.lemma;
      if (neg && mood === 'imp' && tense.id === 'pres') return dials[1] === 0 ? null : v.sub.pres[dials[1]];
      const table = v[mood] && v[mood][tense.id];
      return table ? table[dials[1]] : null;
    }
    const a = ADJECTIVES[word.lemma];
    return a[GENDERS[dials[0]].id][NUMBERS[dials[1]].id];
  }

  function formFor(word, dials, neg) { // Extend the same lookup only when the public explorer opts in.
    let form = baseFormFor(word, dials, neg); // Keep every existing Tú table as the maintained source.
    // The infinitive is the same everywhere: no −se ending, no Vos form, and a reflexive verb already
    // carries its own pronoun (llamarse), so none of the adjustments below may touch it.
    if (resting(word, dials)) return form;
    // The −ra/−se lever (NZ, 2026-11-11; designed 2026-11-10): in the imperfect subjunctive, the −se family
    // replaces −ra in all six forms: comiera → comiese, comiéramos → comiésemos. Applies in the game too.
    if (form && state.ending === 'se' && word && word.kind === 'verb' && MOODS[dials[0]].id === 'sub' && TENSES[dials[2]].id === 'impf') form = toSe(form);
    if (!state.publicForms || !word || word.kind !== 'verb') return form; // Leave the game and adjective lookup unchanged.
    const v = VERBS[word.lemma], mood = MOODS[dials[0]].id, tense = TENSES[dials[2]]; // Read the selected grammatical combination.
    const regional = state.publicForms[word.lemma]; // Use an explicit checked entry rather than guessing an irregular form.
    if (state.variety === 'vos' && dials[1] === 1 && tense.id === 'pres' && regional) { // Change singular informal address only.
      if (mood === 'ind') form = regional.present; // Vos present differs from Tú for the supported verbs.
      if (mood === 'imp' && !neg) form = regional.command; // Affirmative Vos commands need their own form.
    } // Subjunctive and negative commands retain the agreed cantes/comas pattern.
    if (!form || !v.reflexive) return form; // Do not invent a form for an unavailable combination.
    if (tense.id === 'ger') return word.lemma === 'llamarse' ? 'llamándose' : 'levantándose'; // Attach the reflexive to these supported gerunds with the required accent.
    if (tense.nonFinite || (mood === 'imp' && !neg)) return form; // Participles stay bare; stored affirmative commands already include their pronoun.
    return OBJECT_PRONOUNS.ref[dials[1]] + ' ' + form; // Show complete finite reflexive phrases without asking visitors to repair a missing pronoun.
  } // Negation is still added once by the existing readout and confirmation presentation.

  // Swap a −ra imperfect-subjunctive ending for its −se twin: −ra→−se, −ras→−ses, −ramos→−semos, −rais→−seis, −ran→−sen.
  // Every stored imperfect-subjunctive form ends this way, irregulars included (fuera→fuese, tuviera→tuviese).
  const toSe = f => f.replace(/ra(s|mos|is|n)?$/, (m, end) => 'se' + (end || ''));
  // Is the lever showing right now? Only with a verb loaded on subjunctive + imperfect.
  const leverOut = () => !!(state.word && state.word.kind === 'verb' && MOODS[state.dials.verb[0]].id === 'sub' && TENSES[state.dials.verb[2]].id === 'impf');
  // Flip the lever: all six forms change family at once, and the lever then offers the other one.
  function toggleEnding() {
    if (!leverOut() || !allowed('ending')) return;
    state.ending = state.ending === 'se' ? 'ra' : 'se';
    SFX.click(2);
    render();
    if (state.onSet) state.onSet('ending', state.ending);
  }

  function personAt(p, i) { // Give public labels clear regional meanings without changing the stored person order.
    if (!state.publicForms) return p; // Preserve every original game label and tutorial expectation.
    if (i === 1 && state.variety === 'vos') return { ...p, short: 'vos', full: '2ª singular · vos (Argentina / Uruguay)' }; // Replace Tú only.
    return i === 4 ? { ...p, short: 'vosotros', full: '2ª plural · vosotros / vosotras (España)' } : p; // Never abbreviate the plural as vos in the public tool.
  } // Label changes do not mutate shared vocabulary data.

  // The colour an ejected piece carries into the sentence: its mood's colour
  // for a verb, its gender's colour for an adjective — so a finished sentence
  // still reads "this verb is indicative / this adjective is feminine".
  function colourFor(word, dials) {
    if (!word) return NEUTRAL;
    if (word.kind === 'verb') return MOODS[dials[0]].colour;
    if (word.kind === 'adj')  return GENDERS[dials[0]].colour;
    return NEUTRAL;
  }

  // ---- mutations ----------------------------------------------------------
  function load(word) {
    state.word = { kind: word.kind, lemma: word.lemma };
    if (state.resetOnLoad) state.dials[word.kind] = word.kind === 'verb' ? [0, NO_PERSON, TENSE_HOME] : [0, 0];
    // A newly loaded verb has NO person picked (contract §2): the centre reads the infinitive until a
    // sector is tapped. Mood and tense are still remembered from the last word, like real knobs.
    if (word.kind === 'verb') { state.dials.verb[1] = NO_PERSON; state.remote = null; }
    // Every verb arrives with the mood ring resting on INDICATIVO (NZ,
    // 2026-09-21: "the default mood should always be set to indicative"). It is
    // the mood of plain statements — most sentences a learner builds — so the
    // ring starts where it will usually need to be, and choosing the
    // subjunctive or imperative becomes a deliberate turn away from it.
    if (word.kind === 'verb') state.dials.verb[0] = MOODS.findIndex(m => m.id === 'ind');
    // …and on SÍ: every word arrives affirmative (NZ: "it defaults to having
    // the affirmative activated").
    state.neg = false;
    // Always start on the first step: mood for a verb, gender for an adjective.
    state.active = STEP_ORDER[word.kind][0];
    SFX.load();
    render();
  }

  function clear() {
    state.word = null;
    render();
  }

  // Scramble every dial to a random UNLOCKED stop at the start of a run, so the
  // device never boots already showing the first sentence's answer. Reads locks
  // through the same lens dialSpecs() uses, or beginner mode could randomise
  // onto a mood or tense it had just locked.
  function randomise() {
    const pick = stops => { let i; do { i = Math.floor(Math.random() * stops.length); } while (stops[i].locked); return i; };
    const tenseStops = TENSES.map(t => ({ locked: tenseLocked(t) }));
    // Mood is NOT randomised: it always rests on indicativo (see load()).
    // The person starts on nobody (the infinitive resting state), which already keeps the answer from
    // being pre-dialled; the tense is still scrambled.
    state.dials.verb = [MOODS.findIndex(m => m.id === 'ind'), NO_PERSON, pick(tenseStops)];
    state.remote = null;                         // nothing the device heard earlier carries over
    state.dials.adj = [Math.floor(Math.random() * GENDERS.length), Math.floor(Math.random() * NUMBERS.length)];
  }

  // May this dial be touched right now? Outside the tutorial, always.
  function allowed(dialIndex) {
    if (state.gate && !state.gate(dialIndex)) { SFX.locked(); return false; }
    return true;
  }

  // May this exact stop be chosen right now? Only the guided round sets a guard; everywhere else
  // the answer is always yes. A refusal is a dull click and nothing moves (NZ, 2026-10-04: a
  // wrong guided press "doesn't take"). The guard itself tells the twins, so they can redirect.
  function guarded(dialIndex, stopIndex) {
    if (state.guard && !state.guard(dialIndex, stopIndex)) { SFX.locked(); return false; }
    return true;
  }

  // ---- the calibration's lights (NZ, 2026-10-04) ----------------------------
  // light(i): the device has just HEARD person i's Spanish. That section powers up (with its
  // sound), stays lit for `ms`, then powers down (with its sound). The person dial also moves
  // there, so the hub shows the form being said, the way Cayetana drives it remotely.
  function light(i, ms = 3000) {
    if (!state.word || state.word.kind !== 'verb') return;
    // One voice at a time: if she moves on before the last section has powered down, it powers
    // down now, so two lit sections never read as two people being spoken about at once.
    dim();
    state.flash.add(i);                         // lit now, whatever its calibration level
    state.dials.verb[1] = i;                    // the remote hand turns the dial to it
    state.remote = i;                           // remembered as the DEVICE's choice, not hers
    const mine = ++lightCount;                  // this lighting's own ticket
    SFX.powerUp();
    render();
    setTimeout(() => {                          // a few seconds later, it goes back down
      if (mine !== lightCount) return;          // a newer light (or a dim) already took over
      if (!state.flash.has(i)) return;
      state.flash.delete(i);
      releaseRemote();                          // and the centre goes back to the infinitive
      SFX.powerDown();
      render();
    }, ms);
  }
  let lightCount = 0;                           // tickets for light(), so an old timer never acts late

  // When a heard section powers down, the device lets go of that person and rests on the infinitive
  // again (NZ, 2026-11-12), so Madison's own tap is what picks the person. If she has already tapped
  // a person herself, `remote` is null and her choice stays exactly where she put it.
  // Returns true when it actually moved the dial, so callers know whether a redraw is needed.
  function releaseRemote() {
    if (state.remote == null) return false;
    const moved = !!(state.word && state.word.kind === 'verb' && state.dials.verb[1] === state.remote);
    if (moved) state.dials.verb[1] = NO_PERSON;
    state.remote = null;
    return moved;
  }

  // Power down every section the device is still lighting from what it heard, with one
  // power-down sound. Used when a new line lights another section, and between ladder rungs.
  function dim() {
    lightCount++;                               // any pending power-down timer is now stale
    const released = releaseRemote();           // a heard person never outlives its light
    if (!state.flash.size) { if (released) render(); return; } // redraw only if a person was let go
    state.flash.clear();
    SFX.powerDown();
    render();
  }

  // setCalib(i, level): raise one section to faint (1) or fully lit (2). Never lowers it:
  // a section she has built alone stays fully lit even if a later guided press touches it.
  function setCalib(i, level) {
    if (!state.calib) return;
    if (state.calib[i] >= level) return;
    state.calib[i] = level;
    SFX.powerUp();
    // It flares bright for a moment as it powers up, then settles to its new level. Silent on
    // the way down: settling is not powering off.
    state.flash.add(i);
    render();
    setTimeout(() => { state.flash.delete(i); render(); }, 1100);
  }

  // Turn one dial by `delta` stops (arrow keys, mouse wheel). Wraps around.
  // Locked stops are skipped with a dull sound: you can SEE them, not LAND on
  // them. Does NOT move the focus on — a keyboard player turning a ring one
  // notch at a time must stay on that ring.
  function step(dialIndex, delta) {
    if (!state.word) return;
    const specs = dialSpecs();
    if (dialIndex < 0 || dialIndex >= specs.length) return;
    if (!allowed(dialIndex)) return;
    const spec = specs[dialIndex];
    const dials = currentDials();
    // PERSONA steps around its visual loop rather than raw array order. On a verb that loop also has
    // a "no person" stop between tú and yo (NZ, 2026-11-12), so the arrow keys can reach the infinitive.
    const isPerson = state.word.kind === 'verb' && dialIndex === 1;
    const base = spec.stepOrder || Array.from({ length: spec.stops.length }, (_, i) => i);
    const order = isPerson ? [NO_PERSON, ...base] : base;
    const n = order.length;                              // how many stops the loop has, "no person" included
    const lockedAt = k => k !== NO_PERSON && !!spec.stops[k].locked; // the "no person" stop is never locked
    const pos = Math.max(0, order.indexOf(dials[dialIndex]));
    let p = (pos + delta + n) % n;
    let guard = 0;
    while (lockedAt(order[p]) && guard++ < n) { SFX.locked(); p = (p + delta + n) % n; }
    // The guided round may refuse this exact stop: the press doesn't take, with a dull click.
    if (!guarded(dialIndex, order[p])) return;
    dials[dialIndex] = order[p];
    if (isPerson) state.remote = null;    // a person she turned to herself is hers, not the device's
    if (dialIndex === 0) settleTense();   // A new mood may not allow the current tense (see MOOD_TENSES).
    if (dialIndex === 2) settlePerson();  // A gerund or participle clears the person (contract §2).
    state.active = dialIndex;
    SFX.click(dialIndex);
    render();
    if (state.onSet) state.onSet(dialIndex, dials[dialIndex]);
  }

  // Jump straight to a stop (a click or tap). After a successful set the
  // keyboard focus moves on to the NEXT step in the working order — a guide,
  // not a rule: any ring can still be clicked at any time outside the tutorial.
  function set(dialIndex, stopIndex) {
    if (!state.word) return;
    const specs = dialSpecs();
    if (!specs[dialIndex]) return;
    if (!allowed(dialIndex)) return;
    // The verb's person dial also accepts NO_PERSON (the infinitive), which has no stop of its own.
    const isPerson = state.word.kind === 'verb' && dialIndex === 1;
    const stop = specs[dialIndex].stops[stopIndex];
    if (!stop && !(isPerson && stopIndex === NO_PERSON)) return;   // not a real stop: ignore it
    if (stop && stop.locked) { SFX.locked(); state.active = dialIndex; render(); return; }
    // The guided round may refuse this exact stop (a wrong person): it doesn't take.
    if (!guarded(dialIndex, stopIndex)) return;
    const dials = currentDials();
    if (dials[dialIndex] !== stopIndex) SFX.click(dialIndex);
    dials[dialIndex] = stopIndex;
    if (isPerson) state.remote = null;    // a person set on purpose is never let go by a fading light
    if (dialIndex === 0) settleTense();   // A new mood may not allow the current tense (see MOOD_TENSES).
    if (dialIndex === 2) settlePerson();  // A gerund or participle clears the person (contract §2).
    const order = STEP_ORDER[state.word.kind];
    const at = order.indexOf(dialIndex);
    state.active = at >= 0 && at < order.length - 1 ? order[at + 1] : dialIndex;
    render();
    if (state.onSet) state.onSet(dialIndex, stopIndex);
  }

  // A tap or click on a person sector (contract §2). Different from set(): tapping the sector that is
  // already chosen DESELECTS it, and the centre returns to the infinitive. set() stays a plain
  // "turn to this stop", because walkthroughs and the guided rounds call it to place the dial.
  function tapPerson(i) {
    if (!state.word || state.word.kind !== 'verb') return set(1, i);  // adjectives: an ordinary set
    const t = TENSES[state.dials.verb[2]];
    // On a gerund or participle the sectors are dark: there is nobody to pick, so the tap doesn't take.
    if (t && t.nonFinite) { SFX.locked(); return; }
    // Already this person, and chosen by her (not lit there by the device): the tap lets go of it.
    if (state.dials.verb[1] === i && state.remote !== i) return clearPerson();
    set(1, i);                                                         // otherwise pick this person
  }

  // Back to the infinitive: no person chosen. Used by a second tap on the chosen sector and by Esc.
  function clearPerson() {
    if (!state.word || state.word.kind !== 'verb') return;
    if (state.dials.verb[1] === NO_PERSON) return;                     // already resting: nothing to do
    if (!allowed(1)) return;                                           // a tutorial may hold the ring still
    if (!guarded(1, NO_PERSON)) return;                                // a guided round may refuse it
    state.dials.verb[1] = NO_PERSON;
    state.remote = null;
    state.active = 1;                                                  // the keyboard stays on the person ring
    SFX.click(1);
    render();
    if (state.onSet) state.onSet(1, NO_PERSON);                        // walkthroughs hear the change too
  }

  function setActive(i) {
    const n = dialSpecs().length;
    if (!n) return;
    state.active = (i + n) % n;
    render();
  }

  // Move the keyboard focus one step along the WORKING order (up/down arrows),
  // not the storage order — so down from mood lands on tense, not person.
  function cycleActive(delta) {
    if (!state.word) return;
    const order = STEP_ORDER[state.word.kind];
    const pos = Math.max(0, order.indexOf(state.active));
    state.active = order[(pos + delta + order.length) % order.length];
    render();
  }

  // Flip the SÍ / NO antennae. The tutorial can hold them still like any dial.
  function setNeg(v) {
    if (!state.word || state.word.kind !== 'verb') return;
    if (!allowed('polarity')) return;
    if (state.neg === !!v) return;
    state.neg = !!v;
    SFX.click(2);
    render();
    if (state.onSet) state.onSet('polarity', state.neg ? 1 : 0);
  }

  function toggleVariety() { // Change regional address only through the physical public switch.
    if (!state.publicForms || !allowed('variety')) return; // Keep game defaults and tutorial restrictions intact.
    state.variety = state.variety === 'tu' ? 'vos' : 'tu'; // Change singular address without moving any other control.
    SFX.click(2); render(); // Show the new label, paradigm and next available switch action.
    if (state.onSet) state.onSet('variety', state.variety); // Let the public shell update the disc labels and tutorial.
  } // Plural vosotros remains an independent person sector.

  // Hand the formed piece out. Returns null when the intake is empty or the
  // dials point at a form that does not exist — the machine cannot eject
  // "nothing", so the hub simply does not fire.
  function eject() {
    if (!state.word) return null;
    const dials = currentDials().slice();
    const neg = state.word.kind === 'verb' && state.neg;
    const text = formFor(state.word, dials, neg);
    if (!text) { SFX.reject(); render(); return null; }
    SFX.eject();
    // A confirmed infinitive carries the device's plain bronze, not a mood colour: it is not
    // indicative, subjunctive or a command, just the verb's name.
    const colour = resting(state.word, dials) ? BRONZE : colourFor(state.word, dials);
    return { kind: state.word.kind, lemma: state.word.lemma, text, dials, neg, colour };
  }

  // ---- geometry helpers ---------------------------------------------------
  const f2 = n => n.toFixed(2);
  // Polar -> cartesian around any centre. 0deg is up, angles grow clockwise.
  function pcAt(cx, cy, r, deg) {
    const a = (deg - 90) * Math.PI / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  }

  // Type size that keeps a word inside the space it has to sit in. Conjugated
  // forms run from 2 letters (sé) to 13 (necesitasteis), so one fixed size
  // either shouts the short ones or spills the long ones.
  function fitSize(text, big, small, maxChars) {
    const n = (text || '').length;
    if (n <= Math.round(maxChars * 0.55)) return big;
    if (n >= maxChars) return small;
    return f2(big - (big - small) * (n - maxChars * 0.55) / (maxChars * 0.45));
  }

  // A luminous human pictogram. One figure means singular, two plural — the
  // number of bodies carries grammatical number without a written label.
  function personGlyph(x, y, s, count) {
    const one = ox => `<circle cx="${f2(x + ox)}" cy="${f2(y - 7 * s)}" r="${f2(4.2 * s)}"/>`
      + `<path d="M ${f2(x + ox - 5.5 * s)} ${f2(y + 9 * s)} C ${f2(x + ox - 5.5 * s)} ${f2(y - 1.5 * s)} `
      + `${f2(x + ox + 5.5 * s)} ${f2(y - 1.5 * s)} ${f2(x + ox + 5.5 * s)} ${f2(y + 9 * s)} Z"/>`;
    return count === 1 ? one(0) : one(-7 * s) + one(7 * s);
  }

  // The class a part of the device gets while the tutorial spotlights it.
  const focusCls = part => (state.tutFocus === part ? ' tut-focus' : '');

  // ---- the VERB device ----------------------------------------------------
  // One nested face, read outward (gauntlet concept art, 2026-09-20):
  //     outer ring   = MOOD      (3 sections, rotates under a fixed marker)
  //     inner circle = PERSON    (6 sextants, each showing its conjugated form)
  //     lower plate  = TENSE     (7 round keys, a left-to-right timeline)
  //     centre hub   = the EJECT button, showing the chosen form
  const VB_W = 440, VB_H = 462;
  const CX = 220, CY = 195;
  const R_MOOD_OUT = 190, R_MOOD_IN = 152;
  const R_PERSON_OUT = 146, R_HUB = 48;
  // The tense plate is mounted OVER the lower face of the disc, not orbiting
  // outside it, and carries round keys rather than pie slices.
  const R_TENSE_IN = 148, R_TENSE_OUT = 205;
  const R_TENSE_BTN = 176, BTN_R = 26, BTN_HIT = 31;
  // Past end = the LARGER angle (down-left); future = the smaller (down-right).
  const TENSE_PAST = 242, TENSE_FUT = 118;
  // Mood sections sit at fixed base angles; indicativo rests at 12 o'clock.
  const MOOD_BASE = [0, -120, 120];       // index order matches MOODS: ind, sub, imp

  const pc = (r, deg) => pcAt(CX, CY, r, deg);

  // A ring segment: the band between two radii, swept between two angles.
  function annulus(r1, r2, a1, a2) {
    const [x1, y1] = pc(r2, a1), [x2, y2] = pc(r2, a2);
    const [x3, y3] = pc(r1, a2), [x4, y4] = pc(r1, a1);
    const large = ((a2 - a1) % 360 + 360) % 360 > 180 ? 1 : 0;
    return `M ${f2(x1)} ${f2(y1)} A ${r2} ${r2} 0 ${large} 1 ${f2(x2)} ${f2(y2)} `
         + `L ${f2(x3)} ${f2(y3)} A ${r1} ${r1} 0 ${large} 0 ${f2(x4)} ${f2(y4)} Z`;
  }

  // `off` draws the identical hardware with nothing selected and nothing
  // clickable — the device switched off, so an empty gadget is still visibly a
  // machine rather than blank space.
  function deviceSvg(specs, dials, accent, off) {
    const moodSel = off ? -1 : dials[0], personSel = off ? -1 : dials[1], tenseSel = off ? -1 : dials[2];
    const moodSpec = specs[0], personSpec = specs[1], tenseSpec = specs[2];
    const word = off ? null : state.word;
    let s = `<svg viewBox="${state.publicForms ? -36 : 0} 0 ${state.publicForms ? VB_W + 36 : VB_W} ${VB_H}" class="device-svg${state.tutFocus && !off ? ' tut-on' : ''}" role="group" aria-label="the gadget">`; // Reserve room on the public device for the left-border regional switch.

    // --- outer ring: MOOD -------------------------------------------------
    // The ring rotates so the chosen mood lands under the fixed marker at
    // 12 o'clock, like a combination lock. Labels counter-rotate to stay upright.
    const spin = off ? 0 : -MOOD_BASE[moodSel];
    s += `<g data-part="mood" class="${focusCls('mood')}">`;
    s += `<g class="ring-mood${!off && state.active === 0 ? ' active' : ''}" transform="rotate(${spin} ${CX} ${CY})">`;
    moodSpec.stops.forEach((st, i) => {
      const a = MOOD_BASE[i], a1 = a - 58, a2 = a + 58;   // 4deg of moulding seam between sections
      const sel = i === moodSel;
      s += `<path d="${annulus(R_MOOD_IN, R_MOOD_OUT, a1, a2)}" class="seg seg-mood${sel ? ' sel' : ''}${st.locked ? ' locked' : ''}" `
        + `style="--seg:${st.colour}"${off ? '' : ` data-dial="0" data-stop="${i}"`}/>`;
      // The tense plate covers the bottom, so each label slides along its OWN
      // section away from the bottom instead of sitting where the plate eats it.
      const post = ((a + spin) % 360 + 360) % 360;
      const labelPost = post > 90 && post < 180 ? 98 : post > 180 && post < 270 ? 262 : post;
      const [lx, ly] = pc((R_MOOD_IN + R_MOOD_OUT) / 2, labelPost - spin);
      s += `<g transform="rotate(${-spin} ${f2(lx)} ${f2(ly)})">`
        + `<text x="${f2(lx)}" y="${f2(ly + 4)}" class="seg-label${sel ? ' sel' : ''}${st.locked ? ' locked' : ''}">${st.label}</text></g>`;
    });
    s += `</g>`;
    const [mx, my] = pc(R_MOOD_OUT + 3, 0);
    s += `<path d="M ${f2(mx - 9)} ${f2(my - 12)} L ${f2(mx + 9)} ${f2(my - 12)} L ${f2(mx)} ${f2(my + 4)} Z" class="mood-marker"/>`;
    s += `</g>`;

    // --- inner circle: PERSON, with all six forms written in -------------
    // Six 60deg sextants; the vertical seam makes the left three the singular
    // column and the right three the plural column. Each sextant carries, from
    // the hub outward: its pictogram, the verb FORM for the current mood and
    // tense, and the pronoun. The form is the largest thing in it on purpose —
    // the paradigm is what the player is meant to be reading.
    // A non-finite form (participio, gerundio) has no person: the sextants go
    // dark and the hub alone carries the answer (contract §18.4).
    const dormant = !off && !!(tenseSpec.stops[tenseSel] && tenseSpec.stops[tenseSel].nonFinite);
    s += `<g data-part="person" class="${focusCls('person')}">`;
    s += `<g class="ring-person${!off && state.active === 1 ? ' active' : ''}${dormant ? ' dormant' : ''}">`;
    personSpec.stops.forEach((st, i) => {
      const c = st.col === 'S' ? 330 - st.row * 60 : 30 + st.row * 60;
      // The calibration's light on this section (NZ, 2026-10-04). Outside the calibration
      // (state.calib null) every section is simply on, as it always was.
      // Both read even while the device is idle between sentences: that is exactly when a
      // section reaches full in the alone round (the verb has just left the device).
      const lit = state.flash.has(i);                                 // heard just now: fully bright
      const level = !state.calib ? 2 : state.calib[i];                // 0 dark · 1 faint · 2 full
      const dark = level === 0 && !lit;                               // never heard: completely dark
      // The guided round's pointer: this section pulses until it is the one selected.
      const cued = !off && state.cue && state.cue.person === i && dials[1] !== i;
      // A dark section cannot look selected: there is nothing lit in it to select. Nor can any section while a
      // gerund or participle is chosen (NZ, 2026-11-11): those forms belong to no person, so none may look picked.
      const sel = i === personSel && !dark && !dormant;
      // Each section's pieces sit in one group, so a single class can darken, dim or light the lot.
      s += `<g class="sext cal-${level}${lit ? ' flash' : ''}${cued ? ' cue' : ''}" style="--seg:${st.colour}">`;
      s += `<path d="${annulus(R_HUB, R_PERSON_OUT, c - 29, c + 29)}" class="seg seg-person${sel ? ' sel' : ''}" `
        + `style="--seg:${st.colour}"${off ? '' : ` data-dial="1" data-stop="${i}"`}/>`;
      // A vertical stack centred in the sextant: figure, then the PRONOUN, then
      // its conjugated form directly underneath (NZ, 2026-09-21: "the pronouns
      // like yo, tú, él need to be above the conjugated verbs"). So each
      // sextant reads top-down as Spanish is spoken — "yo / necesito" — and the
      // six of them read as the paradigm table a learner would write out.
      // Stacked by screen axis, not radially, so it reads the same in all rows.
      const [fx, fy] = pc(R_HUB + 52, c);
      s += `<g class="glyph${sel ? ' sel' : ''}">` + personGlyph(fx, fy - 24, 0.9, st.col === 'S' ? 1 : 2) + `</g>`;
      s += `<text x="${f2(fx)}" y="${f2(fy + 1)}" class="seg-sub${sel ? ' sel' : ''}">${st.label}</text>`;
      if (word && !dormant) {
        const form = formFor(word, [dials[0], i, dials[2]], state.neg);
        s += `<text x="${f2(fx)}" y="${f2(fy + 19)}" class="seg-form${sel ? ' sel' : ''}${form ? '' : ' none'}" `
          + `style="font-size:${fitSize(form, 14, 9.5, 13)}px">${form || '—'}</text>`;
      }
      s += `</g>`;                                                    // end of this section's group
    });
    s += `</g></g>`;

    // --- the hub: the EJECT button ----------------------------------------
    // Shows the form the dials point at; tapping it ejects that word into the
    // next open space in the sentence. With no valid form (imperativo yo, a
    // locked tense) it falls back to the Solsello and cannot be pressed. For
    // a non-finite form it is also the ONLY answer — the six sextants have
    // nothing to offer (contract §18.4), which the takeover styling marks.
    const hubForm = word ? formFor(word, dials, state.neg) : null;
    const nonFinite = !!(tenseSpec.stops[tenseSel] && tenseSpec.stops[tenseSel].nonFinite);
    // The hub's rim takes the colour of the PERSON it is about to eject (NZ,
    // 2026-09-21: "the border of the eject circle should be the color of the
    // person, not the mood"). The mood already announces itself from the
    // outer ring; the hub sits inside the person circle and hands out one
    // person's form, so it wears that person's colour — the sextant you picked
    // and the button you press next visibly match.
    // Exception (NZ, 2026-11-11): a gerund or participle wears the INDICATIVE yellow instead, because the form
    // stands alone, tied to no person, so no person's colour should appear to shape it.
    // The infinitive resting state (contract §2): no person chosen, so the centre is neutral, unlit
    // bronze with white lettering. It can still be confirmed; it just doesn't glow like a chosen form.
    const atRest = !off && resting(word, dials);
    const hubHue = nonFinite ? MOODS.find(m => m.id === 'ind').colour
      : atRest ? BRONZE
      : personSel >= 0 && personSpec.stops[personSel] ? personSpec.stops[personSel].colour : null;
    // The guided round points at the hub once the right person is chosen: the next press is CONFIRM.
    const hubCued = !off && hubForm && state.cue && state.cue.person != null && dials[1] === state.cue.person;
    s += `<g data-part="hub" class="hub hub-btn${hubForm ? ' live' : ''}${nonFinite ? ' takeover' : ''}${atRest ? ' resting' : ''}${hubCued ? ' cue' : ''}${focusCls('hub')}" `
      + `${hubHue ? `style="--hub:${hubHue}" ` : ''}`
      + `${hubForm ? 'role="button" aria-label="confirm ' + (state.neg ? 'no ' : '') + hubForm + '"' : ''}>`;
    s += `<circle cx="${CX}" cy="${CY}" r="${R_HUB}" class="hub-plate"/>`;
    s += `<circle cx="${CX}" cy="${CY}" r="${R_HUB - 7}" class="hub-ring"/>`;
    if (hubForm) {
      // Negative: a small red "no" rides above the form, so the hub reads the
      // way the words will land in the sentence.
      if (state.neg) s += `<text x="${CX}" y="${CY - 15}" class="hub-neg">no</text>`;
      s += `<text x="${CX}" y="${CY + 2}" class="hub-form" style="font-size:${fitSize(hubForm, 15, 9, 13)}px">${hubForm}</text>`;
      s += `<text x="${CX}" y="${CY + 19}" class="hub-cap">▼ CONFIRM</text>`;
    } else {
      for (let i = 0; i < 12; i++) {
        const [ax, ay] = pc(R_HUB - 13, i * 30), [bx, by] = pc(R_HUB - 20, i * 30);
        s += `<line x1="${f2(ax)}" y1="${f2(ay)}" x2="${f2(bx)}" y2="${f2(by)}" class="hub-ray"/>`;
      }
      s += `<circle cx="${CX}" cy="${CY}" r="10" class="hub-core"/>`;
    }
    s += `</g>`;

    // --- lower plate: TENSE, as a timeline --------------------------------
    const stepA = (TENSE_PAST - TENSE_FUT) / (tenseSpec.stops.length - 1);
    s += `<g data-part="tense" class="${focusCls('tense')}">`;
    s += `<g class="ring-tense${!off && state.active === 2 ? ' active' : ''}">`;
    s += `<path d="${annulus(R_TENSE_IN, R_TENSE_OUT, TENSE_FUT - 2, TENSE_PAST + 2)}" class="tense-bed"/>`;
    s += `<path d="${annulus(R_TENSE_BTN + BTN_R + 3, R_TENSE_BTN + BTN_R + 5, TENSE_FUT - 1, TENSE_PAST + 1)}" class="tense-rail"/>`;
    tenseSpec.stops.forEach((st, i) => {
      const a = TENSE_PAST - i * stepA;   // index 0 = pretérito = the past end
      const sel = i === tenseSel;
      const [bx, by] = pc(R_TENSE_BTN, a);
      const hit = off ? '' : ` data-dial="2" data-stop="${i}"`;
      s += `<circle cx="${f2(bx)}" cy="${f2(by)}" r="${BTN_R}" class="seg seg-tense${sel ? ' sel' : ''}${st.locked ? ' locked' : ''}"${hit}/>`;
      s += `<circle cx="${f2(bx)}" cy="${f2(by)}" r="${BTN_HIT}" class="key-hit"${hit}/>`;
      s += `<text x="${f2(bx)}" y="${f2(by + 3)}" class="tense-label${sel ? ' sel' : ''}${st.locked ? ' locked' : ''}">${st.label}</text>`;
    });
    const pa = TENSE_PAST - (off ? TENSE_HOME : tenseSel) * stepA;
    const [ptx, pty] = pc(R_TENSE_BTN - BTN_R - 2, pa);
    const [p1x, p1y] = pc(R_TENSE_BTN - BTN_R - 13, pa - 3.2), [p2x, p2y] = pc(R_TENSE_BTN - BTN_R - 13, pa + 3.2);
    s += `<path d="M ${f2(ptx)} ${f2(pty)} L ${f2(p1x)} ${f2(p1y)} L ${f2(p2x)} ${f2(p2y)} Z" class="tense-pointer"/>`;
    s += `</g>`;
    s += `<text x="46" y="${VB_H - 10}" class="axis-cap past">&#9664; PASADO</text>`;
    s += `<text x="${VB_W - 46}" y="${VB_H - 10}" class="axis-cap future">FUTURO &#9654;</text>`;
    s += `</g>`;

    // --- the SÍ / NO antennae, top right ----------------------------------
    // Two stalks rising off the rim with a round switch on each tip. Fixed
    // hardware: they do not turn with the mood ring. The lit one is the
    // polarity the word will come out in; SÍ is lit whenever a word loads.
    // Website (2026-11-22, NZ): the two antennae are replaced by the POLARITY WHEEL from the Brazalete visual-upgrade sessions: one round dial on the
    // upper-right rim, in a fixed collar etched with + (top) and − (right). Its emerald face carries an ivory line from the centre; tapping it turns the
    // face a quarter-turn to the right and shifts it to red for negative. It still drives the same negation (state.neg) as the antennae did.
    {
      const [kx, ky] = pc(POL_AT.r, POL_AT.a), [bx, by] = pc(R_MOOD_OUT - 2, POL_AT.a), [mx, my] = pc(POL_AT.r - POL_COLLAR, POL_AT.a);   // the wheel's centre, and where its mount meets the rim
      const neg = !off && state.neg, turned = !off && state.polWas !== undefined && state.polWas !== state.neg;   // turned = it just changed, so it animates this once
      state.polWas = off ? state.polWas : state.neg;
      const hit = off ? '' : ` data-neg="${state.neg ? 0 : 1}" role="button" aria-pressed="${state.neg}" aria-label="Negative wheel: ${state.neg ? 'negative (no). Tap for affirmative' : 'affirmative (sí). Tap for negative'}"`;
      s += `<g data-part="polarity" class="polwheel${neg ? ' neg' : ''}${turned ? ' turned' : ''}${off ? ' dormant' : ''}${focusCls('polarity')}"${hit}>`;
      s += `<line x1="${f2(bx)}" y1="${f2(by)}" x2="${f2(mx)}" y2="${f2(my)}" class="pol-mount"/>`;                     // the short arm joining the collar to the rim
      s += `<circle cx="${f2(kx)}" cy="${f2(ky)}" r="${POL_COLLAR + 6}" class="pol-hit"/>`;                                  // a generous tap area
      s += `<circle cx="${f2(kx)}" cy="${f2(ky)}" r="${POL_COLLAR}" class="pol-collar"/>`;                                   // the fixed collar
      s += `<text x="${f2(kx)}" y="${f2(ky - POL_COLLAR + 7.5)}" class="pol-mark">+</text>`;                                 // the + etched at the top
      s += `<text x="${f2(kx + POL_COLLAR - 5)}" y="${f2(ky + 3)}" class="pol-mark">−</text>`;                               // the − etched on the right
      s += `<circle cx="${f2(kx)}" cy="${f2(ky)}" r="${POL_FACE + 1.5}" class="pol-seat"/>`;                                 // the dark seat the face turns in
      s += `<g class="pol-face" style="transform-origin:${f2(kx)}px ${f2(ky)}px">`;                                         // the turning face
      s += `<circle cx="${f2(kx)}" cy="${f2(ky)}" r="${POL_FACE}" class="pol-disc"/>`;
      s += `<line x1="${f2(kx)}" y1="${f2(ky)}" x2="${f2(kx)}" y2="${f2(ky - POL_FACE + 3)}" class="pol-line"/>`;             // the inlaid line, from the centre outwards
      s += `<circle cx="${f2(kx)}" cy="${f2(ky)}" r="2.6" class="pol-hub"/></g></g>`;
    }

    if (state.publicForms) s += `<line x1="0" y1="${CY}" x2="${CX - R_MOOD_OUT + 3}" y2="${CY}" class="variety-stalk"/>`; // Mount the regional switch on the rim at the singular-you row.
    s += `</svg>`;
    return s;
  }
  // Where the antennae stand: angles off 12 o'clock (clockwise), how far out
  // the knob sits, and its radius. SÍ nearer the top, NO below it.
  const ANT_TIP = 222, ANT_R = 13;
  // The polarity wheel (website, 2026-11-22): 45° off 12 o'clock, just outside the mood ring; collar and face radii in drawing units.
  const POL_AT = { a: 45, r: R_MOOD_OUT + 30 }, POL_COLLAR = 24, POL_FACE = 16;
  const ANTENNAE = [
    { a: 36, neg: false, label: 'SÍ', colour: '#5ee08a' },
    { a: 57, neg: true,  label: 'NO', colour: '#ff5a6e' },
  ];

  // ---- the ADJECTIVE device -------------------------------------------------
  // Two circles, each split straight down the middle (NZ, 2026-09-21):
  //     GÉNERO: masculino on the left (blue) · femenino on the right (pink)
  //     NÚMERO: singular on the left (cool)  · plural on the right (warm)
  // Left-singular / right-plural matches the person circle exactly, so the
  // player's hands learn one rule for number whatever kind of word it is. The
  // hub bridges the two circles and is the eject button, same as on a verb.
  const A_W = 460, A_H = 262;
  const A_R = 95, A_Y = 122;
  const A_G = [110, A_Y], A_N = [350, A_Y], A_HUB = [230, A_Y], A_HUB_R = 40;

  // Half of a circle: the left half sweeps anticlockwise from the top, the
  // right half clockwise, both closed along the vertical seam.
  function halfPath(cx, cy, r, side) {
    return `M ${cx} ${cy - r} A ${r} ${r} 0 0 ${side === 'L' ? 0 : 1} ${cx} ${cy + r} Z`;
  }

  function adjDeviceSvg(specs, dials) {
    const [gSpec, nSpec] = specs;
    const word = state.word;
    let s = `<svg viewBox="0 0 ${A_W} ${A_H}" class="device-svg adj-svg${state.tutFocus ? ' tut-on' : ''}" role="group" aria-label="the gadget">`;

    // One split circle. `dial` is 0 (gender) or 1 (number); each half is a stop.
    const circle = (part, [cx, cy], spec, dialIndex, title, draw) => {
      let g = `<g data-part="${part}" class="adj-circle${state.active === dialIndex ? ' active' : ''}${focusCls(part)}">`;
      spec.stops.forEach((st, i) => {
        const side = i === 0 ? 'L' : 'R';
        const sel = i === dials[dialIndex];
        g += `<path d="${halfPath(cx, cy, A_R, side)}" class="seg adj-half${sel ? ' sel' : ''}" style="--seg:${st.colour}" `
          + `data-dial="${dialIndex}" data-stop="${i}"/>`;
        const hx = cx + (side === 'L' ? -1 : 1) * A_R * 0.47;
        g += draw(i, hx, cy, sel, st);
      });
      g += `<line x1="${cx}" y1="${cy - A_R}" x2="${cx}" y2="${cy + A_R}" class="adj-seam"/>`;
      g += `<circle cx="${cx}" cy="${cy}" r="${A_R}" class="adj-rim"/>`;
      g += `<text x="${cx}" y="${cy + A_R + 26}" class="adj-title">${title}</text>`;
      return g + `</g>`;
    };

    // GÉNERO halves: the word, plus the article and ending that signal it —
    // el / -o, la / -a — so the cue the player reads off the noun is printed
    // right on the half that answers it.
    s += circle('gender', A_G, gSpec, 0, 'GÉNERO', (i, x, y, sel, st) =>
      `<text x="${f2(x)}" y="${f2(y - 4)}" class="adj-big${sel ? ' sel' : ''}">${i === 0 ? 'masc.' : 'fem.'}</text>`
      + `<text x="${f2(x)}" y="${f2(y + 16)}" class="adj-hint${sel ? ' sel' : ''}">${i === 0 ? 'el · -o' : 'la · -a'}</text>`);

    // NÚMERO halves: the same one-body / two-body pictograms the person
    // circle uses, so singular and plural look identical on both devices.
    s += circle('number', A_N, nSpec, 1, 'NÚMERO', (i, x, y, sel, st) =>
      `<g class="glyph${sel ? ' sel' : ''}">${personGlyph(x, y - 12, 1.1, i === 0 ? 1 : 2)}</g>`
      + `<text x="${f2(x)}" y="${f2(y + 22)}" class="adj-hint${sel ? ' sel' : ''}">${i === 0 ? 'singular' : 'plural'}</text>`);

    // The bridge hub: the form, and the button that ejects it.
    const form = formFor(word, dials);
    // The guided round points at the hub once both halves are set the way it asked.
    const want = state.cue && state.cue.adj;
    const hubCued = form && want && dials[0] === want[0] && dials[1] === want[1];
    s += `<g data-part="hub" class="hub hub-btn${form ? ' live' : ''}${hubCued ? ' cue' : ''}${focusCls('hub')}"${form ? ` role="button" aria-label="confirm ${form}"` : ''}>`;
    s += `<circle cx="${A_HUB[0]}" cy="${A_HUB[1]}" r="${A_HUB_R}" class="hub-plate"/>`;
    s += `<circle cx="${A_HUB[0]}" cy="${A_HUB[1]}" r="${A_HUB_R - 6}" class="hub-ring"/>`;
    if (form) {
      s += `<text x="${A_HUB[0]}" y="${A_HUB[1] + 2}" class="hub-form" style="font-size:${fitSize(form, 14, 9, 10)}px">${form}</text>`;
      s += `<text x="${A_HUB[0]}" y="${A_HUB[1] + 17}" class="hub-cap" style="font-size:6.5px">▼ CONFIRM</text>`;
    }
    s += `</g>`;
    return s + `</svg>`;
  }

  // ---- render -------------------------------------------------------------
  function render() {
    if (!host) return;
    const specs = dialSpecs();
    const dials = currentDials();
    const word = state.word;
    const accent = colourFor(word, dials);
    const form = word ? formFor(word, dials, word.kind === 'verb' && state.neg) : null;

    host.style.setProperty('--accent', accent);
    host.classList.toggle('empty', !word);
    host.classList.toggle('has-form', !!form);

    let html = '';
    html += `<div class="gadget-intake">`;
    html += word
      // An adjective shows its @ form here too (encantad@): the ending is hers to dial, so the device
      // must not print the masculine as if it were already decided (the @ rule, 2026-09-23).
      ? `<span class="intake-word">${word.kind === 'adj' ? atForm(word.lemma) : word.lemma}</span><span class="intake-kind">${word.kind !== 'verb' ? 'adjetivo' : VERBS[word.lemma] && VERBS[word.lemma].reflexive ? 'verbo reflexivo' : 'verbo'}</span>`
      : `<span class="intake-hint">drop a verb here</span>`;
    html += `</div>`;

    if (specs.length === 3) {
      // The −ra/−se lever: only on subjunctive + imperfect. It shows the family it will switch TO, like the Tú/Vos
      // switch. It unfolds (animation class) only on the drawing where it first appears, not on every redraw.
      const out = leverOut();
      const lever = out ? `<button id="ending-lever" type="button" class="ending-lever${state.leverWasOut ? '' : ' unfold'}" data-ending-lever aria-label="Switch the imperfect subjunctive to ${state.ending === 'se' ? '−ra' : '−se'} endings" title="Switch to ${state.ending === 'se' ? '−ra' : '−se'} endings"><span class="lever-arm" aria-hidden="true"></span>${state.ending === 'se' ? '−ra' : '−se'}</button>` : '';
      state.leverWasOut = out;
      html += `<div class="device${state.publicForms ? ' device-public' : ''}">${deviceSvg(specs, dials, accent)}${lever}${state.publicForms ? `<button id="variety-switch" type="button" class="variety-switch" data-variety-switch aria-label="Switch to ${state.variety === 'tu' ? 'Vos (Argentina / Uruguay)' : 'Tú'}" title="Switch to ${state.variety === 'tu' ? 'Vos' : 'Tú'}">${state.variety === 'tu' ? 'Vos' : 'Tú'}</button>` : ''}</div>`; // The physical switch offers the other variety while the person sector names the current one.
    } else if (specs.length === 2) {
      html += `<div class="device adj-device">${adjDeviceSvg(specs, dials)}</div>`;
    } else {
      // No word: draw the verb device powered down, so the machine is present.
      const idle = [
        { name: 'MODO',    stops: MOODS.map(m => ({ label: m.label, full: m.full, colour: m.colour })) },
        { name: 'PERSONA', stops: PERSONS.map(p => ({ label: p.short, full: p.full, col: p.col, row: p.row, colour: p.colour })) },
        { name: 'TIEMPO',  stops: TENSES.map(t => ({ label: t.label, full: t.full, locked: t.locked })) },
      ];
      html += `<div class="device device-off">${deviceSvg(idle, [0, 0, TENSE_HOME], accent, true)}</div>`;
    }

    // The selections spelled out, in WORKING order (mood, tense, person for a
    // verb) with the step number — so the readout teaches the order too.
    if (specs.length) {
      html += `<div class="device-readout">`;
      STEP_ORDER[word.kind].forEach((i, n) => {
        const sp = specs[i];
        // No person chosen has no stop to name, so the chip says what the centre is showing instead.
        const val = sp.stops[dials[i]] ? sp.stops[dials[i]].full : 'ninguna · infinitivo';
        html += `<button class="ro${state.active === i ? ' active' : ''}" data-dial="${i}" type="button">`
          + `<span class="ro-name">${n + 1} · ${sp.name}</span><span class="ro-val">${val}</span></button>`;
      });
      html += `</div>`;
    }

    // The LCD row stays for the keyboard and the lightning round (whose EJECT
    // becomes CONFIRM). The hub is the primary eject on a touch screen; it
    // works by pressing this same button, so every mode shares one eject path.
    const liveForm = word ? formFor(word, dials, word.kind === 'verb' && state.neg) : null;
    const shown = !word ? '' : !state.liveReadout ? '▮▮▮▮' : liveForm ? (state.neg && word.kind === 'verb' ? 'no ' : '') + liveForm : '—';
    html += `<div class="gadget-out">`;
    html += `<div class="gadget-lcd${form ? '' : ' none'}">${shown}</div>`;
    html += `<div class="gadget-btns">`;
    html += `<button class="gadget-eject" ${word ? '' : 'disabled'} title="Enter / Space">CONFIRM ▶</button>`;
    html += `<button class="gadget-return" ${word ? '' : 'disabled'} title="Backspace">✕</button>`;
    html += `</div></div>`;

    const restoreSwitchFocus = state.publicForms && host.contains(document.activeElement) && document.activeElement.id === 'variety-switch'; // Remember keyboard focus before replacing the physical switch during a redraw.
    host.innerHTML = html;
    if (onChange) onChange();
    if (restoreSwitchFocus) { const switchButton = host.querySelector('[data-variety-switch]'); if (switchButton && !switchButton.disabled) switchButton.focus({ preventScroll: true }); } // Let a keyboard visitor flip the hardware repeatedly without losing their place.
  }

  // ---- wiring -------------------------------------------------------------
  function mount(el, changeCb) {
    host = el;
    onChange = changeCb;

    host.addEventListener('click', e => {
      const t = e.target;
      // The hub is the eject button. It works by pressing the real EJECT
      // button, so lab.js (seat into the next open space) and the lightning
      // round (EJECT = CONFIRM) both handle it with the code they already have.
      const hub = t.closest && t.closest('.hub-btn');
      if (hub) {
        if (hub.classList.contains('live')) { const b = host.querySelector('.gadget-eject'); if (b) b.click(); }
        return;
      }
      if (t.closest && t.closest('[data-variety-switch]')) { toggleVariety(); return; } // Let the on-device button use the same gated input route as the other hardware.
      if (t.closest && t.closest('[data-ending-lever]')) { toggleEnding(); return; } // The −ra/−se lever flips all six imperfect-subjunctive forms.
      // The SÍ / NO antennae.
      const ant = t.closest && t.closest('[data-neg]');
      if (ant) { setNeg(ant.dataset.neg === '1'); return; }
      // Anything carrying data-dial + data-stop selects that stop — one rule
      // for every clickable region on both devices.
      const hit = t.closest && t.closest('[data-dial][data-stop]');
      // A verb's person sector goes through tapPerson, so a second tap on it deselects (contract §2).
      if (hit && state.word && state.word.kind === 'verb' && +hit.dataset.dial === 1) { tapPerson(+hit.dataset.stop); return; }
      if (hit) { set(+hit.dataset.dial, +hit.dataset.stop); return; }
      // The readout chips pick which ring the arrow keys drive.
      const ro = t.closest && t.closest('.ro');
      if (ro && ro.dataset.dial != null) { setActive(+ro.dataset.dial); }
    });

    render();
  }

  return {
    configurePublic(forms) { state.publicForms = forms; render(); }, // Opt the standalone explorer into complete reflexive phrases and the regional table.
    set variety(v) { state.variety = v === 'vos' ? 'vos' : 'tu'; render(); }, // Preserve all dial settings when informal address changes.
    get variety() { return state.variety; }, // Let the explorer save the selected variety.
    toggleVariety, // Expose the same physical-switch action to documented keyboard access.
    toggleEnding, // The −ra/−se lever, for keyboard access and walkthroughs.
    moodAllows: (moodId, tenseId) => !moodBlocks(moodId, tenseId), // Lets the public page grey out the same buttons the device does.
    set ending(v) { state.ending = v === 'se' ? 'se' : 'ra'; render(); }, // Restore a remembered ending family.
    get ending() { return state.ending; }, // Let the explorer remember the chosen family for later visits.
    captureState() { return JSON.parse(JSON.stringify({ word: state.word, dials: state.dials, active: state.active, neg: state.neg, variety: state.variety, ending: state.ending, lens: state.lens, liveReadout: state.liveReadout })); }, // Preserve both word modes (and the ending family) before a temporary walkthrough.
    restoreState(saved) { Object.assign(state, JSON.parse(JSON.stringify(saved))); state.remote = null; render(); }, // A restored person is always the visitor's own, never one the device "heard". // Restore exploration exactly without submitting an answer or firing input hooks.
    mount, load, clear, randomise, step, set, setActive, cycleActive, eject, formFor, colourFor, render,
    // The infinitive resting state: the "no person" value, the tap that toggles a sector, and the
    // clear used by Esc. `atRest` says whether the centre is showing the infinitive right now.
    NO_PERSON, tapPerson, clearPerson,
    get atRest() { return resting(state.word, currentDials()); },
    setNeg, toggleNeg: () => setNeg(!state.neg),
    get negative() { return state.neg; },
    get word() { return state.word; },
    get active() { return state.active; },
    get dials() { return currentDials().slice(); },
    get dialCount() { return dialSpecs().length; },
    set liveReadout(v) { state.liveReadout = !!v; render(); },
    get liveReadout() { return state.liveReadout; },
    set resetOnLoad(v) { state.resetOnLoad = !!v; },
    // The mission's lens (see state.lens). `beginnerMode` is kept as the old
    // name for "indicativo + presente only", so nothing that set it breaks.
    set lens(v) { state.lens = v || null; render(); },
    get lens() { return state.lens; },
    set beginnerMode(v) { state.lens = v ? { moods: ['ind'], tenses: ['pres'] } : null; render(); },
    get beginnerMode() { return !!state.lens; },
    // Tutorial hooks (tutorial.js). Setting focus re-renders so the spotlit
    // part lights and the rest of the device dims immediately.
    set gate(fn) { state.gate = fn || null; },
    set onSet(fn) { state.onSet = fn || null; },
    set tutFocus(part) { state.tutFocus = part || null; render(); },
    get tutFocus() { return state.tutFocus; },
    // The calibration (NZ, 2026-10-04; see state.calib). Setting it to an array of six levels
    // starts it; setting null ends it, and the device looks the way every other mode expects.
    set calib(v) { state.calib = v ? v.slice() : null; state.flash.clear(); render(); },
    get calib() { return state.calib ? state.calib.slice() : null; },
    light, dim, setCalib,
    // The guided round's pointer and its refusal rule. The pointer is set quietly (no redraw),
    // because the lab sets it just before it redraws everything anyway.
    setCue(c) { state.cue = c || null; },
    set guard(fn) { state.guard = fn || null; },
  };
})();
