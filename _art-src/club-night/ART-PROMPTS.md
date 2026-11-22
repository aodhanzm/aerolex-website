# Brazalete Club Night — art prompts for ChatGPT

Written 22 November 2026 for NZ to paste into ChatGPT, **one batch (up to 10 pictures) at a time**. Design contract: vault `products/the-scene/specs/Brazalete Club Night — Design Contract 2026-11-22.md`.
This folder (`_art-src/`) is never published; the website only gets the compressed copies Claude makes.

**67 pictures in 8 batches:** salsa scenery (Batch 1), salsa musicians (Batches 2–4), reggaeton scenery (Batch 5), reggaeton musicians (Batches 6–8).

---

## How to do it

1. Open **one new ChatGPT chat per scene** (one for salsa, one for reggaeton) so the style stays consistent inside each.
2. In that chat, **attach your two favourite reference pictures first** ("Courtyard after dark" and "Salsa club stage") and paste the **Style rules** block below once.
3. Paste one batch block at a time. If ChatGPT only makes one picture, say "next" until all 10 are done.
4. **Download each picture as PNG** and save it here, named exactly as the batch says (for example `S03-salsa-stage.png`):
   `_art-src\club-night\incoming\` inside the website folder (the folder this file is in, then `incoming`)
   - If renaming is a chore: put a batch's downloads, in the order ChatGPT made them, into `incoming\batch-1\`, `incoming\batch-2\` and so on. Claude matches them by order and checks each one by eye.
5. Tell Claude "process the club art". Claude crops and resizes each picture to its **final size**, compresses it, checks it in the page, and tells you which ones need a redo.

**About the sizes.** ChatGPT can only make three sizes: **1024×1024** (square), **1536×1024** (wide) and **1024×1536** (tall). Each picture below says which one to ask for ("Generate at"), and the size Claude turns it into for the website ("Final"). The final sizes are measured on a **1920×1080 scene**: a full laptop screen. On smaller screens everything scales down together.

**Transparent backgrounds.** Everything except the two backdrops must have a **transparent background** (a PNG with no background at all, not white, not checkered). If ChatGPT draws a checkerboard or a white box, ask: "Make the background truly transparent."

**Not in the pictures (the page draws these itself, so they can glow, pulse and change colour):** string lights, spotlight beams, the neon sign, sparkles, confetti, fireworks, the combo ring, and any words. **No text or letters in any picture.**

---

## Style rules (paste once at the start of each chat)

```
I'm making layered artwork for an animated web game scene: an open-air Caribbean music night club at night. Every picture I ask for is ONE separate layer that will be stacked with others and animated by code, so follow these rules for every picture in this chat:

- Style: match the attached reference pictures. Vibrant, glossy, painterly semi-realistic cartoon, like a premium mobile game. Rich saturated colours, warm golden light against deep blue-violet night, turquoise accents, soft glows. Clean, crisp edges.
- Lighting: night. Warm key light from the front-left (lanterns and stage lights), cool turquoise rim light from behind (the lagoon and moon).
- Camera: straight-on, eye level, slightly from the front, the same for every picture so the layers fit together.
- Transparent background for every picture unless I say "backdrop". No ground shadow, no floor, no frame, no border.
- No text, letters, logos, signs with writing, watermarks or UI of any kind.
- Only draw what I describe. No extra people, instruments or props.
- Deliver each picture as a PNG at exactly the size I give.
```

---

## Where each piece goes (for reference; the page places them)

The scene is **1920×1080**. The Brazalete sits in the middle (roughly x 660–1260), so the middle of every scenery picture should stay calm and simple.

| Piece | Position on the 1920×1080 scene |
|---|---|
| Backdrop | the whole scene, behind everything |
| Left set (courtyard corner / beach hut) | left edge, x 0–720, full height |
| Stage | right side, x 920–1920, y 300–967 |
| Musicians | standing on the stage's three risers, 150–260 px tall |
| Palms | bleeding off the top-left and top-right corners |
| Foreground plants | bottom-left and bottom-right corners |
| Lanterns / tiki torches | 4 copies along the left set and the stage |
| Glass pedestal | under the Brazalete, centre |

---

# SALSA (one chat for Batches 1–4)

## Batch 1 — salsa scenery (9 pictures)

```
Batch 1 of the salsa scene. Make these 9 pictures one at a time, each as its own PNG, following my style rules.

