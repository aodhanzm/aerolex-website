const BrazaleteQuiz = (() => { // Keep scoring and saved-session validation independent of the screen.
  const questions = [ // Use existing supported present-tense data with explicit English person cues.
    {id:'eat-i',lemma:'comer',person:0,prompt:'I eat.'}, // Practise the first-person form without an ambiguous subject.
    {id:'live-you',lemma:'vivir',person:1,prompt:'You live. (tú)'}, // Identify singular informal you explicitly.
    {id:'work-she',lemma:'trabajar',person:2,prompt:'She works.'}, // Practise a third-person singular regular verb.
    {id:'buy-we',lemma:'comprar',person:3,prompt:'We buy.'}, // Include a plural person in the first session.
    {id:'need-they',lemma:'necesitar',person:5,prompt:'They need.'}, // Include third-person plural agreement.
    {id:'have-i',lemma:'tener',person:0,prompt:'I have.'}, // Include a supported irregular first-person form.
    {id:'want-he',lemma:'querer',person:2,prompt:'He wants.'}, // Include an existing stem-changing form without inventing a new pattern quiz.
    {id:'see-we',lemma:'ver',person:3,prompt:'We see.'}, // Practise a second supported irregular verb.
    {id:'pay-you',lemma:'pagar',person:1,prompt:'You pay. (tú)'}, // Keep the required regional pronoun unambiguous.
    {id:'be-they',lemma:'ser',person:5,prompt:'They are. (identity; use ser)'}, // Distinguish ser from estar in the prompt itself.
  ]; // Keep this first topic bounded to ten reviewed existing-table forms.
  const byId = id => questions.find(q => q.id === id); // Recover trusted question text from its saved identifier.
  const expected = (q, verbs) => verbs[q.lemma].ind.pres[q.person]; // Read the answer from the maintained conjugation tables.
  function create(options, random = Math.random) { // Start a fresh session with a stable order that can be resumed.
    const ids = questions.map(q => q.id); // Save identifiers instead of trusting saved prompt or answer text.
    for (let i=ids.length-1;i>0;i--) { const j=Math.floor(random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]]; } // Shuffle once rather than rearranging questions during a retry.
    return {version:1,ids,index:0,records:[],attempts:[],stage:'question',options:{mode:options.mode,hints:!!options.hints,retries:!!options.retries},device:null}; // Store only the state needed for this quiz.
  } // Exploration state belongs to the separate working page.
  function submit(session, piece, verbs) { // Score only deliberate center-button submissions.
    if (session.stage!=='question'||!piece) return null; // Avoid rescoring a completed question or empty device.
    const q=byId(session.ids[session.index]); // Select the current trusted question.
    const form=(piece.neg?'no ':'')+piece.text; // Preserve the full submitted form for later review.
    const correct=piece.lemma===q.lemma&&form===expected(q,verbs)&&piece.dials[0]===0&&piece.dials[1]===q.person&&piece.dials[2]===3; // Require the requested verb, mood, person and tense rather than a coincidentally equal string.
    session.attempts.push({form,lemma:piece.lemma,correct}); // Count loading/unloading nowhere in the scoring model.
    const done=correct||!session.options.retries||session.attempts.length>=2; // Respect independently selected retry settings.
    if (done) { session.records.push({id:q.id,correct,attempts:session.attempts.map(a=>({...a}))});session.stage='feedback'; } // Keep the original result fixed after the explanation is revealed.
    return {correct,done,expected:expected(q,verbs)}; // Let the UI choose whether the explanation is visible yet.
  } // Extra practice never calls this function once a question is recorded.
  const score = session => ({correct:session.records.filter(r=>r.correct).length,retried:session.records.filter(r=>r.correct&&r.attempts.length===2).length,total:session.ids.length}); // Count second-attempt success as correct and report its retry separately.
  function valid(value, verbs) { // Reject corrupt or obsolete browser storage before it can affect the device.
    if (!value||value.version!==1||!Array.isArray(value.ids)||value.ids.length!==10||new Set(value.ids).size!==10||value.ids.some(id=>!byId(id))) return false; // Accept only this exact bounded topic.
    if (!Number.isInteger(value.index)||value.index<0||value.index>=10||!['question','feedback'].includes(value.stage)) return false; // Prevent impossible positions and unsupported stages.
    if (!value.options||!['guided','challenge'].includes(value.options.mode)||typeof value.options.hints!=='boolean'||typeof value.options.retries!=='boolean') return false; // Preserve independently adjustable settings with safe types.
    const attempt=a=>a&&typeof a.form==='string'&&a.form.length<100&&Object.hasOwn(verbs,a.lemma)&&typeof a.correct==='boolean'; // Saved answers are plain bounded strings, never executable markup.
    if (!Array.isArray(value.attempts)||value.attempts.length>2||value.attempts.some(a=>!attempt(a))) return false; // Limit saved attempts to the agreed maximum.
    if (!Array.isArray(value.records)||value.records.length!==value.index+(value.stage==='feedback'?1:0)||value.records.some((r,i)=>!r||r.id!==value.ids[i]||typeof r.correct!=='boolean'||!Array.isArray(r.attempts)||r.attempts.length<1||r.attempts.length>2||r.attempts.some(a=>!attempt(a)))) return false; // Keep question order and recorded results consistent.
    const d=value.device; // Validate a narrow device snapshot rather than restoring an arbitrary engine object.
    if (d!==null&&(!d||!Object.hasOwn(verbs,d.lemma)||!Number.isInteger(d.mood)||d.mood<0||d.mood>2||!Number.isInteger(d.tense)||d.tense<0||d.tense>6||!Number.isInteger(d.person)||d.person< -1||d.person>5||typeof d.negative!=='boolean'||!['tu','vos'].includes(d.variety)||!['ra','se'].includes(d.ending))) return false; // Ignore malformed saved selections safely.
    return true; // Only validated unfinished sessions may be resumed.
  } // Browser-storage failure does not prevent taking a fresh quiz.
  return {questions,byId,expected,create,submit,score,valid}; // Expose the small state model for meaningful data/scoring tests.
})(); // Keep internal helpers out of the global namespace.
