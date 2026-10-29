/* Small progressive enhancements; links and content also work without JavaScript. */
(() => {
  'use strict';
  const menu = document.querySelector('.menu-toggle');
  const navigation = document.getElementById('mobile-nav');
  const closeMenu = () => {
    if (!menu || !navigation) return;
    menu.setAttribute('aria-expanded', 'false');
    navigation.hidden = true;
  };
  if (menu && navigation) {
    menu.addEventListener('click', () => {
      const expanded = menu.getAttribute('aria-expanded') === 'true';
      menu.setAttribute('aria-expanded', String(!expanded));
      navigation.hidden = expanded;
    });
    navigation.addEventListener('click', event => {
      if (event.target.closest('a')) closeMenu();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
        closeMenu();
        menu.focus();
      }
    });
    document.addEventListener('click', event => {
      if (!event.target.closest('.site-header')) closeMenu();
    });
    window.matchMedia('(min-width: 761px)').addEventListener('change', closeMenu);
  }

  const dialog = document.querySelector('.project-dialog');
  // Only replace the accessible in-page fallback when native modal support exists.
  if (dialog && typeof dialog.showModal === 'function') {
    document.body.classList.add('js-ready');
    let opener = null;
    document.querySelectorAll('[data-open-project]').forEach(link => {
      link.addEventListener('click', event => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        opener = link;
        dialog.showModal();
        document.body.classList.add('modal-open');
      });
    });
    dialog.querySelector('[data-close-project]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => {
      document.body.classList.remove('modal-open');
      if (opener) opener.focus();
    });
  }
  document.querySelectorAll('[data-back-top]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
      const home = document.querySelector('.site-header .brand');
      if (home) home.focus({ preventScroll: true });
    });
  });
  document.querySelectorAll('[data-print-resume]').forEach(button => {
    button.addEventListener('click', () => window.print());
  });
})();