S01-salsa-backdrop — Generate at 1536×1024. BACKDROP (NOT transparent). A Caribbean lagoon at night seen from a seaside courtyard: deep blue-violet starry sky, a large glowing full moon in the upper right with its reflection shimmering on calm turquoise water, distant green hills with tiny warm town lights along the shore on the right, a faint old church tower far away. The bottom third is the courtyard floor: warm terracotta tiles with patches of colourful Spanish painted tiles, reflecting a little moonlight, running from edge to edge. The middle of the picture (the floor and water in the centre) must stay simple and uncluttered. No people, no buildings in the foreground, no stage, no plants in front, no lights strung across.

S02-salsa-courtyard-left — Generate at 1024×1536. Transparent background. The left corner of a Spanish-colonial courtyard, as a tall cut-out layer: cream and peach stucco wall with two rounded arches and a wooden door, a small balcony, masses of magenta and pink bougainvillea cascading over the top and down the arches, a few terracotta pots with plants at the base. The right edge of the picture is where the wall ends, cleanly. Empty iron hooks where lanterns would hang, but no lanterns and no lamps. No floor, no sky behind it.

S03-salsa-stage — Generate at 1536×1024. Transparent background. An empty open-air bandstand stage, seen from the front and slightly to the left: a warm polished-wood stage platform with THREE stepped levels (a wide low front level, a middle level, and a raised back level), all clearly flat and empty so musicians can stand on them; two carved wooden-and-stone columns holding up a red terracotta tiled roof with a pretty wooden fringe; a low decorative railing of colourful Spanish tiles along the front edge. Completely empty: no people, no instruments, no microphones, no lights, no signs. No floor around it, no sky behind it.

S04-salsa-palm-left — Generate at 1024×1536. Transparent background. One tall coconut palm with a gently curving trunk leaning to the right and a full crown of glossy fronds at the top, lit warm gold from the front and turquoise from behind. The trunk starts at the bottom edge. Nothing else.

S05-salsa-palm-right — Generate at 1024×1536. Transparent background. A different tall coconut palm with its trunk leaning to the left and a full, slightly asymmetric crown of fronds at the top, same lighting. The trunk starts at the bottom edge. Nothing else.

S06-salsa-flowers-left — Generate at 1024×1024. Transparent background. A lush tropical bush for the bottom-left corner of the scene: large red and orange hibiscus flowers, big glossy monstera and banana leaves, a few small pink blossoms, spreading from the bottom-left corner up and to the right, lit warm from the front. Nothing else.

S07-salsa-flowers-right — Generate at 1024×1024. Transparent background. A matching lush tropical bush for the bottom-right corner: orange hibiscus, bird-of-paradise flowers, big glossy leaves, spreading from the bottom-right corner up and to the left. Nothing else.

S08-salsa-lantern — Generate at 1024×1024. Transparent background. One ornate hanging Spanish-Moroccan brass lantern with amber glass panels, glowing warmly from inside, hanging from a short chain at the top centre. Only the lantern and chain, centred, filling about 70% of the height.

