# AeroLex forest homepage — 2026-10-29

## Current direction

The confirmed design is a cinematic painted Pacific Northwest forest with a guided click-through path. Trees part to reveal a project world; each clearing presents its artwork, an introduction, the owner's contribution, and View project / Enter actions where appropriate. A persistent Projects / About / Resume menu gives employers and visitors direct access.

This supersedes the orange/purple color studies and the static midnight-gallery homepage. The prior gallery markup is preserved in `_archive/portfolio-gallery-2026-10/index.html`; prior artwork remains in the repo but is not the new entrance.

## Identity and content

- Display: Noah Zepter-Martínez. Biography and resume: Noah Aodhán Zepter-Martínez.
- LinkedIn: https://www.linkedin.com/in/noahzepter/.
- Verbilink: Project Manager, September 2025–August 2026; Product Advisor, September 2026–present, as confirmed by the owner.
- The Scene is a playable beta with its existing landing page at `/the-scene/` and game at `play.aerolex.dev`.
- The Sanctum is private and still uses its existing access gate. Its Enter link goes to `/sanctum/`.
- Hanyu Courtyard is in development. It offers a concept preview and has no fabricated Enter link.

## Source and behavior

`index.html` contains the entrance and static portfolio fallback. `assets/forest.css` and `assets/forest.js` implement the forest layers, journey, and quick-access dialogs. Shared `assets/portfolio.css` / `.js` retain the resume, project directory, consent styling, mobile menu and existing Chinese concept modal. There is no framework, package dependency or build step.

The generated forest background and transparent foreground tree image are independent layers. Two clipped halves of the foreground move aside; the backdrop fades to the existing generated three-world artwork. Each world is selected from that triptych with a responsive square-panel crop. These images are illustrations, not screenshots of the actual apps.

The journey is a small finite state machine: entrance, walking, revealing, world. Navigation is disabled during its short transition. Reset cancels stale transitions. Reduced motion follows the system preference and has an explicit session-only toggle. Native dialogs keep keyboard navigation and Escape behavior. Without JS or native dialog support, the static project/experience/resume content remains available below the forest.

## Preview and release

Run `python -m http.server 8097 --bind 127.0.0.1` from the repository root. Check `/`, `/resume/`, `/the-scene/`, all three clearings, Projects/About panels, the Chinese concept modal, and mobile/reduced-motion behavior.

Work remains on `codex/portfolio-homepage`. GitHub Pages publishes `main`; nothing in this forest implementation step pushes or publishes the website. A pre-existing privacy edit and untracked `sanctum/about/` directory are separate work and must be preserved.

## Verification status

Browser verification passed for the normal tree-parting reveal, all three clearings in sequence, reduced motion, returning to the entrance, direct clearing selection from Projects, the Sanctum project selection, the Chinese concept dialog and Escape, About content, cookie-settings reopening/decline, mobile menu closing, and the printable resume route. No horizontal overflow was observed at desktop, 390px or 320px widths; the full name fits the mobile resume. No browser console errors were observed during these checks. The generated foreground is RGBA with zero alpha at its center, verified from the saved asset.

This is a first forest prototype: the trail uses one generated forest setting, and each project reveal crops its panel from the existing generated triptych. No live publication has occurred. Real-device Safari/iPad testing and production download optimization remain release work rather than claims of this prototype.

Final static checks also passed for 28 local destinations/assets and all active-page anchors, plus JavaScript syntax and Git whitespace. Entrance, clearing, and phone screenshots are saved in the chat visualization workspace. The preview is left at the entrance with normal motion restored.
