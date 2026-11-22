"""Turns NZ's ChatGPT pictures for Brazalete Club Night into the website's art files (2026-11-22).

Reads   _art-src/club-night/incoming/   (pictures named as in ART-PROMPTS.md, e.g. S03-salsa-stage.png,
                                         or unnamed downloads in batch-1/, batch-2/ ... in the order ChatGPT made them)
Writes  brazalete/art/club/<name>.webp  (cropped and resized to the final size, compressed)
        brazalete/art/club/manifest.json (the list of pictures that exist; the page uses it to swap stand-ins for real art)
Run:    python _tools/club-art.py          (add --dry to only report what it would do)

The originals stay in _art-src/ (never published). Re-running is safe: every output is rebuilt from the originals.
"""
import json
import sys
from pathlib import Path

from PIL import Image  # Pillow: opens, crops, resizes and saves pictures

HERE = Path(__file__).resolve().parent                     # the _tools folder
SITE = HERE.parent                                          # the website folder
INCOMING = SITE / '_art-src' / 'club-night' / 'incoming'    # where NZ drops the downloads
OUT = SITE / 'brazalete' / 'art' / 'club'                  # what the page loads

# Every picture: final width, final height, how to fit it, and where to anchor it.
#   cover   = fill the whole size, cropping the overflow (backdrops)
#   contain = trim the empty transparent edges, then fit inside the size without cropping, anchored as given
SCENERY = {
    'S01-salsa-backdrop': (1920, 1080, 'cover', 'center'),
    'S02-salsa-courtyard-left': (720, 1080, 'contain', 'bottom-left'),
    'S03-salsa-stage': (1000, 667, 'contain', 'bottom'),
    'S04-salsa-palm-left': (640, 960, 'contain', 'bottom'),
    'S05-salsa-palm-right': (640, 960, 'contain', 'bottom'),
    'S06-salsa-flowers-left': (560, 560, 'contain', 'bottom-left'),
    'S07-salsa-flowers-right': (560, 560, 'contain', 'bottom-right'),
    'S08-salsa-lantern': (160, 160, 'contain', 'center'),
    'P01-glass-pedestal': (1200, 420, 'contain', 'center'),
    'R01-reggaeton-backdrop': (1920, 1080, 'cover', 'center'),
    'R02-reggaeton-beach-left': (720, 1080, 'contain', 'bottom-left'),
    'R03-reggaeton-stage': (1000, 667, 'contain', 'bottom'),
    'R04-reggaeton-palm-left': (640, 960, 'contain', 'bottom'),
    'R05-reggaeton-palm-right': (640, 960, 'contain', 'bottom'),
    'R06-reggaeton-plants-left': (560, 560, 'contain', 'bottom-left'),
    'R07-reggaeton-plants-right': (560, 560, 'contain', 'bottom-right'),
    'R08-reggaeton-torch': (160, 480, 'contain', 'bottom'),
}
SALSA = ['base', 'hats', 'conga', 'bass', 'piano', 'bongo', 'timbal', 'guiro', 'extra', 'tres', 'accordion', 'organ', 'trombones', 'trumpets', 'melody',
         'horns', 'saxes', 'clarinets', 'flutes', 'strings', 'pizz', 'harp', 'pito', 'coros', 'palmas']
REGGAETON = ['kick', 'snare', 'hats', 'bass808', 'claps', 'timbal', 'conga', 'bongo', 'cowbell', 'shaker', 'sub', 'piano', 'nylon', 'steelgtr', 'marimba',
             'pad', 'toms', 'steeldrum', 'synthbrass', 'lead', 'brass', 'strings', 'choir', 'horns', 'fx']
MUSICIANS = {}                                              # every musician: 400×600, feet on the bottom edge
for band, ids in (('salsa', SALSA), ('reggaeton', REGGAETON)):
    for i, layer in enumerate(ids):
        MUSICIANS[f'M-{band}-{i + 1:02d}-{layer}'] = (400, 600, 'contain', 'bottom')
PIECES = {**SCENERY, **MUSICIANS}

# The order of each batch in ART-PROMPTS.md, for unnamed downloads in batch-N folders.
names = list(PIECES)
BATCHES = {
    1: [n for n in names if n.startswith(('S0', 'P01'))],
    2: [f'M-salsa-{i:02d}-{SALSA[i - 1]}' for i in range(1, 11)],
    3: [f'M-salsa-{i:02d}-{SALSA[i - 1]}' for i in range(11, 21)],
    4: [f'M-salsa-{i:02d}-{SALSA[i - 1]}' for i in range(21, 26)],
    5: [n for n in names if n.startswith('R0')],
    6: [f'M-reggaeton-{i:02d}-{REGGAETON[i - 1]}' for i in range(1, 11)],
    7: [f'M-reggaeton-{i:02d}-{REGGAETON[i - 1]}' for i in range(11, 21)],
    8: [f'M-reggaeton-{i:02d}-{REGGAETON[i - 1]}' for i in range(21, 26)],
}
PICTURE = ('.png', '.webp', '.jpg', '.jpeg')