P01-glass-pedestal — Generate at 1536×1024. Transparent background. A round glowing glass stage platform seen from slightly above, like a futuristic turquoise display stand: two stacked shallow glass discs with pearl-white rims, soft cyan light rising from the inside, a faint ring of light on top. Wide and flat (about three times wider than tall), centred. Nothing on top of it.
```

**Final sizes:** S01 1920×1080 · S02 720×1080 · S03 1000×667 · S04 640×960 · S05 640×960 · S06 560×560 · S07 560×560 · S08 160×160 · P01 1200×420

## Musicians: shared instructions (already inside each batch below)

Every musician is **Generate at 1024×1536, transparent background, Final 400×600**. One musician per picture (except where it says two), **whole body from head to feet**, feet near the bottom edge, filling about 90% of the height. Facing three-quarters toward the viewer and slightly to the **left** (toward the centre of the screen). Caught in a lively playing pose, but holding still (the page makes them move). The same art style and lighting in every picture so they look like one band.

## Batch 2 — salsa musicians 1 to 10

```
Batch 2 of the salsa scene: the band's musicians, one per picture. For every picture in this batch: generate at 1024×1536, transparent background, the whole body from head to feet filling about 90% of the height with the feet near the bottom edge, facing three-quarters toward the viewer and slightly to the left, a lively playing pose. Classic Caribbean salsa band look: guayabera shirts, cream and white linen suits, Panama hats, colourful dresses, flowers in the hair; a varied cast of Caribbean and Latin American people of different ages, skin tones and body types. Same style and lighting as before. No other people, no stage, no floor, no text. Make these 10 pictures one at a time:

M-salsa-01-base — A drummer seated on a stool behind a compact drum kit (bass drum, snare, two toms, a ride cymbal), sticks raised mid-groove. The whole kit and the drummer visible.
M-salsa-02-hats — A percussionist standing between a hi-hat stand, a crash cymbal and a pair of copper timpani kettledrums, a mallet in each hand.
M-salsa-03-conga — A conguero standing and slapping a pair of tall wooden conga drums with both hands.
M-salsa-04-bass — A bassist playing an upright double bass, plucking the strings, the whole bass visible.
M-salsa-05-piano — A pianist standing at a red stage piano on a stand, both hands on the keys, smiling.
M-salsa-06-bongo — A bongosero seated on a low stool with bongo drums between the knees and a cowbell hanging at the hip.
M-salsa-07-timbal — A timbalero standing at a pair of shiny silver timbales with two cowbells and a small cymbal, sticks in both hands.
M-salsa-08-guiro — A percussionist scraping a gourd güiro with a stick, a pair of maracas tucked in the belt.
M-salsa-09-extra — A percussionist with a tambourine in one hand and wooden claves in the other, a small shaker table beside them.
M-salsa-10-tres — A guitarist strumming a Cuban tres guitar (small, six strings in three pairs).
```

## Batch 3 — salsa musicians 11 to 20

```
Batch 3 of the salsa scene: more musicians, with exactly the same rules as Batch 2 (1024×1536, transparent, whole body, feet near the bottom, three-quarters view toward the left, classic Caribbean salsa band look, varied cast, same style and lighting, nothing else in the picture). Make these 10 pictures one at a time:

M-salsa-11-accordion — An accordionist playing a red and pearl accordion, bellows open.
M-salsa-12-organ — An organist standing at a vintage red combo organ on a chrome stand.
M-salsa-13-trombones — A trombonist with the slide pushed out, playing loud.
M-salsa-14-trumpets — A trumpeter in the horn section, trumpet level.
M-salsa-15-melody — The star trumpet soloist: stepping forward, trumpet pointed high to the sky, a flashy gold-trimmed suit.
M-salsa-16-horns — A French horn player, the coiled brass horn held with the bell down at the hip.
M-salsa-17-saxes — A saxophonist playing a gold tenor saxophone, leaning back.
M-salsa-18-clarinets — A clarinetist playing a black clarinet.
M-salsa-19-flutes — A flautist playing a silver flute held to the right.
M-salsa-20-strings — A violinist playing a violin, bow mid-stroke.
```

## Batch 4 — salsa musicians 21 to 25

```
Batch 4 of the salsa scene: the last musicians, same rules as Batches 2 and 3. Make these 5 pictures one at a time:

