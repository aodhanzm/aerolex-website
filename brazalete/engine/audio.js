/* =============================================================================
   GADGET LAB — AUDIO
   Every sound is synthesised with the Web Audio API. No files are fetched,
   because the lab must run from a double-clicked file:// URL, and because the
   live game already does the same (game.css banner: "no files needed").

   The contract asks for a sound on every dial click and every seat. The point
   of the click is tactility — the dial should feel like a physical detent, not
   a menu — so the click is a very short noise burst, not a tone.
   ============================================================================= */

const SFX = (() => {
  let ctx = null;      // created lazily: browsers refuse to start audio before a user gesture
  let enabled = true;  // debug-panel toggle

  // Called from the first pointerdown/keydown anywhere. If the context was
  // created suspended (autoplay policy), resume it here.
  function unlock() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  }

  // A tone with an exponential decay. `type` is the oscillator shape; a square
  // wave reads as "cheap plastic gadget", which is the Y2K feel we want.
  function tone(freq, dur, { type = 'square', gain = 0.12, at = 0, slide = 0 } = {}) {
    if (!ctx || !enabled) return;
    const t0 = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    // `slide` bends the pitch across the note — down for a reject, up for an eject.
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  // A burst of filtered white noise. Used for the dial detent and the seat
  // "thunk" — mechanical sounds are noise, not pitch.
  function noise(dur, { gain = 0.2, cutoff = 3000, at = 0 } = {}) {
    if (!ctx || !enabled) return;
    const t0 = ctx.currentTime + at;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(ctx.destination);
    src.start(t0);
  }

  return {
    unlock,
    setEnabled(v) { enabled = !!v; },

    // One detent of a dial. Slightly different per dial so the ear can tell
    // which one moved without looking — the same reason each mood has a colour.
    click(dialIndex = 0) {
      noise(0.03, { gain: 0.25, cutoff: 2500 + dialIndex * 1200 });
      tone(900 + dialIndex * 250, 0.03, { type: 'triangle', gain: 0.05 });
    },

    // A locked stop: the dial refuses to turn there. Dull, no tone.
    locked() { noise(0.06, { gain: 0.12, cutoff: 500 }); },

    // A word dropped into the gadget's intake.
    load() { tone(220, 0.12, { type: 'sawtooth', gain: 0.08, slide: 160 }); noise(0.05, { gain: 0.1, cutoff: 1200 }); },

    // The formed piece ejected from the gadget — a quick rising blip.
    eject() { tone(440, 0.1, { type: 'square', gain: 0.08, slide: 400 }); },

    // A piece seating in a slot: a thunk plus a two-note confirm.
    seat() {
      noise(0.05, { gain: 0.3, cutoff: 900 });
      tone(660, 0.09, { type: 'triangle', gain: 0.1, at: 0.02 });
      tone(990, 0.14, { type: 'triangle', gain: 0.1, at: 0.09 });
    },

    // Rejection. A low, detuned buzz that bends downward — it should FEEL like
    // a wrong-shaped key in a lock, not like a scold. Short on purpose.
    reject() {
      tone(160, 0.22, { type: 'sawtooth', gain: 0.12, slide: -60 });
      tone(163, 0.22, { type: 'square', gain: 0.06, slide: -60 });
    },

    // A whole sentence completed — a fast major arpeggio.
    complete() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, { type: 'triangle', gain: 0.1, at: i * 0.07 }));
    },

    // Last-seconds clock tick, reusing the dial detent sound at a lower pitch
    // so the two never get confused.
    tick() { noise(0.02, { gain: 0.15, cutoff: 800 }); },

    // A person section of the brazalete POWERING UP (NZ, 2026-10-04): the section is dark until
    // the device "hears" its Spanish, then it lights with this. A rising electric whine plus a
    // soft shimmer on top, so it reads as a circuit waking up rather than a button being pressed.
    powerUp() {
      tone(180, 0.32, { type: 'sawtooth', gain: 0.05, slide: 720 });      // the whine climbing
      tone(1320, 0.18, { type: 'triangle', gain: 0.04, at: 0.2 });        // the shimmer when it is fully on
      noise(0.08, { gain: 0.06, cutoff: 4500, at: 0.18 });                // a crackle of current
    },

    // The same section POWERING DOWN a few seconds later: the whine falling away, quieter than the
    // power-up so a run of them never gets tiring.
    powerDown() {
      tone(620, 0.4, { type: 'sawtooth', gain: 0.035, slide: -520 });     // the whine sinking
      noise(0.05, { gain: 0.03, cutoff: 900, at: 0.05 });                 // the last of the current
    },

    // The brazalete fully CALIBRATED: all six sections lit for good. A rising chord that lands on
    // a held top note, bigger than a sentence completing but smaller than a medal.
    calibrated() {
      [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.5, { type: 'triangle', gain: 0.09, at: i * 0.09 }));
      tone(180, 0.6, { type: 'sawtooth', gain: 0.04, slide: 900 });      // the power-up whine underneath it
    },

    // Medal. Gold gets the bigger fanfare; bronze a modest one; none a soft close.
    medal(kind) {
      const seq = kind === 'gold' ? [523, 659, 784, 1047, 1319] : kind === 'bronze' ? [392, 523, 659] : [330, 262];
      seq.forEach((f, i) => tone(f, 0.28, { type: 'triangle', gain: 0.12, at: i * 0.11 }));
    },
  };
})();
