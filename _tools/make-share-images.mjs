// Makes the pictures shown when a page of the site is shared (LinkedIn, X, Instagram's link sticker, messaging apps),
// plus the small browser-tab icons. Each share picture is 1200 by 630, the size those services expect.
//
// How it works: for each page it lays out a simple card (a background picture, a dark fade, and two lines of text in the
// site's own fonts) in a real browser (Edge) and saves a picture of it into assets/og/. Change the words in the list
// below and run it again to remake a card.
//
// Run from the website folder, with the local preview running (default http://127.0.0.1:8766):
//   node _tools/make-share-images.mjs
// Needs the Playwright package installed with the dev-log video tool (AeroLex-Code/_tools/devlog-video).
import fs from 'node:fs'; // reads and writes files
import path from 'node:path'; // builds file paths
import { createRequire } from 'node:module'; // loads a package installed in another folder
import { fileURLToPath } from 'node:url'; // this file's own location

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); // the website folder
const candidates = [process.env.PLAYWRIGHT_DIR, path.resolve(site, '../_tools/devlog-video'), path.resolve(site, '../../_tools/devlog-video')].filter(Boolean); // where Playwright may be
const home = candidates.find(dir => fs.existsSync(path.join(dir, 'node_modules/playwright'))); // the first place that has it
if (!home) throw new Error('Playwright not found. Install it in AeroLex-Code/_tools/devlog-video or set PLAYWRIGHT_DIR.');
const { chromium } = createRequire(path.join(home, 'package.json'))('playwright'); // load it from there
const base = process.env.SITE_URL || 'http://127.0.0.1:8766'; // the local preview, so the cards can use the site's own pictures

// One entry per card: file name, background picture, where the picture should sit, small label, headline, and one line under it.
const cards = [
  { file: 'home', bg: '/assets/forest/forest-path-v1.webp', focus: '50% 55%', label: 'Noah Zepter-Martínez', title: 'A designer who builds.', line: 'Game-based learning and interactive worlds' },
  { file: 'about', bg: '/assets/about/noah.webp', focus: '50% 22%', split: true, label: 'About', title: 'Noah Zepter-Martínez', line: 'A designer who builds. Game-based learning and interactive worlds.' },
  { file: 'brazalete', bg: '/assets/forest/brazalete-clearing-v1.webp', focus: '50% 45%', label: 'Free Spanish grammar tool', title: 'El brazalete', line: 'Build Spanish verbs by turning its rings. No account needed.' },
  { file: 'sanctum', bg: '/assets/forest/the-sanctum-clearing-v1.webp', focus: '50% 40%', label: 'An observatory and a grimoire', title: 'The Sanctum', line: 'Look around as a guest. No sign-up, nothing saved.' },
  { file: 'hanyu-courtyard', bg: '/assets/forest/hanyu-courtyard-clearing-v1.webp', focus: '50% 50%', label: 'Mandarin-learning adventure · In design', title: 'Hanyu Courtyard', line: 'Restore an old estate, one character and one brushstroke at a time.' },
  { file: 'story-brazalete', bg: '/assets/stories/brazalete/concept.webp', focus: '0% 22%', label: 'Design story · The Brazalete', title: 'How a conjugation chart became something you wear', line: 'Five decisions behind a Spanish grammar tool.', small: true },
  { file: 'story-sanctum', bg: '/assets/stories/sanctum/observatory.webp', focus: '50% 50%', label: 'Design story · The Sanctum', title: 'From a star chart to an estate you walk through', line: 'How a tool became a place.', small: true },
  { file: 'story-hanyu-courtyard', bg: '/assets/hanyu/courtyard.webp', focus: '60% 60%', label: 'Design story · Hanyu Courtyard', title: 'How Hanyu Courtyard got its shape', line: 'Four decisions from three playtests.', small: true },
  { file: 'resume', bg: '/assets/forest/forest-path-v1.webp', focus: '50% 70%', label: 'Résumé', title: 'Noah Zepter-Martínez', line: 'Learning Experience & Game Designer' },
];