M-salsa-21-pizz — A cellist plucking the strings of a cello with one finger, seated on a small stool.
M-salsa-22-harp — A harpist playing a small wooden Latin folk harp, standing.
M-salsa-23-pito — A hype performer blowing a silver whistle, one arm raised high, full of energy.
M-salsa-24-coros — TWO backing singers side by side in matching outfits, singing into one vintage microphone on a stand.
M-salsa-25-palmas — A dancer clapping hands above the head, mid-step, a swirling colourful skirt.
```

---

# REGGAETON (one new chat for Batches 5–8)

Start a new chat, attach the two reference pictures, paste the Style rules again, then add this sentence: **"This chat is the reggaeton version: a night beach party on the same lagoon, with neon pink, purple and electric-blue accents instead of warm gold."**

## Batch 5 — reggaeton scenery (8 pictures)

```
Batch 5: the reggaeton beach party scenery. Make these 8 pictures one at a time, each as its own PNG, following my style rules, with neon pink, purple and electric-blue accents.

R01-reggaeton-backdrop — Generate at 1536×1024. BACKDROP (NOT transparent). A Caribbean beach at night: a violet and deep-blue sky with stars and a big moon on the upper right, the moon's path glittering on the sea, gentle glowing turquoise waves rolling onto the shore, a dark headland with a lighthouse far off on the left, faint neon city glow on the far horizon on the right. The bottom third is smooth pale sand catching pink and blue light, running edge to edge. The middle of the picture (sand and sea in the centre) must stay simple. No people, no stage, no plants in front, no lights strung across.

R02-reggaeton-beach-left — Generate at 1024×1536. Transparent background. The left side of the beach party as a tall cut-out layer: a small wooden beach bar hut with a palm-thatch roof, surfboards leaning on it, a stack of colourful crates, and a stone fire pit with a crackling bonfire in front. The right edge is where the hut ends, cleanly. No people. No sky or sand behind it.

R03-reggaeton-stage — Generate at 1536×1024. Transparent background. An empty beach party DJ stage, seen from the front and slightly to the left: a wooden deck stage with THREE stepped levels (a wide low front level, a middle level, a raised back level), all flat and empty so performers can stand on them; a black metal truss frame overhead with dark LED panels (switched off); a big speaker stack on each side. Completely empty: no people, no instruments, no DJ decks, no lights shining, no signs. No sand or sky around it.

R04-reggaeton-palm-left — Generate at 1024×1536. Transparent background. A tall beach coconut palm leaning to the right with a full crown of fronds at the top, lit pink from the front and electric blue from behind. Trunk starts at the bottom edge. Nothing else.

R05-reggaeton-palm-right — Generate at 1024×1536. Transparent background. A different tall coconut palm leaning to the left, same lighting, with a few coconuts. Trunk starts at the bottom edge. Nothing else.

R06-reggaeton-plants-left — Generate at 1024×1024. Transparent background. Beach plants for the bottom-left corner: tall dune grass, sea grape leaves, a big monstera leaf, a half-buried conch shell, spreading from the bottom-left corner up and to the right. Nothing else.

R07-reggaeton-plants-right — Generate at 1024×1024. Transparent background. Beach plants for the bottom-right corner: dune grass, a small agave, tropical leaves and a beach cooler half hidden, spreading from the bottom-right corner up and to the left. Nothing else.

R08-reggaeton-torch — Generate at 1024×1536. Transparent background. One bamboo tiki torch standing upright with a bright flame at the top, centred, filling about 90% of the height. Only the torch.
```

**Final sizes:** R01 1920×1080 · R02 720×1080 · R03 1000×667 · R04 640×960 · R05 640×960 · R06 560×560 · R07 560×560 · R08 160×480

## Batch 6 — reggaeton performers 1 to 10

```
Batch 6 of the reggaeton beach party: the band's performers, one per picture. For every picture: generate at 1024×1536, transparent background, the whole body from head to feet filling about 90% of the height with the feet near the bottom edge, facing three-quarters toward the viewer and slightly to the left, a lively performing pose. Reggaeton beach party look: streetwear, bucket hats, oversized tees, gold chains, sunglasses, colourful sneakers, neon accents, swimwear touches; a varied cast of Caribbean and Latin American people of different ages, skin tones and body types. Same style and lighting as before. No other people, no stage, no floor, no text. Make these 10 pictures one at a time:

