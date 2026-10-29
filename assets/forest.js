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

  const worlds = [
    {
      id: 'project-scene', name: 'The Scene', category: '01 / LANGUAGE-LEARNING GAME',
      description: 'Beyond the pines, a town on the coast. A Spanish-learning game built around conversations, choices, and the people you meet.',
      contribution: 'Game production · Curriculum design · Product advisory',
      project: '/the-scene/', enter: 'https://play.aerolex.dev/', availability: 'Playable beta · Desktop recommended',
      image: '/assets/forest/the-scene-clearing-v1.png', mobileFocus: '37%',
      imageLabel: 'Solmara’s colorful coastal city with a carved cliff monument, waterfalls, cable cars and a sun arch at sunset'
    },
    {
      id: 'project-sanctum', name: 'The Sanctum', category: '02 / A SPACE FOR REFLECTION',
      description: 'A quiet observatory beyond the trees. A personal space for astrology, journaling, and following your curiosity.',
      contribution: 'Product design · Development',
      project: '/sanctum/about/', enter: '/sanctum/', availability: 'Private tool · Invitation required to join',
      image: '/assets/forest/the-sanctum-clearing-v1.png', mobileFocus: '30%',
      imageLabel: 'A Grecian island archipelago with a temple of Athena, a brass-domed observatory and illuminated marble terraces beneath the stars'
    },
    {
      id: 'project-chinese', name: 'Hànyǔ Courtyard', category: '03 / CHINESE LEARNING',
      description: 'A lantern-lit courtyard at the end of the path. A learning app for understanding characters, building sentences, and writing by hand.',
      contribution: 'Learning experience · App design',
      project: '#chinese-project', enter: null, availability: 'In development · Explore the design concept',
      image: '/assets/forest/hanyu-courtyard-clearing-v1.png', mobileFocus: '48%',
      imageLabel: 'A Chinese scholar’s writing desk and carved wooden study opening onto a lantern-lit garden courtyard and distant mountains'
    }
  ];
  const card = stage.querySelector('.world-introduction');
  const backdrop = stage.querySelector('.world-backdrop');
  const title = document.querySelector('#world-title');
  const category = document.querySelector('#world-category');
  const description = document.querySelector('#world-description');
  const role = document.querySelector('#world-role');
  const availability = document.querySelector('#world-availability');
  const viewLink = document.querySelector('#world-project-link');
  const enterLink = document.querySelector('#world-enter-link');
  const next = stage.querySelector('[data-next-clearing]');
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
    next.disabled = value;
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
    card.setAttribute('aria-hidden', 'true');
    card.inert = true;
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
      category.textContent = world.category;
      title.textContent = world.name;
      description.textContent = world.description;
      role.textContent = 'My contribution: ' + world.contribution;
      availability.textContent = world.availability;
      viewLink.href = world.project;
      viewLink.innerHTML = (index === 2 ? 'View concept' : 'View project') + ' <span aria-hidden="true">↗</span>';
      enterLink.hidden = !world.enter;
      if (world.enter) enterLink.href = world.enter;
      next.innerHTML = (index === worlds.length - 1 ? 'Return to the forest' : 'Continue along the path') + ' <span aria-hidden="true">→</span>';
      card.hidden = false;
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
      card.removeAttribute('aria-hidden');
      card.inert = false;
      announcement.textContent = '';
      setBusy(false);
      title.focus({ preventScroll: true });
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
    card.hidden = true;
    card.setAttribute('aria-hidden', 'true');
    card.inert = true;
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
  next.addEventListener('click', () => selected === worlds.length - 1 ? returnHome() : visit(selected + 1));
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
    button.textContent = 'Find this clearing →';
    button.addEventListener('click', () => {
      closePanels();
      visit(index);
    });
    article.append(button);
  });
  viewLink.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (selected === 2) {
      event.preventDefault();
      const concept = document.querySelector('.project-dialog');
      concept.showModal();
      document.body.classList.add('modal-open');
    }
  });
  // Preserve direct links to the static portfolio sections for visitors arriving from outside.
  const legal = document.createElement('nav');
  legal.className = 'forest-legal';
  legal.setAttribute('aria-label', 'Privacy and cookie choices');
  legal.innerHTML = '<a href="/privacy/">Privacy</a><a href="#" data-action="cookie-settings">Cookie settings</a>';
  legal.querySelector('[data-action="cookie-settings"]').addEventListener('click', () => biography.close());
  biography.append(legal);
  const initialHash = location.hash;
  if (['#projects', '#project-scene', '#project-sanctum', '#project-chinese'].includes(initialHash)) {
    openPanel('projects', initialHash.startsWith('#project-') ? initialHash.slice(1) : null);
  } else if (initialHash === '#chinese-project') {
    document.querySelector('.project-dialog').showModal();
    document.body.classList.add('modal-open');
  } else if (['#about', '#experience', '#education', '#contact'].includes(initialHash)) {
    openPanel('about', initialHash === '#about' ? null : initialHash.slice(1));
  }
})();
