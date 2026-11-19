/* The forest is a finite guided journey; all public project links remain ordinary links. */
(() => {
  'use strict';
  const stage = document.querySelector('.forest-stage');
  if (!stage) return;

  const projects = document.querySelector('#projects');
  const about = document.querySelector('#about');
  const contact = document.querySelector('#contact');
  const directory = document.querySelector('#forest-projects-dialog');
  const biography = document.querySelector('#forest-about-dialog');
  // Older browsers keep the complete static portfolio instead of receiving a broken modal experience.
  if (!directory || typeof directory.showModal !== 'function') return;
  directory.append(projects);
  biography.append(about, contact);
  document.body.classList.add('forest-ready');

  // 2026-11-13: the words, buttons and links of each clearing are written in index.html (one card per clearing), so edit mode can
  // retype them. This list now holds only what the page can't hold: each clearing's backdrop picture and where it is centred on phones.
  const worlds = [
    // The Brazalete's backdrop: NZ's original brazalete concept art (device close-up, edges blended into a dark background).
    { name: 'The Brazalete', image: '/assets/forest/brazalete-clearing-v1.webp', mobileFocus: '42%',
      imageLabel: 'A brass and enamel wristband with a glowing wheel of coloured segments for choosing verb forms' },
    // The Sanctum's backdrop: compressed copy of the clearing picture (2026-11-12).
    { name: 'The Sanctum', image: '/assets/forest/the-sanctum-clearing-v1.webp', mobileFocus: '30%',
      imageLabel: 'A Grecian island archipelago with a temple of Athena, a brass-domed observatory and illuminated marble terraces beneath the stars' },
    // Hanyu Courtyard's backdrop (compressed copy, 2026-11-12). Visitors only see the design concept; the playable build is NZ-only.
    { name: 'Hanyu Courtyard', image: '/assets/forest/hanyu-courtyard-clearing-v1.webp', mobileFocus: '48%',
      imageLabel: 'A Chinese scholar’s writing desk and carved wooden study opening onto a lantern-lit garden courtyard and distant mountains' },
    // The Scene's backdrop (added 2026-11-19): the island city of Solmara at sunset, from a stone terrace.
    { name: 'The Scene', image: '/assets/forest/the-scene-clearing-v1.webp', mobileFocus: '35%',
      imageLabel: 'The island city of Solmara at sunset: a giant carved face in a cliff beside a waterfall, pastel domed buildings, a tram and cable cars, and the sea beyond a stone terrace' }
  ];
  const cards = [...stage.querySelectorAll('.world-introduction')];   // The four clearing cards, in path order.
  const backdrop = stage.querySelector('.world-backdrop');
  const nextButtons = [...stage.querySelectorAll('[data-next-clearing]')];   // One "next" button per card.
  const start = stage.querySelector('[data-start-trail]');
  const announcement = document.querySelector('#trail-announcement');
  const motionButton = document.querySelector('#motion-control');
  const stopButtons = [...stage.querySelectorAll('[data-clearing]')];
  const homeButtons = [...document.querySelectorAll('[data-trail-home]')];
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let motionReduced = preference.matches;
  try { motionReduced = motionReduced || sessionStorage.getItem('aerolex:forest:reduce-motion') === 'true'; } catch (_) {}
  let selected = -1;
  let transition = 0;
  let busy = false;
  const worldArt = new Map();

  function reflectMotion() {
    document.body.classList.toggle('forest-motion-reduced', motionReduced);
    motionButton.setAttribute('aria-pressed', String(motionReduced));
    motionButton.textContent = motionReduced ? 'Motion reduced' : 'Reduce motion';
  }
  reflectMotion();
  motionButton.addEventListener('click', () => {
    motionReduced = !motionReduced;
    try { sessionStorage.setItem('aerolex:forest:reduce-motion', String(motionReduced)); } catch (_) {}
    reflectMotion();
  });
  preference.addEventListener('change', event => {
    motionReduced = event.matches;
    reflectMotion();
  });

  function setBusy(value) {
    busy = value;
    stage.setAttribute('aria-busy', String(value));
    stopButtons.forEach(button => { button.disabled = value; });
    nextButtons.forEach(button => { button.disabled = value; });
    start.setAttribute('aria-disabled', String(value));
  }
  function wait(ms) { return new Promise(resolve => setTimeout(resolve, motionReduced ? 0 : ms)); }
  function loadWorldArt(source) {
    if (!worldArt.has(source)) {
      worldArt.set(source, new Promise((resolve, reject) => {
        const image = new Image();
        const timeout = setTimeout(() => reject(new Error('Image loading timed out')), 12000);
        image.onload = () => { clearTimeout(timeout); resolve(); };
        image.onerror = () => { clearTimeout(timeout); reject(new Error('Image could not load')); };
        image.src = source;
      }).catch(error => { worldArt.delete(source); throw error; }));
    }
    return worldArt.get(source);
  }
  function reflectStops() {
    stopButtons.forEach((button, index) => {
      if (index === selected) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    document.querySelector('.back-to-trailhead').hidden = selected === -1;
  }

  async function visit(index) {
    if (busy || index < 0 || index >= worlds.length) return;
    const token = ++transition;
    setBusy(true);
    stage.dataset.phase = 'walking';
    stage.classList.remove('is-revealed');
    stage.classList.add('is-away', 'is-walking');
    // While walking, every card is closed to assistive tech and clicks (only one is ever shown at a time).
    cards.forEach(card => { card.setAttribute('aria-hidden', 'true'); card.inert = true; });
    announcement.textContent = 'Following the path to ' + worlds[index].name + '…';
    try {
      const world = worlds[index];
      await Promise.all([loadWorldArt(world.image), wait(selected === -1 ? 650 : 1000)]);
      if (token !== transition) return;
      selected = index;
      backdrop.style.backgroundImage = 'url("' + world.image + '")';
      backdrop.style.setProperty('--world-focus', world.mobileFocus);
      backdrop.setAttribute('aria-label', world.imageLabel);
      backdrop.setAttribute('aria-hidden', 'false');
      // Show only this clearing's card; its words and buttons are already written in index.html.
      cards.forEach((card, i) => { card.hidden = i !== index; });
      reflectStops();
      // Allow the closed frame to paint before beginning the tree-parting transition.
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (token !== transition) return;
      stage.classList.remove('is-walking');
      stage.classList.add('is-revealed');
      stage.dataset.phase = 'revealing';
      await wait(1800);
      if (token !== transition) return;
      stage.dataset.phase = 'world';
      cards[index].removeAttribute('aria-hidden');
      cards[index].inert = false;
      announcement.textContent = '';
      setBusy(false);
      cards[index].querySelector('h2').focus({ preventScroll: true });
    } catch (_) {
      if (token !== transition) return;
      returnHome(false);
      announcement.textContent = 'The artwork couldn’t load. Try the path again, or use Projects in the menu.';
    }
  }

  function returnHome(focus = true) {
    ++transition;
    selected = -1;
    stage.classList.remove('is-away', 'is-revealed', 'is-walking');
    stage.dataset.phase = 'entrance';
    backdrop.setAttribute('aria-hidden', 'true');
    cards.forEach(card => { card.hidden = true; card.setAttribute('aria-hidden', 'true'); card.inert = true; });
    announcement.textContent = '';
    setBusy(false);
    reflectStops();
    if (focus) start.focus({ preventScroll: true });
  }
  start.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    visit(0);
  });
  stopButtons.forEach((button, index) => button.addEventListener('click', () => visit(index)));
  // "Check out other projects": the first two cards walk on to the next clearing; the last one opens the projects panel
  // (NZ's choice, 2026-11-13) instead of going back to the forest entrance.
  nextButtons.forEach(button => button.addEventListener('click', () => {
    if (selected === worlds.length - 1) { returnHome(false); openPanel('projects'); } else visit(selected + 1);
  }));
  homeButtons.forEach(button => button.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    returnHome();
  }));

  function closePanels() {
    [directory, biography].forEach(dialog => { if (dialog.open) dialog.close(); });
  }
  function openPanel(which, focusId) {
    const dialog = which === 'projects' ? directory : biography;
    closePanels();
    dialog.showModal();
    const target = focusId ? dialog.querySelector('#' + focusId) : dialog.querySelector('h2');
    if (target) {
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      if (focusId) target.scrollIntoView({ block: 'nearest' });
    }
  }
  document.querySelectorAll('[data-forest-panel]').forEach(link => link.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    openPanel(link.dataset.forestPanel);
  }));
  [directory, biography].forEach(dialog => {
    dialog.querySelector('[data-close-forest-panel]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const b = dialog.getBoundingClientRect();
      if (event.clientX < b.left || event.clientX > b.right || event.clientY < b.top || event.clientY > b.bottom) dialog.close();
    });
  });
  projects.querySelectorAll('.project-card').forEach((article, index) => {
    const button = document.createElement('button');
    button.className = 'forest-find-clearing';
    button.type = 'button';
    button.textContent = 'Show in this forest';
    button.addEventListener('click', () => {
      closePanels();
      visit(index);
    });
    article.append(button);
  });
  // 2026-11-13: the Privacy and Cookie settings links that used to sit at the bottom of this panel are gone (NZ's request);
  // they remain in the page footer and the About page.
  // The local edit tool (_tools/edit-mode) uses these to show a clearing or the projects panel while editing.
  // Visitors never need them; they only read what is on the page.
  window.aerolexForest = { visit, home: () => returnHome(false), openPanel, closePanels, get selected() { return selected; }, get busy() { return busy; } };
  const initialHash = location.hash;
  // Links like aerolex.dev/#project-brazalete open the projects panel at that card (The Scene's card was replaced).
  if (['#projects', '#project-brazalete', '#project-sanctum', '#project-chinese'].includes(initialHash)) {
    openPanel('projects', initialHash.startsWith('#project-') ? initialHash.slice(1) : null);
  } else if (initialHash === '#chinese-project') {
    location.replace('/hanyu-courtyard/'); // Old links to the Hanyu preview window go to its project page.
  } else if (['#about', '#experience', '#education', '#contact'].includes(initialHash)) {
    location.replace(initialHash === '#contact' ? '/about/#contact' : '/about/'); // Old links to the About panel go to the About page.
  }
})();
