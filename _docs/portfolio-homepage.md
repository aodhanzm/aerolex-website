# Portfolio homepage — 2026-10-29

## Shape and ownership

The root homepage is now Noah Martínez’s portfolio, following the approved midnight navy, ivory, brass, and orbital mockup. The Scene’s existing landing page lives at `/the-scene/`; `/sanctum/` and the game at `play.aerolex.dev` retain their existing destinations.

Editable homepage: `index.html`, `assets/portfolio.css`, `assets/portfolio.js`, and `assets/portfolio/`. The companion résumé is `resume/index.html`, with a print stylesheet in the shared CSS. There is no build step or package dependency.

## Copy and assets

Professional details come from the owner-authorized producer résumé draft and the existing AeroLex description, read on 2026-10-29. Bracketed claims, unfinished metrics, the private telephone number, personal email, and location placeholder were omitted. The owner says the résumé is still being updated; recheck role descriptions before publication.

The Scene cover uses existing Solmara concept art. The Sanctum cover is an illustrative SVG, not a current app screenshot. The Chinese preview is the owner-supplied concept image and is explicitly marked as a concept. Its native modal has an in-page fallback when JavaScript is unavailable. The Chinese app is not yet released and has no fake launch URL.

## Preview and release

Run a static server from the repository root, for example `python -m http.server 8097 --bind 127.0.0.1`. Preview `/`, `/resume/`, and `/the-scene/`; verify the Chinese modal, mobile menu, printing, and links. Existing analytics and consent remain shared with the privacy page.

This repository publishes `main` through GitHub Pages. Changes are being prepared on `codex/portfolio-homepage`. A pre-existing edit to `privacy/index.html` is unrelated and must not be included in a homepage-only commit or reverted.

## Status

First implementation complete. Browser checks passed for the desktop layout and 390px/320px phone layouts, mobile navigation and anchors, the native Chinese preview modal (including Escape and focus restoration), the resume route, and cookie-settings reopening/decline. No browser console errors or horizontal overflow were observed. All 24 local destinations/assets referenced by the three new/relocated HTML pages returned HTTP 200; SVG/sitemap XML parsing, JavaScript syntax, and Git whitespace checks passed.

NZ confirmed the AI Solutions v4 Verbilink timeline on 2026-10-29: Project Manager from September 2025 to August 2026, then Product Advisor from September 2026 to present. Both the homepage and printable resume now show these roles and dates. Project-preview imagery remains open for owner preference.

An existing untracked `sanctum/about/` directory appeared during the session; it is separate work and is not part of this homepage change. Nothing has been pushed to the publishing branch.
