/* "Play with the band" on the verb page (2026-11-20, build step 3).
   Turns the verb page into a rhythm practice: pick a quiz, the band starts, an English prompt appears, the player sets the REAL Brazalete's dials and presses the center to confirm,
   and the shared band (band.js) does the music, the beat dots, the streak and the ending. This file only knows about verbs and questions; it never touches the music directly.
   Quiz types in the first build (NZ, 2026-11-20): Guided and Challenge (the ten present-tense questions from the old quiz) and Sentences (past, imperfect and present of "ir", from the sketch).
   Four more types have "coming soon" cards. Hints stay; the second attempt is dropped (a miss already ends the question and resets the streak). */
(() => {
  'use strict'; // Catch accidental globals.
  const $ = id => document.getElementById(id);
  const shuffle = a => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };

  /* ---------- The quizzes ---------- */
  const QUIZZES = {
    guided: { name: 'Guided', blurb: 'Present tense, ten questions. The verb is loaded for you.', n: 10 },
    challenge: { name: 'Challenge', blurb: 'Present tense, ten questions. Pick the verb from a small bank first.', n: 10 },
    sentences: { name: 'Sentences', blurb: 'Past, imperfect and present of ir. Read the English to find the tense and the person.', n: 12 }
  };
  const SOON = [['Boot-pattern verbs', 'Stem changes such as quiero and puedo.'], ['Irregular verbs', 'The verbs that break the rules.'], ['Translate the past', 'Every way to talk about the past.'], ['Subjunctive triggers', 'Which words call for the subjunctive.']];
  /* The Sentences quiz: plain English (no colors, no tense labels), the person (0 yo, 1 tú, 2 él, 3 nosotros, 4 vosotros, 5 ellos) and the tense. The sentence is the only clue. */
  const SENTENCES = [
    { text: 'I went to that high school.', person: 0, tense: 'pret' }, { text: 'Every summer we went to the beach.', person: 3, tense: 'impf' },
    { text: 'Last night they went home early.', person: 5, tense: 'pret' }, { text: 'As a kid, you went to the park every day. (tú)', person: 1, tense: 'impf' },
    { text: 'On Friday she went to the market.', person: 2, tense: 'pret' }, { text: 'Every morning he went to the bakery.', person: 2, tense: 'impf' },
    { text: 'Right now I go to the gym.', person: 0, tense: 'pres' }, { text: 'You go to the beach on Sundays. (tú)', person: 1, tense: 'pres' },
    { text: 'She goes to the market every Friday.', person: 2, tense: 'pres' }, { text: 'Today we go to the park.', person: 3, tense: 'pres' },
    { text: 'They go home after class.', person: 5, tense: 'pres' }, { text: 'He goes to the bakery now.', person: 2, tense: 'pres' }
  ];

  /* ---------- State ---------- */
  const P = { active: false, built: false, quiz: null, order: [], i: 0, cur: null, accepting: false, hints: true, saved: null, timer: 0, loading: false };
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
  /* Puts the real device in a fresh starting state for a question: the verb loaded, indicative and present, no person chosen, Tú, no negation. */
  function prepDevice(lemma, keepTense) {
    const oldTense = Gadget.word ? Gadget.dials[2] : TENSE_HOME;
    Gadget.variety = 'tu'; Gadget.load({ kind: 'verb', lemma }); Gadget.set(0, 0); Gadget.set(2, keepTense ? oldTense : TENSE_HOME); Gadget.clearPerson(); Gadget.setNeg(false);
  }

  /* ---------- Questions ---------- */
  const person = p => PERSONS[p].full.replace(/^.*— /, '');                                // "yo", "tú", "él / ella / usted" ...
  function questionInfo(q) {                                                                  // everything the quiz needs about one question
    if (P.quiz === 'sentences') {
      const tId = q.tense, expected = VERBS.ir.ind[tId][q.person];
      return { lemma: 'ir', person: q.person, tense: tId, expected, prompt: q.text, hint: 'The sentence tells you the tense. The words around the verb are the clue.', explain: expected + ' (indicative, ' + TENSES[tenseIndex(tId)].full + ', ' + person(q.person) + ')' };
    }
    const expected = BrazaleteQuiz.expected(q, VERBS);
    return { lemma: q.lemma, person: q.person, tense: 'pres', expected, prompt: q.prompt, hint: 'Look for the verb meaning “' + VERBS[q.lemma].en + '”. Use indicative, present and ' + PERSONS[q.person].full + '.', explain: expected + ' (' + q.lemma + ', indicative, present, ' + person(q.person) + ')' };
  }
  function show(el, on) { el.hidden = !on; }

  /* ---------- The screens: menu, question, results ---------- */
  function showMenu() {
    ['band-prompt', 'band-results'].forEach(id => show($(id), false)); show($('band-menu'), true); $('bm-status').textContent = '';
  }
  function buildMenu() {
    const cards = Object.entries(QUIZZES).map(([k, q]) => '<button class="bm-card" type="button" data-quiz="' + k + '"><strong>' + q.name + '</strong><span>' + q.blurb + '</span></button>').join('') +
      SOON.map(([n, b]) => '<div class="bm-card soon" aria-disabled="true"><strong>' + n + '</strong><span>' + b + '</span><em>Coming soon</em></div>').join('');
    $('bm-cards').innerHTML = cards;
  }
  async function startQuiz(type) {
    Band.unlock();                                                                          // sound must be unlocked inside the click, before the music loads
    if (P.loading) return; P.loading = true; P.quiz = type; P.hints = $('bm-hints').checked;
    $('bm-status').textContent = 'Loading the band...';
    const ok = await Band.load();
    P.loading = false;
    if (!ok) { $('bm-status').textContent = 'The music could not be loaded, so the band cannot play right now.'; return; }
    if (!P.active) return;                                                                  // the player left while it loaded
    P.order = type === 'sentences' ? shuffle(SENTENCES).slice(0, QUIZZES[type].n) : shuffle(BrazaleteQuiz.questions).slice(0, QUIZZES[type].n); P.i = 0; P.cur = null; P.accepting = false;
    show($('band-menu'), false); show($('band-results'), false); show($('band-prompt'), true);
    $('bp-progress').textContent = ''; $('bp-text').textContent = 'Listen to the drums...'; $('bp-feedback').textContent = ''; show($('bp-hint-text'), false); show($('bp-bank'), false); $('bp-hint').hidden = !P.hints; $('bp-finish').disabled = false;
    Gadget.clear();                                                                         // an empty device until the first question
    Band.startRound(next);
  }
  function next() {
    if (!P.active || !Band.state.roundOn) return;
    clearTimeout(P.timer);
    if (P.i >= P.order.length) { P.accepting = false; $('bp-progress').textContent = ''; $('bp-text').textContent = 'The band builds to the finish...'; show($('bp-bank'), false); $('bp-hint').hidden = true; $('bp-finish').disabled = true; Band.finishRound(); return; }
    const q = P.order[P.i], info = P.cur = questionInfo(q);
    $('bp-progress').textContent = 'Question ' + (P.i + 1) + ' of ' + P.order.length; $('bp-text').textContent = info.prompt; $('bp-feedback').textContent = ''; $('bp-feedback').className = 'bp-feedback'; show($('bp-hint-text'), false); $('bp-hint-text').textContent = info.hint;
    if (P.quiz === 'challenge') {                                                           // pick the verb from a small bank
      Gadget.clear();
      const others = ['comer', 'vivir', 'tener', 'ser', 'trabajar', 'necesitar'].filter(l => l !== info.lemma).slice(0, 2), bank = [info.lemma, ...others];
      for (let k = 0; k < P.i % 3; k++) bank.push(bank.shift());                            // move the right verb around the bank
      $('bp-bank').innerHTML = '<span>Choose the verb:</span>' + bank.map(l => '<button type="button" data-bank="' + l + '">' + l + '</button>').join(''); show($('bp-bank'), true);
    } else { show($('bp-bank'), false); prepDevice(info.lemma, P.quiz === 'sentences' && P.i > 0); }   // sentences keep the tense the player chose last time, so there is less clicking
    P.accepting = true;
    Band.beginQuestion({ onTimeout: () => finishQuestion(null, true) });
  }
  /* The player confirmed (piece = what the device produced), or time ran out (piece = null, timedOut = true). */
  function finishQuestion(piece, timedOut) {
    if (!P.accepting || !P.cur) return;
    const q = P.cur;
    if (!timedOut && !piece) { $('bp-feedback').textContent = 'Choose an available form before confirming.'; return; }   // nothing confirmed; the question stays open
    P.accepting = false;
    const form = piece ? (piece.neg ? 'no ' : '') + piece.text : '';
    const correct = !timedOut && !!piece && piece.lemma === q.lemma && form === q.expected && piece.dials[0] === 0 && piece.dials[1] === q.person && TENSES[piece.dials[2]].id === q.tense;
    const info = Band.resolve({ correct, form: q.expected, timedOut });
    const fb = $('bp-feedback');
    fb.className = 'bp-feedback ' + (correct ? 'ok' : 'miss');
    fb.textContent = correct ? (info.inPocket ? 'In the pocket: ' : 'Correct: ') + q.expected + '.' + (info.joined ? ' ' + info.joined + ' the band.' : '') : (timedOut ? 'Time. ' : 'Not this time. ') + 'It was ' + q.explain + '.' + (info.dropped ? ' ' + info.dropped + ' dropped out.' : '');
    P.i++; P.timer = setTimeout(next, correct ? 1300 : 2600);
  }

  /* ---------- Results ---------- */
  function showResults(s) {
    show($('band-prompt'), false); show($('band-results'), true);
    const avg = s.average ? ' Your average answer took ' + s.average.toFixed(1) + ' seconds.' : '';
    $('br-score').textContent = s.right + ' right out of ' + s.asked + '. Longest streak ' + s.best + '. In the pocket ' + s.pocket + ' times.' + avg;
  }

  /* ---------- Entering and leaving ---------- */
  function setMode(on) {
    $('mode-band').setAttribute('aria-pressed', String(on)); $('mode-explore').setAttribute('aria-pressed', String(!on));
    document.body.classList.toggle('band-mode', on); show($('band-row'), on);
  }
  function enter() {
    if (P.active) return;
    if (typeof PublicTutorial !== 'undefined' && PublicTutorial.active) return;               // not during a walkthrough
    P.saved = snapshot(); P.active = true; setMode(true);
    if (!P.built) { P.built = true; buildMenu(); Band.mountSettings($('band-settings')); Band.mountInstruments($('band-instruments')); Band.mountTimer($('band-timer')); Band.mountRing($('band-ring')); Band.mountShout($('band-shout')); }
    Band.listBands().then(() => Band.mountSettings($('band-settings')));
    Gadget.clear(); showMenu();
  }
  function exit() {
    if (!P.active) return;
    clearTimeout(P.timer); Band.stopMusic(); P.active = false; P.accepting = false; P.cur = null; setMode(false);
    ['band-menu', 'band-prompt', 'band-results'].forEach(id => show($(id), false)); restore(P.saved);
  }

  /* ---------- Wiring ---------- */
  $('mode-band').addEventListener('click', enter); $('mode-explore').addEventListener('click', exit);
  $('bm-cards').addEventListener('click', e => { const c = e.target.closest('[data-quiz]'); if (c) startQuiz(c.dataset.quiz); });
  $('bp-bank').addEventListener('click', e => { const b = e.target.closest('[data-bank]'); if (!b || !P.accepting) return; prepDevice(b.dataset.bank, false); document.querySelectorAll('[data-bank]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); });
  $('bp-hint').addEventListener('click', () => show($('bp-hint-text'), $('bp-hint-text').hidden));
  $('bp-finish').addEventListener('click', () => { if (!Band.state.roundOn) return; P.accepting = false; clearTimeout(P.timer); $('bp-text').textContent = 'The band builds to the finish...'; show($('bp-bank'), false); $('bp-finish').disabled = true; $('bp-hint').hidden = true; Band.finishRound(); });
  $('br-again').addEventListener('click', () => startQuiz(P.quiz)); $('br-menu').addEventListener('click', showMenu); $('br-explore').addEventListener('click', exit);
  Band.on('fin', s => { if (P.active) showResults(s); });

  /* The questions are all written for Tú, so while the band is playing the Vos switch snaps straight back to Tú (found in review, 2026-11-21). */
  const explorerOnSet = Gadget.onSet;
  Gadget.onSet = dial => { if (explorerOnSet) explorerOnSet(dial); if (P.active && dial === 'variety' && Gadget.variety !== 'tu') Gadget.toggleVariety(); };

  /* The explorer calls BandPlay.answer(piece) when the center button is pressed while the band is active (see explorer.js). */
  window.BandPlay = { get active() { return P.active; }, answer: piece => finishQuestion(piece, false) };
})();
