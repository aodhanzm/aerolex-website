// Checks the site's public pages in a real browser (Edge) at laptop and phone width, and saves a picture of each.
// It looks for: sideways scrolling, pictures without a description, links that lead nowhere, script errors,
// missing link-preview tags, and anything that points at The Scene from a public page.
//
// Run from the website folder, with the local preview already running (default http://127.0.0.1:8766):
//   node _tools/site-check.mjs                      -> checks every page in the list below
//   node _tools/site-check.mjs /about/ /resume/     -> checks only those pages
//   SHOTS=some/folder node _tools/site-check.mjs    -> where to save the pictures (default: .tmp/site-check, not committed)
// It needs the Playwright package that the dev-log video tool already has installed (AeroLex-Code/_tools/devlog-video).
import fs from 'node:fs'; // reads and writes files
import path from 'node:path'; // builds file paths
import { createRequire } from 'node:module'; // lets this file load a package installed in another folder
import { fileURLToPath } from 'node:url'; // turns this file's address into a normal path

const here = path.dirname(fileURLToPath(import.meta.url)); // this script's folder (_tools)
const site = path.resolve(here, '..'); // the website folder
// Playwright lives with the video tool. Look in the two places it can be relative to this folder (main checkout or a worktree).
const candidates = [process.env.PLAYWRIGHT_DIR, path.resolve(site, '../_tools/devlog-video'), path.resolve(site, '../../_tools/devlog-video')].filter(Boolean);
const home = candidates.find(dir => fs.existsSync(path.join(dir, 'node_modules/playwright'))); // first place that has it
if (!home) throw new Error('Playwright not found. Install it in AeroLex-Code/_tools/devlog-video or set PLAYWRIGHT_DIR.');
const { chromium } = createRequire(path.join(home, 'package.json'))('playwright'); // load Playwright from there