// The card's layout, as a tiny web page. "split" cards put the picture on the right half (used for the portrait).
const page = c => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background: #0b1720; }
  .bg { position: absolute; inset: 0 0 0 ${c.split ? '56%' : '0'}; background: url("${base}${c.bg}") ${c.focus} / cover no-repeat; }
  .fade { position: absolute; inset: 0; background: ${c.split ? 'linear-gradient(90deg, #0b1720 0, #0b1720 54%, rgba(11,23,32,0) 72%)' : c.small ? 'linear-gradient(180deg, rgba(5,14,12,.45) 0, rgba(5,14,12,.8) 42%, rgba(5,14,12,.97) 100%)' : 'linear-gradient(180deg, rgba(5,14,12,.55) 0, rgba(5,14,12,.35) 35%, rgba(5,14,12,.92) 100%)'}; } /* story cards (small: true) get a darker fade because their headlines are longer and their pictures busier */
  .frame { position: absolute; inset: 22px; border: 1px solid rgba(195,163,114,.55); }
  .words { position: absolute; left: 70px; right: ${c.split ? '560px' : '70px'}; bottom: 78px; color: #f1eadb; }
  .label { font: 500 21px/1.3 "DM Sans", Arial, sans-serif; letter-spacing: .2em; text-transform: uppercase; color: #dfc18d; margin: 0 0 18px; }
  h1 { font: 400 ${c.small ? '70px' : '96px'}/1.02 "Cormorant Garamond", Georgia, serif; letter-spacing: -.02em; margin: 0 0 20px; text-shadow: 0 2px 24px rgba(0,0,0,.6); }
  .line { font: 400 30px/1.3 "Cormorant Garamond", Georgia, serif; color: #e9e2cf; margin: 0; text-shadow: 0 2px 14px rgba(0,0,0,.7); }
  .site { position: absolute; left: 70px; top: 58px; font: 500 20px/1 "DM Sans", Arial, sans-serif; letter-spacing: .3em; color: #f1eadb; display: flex; align-items: center; gap: 16px; }
  .site img { width: 44px; height: 35px; }
  .addr { position: absolute; right: 70px; top: 62px; font: 500 20px/1 "DM Sans", Arial, sans-serif; letter-spacing: .08em; color: #dfc18d; }
</style></head><body>
  <div class="bg"></div><div class="fade"></div><div class="frame"></div>
  <div class="site"><img src="${base}/assets/portfolio/mark.svg" alt="">AEROLEX</div><div class="addr">aerolex.dev</div>
  <div class="words"><p class="label">${c.label}</p><h1>${c.title}</h1><p class="line">${c.line}</p></div>
</body></html>`;

fs.mkdirSync(path.join(site, 'assets/og'), { recursive: true }); // where the share pictures live
fs.mkdirSync(path.join(site, 'assets/favicon'), { recursive: true }); // where the tab icons live
const browser = await chromium.launch({ channel: 'msedge', headless: true }); // Edge, without a window
const tab = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 }); // exactly the card's size
for (const card of cards) {
  await tab.setContent(page(card), { waitUntil: 'networkidle' }); // lay the card out and wait for its picture and fonts
  await tab.evaluate(() => document.fonts.ready); // make sure the site's fonts are in before the picture is taken
  await tab.screenshot({ path: path.join(site, 'assets/og', card.file + '.jpg'), type: 'jpeg', quality: 86 }); // save it
  console.log('share picture:', card.file + '.jpg');
}

// Browser-tab icons: the gold mark on the site's dark blue, as a rounded square, at the sizes browsers and phones ask for.
const icon = size => `<!doctype html><html><body style="margin:0;width:${size}px;height:${size}px;background:#0b1720;display:grid;place-items:center"><img src="${base}/assets/portfolio/mark.svg" style="width:${Math.round(size * 0.78)}px"></body></html>`;
for (const [size, name] of [[32, 'favicon-32.png'], [180, 'apple-touch-icon.png'], [512, 'icon-512.png']]) {
  await tab.setViewportSize({ width: size, height: size }); // the icon's exact size
  await tab.setContent(icon(size), { waitUntil: 'networkidle' });
  await tab.screenshot({ path: path.join(site, 'assets/favicon', name), type: 'png' });
  console.log('icon:', name);
}
await browser.close();
