/* "Play with the band" on the verb page (2026-11-20, build step 3; quiz flow reworked 2026-11-22).
   Turns the verb page into a rhythm practice: pick a quiz and how many questions, the band starts, an English prompt appears, the player LOADS THE VERB
   (tap the empty verb slot, pick one of four verbs) and then sets the REAL Brazalete's dials and presses the center to confirm. The shared band (band.js)
   does the music, the beat timer, the streak and the ending. This file only knows about verbs and questions; it never touches the music directly.
   NZ's changes on 2026-11-22: the verb slot starts empty for every question and offers four verbs in a square beside the device; the number of questions
   (5, 10, 15 or 20) is chosen before the beat starts; a progress bar under the top bar replaces "Question X of Y"; Settings lives in the top bar with a
   small Finish button inside, and opening it pauses the game; the Explore / Play buttons disappear during a quiz (Explore comes back on the end screen). */
(() => {
  'use strict'; // Catch accidental globals.
  const $ = id => document.getElementById(id);
  const shuffle = a => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };

  /* ---------- The quizzes ---------- */
  const QUIZZES = {
    guided: { name: 'Guided', blurb: 'Present tense. Read the English, load the verb, build the form. Hints on.' },
    challenge: { name: 'Challenge', blurb: 'Present tense, no hints. Load the right verb and build the form on the beat.' },
    sentences: { name: 'Sentences', blurb: 'Past, imperfect and present of ir. Read the English to find the tense and the person.' }
  };
  const SOON = [['Boot-pattern verbs', 'Stem changes such as quiero and puedo.'], ['Irregular verbs', 'The verbs that break the rules.'], ['Translate the past', 'Every way to talk about the past.'], ['Subjunctive triggers', 'Which words call for the subjunctive.']];
  /* The Sentences quiz: plain English (no colours, no tense labels), the person (0 yo, 1 tú, 2 él, 3 nosotros, 4 vosotros, 5 ellos) and the tense. The sentence is the only clue. */
  const SENTENCES = [
    { text: 'I went to that high school.', person: 0, tense: 'pret' }, { text: 'Every summer we went to the beach.', person: 3, tense: 'impf' },
    { text: 'Last night they went home early.', person: 5, tense: 'pret' }, { text: 'As a kid, you went to the park every day. (tú)', person: 1, tense: 'impf' },
    { text: 'On Friday she went to the market.', person: 2, tense: 'pret' }, { text: 'Every morning he went to the bakery.', person: 2, tense: 'impf' },
    { text: 'Right now I go to the gym.', person: 0, tense: 'pres' }, { text: 'You go to the beach on Sundays. (tú)', person: 1, tense: 'pres' },
    { text: 'She goes to the market every Friday.', person: 2, tense: 'pres' }, { text: 'Today we go to the park.', person: 3, tense: 'pres' },
    { text: 'They go home after class.', person: 5, tense: 'pres' }, { text: 'He goes to the bakery now.', person: 2, tense: 'pres' }
  ];
  const LENGTHS = [5, 10, 15, 20];                                                           // the question counts the player can pick

  /* ---------- State ---------- */
  const P = { active: false, built: false, quiz: null, len: 10, order: [], i: 0, cur: null, accepting: false, hints: true, saved: null, timer: 0, loading: false, lastTense: null };
  const tenseIndex = id => TENSES.findIndex(t => t.id === id);

  /* The device's current word and dials, so Explore can be restored when the player leaves the band. */
  const snapshot = () => Gadget.word ? { lemma: Gadget.word.lemma, mood: Gadget.dials[0], person: Gadget.dials[1], tense: Gadget.dials[2], neg: Gadget.negative, variety: Gadget.variety } : null;
  function restore(s) {
    Gadget.clear();
    if (!s) return;
    Gadget.variety = s.variety; Gadget.load({ kind: 'verb', lemma: s.lemma }); Gadget.set(0, s.mood); Gadget.set(2, s.tense);
    if (s.person === Gadget.NO_PERSON) Gadget.clearPerson(); else Gadget.set(1, s.person);
    Gadget.setNeg(s.neg);
  }
  /* Loads a verb into the real device in a fresh state: indicative, present (or the tense kept from the last Sentences question), no person, Tú, affirmative. */
  function prepDevice(lemma) {
    const keep = P.quiz === 'sentences' && P.lastTense !== null;
    Gadget.variety = 'tu'; Gadget.load({ kind: 'verb', lemma }); Gadget.set(0, 0); Gadget.set(2, keep ? P.lastTense : TENSE_HOME); Gadget.clearPerson(); Gadget.setNeg(false);
  }

  /* ---------- Questions ---------- */
  const person = p => PERSONS[p].full.replace(/^.*— /, '');                                // "yo", "tú", "él / ella / usted" ...
  function questionInfo(q) {                                                                  // everything the quiz needs about one question
    if (P.quiz === 'sentences') {
      const tId = q.tense, expected = VERBS.ir.ind[tId][q.person];
      return { lemma: 'ir', person: q.person, tense: tId, expected, prompt: q.text, hint: 'The verb is ir (to go). The words around it tell you the tense.', explain: expected + ' (ir, indicative, ' + TENSES[tenseIndex(tId)].full + ', ' + person(q.person) + ')' };
    }
    const expected = BrazaleteQuiz.expected(q, VERBS);
    return { lemma: q.lemma, person: q.person, tense: 'pres', expected, prompt: q.prompt, hint: 'Look for the verb meaning “' + VERBS[q.lemma].en + '”. Use indicative, present and ' + PERSONS[q.person].full + '.', explain: expected + ' (' + q.lemma + ', indicative, present, ' + person(q.person) + ')' };
  }
  /* A round of n questions: the pool shuffled, and reshuffled again if the round is longer than the pool (no repeat back to back). */
  function buildOrder(pool, n) {
    const out = [];
    while (out.length < n) { let s = shuffle(pool); if (out.length && s[0] === out[out.length - 1]) s.push(s.shift()); out.push(...s); }
    return out.slice(0, n);
  }
  /* The four verbs offered in the picker: the right one and three others, in a random order. */
  function verbChoices(right) {
    const others = shuffle(Object.keys(VERBS).filter(l => l !== right && !VERBS[l].reflexive)).slice(0, 3);
    return shuffle([right, ...others]);
  }
  function show(el, on) { if (el) el.hidden = !on; }

  /* ---------- The verb picker: four verbs in a square beside the device ---------- */
  function openPicker() {
    if (!P.accepting || !P.cur) return;
    const pick = $('verb-pick');
    $('vp-grid').innerHTML = P.cur.choices.map(l => '<button type="button" data-pick="' + l + '" lang="es"' + (Gadget.word && Gadget.word.lemma === l ? ' aria-pressed="true"' : '') + '>' + l + '</button>').join('');
    show(pick, true); placePicker();
    const first = pick.querySelector('button'); if (first) first.focus({ preventScroll: true });
  }
  function closePicker() { show($('verb-pick'), false); }
  /* Where the square goes: beside the device on a laptop (never over it); on a phone, over the stage window and combo row above the question. */
  function placePicker() {
    const pick = $('verb-pick'); if (pick.hidden) return;
    const svg = document.querySelector('#device .device-svg'), win = document.querySelector('#device .gadget-intake');
    if (!svg || !win) return;
    const r = svg.getBoundingClientRect(), w = win.getBoundingClientRect(), W = innerWidth;
    pick.classList.toggle('vp-phone', W < 1024);
    if (W >= 1024) {
      const vb = (svg.getAttribute('viewBox') || '0 0 440 462').split(/\s+/).map(Number), k = r.width / vb[2];
      const right = r.left + (220 - vb[0] + 236) * k;                                       // just past the device's right edge
      Object.assign(pick.style, { left: Math.min(right + 12, W - pick.offsetWidth - 12) + 'px', top: w.top + 'px', right: '', width: '' });
    } else {
      const slot = $('band-row'), q = $('band-prompt');
      const top = slot && slot.offsetHeight ? slot.getBoundingClientRect().top : 70, bottom = q.getBoundingClientRect().top - 6;
      Object.assign(pick.style, { left: '10px', right: '10px', width: 'auto', top: top + 'px', height: Math.max(96, bottom - top) + 'px' });
    }
  }

  /* ---------- The screens: menu, question, results ---------- */
  function setQuizOn(on) { document.body.classList.toggle('quiz-on', on); show($('band-progress'), on); }   // hides the Explore / Play buttons while a quiz runs
  function showMenu() {
    setQuizOn(false); closePicker();
    ['band-prompt', 'band-results'].forEach(id => show($(id), false)); show($('band-menu'), true); $('bm-status').textContent = '';
  }
  function buildMenu() {
    const cards = Object.entries(QUIZZES).map(([k, q]) => '<button class="bm-card" type="button" data-quiz="' + k + '"><strong>' + q.name + '</strong><span>' + q.blurb + '</span></button>').join('') +
      SOON.map(([n, b]) => '<div class="bm-card soon" aria-disabled="true"><strong>' + n + '</strong><span>' + b + '</span><em>Coming soon</em></div>').join('');
    $('bm-cards').innerHTML = cards;
  }
  function setProgress(done) {                                                              // the bar under the top bar: how far through the round
    const bar = $('band-progress'), n = P.order.length || P.len;
    bar.setAttribute('aria-valuemax', n); bar.setAttribute('aria-valuenow', done); bar.setAttribute('aria-valuetext', 'Question ' + Math.min(done + 1, n) + ' of ' + n);
    $('band-progress-fill').style.width = (100 * done / n) + '%';
  }
  async function startQuiz(type) {
    Band.unlock();                                                                          // sound must be unlocked inside the click, before the music loads
    if (P.loading) return; P.loading = true; P.quiz = type; P.hints = type !== 'challenge' && $('bm-hints').checked;
    $('bm-status').textContent = 'Loading the band...';
    const ok = await Band.load();
    P.loading = false;
    if (!ok) { $('bm-status').textContent = 'The music could not be loaded, so the band cannot play right now.'; return; }
    if (!P.active) return;                                                                  // the player left while it loaded
    P.order = buildOrder(type === 'sentences' ? SENTENCES : BrazaleteQuiz.questions, P.len); P.i = 0; P.cur = null; P.accepting = false; P.lastTense = null;
    show($('band-menu'), false); show($('band-results'), false); show($('band-prompt'), true); setQuizOn(true); setProgress(0);
    $('bp-progress').textContent = ''; $('bp-text').textContent = 'Listen to the drums...'; $('bp-feedback').textContent = ''; show($('bp-hint-text'), false); $('bp-hint').hidden = !P.hints; $('bp-finish').disabled = false;
    Gadget.clear();                                                                         // an empty device until the first question
    Band.startRound(next);
  }
  function next() {
    if (!P.active || !Band.state.roundOn) return;
    clearTimeout(P.timer);
    if (Band.state.paused) { P.timer = setTimeout(next, 250); return; }                     // Settings is open: wait until the game resumes
    if (P.i >= P.order.length) { finishNow(); return; }
    const q = P.order[P.i], info = P.cur = questionInfo(q);
    info.choices = verbChoices(info.lemma);
    setProgress(P.i);
    $('bp-progress').textContent = 'Question ' + (P.i + 1) + ' of ' + P.order.length; $('bp-text').textContent = info.prompt;
    $('bp-feedback').className = 'bp-feedback'; $('bp-feedback').textContent = P.i === 0 ? 'Tap the empty verb slot to load a verb.' : '';
    show($('bp-hint-text'), false); $('bp-hint-text').textContent = info.hint;
    Gadget.clear();                                                                         // the verb slot starts empty for every question
    P.accepting = true;
    Band.beginQuestion({ onTimeout: () => finishQuestion(null, true) });
  }
  /* The player confirmed (piece = what the device produced), or time ran out (piece = null, timedOut = true). */
  function finishQuestion(piece, timedOut) {
    if (!P.accepting || !P.cur) return;
    const q = P.cur;
    if (!timedOut && !piece) { $('bp-feedback').textContent = Gadget.word ? 'Choose an available form before confirming.' : 'Load a verb first: tap the empty verb slot.'; return; }   // nothing confirmed; the question stays open
    P.accepting = false; closePicker();
    if (Gadget.word) P.lastTense = Gadget.dials[2];                                         // the Sentences quiz keeps the tense for the next question
    const form = piece ? (piece.neg ? 'no ' : '') + piece.text : '';
    const correct = !timedOut && !!piece && piece.lemma === q.lemma && form === q.expected && piece.dials[0] === 0 && piece.dials[1] === q.person && TENSES[piece.dials[2]].id === q.tense;
    const info = Band.resolve({ correct, form: q.expected, timedOut });
    const fb = $('bp-feedback');
    fb.className = 'bp-feedback ' + (correct ? 'ok' : 'miss');
    const wrongVerb = !timedOut && piece && piece.lemma !== q.lemma;
    fb.textContent = correct ? (info.inPocket ? 'In the pocket: ' : 'Correct: ') + q.expected + '.' + (info.joined ? ' ' + info.joined + ' the band.' : '')
      : (timedOut ? 'Time. ' : wrongVerb ? 'Wrong verb. ' : 'Not this time. ') + 'It was ' + q.explain + '.' + (info.dropped ? ' ' + info.dropped + ' dropped out.' : '');
    P.i++; setProgress(P.i); P.timer = setTimeout(next, correct ? 1300 : 2600);
  }
  function finishNow() {                                                                    // the round ends (all questions done, or Finish pressed in Settings)
    if (!Band.state.roundOn) return;
    P.accepting = false; clearTimeout(P.timer); closePicker();
    $('bp-text').textContent = 'The band builds to the finish...'; $('bp-feedback').textContent = ''; $('bp-hint').hidden = true; $('bp-finish').disabled = true;
    Band.finishRound();
  }

  /* ---------- Results ---------- */
  function showResults(s) {
    show($('band-prompt'), false); show($('band-results'), true); setQuizOn(false); document.body.classList.add('quiz-end');   // the end screen: Explore comes back (its button is on this card)
    const avg = s.average ? ' Your average answer took ' + s.average.toFixed(1) + ' seconds.' : '';
    $('br-score').textContent = s.right + ' right out of ' + s.asked + '. Longest streak ' + s.best + '. In the pocket ' + s.pocket + ' times.' + avg;
  }

  /* ---------- Settings in the top bar: opening it pauses everything ---------- */
  function setGear(open) {
    const playing = Band.state.roundOn;
    if (open && playing) Band.pause(); else if (!open) Band.resume();
    document.body.classList.toggle('game-paused', open && playing);
    show($('gear-paused'), open && playing); $('bp-finish').hidden = !playing;
  }

  /* ---------- Entering and leaving ---------- */
  function setMode(on) {
    $('mode-band').setAttribute('aria-pressed', String(on)); $('mode-explore').setAttribute('aria-pressed', String(!on));
    document.body.classList.toggle('band-mode', on); show($('band-row'), on);
    show($('band-side'), on); show($('band-gear'), on);                                     // the combo column and the Settings button belong to the band
    if (!on) { $('band-gear').open = false; setQuizOn(false); document.body.classList.remove('quiz-end'); }
  }
  function enter() {
    if (P.active) return;
    if (typeof PublicTutorial !== 'undefined' && PublicTutorial.active) return;               // not during a walkthrough
    P.saved = snapshot(); P.active = true; setMode(true);
    if (!P.built) {
      P.built = true; buildMenu(); Band.mountSettings($('band-settings'));
      if (window.Club) Band.mountInstruments(Club.bandHost, Club.stageOptions);            // Club Night (2026-11-22): the musicians stand on the club's stage
      else Band.mountInstruments($('band-instruments'), { stage: true });                  // without the club: the band picture beside the device
      Band.mountTimer($('band-timer')); Band.mountRing($('band-ring')); Band.mountCombo($('band-combo')); Band.mountShout($('band-shout'));   // the combo number sits apart from the ring
    }
    Band.listBands().then(() => Band.mountSettings($('band-settings')));
    Gadget.clear(); showMenu();
  }
  function exit() {
    if (!P.active) return;
    clearTimeout(P.timer); Band.stopMusic(); P.active = false; P.accepting = false; P.cur = null; setMode(false); closePicker();
    ['band-menu', 'band-prompt', 'band-results'].forEach(id => show($(id), false)); restore(P.saved);
  }

  /* ---------- Wiring ---------- */
  $('mode-band').addEventListener('click', enter); $('mode-explore').addEventListener('click', exit);
  $('bm-cards').addEventListener('click', e => { const c = e.target.closest('[data-quiz]'); if (c) startQuiz(c.dataset.quiz); });
  $('bm-length').addEventListener('click', e => { const b = e.target.closest('[data-len]'); if (!b) return; P.len = +b.dataset.len; $('bm-length').querySelectorAll('[data-len]').forEach(x => x.setAttribute('aria-checked', String(x === b))); });
  $('vp-grid').addEventListener('click', e => { const b = e.target.closest('[data-pick]'); if (!b || !P.accepting) return; prepDevice(b.dataset.pick); closePicker(); document.getElementById('device').focus({ preventScroll: true }); });   // the chosen verb goes into the device
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('verb-pick').hidden) closePicker(); });
  document.addEventListener('pointerdown', e => { const pick = $('verb-pick'); if (!pick.hidden && !pick.contains(e.target) && !e.target.closest('.gadget-intake')) closePicker(); });   // a tap elsewhere closes the square
  addEventListener('resize', placePicker);
  $('bp-hint').addEventListener('click', () => show($('bp-hint-text'), $('bp-hint-text').hidden));
  $('bp-finish').addEventListener('click', () => { $('band-gear').open = false; finishNow(); });
  $('band-gear').addEventListener('toggle', () => setGear($('band-gear').open));
  $('br-again').addEventListener('click', () => { document.body.classList.remove('quiz-end'); startQuiz(P.quiz); }); $('br-menu').addEventListener('click', () => { document.body.classList.remove('quiz-end'); showMenu(); }); $('br-explore').addEventListener('click', exit);
  Band.on('fin', s => { if (P.active) showResults(s); });

  /* The questions are all written for Tú, so while the band is playing the Vos switch snaps straight back to Tú (found in review, 2026-11-21). */
  const explorerOnSet = Gadget.onSet;
  Gadget.onSet = dial => { if (explorerOnSet) explorerOnSet(dial); if (P.active && dial === 'variety' && Gadget.variety !== 'tu') Gadget.toggleVariety(); };

  /* The explorer calls BandPlay.answer(piece) when the center button is pressed while the band is active (see explorer.js); the verb slot calls openPicker. */
  window.BandPlay = { get active() { return P.active; }, get choosing() { return P.accepting; }, answer: piece => finishQuestion(piece, false), openPicker };
})();
