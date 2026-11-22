# Brazalete art slots

Plain-language guide for whoever makes the finished pictures (Codex, an artist). The band and the devices already work with simple placeholder drawings. **Every finished picture is a replaceable file with a fixed name, so nothing in the code has to change when a picture arrives.**

## How a picture goes live

1. Make the image (square, transparent background, WebP or PNG, about 256 by 256 pixels, one instrument centered with a little space around it).
2. Save it in `brazalete/art/instruments/` using the exact name from the list below.
3. Add one line to `brazalete/art/instruments/manifest.json` that maps the slot to the file, like this: `{ "salsa/conga": "salsa-conga.webp" }`.
4. Reload the page. Any instrument without a line keeps its placeholder drawing, so pictures can arrive one at a time.

Boxes are shown dim (grayscale) until the instrument joins the band, then in full color, so the picture should look good both ways. A yellow border flashes around the box with the instrument's own sound.

## Instrument slots (one per instrument group, per version)

### Reggaeton (25 instruments, in the order they join)

| # | Slot name | Instrument | File to make |
|---|---|---|---|
| 1 | `reggaeton/kick` | Kick | `reggaeton-kick.webp` |
| 2 | `reggaeton/snare` | Dembow snare and rim | `reggaeton-snare.webp` |
| 3 | `reggaeton/hats` | Hi-hats | `reggaeton-hats.webp` |
| 4 | `reggaeton/bass808` | 808 bass | `reggaeton-bass808.webp` |
| 5 | `reggaeton/claps` | Claps and snaps | `reggaeton-claps.webp` |
| 6 | `reggaeton/timbal` | Timbales | `reggaeton-timbal.webp` |
| 7 | `reggaeton/conga` | Congas | `reggaeton-conga.webp` |
| 8 | `reggaeton/bongo` | Bongos | `reggaeton-bongo.webp` |
| 9 | `reggaeton/cowbell` | Cowbell, guiro and maracas | `reggaeton-cowbell.webp` |
| 10 | `reggaeton/shaker` | Shaker and tambourine | `reggaeton-shaker.webp` |
| 11 | `reggaeton/sub` | Sub bass | `reggaeton-sub.webp` |
| 12 | `reggaeton/piano` | Piano | `reggaeton-piano.webp` |
| 13 | `reggaeton/nylon` | Nylon guitar | `reggaeton-nylon.webp` |
| 14 | `reggaeton/steelgtr` | Steel guitar strum | `reggaeton-steelgtr.webp` |
| 15 | `reggaeton/marimba` | Marimba and kalimba | `reggaeton-marimba.webp` |
| 16 | `reggaeton/pad` | Synth pad | `reggaeton-pad.webp` |
| 17 | `reggaeton/toms` | Toms and cymbals | `reggaeton-toms.webp` |
| 18 | `reggaeton/steeldrum` | Steel drums | `reggaeton-steeldrum.webp` |
| 19 | `reggaeton/synthbrass` | Synth brass | `reggaeton-synthbrass.webp` |
| 20 | `reggaeton/lead` | Synth lead | `reggaeton-lead.webp` |
| 21 | `reggaeton/brass` | Real brass | `reggaeton-brass.webp` |
| 22 | `reggaeton/strings` | Strings | `reggaeton-strings.webp` |
| 23 | `reggaeton/choir` | Voices and chops | `reggaeton-choir.webp` |
| 24 | `reggaeton/horns` | Air horns and hype | `reggaeton-horns.webp` |
| 25 | `reggaeton/fx` | Risers and impacts | `reggaeton-fx.webp` |

### Salsa (25 instruments, in the order they join)

