/* The Brazalete dev-log library: the list of videos shown on aerolex.dev/brazalete/.
 *
 * To add a video once it's on YouTube:
 *   1. Copy its ID: the 11 characters after "v=" in the YouTube address
 *      (in https://www.youtube.com/watch?v=dQw4w9WgXcQ the ID is dQw4w9WgXcQ).
 *   2. Put it between the quotes after youtube: on the right line, replacing null.
 * A line with youtube: null shows as a "Coming soon" card. Order here = order on the page.
 * "episodes" is the main series; "process" is the supplementary design-process videos.
 */
window.BRAZALETE_VIDEOS = {
  episodes: [
    // Episode 1 follows the recording card saved in the vault (2026-11-10). Not filmed yet.
    { title: 'Episode 1 · Why I needed this tool', youtube: null },
    // Episode 2's working title from the series plan.
    { title: 'Episode 2 · Finding its shape', youtube: null },
  ],
  process: [
    // Supplementary videos showing the design work between episodes. Add one line per video.
    { title: 'Design sessions', note: 'Sketches, dead ends and work sessions', youtube: null },
  ],
};
