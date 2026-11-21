/* Where the Brazalete band's files live (2026-11-20). This is the ONE setting to change when the music moves.
   - music:  the folder holding bands.json and one folder per version (salsa, reggaeton), each with manifest.json and the .mp3 layers.
   - shouts: NZ's recorded verb shouts (manifest.json plus .wav files).
   - art:    optional finished instrument pictures (see /brazalete/art/README.md); without them the placeholder drawings are used.
   Deployed 2026-11-21 as a separate Cloudflare project ("brazalete-audio"), outside this public repository. The files are in AeroLex-Code/_tools/brazalete-audio-host/site.
   When a nicer address exists (audio.aerolex.dev), change the two addresses below to it. */
window.BRAZALETE_AUDIO = {
  music: 'https://brazalete-audio.aodhanzmartinez.workers.dev/music/',
  shouts: 'https://brazalete-audio.aodhanzmartinez.workers.dev/shouts/',
  art: '/brazalete/art/instruments/'
};