| # | Slot name | Instrument | File to make |
|---|---|---|---|
| 1 | `salsa/base` | Drums | `salsa-base.webp` |
| 2 | `salsa/hats` | Hi-hat, cymbals and timpani | `salsa-hats.webp` |
| 3 | `salsa/conga` | Congas | `salsa-conga.webp` |
| 4 | `salsa/bass` | Bass | `salsa-bass.webp` |
| 5 | `salsa/piano` | Piano | `salsa-piano.webp` |
| 6 | `salsa/bongo` | Bongos | `salsa-bongo.webp` |
| 7 | `salsa/timbal` | Timbales | `salsa-timbal.webp` |
| 8 | `salsa/guiro` | Güiro and maracas | `salsa-guiro.webp` |
| 9 | `salsa/extra` | Extra percussion | `salsa-extra.webp` |
| 10 | `salsa/tres` | Tres and guitars | `salsa-tres.webp` |
| 11 | `salsa/accordion` | Accordion | `salsa-accordion.webp` |
| 12 | `salsa/organ` | Organ | `salsa-organ.webp` |
| 13 | `salsa/trombones` | Trombones | `salsa-trombones.webp` |
| 14 | `salsa/trumpets` | Trumpets | `salsa-trumpets.webp` |
| 15 | `salsa/melody` | Trumpet melody | `salsa-melody.webp` |
| 16 | `salsa/horns` | French horns | `salsa-horns.webp` |
| 17 | `salsa/saxes` | Saxophones | `salsa-saxes.webp` |
| 18 | `salsa/clarinets` | Clarinets | `salsa-clarinets.webp` |
| 19 | `salsa/flutes` | Flutes | `salsa-flutes.webp` |
| 20 | `salsa/strings` | Strings | `salsa-strings.webp` |
| 21 | `salsa/pizz` | Pizzicato strings | `salsa-pizz.webp` |
| 22 | `salsa/harp` | Harp and marimba | `salsa-harp.webp` |
| 23 | `salsa/pito` | Pito (whistle) | `salsa-pito.webp` |
| 24 | `salsa/coros` | Coros | `salsa-coros.webp` |
| 25 | `salsa/palmas` | Palmas | `salsa-palmas.webp` |

## Other slots planned (not wired yet)

- **Combo ring frame:** an optional decorative frame around the streak number (the ring itself is drawn with CSS).
- **Device art:** the verb, agreement and pronoun devices have their own art slots, listed when those pages get their finished look.
- **Chooser card pictures:** one picture per device card on `/brazalete/use/`.

Do not put music or voice files here. They live on separate hosting (see `brazalete/band/config.js`).

## The band picture (verb page, 22 November 2026)

On the verb page the instrument boxes are replaced by **one picture of the whole band** (NZ's choice). Each member is dim until they join, then appears in colour and moves to the beat. Until finished art exists, a placeholder stage is drawn with the instrument drawings standing on it. The pronoun and agreement pages still show the boxes.

To put in a finished band picture (one per version, salsa and reggaeton):

1. Make a **backdrop** (the stage and scenery, no players), portrait, about 600 by 800 pixels, WebP.
2. Make **one picture per member** (player with instrument), transparent background, square, about 256 by 256, WebP. Each member must look good both dim and in colour.
3. Save them in `brazalete/art/band/`.
4. Fill in `brazalete/art/band/manifest.json`, for example:

```json
{
  "salsa": {
    "backdrop": "salsa-stage.webp",
    "members": {
      "base":  { "file": "salsa-base-player.webp",  "x": 50, "y": 80, "w": 20, "z": 10 },
      "conga": { "file": "salsa-conga-player.webp", "x": 30, "y": 78, "w": 18, "z": 9 }
    }
  }
}
```

`x` and `y` are where the member's centre stands, in percent of the picture's width and height; `w` is the member's width in percent of the picture's width; `z` decides who is drawn in front (bigger = in front). Use the member names from the slot lists above (the part after the slash). A member without an entry keeps its placeholder drawing and spot, so pictures can arrive one at a time. The motion (bobbing, swaying, hopping, pumping to the beat, and the pop when someone joins) is added by the page, so the pictures should be still.
