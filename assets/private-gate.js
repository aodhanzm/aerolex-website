/* Private password screen for NZ-only pages (Hanyu's playable build and The Scene's hidden landing page).
 *
 * How it works, in plain terms:
 * - This file is loaded at the very top of each private page, before anything is drawn.
 * - If this browser has already been unlocked, it does nothing and the page shows normally.
 * - Otherwise it hides the page and shows a password box instead.
 * - The real password is never stored anywhere on the site. Only a scrambled "fingerprint" of it is
 *   (the HASH below). Typing a password scrambles it the same way; if the fingerprints match, it unlocks.
 * - The scrambling is deliberately slow (250,000 rounds) so guessing passwords one after another is expensive.
 *
 * Limits: this is a front-door lock, not a safe. The site's files are public on GitHub, so a determined
 * person could still open the underlying files directly. It keeps casual visitors out.
 *
 * To set or change the password, run `node _tools/set-private-password.mjs` from the website folder.
 * That script rewrites the GATE line below. Never type the password into this file by hand.
 */
(function () {
  'use strict';

  // The fingerprint settings. SALT is random text mixed into the password so the fingerprint can't be
  // looked up in a table; HASH is the fingerprint itself. Both empty = no password set yet (stays locked).
  var GATE = { salt: '60d8e877776010bcc6b27c9a0c9430df', hash: '35babf75baced0e5d8fdf3730bdd7fe5d480b099726f26f1e10d776866a5516c', iterations: 250000 };

  // Name of the note this browser keeps once unlocked (it stores the fingerprint, never the password).
  var STORAGE_KEY = 'aerolex-private-gate';

  // Read the "already unlocked" note safely: private browsing or blocked storage can make this throw.
  function readUnlock() {
    try { return window.localStorage.getItem(STORAGE_KEY); } catch (_) { return null; }
  }

  // Save the "unlocked" note; if the browser refuses, the visitor simply has to type the password again next time.
  function saveUnlock(value) {
    try { window.localStorage.setItem(STORAGE_KEY, value); } catch (_) { /* nothing to do */ }
  }

  // Already unlocked with the current password? Then let the page show and stop here.
  // If the password is changed later, the fingerprint changes and every browser is locked again.
  if (GATE.hash && readUnlock() === GATE.hash) return;

  // Mark the page as locked straight away, before the page body exists, so its content never flashes on screen.
  document.documentElement.classList.add('private-gate-locked');

  // While locked, hide everything on the page except the password box.
  var hideStyle = document.createElement('style');
  hideStyle.textContent =
    'html.private-gate-locked body > :not(#private-gate){display:none !important}' +
    'html.private-gate-locked body{margin:0;background:#101c17}';
  document.head.appendChild(hideStyle);

  // Turn typed text into the slow fingerprint (PBKDF2 with SHA-256), returned as hex text.
  function fingerprint(password) {
    var enc = new TextEncoder();
    return window.crypto.subtle
      .importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
      .then(function (key) {
        return window.crypto.subtle.deriveBits(
          { name: 'PBKDF2', salt: enc.encode(GATE.salt), iterations: GATE.iterations, hash: 'SHA-256' },
          key,
          256
        );
      })
      .then(function (bits) {
        // Convert the raw bytes into the same hex text the set-password script writes.
        return Array.prototype.map
          .call(new Uint8Array(bits), function (b) { return ('0' + b.toString(16)).slice(-2); })
          .join('');
      });
  }

  // Build the password box once the page body exists.
  function showGate() {
    var box = document.createElement('div');
    box.id = 'private-gate';
    // The styles live inside this file so the box looks the same on every private page,
    // whatever that page's own design is. Colours match the website's forest palette.
    box.innerHTML =
      '<style>' +
      '#private-gate{position:fixed;inset:0;display:grid;place-items:center;padding:24px;' +
      'background:#101c17;color:#eef0e5;font-family:"DM Sans",system-ui,sans-serif;z-index:2147483647}' +
      '#private-gate form{width:min(380px,100%);display:grid;gap:14px}' +
      '#private-gate .pg-kicker{margin:0;font-size:12px;letter-spacing:.25em;text-transform:uppercase;color:#a6b69a}' +
      '#private-gate h1{margin:0 0 4px;font:500 40px/1.1 "Cormorant Garamond",Georgia,serif}' +
      '#private-gate p{margin:0;color:#b2bfb2;font-size:15px;line-height:1.6}' +
      '#private-gate label{font-size:13px;color:#a6b69a}' +
      '#private-gate input{font:inherit;font-size:17px;padding:12px 14px;border-radius:6px;' +
      'border:1px solid rgba(190,207,175,.4);background:#09130f;color:#eef0e5}' +
      '#private-gate input:focus{outline:2px solid #d5dfbd;outline-offset:2px}' +
      '#private-gate button{font:inherit;font-size:15px;font-weight:600;padding:12px;border-radius:6px;' +
      'border:0;background:#eef0e5;color:#101c17;cursor:pointer}' +
      '#private-gate button:disabled{opacity:.6;cursor:progress}' +
      '#private-gate .pg-error{color:#f0b8a8;min-height:1.6em}' +
      '#private-gate a{color:#d5dfbd;font-size:14px}' +
      '</style>' +
      '<form novalidate>' +
      '<p class="pg-kicker">AeroLex · Private preview</p>' +
      '<h1>This page is private.</h1>' +
      '<p>It is a work in progress that only its maker can open for now.</p>' +
      '<label for="pg-password">Password</label>' +
      '<input id="pg-password" type="password" autocomplete="current-password" required>' +
      '<button type="submit">Unlock</button>' +
      '<p class="pg-error" role="alert" aria-live="polite"></p>' +
      '<a href="/">Back to aerolex.dev</a>' +
      '</form>';
    document.body.appendChild(box);

    var form = box.querySelector('form');
    var input = box.querySelector('input');
    var button = box.querySelector('button');
    var error = box.querySelector('.pg-error');
    input.focus();

    form.addEventListener('submit', function (event) {
      // Stop the browser from reloading the page; we check the password here instead.
      event.preventDefault();
      // No password set yet: say so plainly rather than pretending the typed one was wrong.
      if (!GATE.hash) { error.textContent = 'No password has been set for this site yet.'; return; }
      // The scrambling only works on secure (https or localhost) pages; explain if it isn't available.
      if (!window.crypto || !window.crypto.subtle) { error.textContent = 'This browser can’t check the password here.'; return; }
      // Show that it's working, since the slow fingerprint takes a moment.
      button.disabled = true;
      button.textContent = 'Checking…';
      error.textContent = '';
      fingerprint(input.value).then(function (result) {
        if (result === GATE.hash) {
          // Correct: remember this browser, remove the box and reveal the page underneath.
          saveUnlock(result);
          box.remove();
          hideStyle.remove();
          document.documentElement.classList.remove('private-gate-locked');
        } else {
          // Wrong: clear the box and let them try again.
          error.textContent = 'That password isn’t right. Try again.';
          input.value = '';
          input.focus();
        }
      }).catch(function () {
        error.textContent = 'Something went wrong checking the password. Try again.';
      }).then(function () {
        // Put the button back to normal whatever happened.
        button.disabled = false;
        button.textContent = 'Unlock';
      });
    });
  }

  // The script runs before the page body exists, so wait for it before adding the box.
  if (document.body) showGate();
  else document.addEventListener('DOMContentLoaded', showGate);
})();
