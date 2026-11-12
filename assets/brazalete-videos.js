/* The Brazalete dev-log library: the list of videos shown on aerolex.dev/brazalete/.
 *
 * To add a video once it's on YouTube:
 *   1. Copy its ID: the 11 characters after "v=" in the YouTube address
 *      (in https://www.youtube.com/watch?v=dQw4w9WgXcQ the ID is dQw4w9WgXcQ).
 *   2. Put it between the quotes after youtube: on the right line, replacing null.
 * A line with youtube: null shows as a "Coming soon" card. Order here = order on the page.
 * "episodes" is the main series; "process" is the supplementary design-process videos.
 *
 * Updated 2026-11-12: titles now match the final 17-episode list in the vault's Series Plan. Only the next few
 * episodes are shown as "Coming soon", so the page isn't a wall of empty cards. The rest are written out below
 * with "//" in front; remove the two slashes from a line when that episode is about to go up.
 */
window.BRAZALETE_VIDEOS = {
  episodes: [
    // Episode 1 is recorded and edited; it shows here as soon as it has a YouTube ID.
    { title: 'Episode 1 · The wall of grammar', note: 'Why Spanish grammar stops learners, and why I built a tool', youtube: null },
    { title: 'Episode 2 · Knowing isn’t using', note: 'Charts, streaks, and what practice has to do instead', youtube: null },
    { title: 'Episode 3 · Finding its shape', note: 'The reveal: why it’s something you wear and turn', youtube: null },
    { title: 'Episode 4 · Why the wheel has six sections', note: 'A place for every person', youtube: null },
    // { title: 'Episode 5 · Making mood and tense physical', note: 'A timeline you press and a ring you turn', youtube: null },
    // { title: 'Episode 6 · Why all six forms stay visible', note: 'The rule I broke on purpose', youtube: null },
    // { title: 'Episode 7 · Giving adjectives their own controls', note: 'Why this word ends in an @', youtube: null },
    // { title: 'Episode 8 · Making it satisfying to use', note: 'Keys, sound, and mistakes that cost nothing', youtube: null },
    // { title: 'Episode 9 · Direct-object pronouns', note: 'A second disc that mirrors the first', youtube: null },
    // { title: 'Episode 10 · Indirect objects', note: 'One switch, and half the pronouns move', youtube: null },
    // { title: 'Episode 11 · Reflexive verbs', note: 'What “me llamo” really says', youtube: null },
    // { title: 'Episode 12 · What the SÍ / NO switches do', note: 'The smallest control carries a page of grammar', youtube: null },
    // { title: 'Episode 13 · When the wheel goes dark', note: 'Forms with no person, and controls that only wake when needed', youtube: null },
    // { title: 'Episode 14 · Tú, vos, vosotros', note: 'Whose Spanish are you practising?', youtube: null },
    // { title: 'Episode 15 · Turning it into self-study', note: 'A report card that names the part you missed', youtube: null },
    // { title: 'Episode 16 · Teaching someone to use it', note: 'The tutorial that skipped the Spanish', youtube: null },
    // { title: 'Episode 17 · The rebuild I threw away', note: 'It compiled without an error and didn’t work', youtube: null },
  ],
  process: [
    // Supplementary videos showing the design work between episodes. Add one line per video.
    { title: 'Design sessions', note: 'Sketches, dead ends and work sessions', youtube: null },
  ],
};
