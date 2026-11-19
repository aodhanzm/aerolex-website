const PublicTutorial = (() => { // Adapt the game's spotlight, gated controls and explicit confirmation to the public explorer.
  'use strict'; // Keep temporary lesson state out of the game's globals.
  const $ = id => document.getElementById(id); // Address only the public page's own tutorial elements.
  let bridge = null, current = null, restoring = false; // Keep a single lesson and its return snapshot at a time.
  const step = (title, copy, action = null, accept = () => true, focus = null) => ({ title, copy, action, accept, focus }); // Describe a short explanation and, when needed, one deliberate device action.
  const dial = (index, value) => () => Gadget.dials[index] === value; // Check the actual shared dial rather than a duplicate answer model.
  const finish = text => step('Ready to explore', text); // End each walkthrough with an explicit return or replay choice.
  const lessons = { // All new public teaching text remains draft until NZ reviews it.
    intro: { title: 'Introduction', word: 'comer', steps: [ // Start with a supported word and no forced account or lesson sequence.
      step('A word goes in, a form comes out', 'Choose a word with Change word. The brazalete changes verbs with mood, tense or form, and person. Adjectives use gender and number.'), // Introduce the existing device without story or progression promises.
      step('Two tools, different jobs', 'The brazalete changes the loaded word. The pronoun disc explores direct-object, indirect-object and reflexive pronouns. CONFIRM keeps a form below its tool; nothing is submitted just by turning a control.'), // Explain explicit confirmation and the separate disc.
      step('The switch lives on the rim', 'On the left border, level with the singular-you sector, the small button offers the other variety. Vos selects Argentina/Uruguay forms; Tú switches back. The plural vosotros sector stays separate.'), // Teach the exact hardware placement requested by NZ.
      finish('Choose any walkthrough, or return to exploration. Mouse, keyboard and touch use the same controls. You can leave a walkthrough at any time.'), // Keep the introduction short and optional.
    ] }, // Close the introductory cards.
    verbs: { title: 'Verbs', word: 'comer', steps: [ // Reuse the original tutorial's mood, tense, person and confirmation order.
      step('1 · MODO: choose a mood', 'Build “I eat”. Choose IND, indicativo, for this statement. Indicative can describe habits as well as what happens now. SUBJ appears in constructions such as wishes or doubts; IMP builds commands.', 0, dial(0, 0), 'mood'), // Avoid reducing the present tense to this moment alone.
      step('2 · TIEMPO: choose the present', 'Choose PRES, presente. “I eat” is present here. The timeline also includes past and future tenses, alongside two non-finite forms.', 2, dial(2, 3), 'tense'), // Distinguish forms from tenses before the non-finite example.
      step('3 · PERSONA: choose who', 'Choose yo, “I”. The six sectors show the current set of forms. Singular is on the left; plural is on the right. Until you choose, the centre shows the infinitive, comer; tapping the chosen sector again goes back to it.', 1, dial(1, 0), 'person'), // Teach the maintained physical layout.
      step('4 · Confirm como', 'The centre now shows como. Press its CONFIRM control, or use the full-size CONFIRM button below it.', 'confirm', () => Gadget.formFor(Gadget.word, Gadget.dials, Gadget.negative) === 'como', 'hub'), // Require a real submission instead of accepting the starting render.
      step('SÍ / NO: make it negative', 'Press NO to make no como, “I do not eat”. These switches sit on the upper-right rim. In command practice, IMP + NO uses a present-subjunctive verb form.', 'polarity', () => Gadget.negative, 'polarity'), // Include negation without confusing grammatical form and command function.
      step('Confirm the negative phrase', 'Press CONFIRM to keep no como below the device. Turning a control by itself never confirms the phrase.', 'confirm', () => Gadget.negative, 'hub'), // Keep confirmation explicit after changing polarity.
      step('A form without a person: gerundio', 'Choose ger., gerundio. Comiendo is a non-finite form: it does not change for yo, tú or another person. The person controls become unavailable.', 2, dial(2, 4), 'tense'), // Explain the dormant person controls as grammar rather than missing functionality.
      step('Another non-finite form: participio', 'Choose part., participio pasado. Comido has no grammatical person here. A participle on its own is not a complete past-tense sentence.', 2, dial(2, 2), 'tense'), // Avoid teaching a bare participle as a finite past tense.
      finish('Mood, then tense or form, then person when applicable, then confirm. That order is guided here; in free exploration you can turn the available controls in any order.'), // Promise cleanup of the temporary tutorial ordering.
    ] }, // Close the verb walkthrough.
    adjectives: { title: 'Adjectives', word: 'nuevo', steps: [ // Expand the former single adjective tip into a working agreement lesson.
      step('1 · GÉNERO: match the noun', 'Complete las camisas ___. Camisas is feminine. Choose femenino on the gender dial; the adjective becomes nueva before number changes.', 0, dial(0, 1), 'gender'), // Give a checked noun context instead of guessing gender from arbitrary endings.
      step('2 · NÚMERO: more than one', 'Las camisas means more than one shirt. Choose plural on the number dial, so the adjective becomes nuevas.', 1, dial(1, 1), 'number'), // Teach number independently of gender.
      step('Confirm nuevas', 'Press CONFIRM for las camisas nuevas, “the new shirts”. The adjective matches the noun it describes in gender and number.', 'confirm', () => Gadget.formFor(Gadget.word, Gadget.dials, false) === 'nuevas', 'hub'), // Validate the whole intended agreement before completion.
      finish('Both dials are yours in exploration. The supported adjective list currently uses forms that change for gender and number; other Spanish adjectives can follow different patterns.'), // Scope the lesson to the actual current vocabulary.
    ] }, // Close the adjective walkthrough.
    direct: { title: 'Direct objects', word: 'comprar', disc: true, steps: [ // Adapt the original full-noun-to-pronoun demonstration to the public disc.
      step('1 · Choose the direct-object role', 'Compro la camisa means “I buy the shirt”. To replace the known shirt with “it”, choose VÍCTIMA, the device’s direct-object setting.', 'rx-role', () => Receiver.mode === 'vic', 'switch'), // Explain the existing hardware label without inventing a new role.
      step('2 · Choose la', 'La camisa is third-person singular and feminine. Choose the feminine half of the singular third-person sector: la.', 'rx-person', () => Receiver.person === 2 && Receiver.gender === 1, 'sextant'), // Check both person and gender rather than accepting matching text from a different role.
      step('3 · Confirm the pronoun', 'Confirm la. In this present-tense statement, La compro means “I buy it”. The subject is still “I”; the pronoun replaces the shirt.', 'rx-confirm', () => Receiver.mode === 'vic' && Receiver.form === 'la', 'rhub'), // Require the correct role and spelling together.
      finish('In the finite statements used here, the object pronoun goes before the verb. With affirmative commands it attaches after the verb; gerund and infinitive constructions need their own placement rules.'), // Avoid turning introductory placement into a universal rule.
    ] }, // Close the direct-object walkthrough.
    indirect: { title: 'Indirect objects', word: 'comprar', disc: true, steps: [ // Add the dedicated lesson missing from the previous build.
      step('1 · Choose the recipient role', 'Compro una camisa a Ana: “I buy Ana a shirt”. Ana is the recipient. Choose RECEPTOR, the indirect-object setting. The shirt is the direct object.', 'rx-role', () => Receiver.mode === 'rec', 'switch'), // Contrast the recipient with the purchased thing in a single clear context.
      step('2 · Choose le for Ana', 'Choose the singular third-person sector. Le can refer to Ana here: Le compro una camisa a Ana. Le does not change for masculine or feminine recipients.', 'rx-person', () => Receiver.person === 2, 'sextant'), // Teach gender-invariant le with enough context.
      step('3 · Confirm le', 'Confirm le in the RECEPTOR role. The same disc can show similar words in different roles, so the role matters as well as the letters.', 'rx-confirm', () => Receiver.mode === 'rec' && Receiver.form === 'le', 'rhub'), // Require a deliberate role-sensitive confirmation.
      step('4 · More than one recipient', 'Now the recipients are Ana and Luis. Choose the plural third-person sector for les: Les compro una camisa a Ana y Luis.', 'rx-person', () => Receiver.person === 5, 'sextant'), // Demonstrate recipient number without changing the purchased object.
      step('Confirm les', 'Confirm les. Le is singular; les is plural. Neither changes for the recipients’ gender.', 'rx-confirm', () => Receiver.mode === 'rec' && Receiver.form === 'les', 'rhub'), // Check the plural form through the real disc.
      finish('These examples use an indirect object with a finite verb. Combinations such as se la and other constructions need additional instruction; this walkthrough does not teach every pronoun combination.'), // State the introductory scope without claiming complete Spanish coverage.
    ] }, // Close the indirect-object walkthrough.
    reflexive: { title: 'Reflexives', word: 'levantarse', steps: [ // Reuse role, subject mapping and confirmation from the existing reflexive tutorial.
      step('1 · Choose REFLEXIVO', 'Levantarse means “to get up”. Choose REFLEXIVO on the pronoun disc. In te levantas, te matches the subject tú.', 'rx-role', () => Receiver.mode === 'ref', 'switch'), // Use the supported example without generalising about every verb ending in se.
      step('2 · Choose the singular-you sector', 'Choose the singular-you sector for te. Tú and Argentine/Uruguayan vos both use te; plural vosotros uses os.', 'rx-person', () => Receiver.person === 1, 'sextant'), // Distinguish singular Vos from plural Vosotros directly.
      step('Confirm te on the disc', 'Confirm te in REFLEXIVO mode. This explores the pronoun by itself; it does not add another pronoun to a complete reflexive phrase.', 'rx-confirm', () => Receiver.mode === 'ref' && Receiver.form === 'te', 'rhub'), // Prevent the duplicate-pronoun misunderstanding.
      step('3 · Choose tú on the brazalete', 'The loaded word is levantarse. Choose tú on its person dial. The verb display includes the required pronoun: te levantas.', 1, dial(1, 1), 'person'), // Use the same maintained device for the complete phrase.
      step('Confirm te levantas', 'Press CONFIRM on the brazalete. Its phrase already contains te, so the separate disc must not add a second te.', 'confirm', () => Gadget.formFor(Gadget.word, Gadget.dials, false) === 'te levantas', 'hub'), // Validate the full reflexive phrase.
      step('4 · Try the Vos hardware switch', 'Press Vos on the left rim. The phrase becomes te levantás. The verb ending changes while the pronoun stays te.', 'variety', () => Gadget.variety === 'vos', 'variety'), // Teach the requested physical switch inside a useful reflexive context.
      finish('For these supported finite reflexive phrases, the display includes the pronoun. Affirmative commands and gerunds attach it after the verb. The bare participle stays separate and needs a construction.'), // Keep the wording limited to constructions the explorer actually supports.
    ] }, // Close the reflexive walkthrough.
    variety: { title: 'Tú / Vos switch', word: 'comer', steps: [ // Teach the new physical hardware rather than an external regional selector.
      step('1 · Press Vos on the left rim', 'The singular-you sector currently shows tú and comes. Press the small Vos switch on the outside left border, level with that sector. It offers the variety you can switch to.', 'variety', () => Gadget.variety === 'vos', 'variety'), // Match NZ's placement and inverse-label requirements exactly.
      step('2 · Confirm comés', 'The sector now shows vos and comés, for Argentina/Uruguay. The switch now says Tú. Confirm comés without changing the other dials.', 'confirm', () => Gadget.variety === 'vos' && Gadget.formFor(Gadget.word, Gadget.dials, false) === 'comés', 'hub'), // Verify the regional form rather than merely a changed label.
      step('3 · Press Tú to return', 'Press Tú on the same switch. The singular sector returns to tú and comes; the switch offers Vos again.', 'variety', () => Gadget.variety === 'tu', 'variety'), // Require a real second toggle during the lesson.
      step('4 · Vosotros is plural', 'Choose vosotros on the right side of the person circle. It means “you all” in Spain and gives coméis. The singular Tú/Vos switch does not replace this sector.', 1, dial(1, 4), 'person'), // Keep plural Spain address separate from voseo.
      step('Confirm coméis', 'Confirm the plural form coméis. The singular switch still offers Vos; your plural person selection stays in place.', 'confirm', () => Gadget.dials[1] === 4 && Gadget.formFor(Gadget.word, Gadget.dials, false) === 'coméis', 'hub'), // Demonstrate state preservation while using the other plural form.
      finish('The explorer remembers your later choice in this browser. Both Tú and Vos use te. The main Vos subjunctive uses forms such as comas; regional alternatives such as comás also occur.'), // Retain the contract's agreed regional help and first-visit continuity.
    ] }, // Close the regional walkthrough.
  }; // Keep this reviewed-to-be content in the maintained product source.
  function activeStep() { return current && lessons[current.id].steps[current.index]; } // Read the current authored instruction without inferring advancement from rendering.
  function allows(action) { return !current || activeStep().action === action; } // Restrict only the one action being taught while a walkthrough is active.
  function decorate() { // Mirror shared input gates in full-size native controls and readable disabled states.
    if (!bridge) return; // The explorer may render before tutorial initialisation.
    document.querySelectorAll('#native-controls select').forEach(el => { const i = Number(el.id.slice(5)); el.disabled = [...el.options].every(o => o.disabled) || !allows(i); }); // Preserve grammatical unavailability alongside temporary lesson restrictions.
    document.querySelectorAll('[data-polarity]').forEach(el => { el.disabled = !allows('polarity'); }); // Prevent native buttons from bypassing the same polarity gate as the hardware.
    const hardware = $('variety-switch'); if (hardware) hardware.disabled = !allows('variety'); // Keep the physical regional switch as the sole variety control.
    const confirm = $('device').querySelector('.gadget-eject'); if (confirm) confirm.disabled = !Gadget.formFor(Gadget.word, Gadget.dials, Gadget.negative) || !allows('confirm'); // Disable confirmation outside its deliberate lesson step.
    [['role', 'rx-role'], ['rx-person', 'rx-person'], ['rx-gender', 'rx-person']].forEach(([id, action]) => { const el = $(id); if (el) el.disabled = [...el.options].every(o => o.disabled) || !allows(action); }); // Apply role, person and gender restrictions to the accessible disc controls.
    $('confirm-pronoun').disabled = !allows('rx-confirm'); // Keep the full-size pronoun confirmation route gated too.
    document.querySelectorAll('[data-lemma], [data-example]').forEach(el => { el.disabled = !allows('load'); }); // Hold the lesson word steady until exploration is restored.
    if (current) $('form-help').textContent = 'Walkthrough: use the highlighted control. Other controls are temporarily unavailable. Return to exploration restores your previous work.'; // Explain gray controls in words rather than relying on their colour.
  } // The shared device remains responsible for its grammar availability checks.
  function show() { // Display a step without treating existing state as a successful answer.
    const lesson = lessons[current.id], s = activeStep(); current.seen = false; // Reset evidence so each interactive step requires its own deliberate input.
    const disc = typeof s.action === 'string' && s.action.startsWith('rx-'); // Put the card beside the instrument the learner is about to use.
    const target = disc ? $('receiver') : $('device'); target.parentNode.insertBefore($('tutorial-panel'), target); // Reuse one card instead of creating a second teaching surface.
    $('tutorial-panel').hidden = false; $('tutorials').open = false; // Keep the current instruction visible and the chooser compact.
    $('tutorial-progress').textContent = `${lesson.title} · ${current.index + 1} of ${lesson.steps.length}`; // Report progress without a score or timer.
    $('tutorial-title').textContent = s.title; $('tutorial-copy').textContent = s.copy; // Render the authored text as text rather than HTML.
    $('tutorial-feedback').textContent = s.action === null ? '' : 'Try the action above, then choose Next.'; // Explain why Next waits for an intentional action.
    $('tutorial-next').disabled = s.action !== null; $('tutorial-next').textContent = current.index === lesson.steps.length - 1 ? 'Return to exploration' : 'Next'; // Require an explicit transition even after a successful action.
    $('tutorial-replay').hidden = current.index !== lesson.steps.length - 1; $('tutorial-exit').hidden = current.index === lesson.steps.length - 1; // Offer replay beside one clear return action at the end of every walkthrough.
    Gadget.tutFocus = disc || s.focus === 'variety' ? null : s.focus; Receiver.tutFocus = disc ? s.focus : null; // Reuse the original devices' own per-part spotlight support.
    document.querySelectorAll('.tutorial-target').forEach(el => el.classList.remove('tutorial-target')); // Remove the previous step's whole-tool marker.
    (s.focus === 'variety' ? $('variety-switch') : target)?.classList.add('tutorial-target'); // Make the small hardware switch easy to locate during its lesson.
    decorate(); $('tutorial-title').focus({ preventScroll: true }); $('tutorial-panel').scrollIntoView({ block: 'nearest', behavior: 'instant' }); // Announce the new instruction and bring its card into view without animation.
  } // Advancing is always a button or keyboard action, never a render side effect.
  function notify(action) { // Observe only actions reported by the shared devices or explicit confirmation handlers.
    if (!current || restoring || activeStep().action !== action) return; // Ignore setup, restoration and unrelated control changes.
    const correct = activeStep().accept(); current.seen = correct; // Recheck after every relevant action so a later wrong selection cannot retain success.
    $('tutorial-next').disabled = !correct; $('tutorial-feedback').textContent = correct ? 'That is the setting for this example. Choose Next when you are ready.' : 'Try the setting described above. You can change this control and try again.'; // Give a retry without revealing unrelated answers or advancing automatically.
  } // A successful action remains on screen until the visitor chooses Next.
  function end() { // Release every tutorial-owned restriction before restoring the visitor's work.
    if (!current) return; const snapshot = current.snapshot, id = current.id; restoring = true; current = null; // Suppress saving while restoration redraws the device.
    Gadget.gate = null; Receiver.gate = null; Gadget.tutFocus = null; Receiver.tutFocus = null; // Leave no ordering or spotlight hooks in exploration.
    document.querySelectorAll('.tutorial-target').forEach(el => el.classList.remove('tutorial-target')); $('tutorial-panel').hidden = true; // Remove temporary teaching markers and card.
    bridge.restore(snapshot); restoring = false; decorate(); bridge.persist(); // Restore before saving so lesson examples never become the visitor's preferences.
    $('tutorials').open = true; document.querySelector(`[data-tutorial="${id}"]`)?.focus(); // Return keyboard visitors to the lesson they just left.
  } // Closing early and finishing use exactly the same cleanup path.
  function begin(id) { // Start or replay an explicitly chosen walkthrough on the existing hardware.
    if (!bridge || !lessons[id]) return; if (current) end(); // Restore an existing lesson before switching to another topic.
    const snapshot = bridge.capture(); current = { id, index: 0, seen: false, snapshot }; // Capture genuine exploration before changing any example state.
    Gadget.gate = null; Receiver.gate = null; Gadget.lens = null; Gadget.liveReadout = true; // Prepare a public teaching example without game progression locks.
    bridge.changeVariety('tu'); bridge.load(lessons[id].word); // Give each replay the same supported starting word and variety.
    if (Gadget.word.kind === 'verb') { Gadget.set(0, id === 'verbs' ? 1 : 0); Gadget.set(2, id === 'verbs' ? 1 : 3); Gadget.set(1, id === 'variety' ? 1 : Gadget.NO_PERSON); Gadget.setNeg(false); } // Begin interactive verb steps away from their intended setting; the person starts on the infinitive (no person), except the Tú/Vos lesson, which needs the singular-you sector chosen.
    else { Gadget.set(0, 0); Gadget.set(1, 0); } // Start the adjective example masculine and singular for an actual agreement change.
    Receiver.reset(id === 'direct' ? 'ref' : 'vic', 0, 0); bridge.refreshPronouns(); // Make every required role or person choice deliberate.
    Gadget.gate = action => allows(action); Receiver.gate = part => allows({ switch: 'rx-role', sextant: 'rx-person', hub: 'rx-confirm' }[part]); // Reuse both devices' existing tutorial-gating mechanics.
    show(); // Display the first step only after its example is ready.
  } // Lessons never mount a duplicate device or import story dialogue.
  function init(api) { // Connect the public page once after its ordinary restoration has completed.
    bridge = api; document.querySelectorAll('[data-tutorial]').forEach(el => el.addEventListener('click', () => begin(el.dataset.tutorial))); // Let every topic start independently and replay indefinitely.
    $('tutorial-next').addEventListener('click', () => { if (!current || (activeStep().action !== null && !current.seen)) return; if (current.index === lessons[current.id].steps.length - 1) end(); else { current.index++; show(); } }); // Require a successful deliberate action and explicit Next for each guided step.
    $('tutorial-exit').addEventListener('click', end); $('tutorial-replay').addEventListener('click', () => { if (current) begin(current.id); }); // Make early exit and replay available without losing exploration state.
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && current) { event.preventDefault(); end(); } }); // Offer a predictable keyboard exit from any tutorial step.
  } // No automatic introduction or first-visit interruption is installed.
  return { init, begin, end, allows, notify, decorate, get busy() { return restoring || !!current; }, get active() { return !!current; } }; // Expose the minimal lifecycle needed by the explorer and regression checks.
})(); // Keep all temporary tutorial state separate from game and quiz records.