def find_sources():
    """Matches each downloaded picture to its piece name: by file name first, then by order inside batch-N folders."""
    found, notes = {}, []
    if not INCOMING.exists():
        return found, [f'No incoming folder yet: {INCOMING}']
    for f in INCOMING.iterdir():                                             # pictures named after their piece
        if f.is_file() and f.suffix.lower() in PICTURE:
            key = next((n for n in PIECES if f.stem.lower().startswith(n.lower())), None)
            if key:
                found[key] = f
            else:
                notes.append(f'Not recognised (name it like the prompt file says): {f.name}')
    for n, order in BATCHES.items():                                         # unnamed downloads, matched by the order they were made
        folder = INCOMING / f'batch-{n}'
        if not folder.is_dir():
            continue
        files = sorted([f for f in folder.iterdir() if f.suffix.lower() in PICTURE], key=lambda f: f.stat().st_mtime)
        if len(files) != len(order):
            notes.append(f'batch-{n}: {len(files)} pictures, expected {len(order)}; matched in order, please check')
        for name, f in zip(order, files):
            found.setdefault(name, f)                                        # a named file wins over a batch-folder guess
    return found, notes


def place(img, w, h, mode, anchor):
    """Crops or fits a picture into exactly w×h."""
    if mode == 'cover':                                                      # fill, cropping whatever sticks out (equally from both sides)
        scale = max(w / img.width, h / img.height)
        img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
        left, top = (img.width - w) // 2, (img.height - h) // 2
        return img.crop((left, top, left + w, top + h))
    img = img.convert('RGBA')
    box = img.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()  # the part that isn't empty
    if box:
        img = img.crop(box)
    scale = min(w / img.width, h / img.height)
    img = img.resize((max(1, round(img.width * scale)), max(1, round(img.height * scale))), Image.LANCZOS)
    canvas = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    x = {'bottom-left': 0, 'bottom-right': w - img.width}.get(anchor, (w - img.width) // 2)
    y = (h - img.height) // 2 if anchor == 'center' else h - img.height    # sit on the bottom edge unless centred
    canvas.paste(img, (x, y), img)
    return canvas


def transparent_enough(img):
    """True if the picture really has a see-through background (ChatGPT sometimes paints a white or checkered one)."""
    if img.mode not in ('RGBA', 'LA') and 'transparency' not in img.info:
        return False
    a = img.convert('RGBA').getchannel('A')
    corners = [a.getpixel((0, 0)), a.getpixel((a.width - 1, 0)), a.getpixel((0, a.height - 1)), a.getpixel((a.width - 1, a.height - 1))]
    return max(corners) < 30                                                 # the four corners should be empty


def main():
    dry = '--dry' in sys.argv
    found, notes = find_sources()
    OUT.mkdir(parents=True, exist_ok=True)
    done, problems = [], []
    for name, (w, h, mode, anchor) in PIECES.items():
        src = found.get(name)
        if not src:
            continue
        img = Image.open(src)
        if mode == 'contain' and not transparent_enough(img):
            problems.append(f'{name}: the background is not transparent; ask ChatGPT for a truly transparent PNG ({src.name})')
            continue
        out = place(img, w, h, mode, anchor)
        if not dry:
            out.save(OUT / f'{name}.webp', 'WEBP', quality=84, method=6)   # compressed for the web, transparency kept
        done.append(f'{name}: {src.name} -> {w}x{h}')
    existing = sorted(p.name for p in OUT.glob('*.webp') if p.stem in PIECES)
    if not dry:
        (OUT / 'manifest.json').write_text(json.dumps({'files': existing}, indent=1) + '\n', encoding='utf-8')
    print(f'Processed {len(done)} picture(s); {len(existing)} of {len(PIECES)} pieces now exist.')
    for line in done:
        print('  ok  ', line)
    for line in problems + notes:
        print('  !!  ', line)
    missing = [n for n in PIECES if n + '.webp' not in existing]
    if missing:
        print(f'Still missing {len(missing)}: ' + ', '.join(missing[:8]) + (' ...' if len(missing) > 8 else ''))


if __name__ == '__main__':
    main()