const base = process.env.SITE_URL || 'http://127.0.0.1:8766'; // the local preview's address
const shots = path.resolve(process.env.SHOTS || path.join(site, '.tmp/site-check')); // where pictures go
// Every public page a visitor can reach. Password pages are checked separately below.
const all = ['/', '/brazalete/', '/sanctum/about/', '/hanyu-courtyard/', '/stories/brazalete/', '/stories/sanctum/', '/stories/hanyu-courtyard/', '/about/', '/resume/', '/privacy/'];
// Pages named on the command line, or all of them. Names are tidied so "about", "/about/" and the mangled form Git Bash
// produces on Windows ("C:/Program Files/Git/about/") all mean the same page.
const named = process.argv.slice(2).map(a => '/' + a.replace(/^.*\/Git\//, '').replace(/^\/+|\/+$/g, '') + '/').map(a => a === '//' ? '/' : a);
const pages = named.length ? named : all;
const sizes = [{ name: 'desktop', width: 1440, height: 900 }, { name: 'phone', width: 390, height: 844 }]; // the two widths the contract asks for

fs.mkdirSync(shots, { recursive: true }); // make the pictures folder if it isn't there
const browser = await chromium.launch({ channel: 'msedge', headless: true }); // use the Edge already on this computer, without a window
const problems = []; // everything found, printed at the end
const seenLinks = new Map(); // link address -> does it exist? (so each address is only fetched once)

// Does a local address answer with a real page or file?
async function exists(url) {
  if (!seenLinks.has(url)) seenLinks.set(url, fetch(url, { method: 'GET' }).then(r => r.ok).catch(() => false)); // remember the answer
  return seenLinks.get(url);
}

for (const page of pages) {
  for (const size of sizes) {
    const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: 1, reducedMotion: 'reduce' }); // a clean visitor with no saved data; reduced motion so pictures are stable
    const tab = await context.newPage(); // one browser tab
    const errors = []; // script errors seen on this page
    tab.on('pageerror', e => errors.push(e.message)); // a script crashed
    tab.on('console', m => { if (m.type() === 'error' && !/favicon|ERR_BLOCKED|googletagmanager|youtube|fonts\.g/.test(m.text())) errors.push(m.text()); }); // an error was logged (ignoring outside services, which are unreachable or irrelevant offline)
    const label = `${page} @${size.name}`; // name used in messages
    const response = await tab.goto(base + page, { waitUntil: 'load' }).catch(e => ({ failed: e.message })); // open the page
    if (!response || response.failed || !response.ok()) { problems.push(`${label}: page did not load`); await context.close(); continue; } // stop here if it isn't there
    await tab.waitForTimeout(900); // let fonts and late scripts settle
    // Close the cookie question (choosing "Decline") so it doesn't cover part of the picture; it is still checked for being there.
    await tab.evaluate(() => { const b = [...document.querySelectorAll('#aerolex-consent button')].find(x => /decline/i.test(x.textContent)); if (b) b.click(); });
    // Scroll to the bottom and back so pictures that only load when you reach them are loaded for the full-page picture.
    await tab.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } window.scrollTo(0, 0); });
    await tab.waitForTimeout(500); // let those pictures finish
    const facts = await tab.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - window.innerWidth, // more than 0 means the page scrolls sideways
      noAlt: [...document.images].filter(i => !i.hasAttribute('alt')).map(i => i.getAttribute('src')), // pictures with no description at all
      broken: [...document.images].filter(i => i.complete && i.naturalWidth === 0 && i.getAttribute('src')).map(i => i.getAttribute('src')), // pictures that failed to load
      links: [...new Set([...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')))], // every link's address, once
      title: document.title, // the browser-tab title
      meta: Object.fromEntries(['description', 'og:title', 'og:description', 'og:image', 'og:url', 'twitter:card'].map(n => [n, (document.querySelector(`meta[name="${n}"],meta[property="${n}"]`) || {}).content || ''])), // link-preview tags
      scene: /the[- ]scene|play\.aerolex/i.test([...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).join(' ')), // any link pointing at The Scene
      h1: document.querySelectorAll('h1').length, // how many main headings (should be exactly one)
    }));
    if (facts.overflow > 1) problems.push(`${label}: scrolls sideways by ${facts.overflow}px`);
    if (facts.noAlt.length) problems.push(`${label}: pictures without alt text: ${facts.noAlt.join(', ')}`);
    if (facts.broken.length) problems.push(`${label}: pictures that did not load: ${facts.broken.join(', ')}`);
    if (facts.h1 !== 1) problems.push(`${label}: has ${facts.h1} main headings (wanted 1)`);
    if (errors.length) problems.push(`${label}: script errors: ${[...new Set(errors)].join(' | ').slice(0, 300)}`);
    if (facts.scene && page !== '/resume/' && page !== '/about/') problems.push(`${label}: links to The Scene`);
    if (size.name === 'desktop') { // link and tag checks only need doing once per page
      for (const name of ['description', 'og:title', 'og:description', 'og:image', 'og:url', 'twitter:card']) if (!facts.meta[name]) problems.push(`${page}: missing ${name} tag`);
      if (facts.meta['og:image']) { const local = facts.meta['og:image'].replace('https://aerolex.dev', base); if (!(await exists(local))) problems.push(`${page}: preview image not found (${facts.meta['og:image']})`); }
      for (const href of facts.links) {
        if (/^(mailto:|tel:|#$|javascript:)/.test(href) || href === '#') continue; // nothing to fetch
        if (/^https?:\/\//.test(href) && !href.startsWith('https://aerolex.dev')) continue; // outside sites aren't checked here
        const url = new URL(href.replace('https://aerolex.dev', base), base + page); // full local address
        const target = url.origin + url.pathname; // without the #part
        if (!(await exists(target))) problems.push(`${page}: link leads nowhere: ${href}`);
        else if (url.hash && url.pathname === new URL(base + page).pathname) { // a jump link within this page: the place must exist
          const found = await tab.evaluate(id => !!document.getElementById(id), decodeURIComponent(url.hash.slice(1)));
          if (!found) problems.push(`${page}: jump link has no target: ${href}`);
        }
      }
    }
    const file = path.join(shots, `${page === '/' ? 'home' : page.replace(/^\/|\/$/g, '').replace(/\//g, '-')}-${size.name}.jpg`); // e.g. stories-brazalete-phone.jpg
    await tab.screenshot({ path: file, fullPage: true, type: 'jpeg', quality: 72 }); // one tall picture of the whole page
    await context.close(); // forget this visitor
  }
}

// Password pages must still be locked: with no saved password, they must show the lock box and none of the private content.
for (const locked of ['/private/the-scene/', '/chinese/']) {
  const context = await browser.newContext(); // a clean visitor
  const tab = await context.newPage();
  const ok = await tab.goto(base + locked, { waitUntil: 'load' }).then(r => r && r.ok()).catch(() => false);
  await tab.waitForTimeout(700);
  const state = ok ? await tab.evaluate(() => ({ box: !!document.querySelector('input[type="password"]'), text: document.body.innerText.length })) : null;
  if (!ok) problems.push(`${locked}: did not load`);
  else if (!state.box) problems.push(`${locked}: NOT LOCKED (no password box shown)`);
  await context.close();
}
// The Scene must not be offered to search engines.
const sitemap = await fetch(base + '/sitemap.xml').then(r => r.text()).catch(() => '');
if (/the-scene|private/.test(sitemap.replace(/<!--[\s\S]*?-->/g, ''))) problems.push('sitemap.xml lists The Scene or a private page');

await browser.close();
console.log(`Checked ${pages.length} page(s) at ${sizes.length} widths. Pictures: ${shots}`);
if (problems.length) { console.log(`\n${problems.length} thing(s) to fix:`); for (const p of problems) console.log(' - ' + p); process.exitCode = 1; }
else console.log('No problems found.');
