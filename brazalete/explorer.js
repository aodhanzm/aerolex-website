(() => { // Keep the standalone page state separate from the game.
  'use strict'; // Catch accidental global assignments during exploration.
  const $ = id => document.getElementById(id); // Refer to the page's own labelled controls.
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); // Render supported labels safely.
  const key = 'aerolex.brazalete.explorer.v1'; // Isolate these preferences from every other product.
  let prefs = {}, filter = 'all'; // Start with the complete library and first-visit defaults.
  try { prefs = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch { $('save-notice').textContent = 'This browser cannot restore saved settings. You can still use the tool.'; } // Continue when local saving is unavailable.
  const saved = { ...prefs }; // Snapshot restoration settings before the first device redraw saves defaults.
  let sound = prefs.sound === true; // A first visit is muted.
  const library = [...Object.keys(VERBS).map(lemma => ({ kind: 'verb', lemma, en: VERBS[lemma].en })), ...Object.keys(ADJECTIVES).map(lemma => ({ kind: 'adj', lemma, en: ADJECTIVES[lemma].en }))]; // Search only the current supported words.
  const strip = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); // Let searches find frío without requiring an accent.
  function save() { // Remember only safe explorer settings at this checkpoint.
    if (PublicTutorial.busy) return; // Never overwrite exploration preferences with a walkthrough example.
    const value = { sound, variety: Gadget.variety, word: Gadget.word, verb: Gadget.word?.kind === 'verb' ? Gadget.dials : prefs.verb, adj: Gadget.word?.kind === 'adj' ? Gadget.dials : prefs.adj, neg: Gadget.negative, role: Receiver.mode, person: Receiver.person, gender: Receiver.gender }; // Keep the selected word and device controls on this browser.
    prefs = value; // Retain the current preferences even when browser storage fails.
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { $('save-notice').textContent = 'Your settings cannot be saved in this browser. The current session still works.'; } // Report the limit without interrupting practice.
  } // Quiz results and unfinished questions will be handled at their own checkpoint.
  function personLabel(i) { // Use clear labels around the smaller hardware lettering.
    if (i === 1) return Gadget.variety === 'vos' ? 'vos · one friend' : 'tú · one friend'; // Keep informal singular address explicit.
    return ['yo', '', 'él / ella / usted', 'nosotros / nosotras', 'vosotros / vosotras · Spain', 'ellos / ellas / ustedes'][i]; // Include all six existing positions.
  } // Vosotros remains a plural choice regardless of the regional switch.
  const tenseHelp = { pres: 'present', pret: 'preterite', impf: 'imperfect', cond: 'conditional', fut: 'future', ger: 'gerund', ppart: 'past participle' }; // Distinguish non-finite forms from finite tenses.
  const moodHelp = ['indicative', 'subjunctive', 'command']; // Keep Spanish controls with short English help.
  function availableTense(index) { // Check actual tables rather than pretending every mood has every tense.
    if (!Gadget.word || Gadget.word.kind !== 'verb') return true; // Adjectives do not use this dial.
    const t = TENSES[index], mood = MOODS[Gadget.dials[0]].id; // Read the active verb and mood.
    return !t.locked && (!Gadget.lens?.tenses || Gadget.lens.tenses.includes(t.id)) && (t.nonFinite || !!VERBS[Gadget.word.lemma][mood]?.[t.id]); // Keep valid non-finite forms available independently of person.
  } // Missing rows remain visibly powered down.
  function optionsFor(dial) { // Describe the same controls for keyboard, touch and native selection.
    if (Gadget.word.kind === 'adj') return dial === 0 ? GENDERS.map((x, i) => ({ label: x.full + (i ? ' · feminine' : ' · masculine'), disabled: false })) : NUMBERS.map((x, i) => ({ label: x.full + (i ? ' · plural' : ' · singular'), disabled: false })); // Use the maintained adjective settings.
    if (dial === 0) return MOODS.map((m, i) => ({ label: m.full + ' · ' + moodHelp[i], disabled: !!Gadget.lens?.moods && !Gadget.lens.moods.includes(m.id) })); // Respect later quiz restrictions through the existing lens.
    if (dial === 2) return TENSES.map((t, i) => ({ label: t.full + ' · ' + tenseHelp[t.id], disabled: !availableTense(i) })); // Explain unavailable rows through disabled options.
    const nf = TENSES[Gadget.dials[2]].nonFinite, imp = MOODS[Gadget.dials[0]].id === 'imp'; // Commands have no yo form; non-finite forms have no person.
    return PERSONS.map((p, i) => ({ label: nf ? 'No person · non-finite form' : personLabel(i), disabled: !!nf || (imp && i === 0) })); // Prevent selecting a meaningless grammatical person.
  } // The large companion controls are equivalent to the physical dials.
  function select(id, label, options, selected, wide = false) { // Build a labelled native control with genuine disabled choices.
    return `<div class="${wide ? 'wide' : ''}"><label for="${id}">${label}</label><select id="${id}" ${options.every(o => o.disabled) ? 'disabled' : ''}>${options.map((o, i) => `<option value="${i}" ${o.disabled ? 'disabled' : ''} ${i === selected ? 'selected' : ''}>${escape(o.label)}</option>`).join('')}</select></div>`; // Escape labels and expose selection through browser-native semantics.
  } // Do not replace readable labels with colour-only cues.
  function restoreFocus(id) { if (id && $(id) && !$(id).disabled) $(id).focus({ preventScroll: true }); } // Keep keyboard focus after a control redraw.
  function refresh() { // Update the surrounding controls after any shared-device change.
    if (!Gadget.word) return; // The first mount briefly has no loaded word.
    const focused = document.activeElement?.id, word = Gadget.word, dials = Gadget.dials; // Preserve the current keyboard location.
    $('loaded-word').textContent = `${word.lemma} · ${library.find(w => w.lemma === word.lemma).en}`; // Keep the collapsed phone picker informative.
    $('word-kind').textContent = word.kind === 'verb' ? 'Verbo' : 'Adjetivo'; // Identify the current device mode.
    const order = word.kind === 'verb' ? [0, 2, 1] : [0, 1], names = word.kind === 'verb' ? ['MODO · Mood', 'PERSONA · Person', 'TIEMPO · Tense / form'] : ['GÉNERO · Gender', 'NÚMERO · Number']; // Follow the established working order.
    $('native-controls').innerHTML = order.map(i => select('dial-' + i, names[i], optionsFor(i), dials[i], word.kind === 'verb' && i === 1)).join('') + (word.kind === 'verb' ? `<div class="wide polarity" role="group" aria-label="Polarity"><button type="button" data-polarity="0" aria-pressed="${!Gadget.negative}">SÍ · affirmative</button><button type="button" data-polarity="1" aria-pressed="${Gadget.negative}">NO · negative</button></div>` : ''); // Provide touch-friendly control alternatives.
    $('device').querySelectorAll('svg').forEach(svg => svg.setAttribute('aria-hidden', 'true')); // Native labelled controls provide the complete accessible equivalent to the illustration.
    $('device').querySelectorAll('[data-dial][data-stop]').forEach(el => { const disabled = !!optionsFor(+el.dataset.dial)[+el.dataset.stop]?.disabled; el.setAttribute('aria-disabled', String(disabled)); el.classList.toggle('locked', disabled); }); // Keep the physical drawing consistent with the available controls.
    $('device').querySelectorAll('.tense-label').forEach((el, i) => el.classList.toggle('locked', !availableTense(i))); // Keep inactive labels readable and gray.
    if (word.kind === 'verb' && TENSES[dials[2]].nonFinite) $('device').querySelector('[data-dial="1"].ro .ro-val').textContent = 'sin persona · non-finite'; // Do not label a gerund or participle with a grammatical person.
    const form = Gadget.formFor(word, dials, Gadget.negative); // Read the shared engine rather than creating another conjugator.
    $('device').querySelector('.gadget-eject').disabled = !form; // Do not offer confirmation when no form exists.
    if (word.kind === 'adj') $('form-help').textContent = 'Set gender and number to match the noun this adjective describes.'; // Explain agreement without inventing a sentence.
    else if (TENSES[dials[2]].nonFinite) $('form-help').textContent = `${TENSES[dials[2]].full}: this form has no person. Mood and person do not change it. ${VERBS[word.lemma].reflexive && TENSES[dials[2]].id === 'ppart' ? 'This is the bare participle; it needs a construction to make a sentence.' : ''}`; // Do not imply a gerund or participle is a person-inflected tense.
    else if (!form) $('form-help').textContent = 'There is no form for this combination. Choose an available tense or person.'; // Explain an unavailable result without claiming a missing verb.
    else $('form-help').textContent = MOODS[dials[0]].id === 'imp' && Gadget.negative ? 'A negative command uses a present-subjunctive verb form. Gray choices are unavailable with this mood.' : 'Turn the controls, then press CONFIRM. Gray choices are unavailable with this mood.'; // Keep the grammatical-form distinction visible during exploration.
    $('variety-status').textContent = `${Gadget.variety === 'vos' ? 'Vos · Argentina / Uruguay' : 'Tú · informal singular'}. The left-rim switch offers ${Gadget.variety === 'vos' ? 'Tú' : 'Vos'}. Vosotros stays plural, for Spain.`; // Keep the current variety visible when the shared switch changes.
    restoreFocus(focused); // Let keyboard users continue operating the same labelled control.
    PublicTutorial.decorate(); // Keep native and physical controls aligned with the current guided step.
    save(); // Remember preferences after physical or companion-control interaction.
  } // Rendering never confirms a form automatically.
  function refreshPronouns() { // Update the disc's accessible companion controls after a selection.
    const focused = document.activeElement?.id; // Preserve keyboard navigation through a redraw.
    const roles = [{ label: 'VÍCTIMA · direct object' }, { label: 'RECEPTOR · indirect object' }, { label: 'REFLEXIVO · reflexive' }]; // Keep the existing Spanish role names with English help.
    const split = Array.isArray(OBJECT_PRONOUNS[Receiver.mode][Receiver.person]); // Only direct third-person pronouns split by gender.
    $('pronoun-controls').innerHTML = select('role', 'FUNCIÓN · Role', roles, ['vic', 'rec', 'ref'].indexOf(Receiver.mode), true) + select('rx-person', 'PERSONA · Person', PERSONS.map((p, i) => ({ label: personLabel(i) })), Receiver.person, true) + select('rx-gender', 'GÉNERO · Gender', GENDERS.map(g => ({ label: g.full, disabled: !split })), Receiver.gender); // Match the large controls to the actual disc state.
    $('receiver').querySelectorAll('svg').forEach(svg => svg.setAttribute('aria-hidden', 'true')); // Expose the native equivalent rather than duplicate small SVG controls.
    $('receiver').querySelectorAll('[data-rx-mode]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.rxMode === Receiver.mode))); // Make the physical role buttons announce selection correctly.
    $('receiver').querySelector('.rx-switch').setAttribute('role', 'group'); // Buttons with pressed states form a group, not an incomplete radio interface.
    $('pronoun-help').textContent = { vic: 'Direct object: the person or thing affected by the verb. Lo / la and los / las follow the noun’s gender and number.', rec: 'Indirect object: the person receiving something or affected indirectly. Le and les do not change for gender.', ref: 'Reflexive: in examples such as me levanto, this pronoun matches the subject. Tú and Vos both use te.' }[Receiver.mode]; // Give scoped role explanations without a universal placement rule.
    restoreFocus(focused); // Keep the selected companion control focused.
    PublicTutorial.decorate(); // Apply the same guided restrictions to native pronoun controls.
    save(); // Remember role and cell choices separately from the game.
  } // Changing the disc never changes the selected verb or adjective.
  function renderLibrary() { // Search Spanish and English words without accepting unsupported verbs.
    const query = strip($('search').value.trim()), words = library.filter(w => (filter === 'all' || w.kind === filter) && strip(w.lemma + ' ' + w.en).includes(query)); // Accent-insensitive search matches the supported set.
    $('word-count').textContent = words.length ? `${words.length} supported ${words.length === 1 ? 'word' : 'words'}` : 'No supported words match. Try another search.'; // State empty search results clearly.
    $('word-list').innerHTML = words.map(w => `<button type="button" data-lemma="${escape(w.lemma)}" aria-pressed="${Gadget.word?.lemma === w.lemma}"><span lang="es">${escape(w.lemma)}</span><small>${escape(w.en)} · ${w.kind === 'verb' ? 'verb' : 'adjective'}</small></button>`).join(''); // Keep every result available as a real keyboard/touch button.
  } // Search does not reset or submit the working device.
  function load(lemma) { // Load only a known supported word.
    const word = library.find(w => w.lemma === lemma); // Reject stale saved words instead of failing inside the shared renderer.
    if (!word) return; // Preserve the current tool if a saved entry is unavailable.
    Gadget.load(word); // Reuse the shared loading interaction.
    if (word.kind === 'verb' && !availableTense(Gadget.dials[2])) Gadget.set(2, TENSE_HOME); // Avoid carrying an incompatible tense across word loads.
    $('confirmed').textContent = 'Choose a form, then press CONFIRM.'; // Clear stale confirmed content when the selected word changes.
    renderLibrary(); // Mark the current word in the search results.
  } // The tool remains loaded after later confirmations.
  function confirm() { // Confirm exactly the form currently visible on the shared device.
    if (!PublicTutorial.allows('confirm')) return; // Require the current tutorial's explicit confirmation step.
    const piece = Gadget.eject(); // Let the maintained device validate availability and play its sound.
    if (piece) { $('confirmed').textContent = (piece.neg ? 'no ' : '') + piece.text; PublicTutorial.notify('confirm'); } // Teach confirmation through an intentional successful submission. // Add negation once to the complete phrase.
  } // Confirmation leaves all controls available for the next experiment.
  function confirmPronoun() { if (!PublicTutorial.allows('rx-confirm')) return; $('pronoun-output').textContent = `${Receiver.form} · ${['direct object', 'indirect object', 'reflexive'][['vic', 'rec', 'ref'].indexOf(Receiver.mode)]}`; SFX.eject(); PublicTutorial.notify('rx-confirm'); } // Confirm both spelling and role without attaching another pronoun to a reflexive verb.
  function changeVariety(variety) { // Change informal singular address without loading the word again.
    Gadget.variety = variety; // Preserve mood, tense, person and polarity through the shared component.
    Receiver.configurePublic(variety); // Keep the pronoun te and update only its subject label.
    $('variety-status').textContent = `${variety === 'vos' ? 'Vos · Argentina / Uruguay' : 'Tú · informal singular'}. The switch on the left rim offers ${variety === 'vos' ? 'Tú' : 'Vos'}. Vosotros stays plural, for Spain.`; // Explain the hardware's action label without duplicating its control.
    refreshPronouns(); // Keep companion labels and saved preferences aligned.
  } // The plural vosotros position is never exchanged.
  function unlock() { if (sound) { try { SFX.unlock(); } catch { $('save-notice').textContent = 'Sound is unavailable in this browser. The tool still works.'; } } } // Create audio only after an intentional gesture with sound enabled.
  SFX.setEnabled(sound); // Honour mute before the first load sound can be requested.
  Gadget.configurePublic(VOS_FORMS); // Opt this page into the explicit regional extension of the existing engine.
  Gadget.mount($('device'), refresh); // Use the current working drawing and its existing pointer controls.
  Receiver.mount($('receiver')); Receiver.show(true); // Make all pronoun roles immediately available.
  Receiver.onSet = part => { refreshPronouns(); PublicTutorial.notify(part === 'switch' ? 'rx-role' : 'rx-person'); }; Receiver.onEject = confirmPronoun; // Observe physical disc changes and keep its confirmation connected to the page.
  Gadget.guard = (dial, stop) => typeof dial !== 'number' || !optionsFor(dial)[stop]?.disabled; // Block unavailable SVG choices as well as native controls.
  Gadget.onSet = dial => { if (Gadget.word.kind === 'verb' && dial === 0) { if (!availableTense(Gadget.dials[2])) Gadget.set(2, TENSE_HOME); if (MOODS[Gadget.dials[0]].id === 'imp' && Gadget.dials[1] === 0) Gadget.set(1, 1); } if (dial === 'variety') { Receiver.configurePublic(Gadget.variety); refreshPronouns(); } PublicTutorial.notify(dial); }; // Keep grammar valid, sync the physical switch, and observe guided device actions.
  changeVariety(prefs.variety === 'vos' ? 'vos' : 'tu'); // Start with Tú unless this browser remembered Vos.
  load(library.some(w => w.lemma === saved.word?.lemma) ? saved.word.lemma : 'ser'); // Open directly with a supported working word.
  const remembered = saved[Gadget.word.kind === 'verb' ? 'verb' : 'adj']; // Restore only the relevant kind of device controls.
  if (Array.isArray(remembered)) { const order = Gadget.word.kind === 'verb' ? [0, 2, 1] : [0, 1]; order.forEach(i => { if (Number.isInteger(remembered[i]) && optionsFor(i)[remembered[i]] && !optionsFor(i)[remembered[i]].disabled) Gadget.set(i, remembered[i]); }); } // Validate every saved index and its availability before restoring it.
  Gadget.setNeg(saved.neg === true); // Restore polarity without changing the loaded word.
  Receiver.reset(['vic', 'rec', 'ref'].includes(saved.role) ? saved.role : 'vic', Number.isInteger(saved.person) && saved.person >= 0 && saved.person < 6 ? saved.person : 0, saved.gender === 1 ? 1 : 0); // Ignore malformed saved pronoun controls.
  refreshPronouns(); // Populate the accessible disc controls after restoration.
  $('sound').textContent = sound ? 'Sound on' : 'Sound off'; $('sound').setAttribute('aria-pressed', String(sound)); // Show the actual sound preference.
  const phone = matchMedia('(max-width: 740px)'); $('picker').open = !phone.matches; // Collapse the phone library without shrinking the device's controls.
  phone.addEventListener('change', e => { $('picker').open = !e.matches; }); // Keep the picker appropriate when the layout changes size.
  $('search').addEventListener('input', renderLibrary); // Filter the list as visitors type.
  document.addEventListener('pointerdown', unlock); document.addEventListener('keydown', unlock); // Respect browser audio gesture requirements.
  $('sound').addEventListener('click', () => { sound = !sound; SFX.setEnabled(sound); unlock(); $('sound').textContent = sound ? 'Sound on' : 'Sound off'; $('sound').setAttribute('aria-pressed', String(sound)); save(); }); // Let visitors opt into sound and remember that choice.
  document.addEventListener('click', event => { // Delegate stable page actions without replacing their event listeners on redraw.
    const result = event.target.closest('[data-lemma]'), type = event.target.closest('[data-filter]'), example = event.target.closest('[data-example]'), polarity = event.target.closest('[data-polarity]'); // Identify only this page's own actions.
    if (result && PublicTutorial.allows('load')) { load(result.dataset.lemma); if (phone.matches) { $('picker').open = false; $('picker').querySelector('summary').focus(); } } // Return focus to the collapsed phone picker after a selection.
    if (type) { filter = type.dataset.filter; document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b === type))); renderLibrary(); } // Keep type filters and their pressed states aligned.
    if (polarity) Gadget.setNeg(polarity.dataset.polarity === '1'); // Reuse the physical SÍ / NO behaviour.
    if (example && PublicTutorial.allows('load')) { const lemma = example.dataset.example; load(lemma); if (Gadget.word.kind === 'verb') { Gadget.set(0, 0); Gadget.set(2, TENSE_HOME); Gadget.setNeg(false); } if (lemma === 'comer') { Gadget.set(1, 1); changeVariety('vos'); } if (lemma === 'nuevo') { Gadget.set(0, 1); Gadget.set(1, 1); } if (lemma === 'levantarse') Gadget.set(1, 3); } // Make each ready-to-try example show its promised form even after a visitor changes tense or polarity.
    if (event.target.closest('#device .gadget-eject')) confirm(); // The physical hub already forwards its click to this button.
  }); // No global keyboard shortcut interferes with search or navigation.
  $('native-controls').addEventListener('change', event => { if (event.target.id.startsWith('dial-')) Gadget.set(+event.target.id.slice(5), +event.target.value); }); // Drive the same shared dials through native selects.
  $('pronoun-controls').addEventListener('change', event => { if (event.target.id === 'role') Receiver.setMode(['vic', 'rec', 'ref'][+event.target.value]); if (event.target.id === 'rx-person') Receiver.set(+event.target.value); if (event.target.id === 'rx-gender') Receiver.set(Receiver.person, +event.target.value); }); // Keep all pronoun companion controls connected to the existing disc.
  $('confirm-pronoun').addEventListener('click', confirmPronoun); // Provide a full-size pronoun confirmation target.
  $('device').addEventListener('keydown', event => { // Restrict fast dial shortcuts to the focused hardware surface.
    if (event.target !== $('device')) return; // Let nested buttons retain their native Enter and Space behaviour.
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' ', 'n', 'N', 't', 'T'].includes(event.key)) event.preventDefault(); else return; // Prevent the device shortcuts from scrolling the page.
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') Gadget.cycleActive(event.key === 'ArrowUp' ? -1 : 1); // Follow mood, tense, person in the established working order.
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { const options = optionsFor(Gadget.active), delta = event.key === 'ArrowLeft' ? -1 : 1; let next = Gadget.dials[Gadget.active]; for (let i = 0; i < options.length; i++) { next = (next + delta + options.length) % options.length; if (!options[next].disabled) { Gadget.set(Gadget.active, next); break; } } } // Skip powered-down choices and never activate a disabled person.
    if (event.key === 'Enter' || event.key === ' ') confirm(); // Confirm explicitly with the focused device.
    if (event.key.toLowerCase() === 't' && Gadget.word.kind === 'verb') Gadget.toggleVariety(); // Operate the same physical regional switch from the focused verb device.
    if (event.key.toLowerCase() === 'n') Gadget.toggleNeg(); // Keep the existing negative-control shortcut.
  }); // Arrow keys outside the hardware continue their normal browser behaviour.
  $('receiver').addEventListener('keydown', event => { // Offer the same keyboard route to pronoun cells as to verb forms.
    if (event.target !== $('receiver') || !['ArrowLeft', 'ArrowRight', 'Enter', ' ', 'v', 'V'].includes(event.key)) return; // Preserve native behaviour on nested buttons.
    event.preventDefault(); if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') Receiver.step(event.key === 'ArrowLeft' ? -1 : 1); else if (event.key.toLowerCase() === 'v') Receiver.toggleMode(); else confirmPronoun(); // Change cells, roles or confirm through the maintained disc.
  }); // Touch, mouse and keyboard all share the same underlying state.
  PublicTutorial.init({ // Let optional walkthroughs borrow the current explorer without owning a second device.
    load, changeVariety, refresh, refreshPronouns, // Reuse the page's existing word loading and presentation.
    capture() { return { gadget: Gadget.captureState(), receiver: { mode: Receiver.mode, person: Receiver.person, gender: Receiver.gender }, prefs: JSON.parse(JSON.stringify(prefs)), confirmed: $('confirmed').textContent, pronounOutput: $('pronoun-output').textContent, focus: document.activeElement?.id }; }, // Save both working tools and previous confirmations before teaching.
    restore(snapshot) { Gadget.restoreState(snapshot.gadget); Receiver.reset(snapshot.receiver.mode, snapshot.receiver.person, snapshot.receiver.gender); Receiver.configurePublic(snapshot.gadget.variety); prefs = snapshot.prefs; refresh(); refreshPronouns(); renderLibrary(); $('confirmed').textContent = snapshot.confirmed; $('pronoun-output').textContent = snapshot.pronounOutput; }, // Return without losing the visitor's work or confirming anything automatically.
    persist: save, // Save only after tutorial cleanup has restored genuine exploration state.
  }); // Quiz-specific pause and restore belongs to the later quiz checkpoint.
})(); // Finish the local explorer with optional, independently replayable walkthroughs.
