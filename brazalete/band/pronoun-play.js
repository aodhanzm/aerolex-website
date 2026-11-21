/* "Play with the band" on the pronoun page (2026-11-20, build step 5).
   Same idea as the verb page (verb-play.js): pick the quiz, the band starts, an English sentence appears, the player sets the REAL pronoun disc and presses its center, and the
   shared band (band.js) does the music, the beat dots, the streak and the ending.
   The question (NZ, 2026-11-20): an English sentence with the object word marked, for example "I see him" with "him" marked. The player sets the role (direct object, indirect
   object or reflexive) and the person, and the disc shows the pronoun (lo). A small blue or pink dot gives the gender only where the English cannot tell ("them", "it").
   The question style works for any disc design, so the redesigned disc can replace this one without redoing the questions. */
(() => {
  'use strict'; // Catch accidental globals.
  const $ = id => document.getElementById(id);
  const shuffle = a => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };

  /* ---------- Content ---------- */
  const ROLES = { vic: 'direct object', rec: 'indirect object', ref: 'reflexive' };
  const WHO = ['yo', 'tú', 'él / ella', 'nosotros', 'vosotros', 'ellos / ellas'];             // the six people, in disc order
  /* Each question: the English (the marked word is the object), the role, the person (0 yo, 1 tú, 2 él/ella, 3 nosotros, 4 vosotros, 5 ellos/ellas) and, for the split third-person
     cells of the direct-object role, the gender (0 masculine, 1 feminine). dot = show the blue or pink dot, only where the English cannot tell the gender. */
  const QUESTIONS = [
    { t: 'She sees <mark>me</mark>.', role: 'vic', person: 0 }, { t: 'I see <mark>you</mark>. (tú)', role: 'vic', person: 1 },
    { t: 'I see <mark>him</mark>.', role: 'vic', person: 2, gender: 0 }, { t: 'I see <mark>her</mark>.', role: 'vic', person: 2, gender: 1 },
    { t: 'He sees <mark>us</mark>.', role: 'vic', person: 3 }, { t: 'I see <mark>you all</mark>. (vosotros, Spain)', role: 'vic', person: 4 },
    { t: 'I see <mark>them</mark>.', role: 'vic', person: 5, gender: 0, dot: 'm' }, { t: 'I buy <mark>it</mark>.', role: 'vic', person: 2, gender: 1, dot: 'f' },
    { t: 'She gives <mark>me</mark> the book.', role: 'rec', person: 0 }, { t: 'I send <mark>you</mark> a message. (tú)', role: 'rec', person: 1 },
    { t: 'I give <mark>him</mark> the book.', role: 'rec', person: 2 }, { t: 'He gives <mark>us</mark> the gift.', role: 'rec', person: 3 },
    { t: 'I give <mark>them</mark> the books.', role: 'rec', person: 5 },
    { t: 'I wash <mark>myself</mark>.', role: 'ref', person: 0 }, { t: 'You wash <mark>yourself</mark>. (tú)', role: 'ref', person: 1 },
    { t: 'She gets <mark>herself</mark> up.', role: 'ref', person: 2 }, { t: 'We get <mark>ourselves</mark> up.', role: 'ref', person: 3 },
    { t: 'They wash <mark>themselves</mark>.', role: 'ref', person: 5 }
  ];
  const QUIZ = { name: 'Sentences', blurb: 'Read the English. Find what the marked word is doing, then set the role and the person on the disc.', n: 12 };
  const HINT = 'Ask what the marked word is doing. Is it receiving the action (direct object), receiving the thing that is given or sent (indirect object), or the same person as the one doing it (reflexive)?';

  /* ---------- State ---------- */
  const P = { active: false, built: false, order: [], i: 0, cur: null, accepting: false, hints: true, saved: null, timer: 0, loading: false };
  const cell = (role, person) => OBJECT_PRONOUNS[role][person];
  const isSplit = (role, person) => Array.isArray(cell(role, person));
  const formFor = q => { const c = cell(q.role, q.person); return Array.isArray(c) ? c[q.gender || 0] : c; };   // the pronoun the disc should show
  const explain = q => formFor(q) + ' (' + ROLES[q.role] + ', ' + WHO[q.person] + (isSplit(q.role, q.person) ? ', ' + (q.gender ? 'feminine' : 'masculine') : '') + ')';
  const show = (el, on) => { el.hidden = !on; };

  /* ---------- Screens ---------- */
  function showMenu() { ['band-prompt', 'band-results'].forEach(id => show($(id), false)); show($('band-menu'), true); $('bm-status').textContent = ''; }
  async function startQuiz() {
    Band.unlock();                                                                          // sound must be unlocked inside the click, before the music loads
    if (P.loading) return; P.loading = true; P.hints = $('bm-hints').checked; $('bm-status').textContent = 'Loading the band...';
    const ok = await Band.load(); P.loading = false;
    if (!ok) { $('bm-status').textContent = 'The music could not be loaded, so the band cannot play right now.'; return; }
    if (!P.active) return;                                                                  // the player left while it loaded
    P.order = shuffle(QUESTIONS).slice(0, QUIZ.n); P.i = 0; P.cur = null; P.accepting = false;
    show($('band-menu'), false); show($('band-results'), false); show($('band-prompt'), true);
    $('bp-progress').textContent = ''; $('bp-text').textContent = 'Listen to the drums...'; $('bp-dot').hidden = true; $('bp-feedback').textContent = ''; show($('bp-hint-text'), false); $('bp-hint').hidden = !P.hints; $('bp-finish').disabled = false;
    Band.startRound(next);
  }
  /* A new question: the disc is put in a starting state that is wrong for BOTH the role and the person, so the player always has to set both. */
  function next() {
    if (!P.active || !Band.state.roundOn) return;
    clearTimeout(P.timer);
    if (P.i >= P.order.length) { P.accepting = false; $('bp-progress').textContent = ''; $('bp-text').textContent = 'The band builds to the finish...'; $('bp-dot').hidden = true; $('bp-hint').hidden = true; $('bp-finish').disabled = true; Band.finishRound(); return; }
    const q = P.cur = Object.assign({ expected: null }, P.order[P.i]); q.expected = formFor(q);
    $('bp-progress').textContent = 'Question ' + (P.i + 1) + ' of ' + P.order.length; $('bp-text').innerHTML = q.t; $('bp-feedback').textContent = ''; $('bp-feedback').className = 'bp-feedback'; show($('bp-hint-text'), false); $('bp-hint-text').textContent = HINT;
    const dot = $('bp-dot'); dot.hidden = !q.dot; if (q.dot) dot.style.background = q.dot === 'm' ? '#3d9bff' : '#ff6fae';
    const roles = ['vic', 'rec', 'ref'].filter(r => r !== q.role); Receiver.reset(roles[Math.floor(Math.random() * roles.length)], (q.person + 3) % 6, 0);   // wrong role, wrong person
    P.accepting = true; Band.beginQuestion({ onTimeout: () => finishQuestion(true) });
  }
  /* The player pressed the disc's center (explorer.js calls PronounPlay.answer), or time ran out. */
  function finishQuestion(timedOut) {
    if (!P.accepting || !P.cur) return;
    P.accepting = false; const q = P.cur;
    const correct = !timedOut && Receiver.mode === q.role && Receiver.person === q.person && Receiver.form === q.expected && (!isSplit(q.role, q.person) || Receiver.gender === (q.gender || 0));
    const info = Band.resolve({ correct, form: q.expected, timedOut });
    const fb = $('bp-feedback'); fb.className = 'bp-feedback ' + (correct ? 'ok' : 'miss');
    fb.textContent = correct ? (info.inPocket ? 'In the pocket: ' : 'Correct: ') + q.expected + '.' + (info.joined ? ' ' + info.joined + ' the band.' : '') : (timedOut ? 'Time. ' : 'Not this time. ') + 'It was ' + explain(q) + '.' + (info.dropped ? ' ' + info.dropped + ' dropped out.' : '');
    P.i++; P.timer = setTimeout(next, correct ? 1300 : 2600);
  }
  function showResults(s) {
    show($('band-prompt'), false); show($('band-results'), true);
    $('br-score').textContent = s.right + ' right out of ' + s.asked + '. Longest streak ' + s.best + '. In the pocket ' + s.pocket + ' times.' + (s.average ? ' Your average answer took ' + s.average.toFixed(1) + ' seconds.' : '');
  }

  /* ---------- Entering and leaving ---------- */
  function setMode(on) { $('mode-band').setAttribute('aria-pressed', String(on)); $('mode-explore').setAttribute('aria-pressed', String(!on)); document.body.classList.toggle('band-mode', on); show($('band-row'), on); }
  function enter() {
    if (P.active) return;
    if (typeof PublicTutorial !== 'undefined' && PublicTutorial.active) return;               // not during a walkthrough
    P.saved = { mode: Receiver.mode, person: Receiver.person, gender: Receiver.gender }; P.active = true; setMode(true);
    if (!P.built) {
      P.built = true;
      $('bm-cards').innerHTML = '<button class="bm-card" type="button" data-quiz="sentences"><strong>' + QUIZ.name + '</strong><span>' + QUIZ.blurb + '</span></button>';
      Band.mountSettings($('band-settings')); Band.mountInstruments($('band-instruments')); Band.mountTimer($('band-timer')); Band.mountRing($('band-ring')); Band.mountShout($('band-shout'));
    }
    Band.listBands().then(() => Band.mountSettings($('band-settings')));
    showMenu();
  }
  function exit() {
    if (!P.active) return;
    clearTimeout(P.timer); Band.stopMusic(); P.active = false; P.accepting = false; P.cur = null; setMode(false);
    ['band-menu', 'band-prompt', 'band-results'].forEach(id => show($(id), false));
    Receiver.reset(P.saved.mode, P.saved.person, P.saved.gender);
  }

  /* ---------- Wiring ---------- */
  $('mode-band').addEventListener('click', enter); $('mode-explore').addEventListener('click', exit);
  $('bm-cards').addEventListener('click', e => { if (e.target.closest('[data-quiz]')) startQuiz(); });
  $('bp-hint').addEventListener('click', () => show($('bp-hint-text'), $('bp-hint-text').hidden));
  $('bp-finish').addEventListener('click', () => { if (!Band.state.roundOn) return; P.accepting = false; clearTimeout(P.timer); $('bp-text').textContent = 'The band builds to the finish...'; $('bp-dot').hidden = true; $('bp-finish').disabled = true; $('bp-hint').hidden = true; Band.finishRound(); });
  $('br-again').addEventListener('click', startQuiz); $('br-menu').addEventListener('click', showMenu); $('br-explore').addEventListener('click', exit);
  Band.on('fin', s => { if (P.active) showResults(s); });
  /* The explorer calls PronounPlay.answer() when the disc's center is pressed while the band is active (see explorer.js). */
  window.PronounPlay = { get active() { return P.active; }, answer: () => finishQuestion(false) };
})();