M-reggaeton-01-kick — A producer standing at a small table with a glowing drum machine, hitting a big pad.
M-reggaeton-02-snare — A performer drumming on an electronic drum pad on a stand, sticks raised.
M-reggaeton-03-hats — A producer tapping rhythms on a glowing sampler pad held in one arm.
M-reggaeton-04-bass808 — A producer playing a chunky synthesizer keyboard on a stand, head nodding.
M-reggaeton-05-claps — A hype dancer clapping hands above the head, mid-bounce.
M-reggaeton-06-timbal — A timbalero at a pair of silver timbales with a cowbell, sticks in both hands, streetwear.
M-reggaeton-07-conga — A percussionist slapping a pair of conga drums painted with neon stripes.
M-reggaeton-08-bongo — A percussionist with bongo drums on a stand, playing with fingertips.
M-reggaeton-09-cowbell — A percussionist with a cowbell and stick in one hand and maracas in the other, a güiro on a strap.
M-reggaeton-10-shaker — A performer shaking a tambourine high in one hand and a shaker in the other, dancing.
```

## Batch 7 — reggaeton performers 11 to 20

```
Batch 7 of the reggaeton beach party: more performers, exactly the same rules as Batch 6. Make these 10 pictures one at a time:

M-reggaeton-11-sub — A DJ at a pair of turntables on a small stand, one hand on a record, headphones on one ear.
M-reggaeton-12-piano — A keyboard player at a white stage piano on a stand.
M-reggaeton-13-nylon — A guitarist playing a nylon-string classical guitar, seated on a beach crate.
M-reggaeton-14-steelgtr — A guitarist strumming a steel-string acoustic guitar, standing.
M-reggaeton-15-marimba — A player at a small marimba with mallets, a kalimba hanging from the neck.
M-reggaeton-16-pad — A producer with a laptop and a small synth on a stand, one hand raised to the crowd.
M-reggaeton-17-toms — A drummer at an electronic drum kit with toms and cymbals, sticks flying.
M-reggaeton-18-steeldrum — A steelpan player playing a shiny chrome steel drum on a stand.
M-reggaeton-19-synthbrass — A performer playing a white keytar slung over the shoulder.
M-reggaeton-20-lead — A star performer playing a glowing neon-pink keytar, stepping forward.
```

## Batch 8 — reggaeton performers 21 to 25

```
Batch 8 of the reggaeton beach party: the last performers, same rules as Batches 6 and 7. Make these 5 pictures one at a time:

M-reggaeton-21-brass — A trumpeter in a flashy tracksuit, trumpet pointed up.
M-reggaeton-22-strings — A violinist playing an electric violin with glowing blue edges.
M-reggaeton-23-choir — TWO backing vocalists side by side, each with a wireless microphone, singing.
M-reggaeton-24-horns — A hype man with an air horn raised in one hand and a megaphone in the other.
M-reggaeton-25-fx — A DJ with a glowing launchpad controller on a stand, smoke curling up behind them.
```

---

## Checklist (Claude ticks these off as pictures arrive)

| Batch | Pictures | Arrived | Processed |
|---|---|---|---|
| 1 | S01–S08, P01 (salsa scenery, pedestal) | | |
| 2 | M-salsa-01 to 10 | | |
| 3 | M-salsa-11 to 20 | | |
| 4 | M-salsa-21 to 25 | | |
| 5 | R01–R08 (reggaeton scenery) | | |
| 6 | M-reggaeton-01 to 10 | | |
| 7 | M-reggaeton-11 to 20 | | |
| 8 | M-reggaeton-21 to 25 | | |
