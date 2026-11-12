# Portfolio launch release copy (branch `codex/devlog-launch`), 2026-11-12

Technical status for the release copy prepared by the portfolio-launch run. Nothing here is published: the branch is
local only and has never been pushed. The decisions and NZ's checklist live in the vault
(`products/aerolex-website/Fable Run — Portfolio Launch — Build Contract 2026-11-12.md` and `START HERE.md`).

## Preview it locally

From this folder: `npx http-server . -p 8766 -a 127.0.0.1 -c-1`, then open http://127.0.0.1:8766/.
(Claude Code and Codex: the vault's launch config "website-devlog-launch" starts the same server.)

Pages to look at: `/`, `/about/`, `/brazalete/`, `/sanctum/about/`, `/sanctum/?guest=1`, `/hanyu-courtyard/`,
`/stories/brazalete/`, `/stories/sanctum/`, `/stories/hanyu-courtyard/`, `/resume/`, `/privacy/`.
Password pages (must stay locked): `/private/the-scene/`, `/chinese/`.

## What changed on this branch (newest first)

| Commit | What |
|---|---|
| Design stories, About, share previews | `/stories/*`, `/about/`, `assets/og/*`, `assets/favicon/*`, `favicon.ico`, link-preview tags on every page, homepage links, WebP forest pictures, sitemap, résumé project links, `assets/brazalete-videos.js` (17 episode titles) |
| Résumé rewrite | From the career-direction chat with NZ (title, summary, Verbilink bullet points, independent projects) |
| Stage Sanctum 0.38.0 | Built from the-sanctum branch `fable/guest-tour`: guest tour and the new project page at `/sanctum/about/` |
| Hanyu page, reading styles, Brazalete quick start, checker | `/hanyu-courtyard/`, `assets/pages.css`, `assets/hanyu/*`, `_tools/site-check.mjs`, restaged `/brazalete/` |
| Homepage first screen | Name, role line, one sentence, three shortcuts; the forest journey kept one line lower |
| Restage the Brazalete tool | The infinitive resting state from the-scene |
| Earlier (2026-11-11) | Résumé layout, password screen, clearings, `/brazalete/`, local edit mode |

## Where things come from (never hand-edit these copies)

- `/brazalete/`: staged from the-scene (`unity-port`) with `WEBSITE_DIR=<this folder> node scripts/stage-brazalete-site.mjs`.
- `/sanctum/` and `/astro/`: staged from the-sanctum with `WEBSITE_DIR=<this folder> npm run deploy:site`. The project page
  is that repo's `public/about/`. **The staged build is from branch `fable/guest-tour`, not `main`.** Merge that branch
  before a real release, or restage from whichever branch NZ approves.
- `/chinese/`: staged from hanyu-courtyard (unchanged in this run).

## Tools added in `_tools/`

- `site-check.mjs`: opens every public page in Edge at 1440 and 390 wide and reports sideways scrolling, missing alt
  text, broken links and pictures, script errors, missing link-preview tags, links to The Scene, unlocked password
  pages and a sitemap that lists private pages. Saves a full-page picture of each. `node _tools/site-check.mjs`.
- `make-share-images.mjs`: remakes the 1200×630 share pictures in `assets/og/` and the tab icons in `assets/favicon/`.
  Edit the words in its list and run it again. (After it, `favicon.ico` is rebuilt from `assets/favicon/icon-512.png`.)
- Both use the Playwright package installed in `AeroLex-Code/_tools/devlog-video` and need the local preview running.

## Pictures and where they came from

Compressed web copies only; originals stay in each product's repo or were captured from a running build.

- `assets/hanyu/*`: stills from the private Hanyu build (local dev server, scripted browser) and the concept painting.
- `assets/stories/brazalete/*`: the annotated concept sheet (the-scene `visuals/gadget-concept/`), today's tool, and the
  20 September version recovered from the-scene's history (commit `1006223`) for the before picture.
- `assets/stories/sanctum/*`: stills from the guest tour (sample data only) and `design/screens/01-sky-page-3d.png`
  (Astro-Map 0.6, sample data) from the-sanctum.
- `assets/stories/hanyu/before.webp`: the earlier chapter page of the Hanyu build.
- `assets/about/noah.webp`: from the existing `assets/noah.jpg`.
- `assets/forest/*.webp`: compressed copies of the PNGs beside them. The PNGs are no longer loaded by any page and
  can be deleted in a later tidy-up (about 15 MB).

## Checked on 2026-11-12/13

`node _tools/site-check.mjs`: all ten public pages at both widths, no problems. Homepage: the forest path through all
three clearings and the project list at both widths. Guest tour in the staged build: no outside requests, saved data
identical before and after. Brazalete: 3,316 + 307 checks pass after restaging. Not checked: any live service's link
preview, a physical phone, Safari or Firefox.

## Before publishing (NZ decides; see the vault checklist)

1. Read the drafts: homepage first screen, About, the three stories, the guided looks, the Brazalete quick start.
2. Decide whether the privacy page keeps the legal name and The Scene's section as they are.
3. Merge the-sanctum `fable/guest-tour` (or restage the Sanctum from the approved branch).
4. Publishing = pushing this branch's work to `main`. Never without NZ's explicit go-ahead.
