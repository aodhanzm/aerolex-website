// The edit-mode toolbar (only ever loaded by the local edit-mode server, never on the live site).
// Turn on "Edit mode", click any text, then change its words, font, size, spacing or position in the panel.
// "Save" writes the change into the website files; the page then reloads to show the saved result.
(() => {
  'use strict';
  const info = window.__EDIT;                                    // Which file this page is, and its fingerprint.
  const KEY = 'aerolex-edit-mode';                               // Remembers on/off and scroll position across reloads.
  let on = sessionStorage.getItem(KEY + ':on') === '1';           // Edit mode stays on after a save-and-reload.
  let selected = null;                                           // The element currently being edited.
  let original = '';                                             // Its inline style before editing, to cancel cleanly.
  const changed = new Set();                                     // Which settings were actually touched, so only those get saved.

  // Fonts offered in the menu: the site's own fonts first, then safe fallbacks.
  const FONTS = ["'Cormorant Garamond', Georgia, serif", "'DM Sans', system-ui, sans-serif", 'Georgia, serif', "'Segoe UI', system-ui, sans-serif", 'system-ui, sans-serif'];

  // ---- Toolbar (bottom-left corner) ----
  const bar = document.createElement('div');
  bar.id = 'edit-bar';
  bar.innerHTML = `<button type="button" data-act="toggle"></button><button type="button" data-act="undo">Undo last save</button><span class="edit-status" role="status"></span>`;
  document.body.append(bar);
  // 2026-11-13: on the homepage the visitor-facing buttons are switched off while editing (clicking text selects it instead),
  // so these toolbar buttons are the way to move between the entrance, the three clearing cards and the Projects panel.
  const forest = () => window.aerolexForest;                      // Set by the homepage's forest script; missing on other pages.
  if (forest()) {
    const nav = document.createElement('span');
    nav.className = 'edit-nav';
    nav.innerHTML = `<b>Show:</b><button type="button" data-go="home">Entrance</button><button type="button" data-go="0">Brazalete card</button><button type="button" data-go="1">Sanctum card</button><button type="button" data-go="2">Hanyu card</button><button type="button" data-go="projects">Projects panel</button>`;
    bar.append(nav);
  }
  const status = bar.querySelector('.edit-status');
  const say = text => { status.textContent = text; };             // Short messages next to the buttons.

  // ---- Side panel (appears when an element is selected) ----
  const panel = document.createElement('aside');
  panel.id = 'edit-panel';
  panel.hidden = true;
  panel.innerHTML = `
    <h2>Edit this text</h2>
    <label>Words<textarea data-f="text" rows="4"></textarea></label>
    <p class="edit-note" data-note="text"></p>
    <label>Font<select data-f="font-family">${FONTS.map(f => `<option value="${f.replace(/"/g, '&quot;')}">${f.split(',')[0].replace(/'/g, '')}</option>`).join('')}</select></label>
    <div class="edit-row"><label>Size (px)<input data-f="font-size" type="number" min="6" max="200" step="1"></label>
    <label>Weight<select data-f="font-weight">${[300, 400, 500, 600, 700, 800].map(w => `<option>${w}</option>`).join('')}</select></label></div>
    <div class="edit-row"><label>Letter spacing (em)<input data-f="letter-spacing" type="number" step="0.01"></label>
    <label>Line height<input data-f="line-height" type="number" step="0.05" min="0.6" max="3"></label></div>
    <div class="edit-row"><label>Align<select data-f="text-align"><option value="">(as is)</option><option>left</option><option>center</option><option>right</option></select></label>
    <label class="edit-check"><input data-f="font-style" type="checkbox"> Italic</label></div>
    <p class="edit-hint">Move: drag the outlined text on the page, or nudge with the arrows (Shift = 10px).</p>
    <div class="edit-nudge"><button type="button" data-n="0,-1">↑</button><button type="button" data-n="-1,0">←</button><button type="button" data-n="1,0">→</button><button type="button" data-n="0,1">↓</button><span data-pos></span></div>
    <div class="edit-actions"><button type="button" data-act="save-text">Save words</button><button type="button" data-act="save-style">Save look &amp; position</button></div>
    <div class="edit-actions"><button type="button" data-act="reset">Reset look to original</button><button type="button" data-act="close">Cancel</button></div>`;
  document.body.append(panel);
  const field = name => panel.querySelector(`[data-f="${name}"]`);

  // The Projects panel is a "modal" window that the browser draws above everything else, including this toolbar and panel.
  // So whenever such a window is open, the toolbar and panel move inside it (and move back when it closes).
  const reparent = () => {
    const open = [...document.querySelectorAll('dialog[open]')].pop();
    const home = open || document.body;
    for (const el of [bar, panel]) if (el.parentNode !== home) home.append(el);
  };
  new MutationObserver(reparent).observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['open'] });

  // Where the homepage is looking right now (which card or panel), so a save-and-reload can put the page back there.
  const viewState = () => forest() ? { panel: !!document.querySelector('#forest-projects-dialog[open]'), clearing: forest().selected } : null;

  // Show the toolbar state; read-only pages (built by other projects) explain why nothing can be saved.
  function refreshBar() {
    bar.querySelector('[data-act="toggle"]').textContent = on ? '✎ Edit mode: ON' : '✎ Edit mode: OFF';
    document.documentElement.classList.toggle('edit-on', on);
    if (info.readOnly) say('This page is built by another project, so it can’t be edited here.');
  }

  // Current position nudge of an element, read from its "translate" style (e.g. "12px -4px").
  function getShift(el) {
    const t = (el.style.translate || getComputedStyle(el).translate || '').trim();
    if (!t || t === 'none') return [0, 0];
    const [x, y = '0px'] = t.split(/\s+/);
    return [parseFloat(x) || 0, parseFloat(y) || 0];
  }
  function setShift(el, x, y) {
    if (el === selected && panel.hidden === false) changed.add('translate');   // Moving counts as a change to save.
    el.style.translate = `${Math.round(x)}px ${Math.round(y)}px`;
    panel.querySelector('[data-pos]').textContent = `moved ${Math.round(x)}, ${Math.round(y)} px`;
  }

  // Select an element: remember its original look, fill the panel with its current values.
  function select(el) {
    if (selected) cancel();
    selected = el;
    changed.clear();                                             // Fresh selection: nothing changed yet.
    original = el.getAttribute('style') || '';
    el.classList.add('edit-selected');
    const cs = getComputedStyle(el);
    field('text').value = el.innerText;
    // Words can only be rewritten on plain text. Text with styled pieces inside (like the coloured dot after the
    // name) keeps its words; its look and position can still be saved. Those pieces can be clicked on their own.
    const mixed = Number.isNaN(where(el)[1]);
    field('text').disabled = mixed || info.readOnly;
    panel.querySelector('[data-note="text"]').textContent = mixed ? 'This text has styled parts inside, so its words can’t be edited here (its look and position can). Click a single part to edit its words.' : '';
    const fam = FONTS.find(f => cs.fontFamily.replace(/"/g, "'").startsWith(f.split(',')[0])) || FONTS[0];
    field('font-family').value = fam;
    field('font-size').value = Math.round(parseFloat(cs.fontSize));
    field('font-weight').value = String(Math.round(parseFloat(cs.fontWeight) / 100) * 100);
    field('letter-spacing').value = cs.letterSpacing === 'normal' ? 0 : +(parseFloat(cs.letterSpacing) / parseFloat(cs.fontSize)).toFixed(3);
    field('line-height').value = cs.lineHeight === 'normal' ? 1.2 : +(parseFloat(cs.lineHeight) / parseFloat(cs.fontSize)).toFixed(2);
    field('text-align').value = '';
    field('font-style').checked = cs.fontStyle === 'italic';
    const [x, y] = getShift(el);
    setShift(el, x, y);
    changed.delete('translate');                                 // Showing the current position isn't a move.
    panel.hidden = false;
  }

  // Undo any unsaved preview and close the panel.
  function cancel() {
    if (!selected) return;
    if (original) selected.setAttribute('style', original); else selected.removeAttribute('style');
    selected.classList.remove('edit-selected');
    selected = null;
    panel.hidden = true;
  }

  // Live preview: every panel change is applied to the element straight away (not saved yet).
  panel.addEventListener('input', e => {
    if (!selected) return;
    const f = e.target.dataset.f;
    const v = e.target.type === 'checkbox' ? (e.target.checked ? 'italic' : 'normal') : e.target.value;
    if (f === 'text') { selected.innerText = v; return; }
    changed.add(f);                                              // Remember this setting was changed, so it gets saved.
    if (f === 'font-size') selected.style.fontSize = v + 'px';
    else if (f === 'letter-spacing') selected.style.letterSpacing = v + 'em';
    else if (f === 'line-height') selected.style.lineHeight = v;
    else selected.style.setProperty(f, v);
  });

  // The look values to save for the selected element, in CSS form: only the ones changed this time.
  // (Untouched settings keep the page's own rules, e.g. the name heading that shrinks to fit on phones.)
  function styles() {
    const [x, y] = getShift(selected);
    const all = {
      'font-family': field('font-family').value,
      'font-size': field('font-size').value + 'px',
      'font-weight': field('font-weight').value,
      'font-style': field('font-style').checked ? 'italic' : 'normal',
      'letter-spacing': field('letter-spacing').value + 'em',
      'line-height': field('line-height').value,
      'text-align': field('text-align').value,
      translate: x || y ? `${Math.round(x)}px ${Math.round(y)}px` : '',
    };
    return Object.fromEntries(Object.entries(all).filter(([k]) => changed.has(k)));
  }

  // Send a save to the local server; on success, reload so the page shows exactly what's on disk.
  async function post(kind, payload) {
    say('Saving…');
    const r = await fetch('/__edit/' + kind, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const out = await r.json().catch(() => ({}));
    if (!r.ok || out.ok === false) { say(out.error || out.message || 'Couldn’t save.'); return; }
    sessionStorage.setItem(KEY + ':scroll', String(scrollY));
    sessionStorage.setItem(KEY + ':view', JSON.stringify(viewState()));   // Return to the same card or panel after the reload.
    location.reload();
  }
  // The element's position in the file, as labelled by the server: "tagStart:textStart:textEnd".
  // An empty part (text with styled pieces inside has no word positions) becomes "not a number", not 0.
  const where = el => (el.getAttribute('data-edit-src') || '').split(':').map(v => (v === '' ? NaN : Number(v)));

  panel.addEventListener('click', e => {
    const act = e.target.dataset.act;
    const n = e.target.dataset.n;
    if (n && selected) {                                          // Nudge buttons: 1px, or 10px with Shift.
      const [dx, dy] = n.split(',').map(Number);
      const step = e.shiftKey ? 10 : 1;
      const [x, y] = getShift(selected);
      setShift(selected, x + dx * step, y + dy * step);
    }
    if (!selected || !act) return;
    const [tagStart, textStart, textEnd] = where(selected);
    if (act === 'close') cancel();
    // Words are only saved for plain text (see select()); otherwise explain instead of saving.
    if (act === 'save-text' && Number.isNaN(textStart)) { say('These words can’t be edited here; click a single part instead.'); return; }
    if (act === 'save-text') post('text',{ file: info.file, version: info.version, textStart, textEnd, text: field('text').value });
    if (act === 'save-style') {
      // Script-filled text has no position in the file; its look is saved on its nearest labelled parent instead.
      if (Number.isNaN(tagStart)) { say('Pick text that comes from the page file to save its look.'); return; }
      if (!changed.size) { say('Nothing changed yet.'); return; }
      post('style', { file: info.file, version: info.version, tagStart, styles: styles() });
    }
    // Reset removes everything saved for this element, returning it to the page's normal look and place.
    if (act === 'reset') post('style', { file: info.file, version: info.version, tagStart, styles: {}, reset: true });
  });

  // ---- Page interaction while edit mode is on ----
  // Clicking text selects it instead of following links or pressing buttons.
  document.addEventListener('click', e => {
    if (!on || bar.contains(e.target) || panel.contains(e.target)) return;
    const el = e.target.closest('[data-edit-src]');
    e.preventDefault();
    e.stopPropagation();
    if (el) select(el);
  }, true);

  // Dragging the selected element moves it; the shift is previewed live and saved with "Save look & position".
  let drag = null;
  document.addEventListener('pointerdown', e => {
    if (!on || !selected || !selected.contains(e.target)) return;
    const [x, y] = getShift(selected);
    drag = { sx: e.clientX, sy: e.clientY, x, y };
    e.preventDefault();
  }, true);
  document.addEventListener('pointermove', e => {
    if (drag) setShift(selected, drag.x + e.clientX - drag.sx, drag.y + e.clientY - drag.sy);
  });
  document.addEventListener('pointerup', () => { drag = null; });

  // Toolbar buttons: switch edit mode on/off, and undo the most recent save.
  bar.addEventListener('click', async e => {
    const act = e.target.dataset.act;
    if (act === 'toggle') {
      on = !on;
      sessionStorage.setItem(KEY + ':on', on ? '1' : '0');
      if (!on) cancel();
      refreshBar();
    }
    const go = e.target.dataset.go;                                // "Show:" buttons on the homepage.
    if (go !== undefined && forest()) {
      cancel();                                                    // Drop any unsaved preview before changing what's on screen.
      const f = forest();
      const panelOpen = !!document.querySelector('#forest-projects-dialog[open]');
      if (go === 'projects') { if (panelOpen) f.closePanels(); else { f.closePanels(); f.openPanel('projects'); } }
      else { f.closePanels(); if (go === 'home') f.home(); else f.visit(Number(go)); }
    }
    if (act === 'undo') {
      const r = await fetch('/__edit/undo', { method: 'POST', body: '{}' });
      const out = await r.json().catch(() => ({}));
      if (out.ok) { sessionStorage.setItem(KEY + ':scroll', String(scrollY)); sessionStorage.setItem(KEY + ':view', JSON.stringify(viewState())); location.reload(); }
      else say(out.message || 'Nothing to undo.');
    }
  });

  // After a save-and-reload, return to where the page was scrolled.
  const back = sessionStorage.getItem(KEY + ':scroll');
  if (back) { sessionStorage.removeItem(KEY + ':scroll'); addEventListener('load', () => scrollTo(0, +back)); }
  // After a save-and-reload, show the same card or panel again (the page itself always restarts at the entrance).
  try {
    const view = JSON.parse(sessionStorage.getItem(KEY + ':view') || 'null');
    sessionStorage.removeItem(KEY + ':view');
    if (view && forest()) { if (view.panel) forest().openPanel('projects'); else if (view.clearing >= 0) forest().visit(view.clearing); }
  } catch (_) { /* A missing or odd remembered view is simply ignored. */ }
  refreshBar();
})();
