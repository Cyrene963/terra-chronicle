#!/usr/bin/env python3
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

REPO = Path('/root/terra-chronicle-game')
OUT_DIR = REPO / 'dogfood-output' / 'terra-review-package-20260616'
OUT_DIR.mkdir(parents=True, exist_ok=True)

ITEMS = [
    {
        'key': 'public_alchemy_dewberry',
        'title': 'Alchemy / Dewberry Crop UI',
        'path': REPO / 'dogfood-output' / 'soft-farm-crop-ui-20260615' / 'public_alchemy_dewberry.png',
        'note': 'Public alchemy scene with dewberry crop UI and parchment fantasy styling.',
    },
    {
        'key': 'dungeon_preview',
        'title': 'Dungeon Preview',
        'path': REPO / 'dogfood-output' / 'terra-battle-dungeon-smoke' / '02_dungeon_preview.png',
        'note': 'Dark fantasy dungeon map preview with node progression.',
    },
    {
        'key': 'soft_farm_water_fire',
        'title': 'Soft Farm / Water + Fire Spirits',
        'path': REPO / 'dogfood-output' / 'soft-farm-unification-20260615' / 'public_soft_farm_water_fire.png',
        'note': 'Soft farm visual unification showing water and fire spirit labor loop.',
    },
    {
        'key': 'card_reveal',
        'title': 'Card Reveal',
        'path': REPO / 'dogfood-output' / 'terra-visual-smoke' / '04_card_reveal.png',
        'note': 'Card crafting/reveal moment from the visual smoke package.',
    },
]

W, H = 1920, 1480
MARGIN = 54
GAP = 34
HEADER_H = 132
FOOTER_H = 54
CELL_W = (W - 2 * MARGIN - GAP) // 2
CELL_H = (H - HEADER_H - FOOTER_H - 2 * MARGIN - GAP) // 2
CAPTION_H = 84
IMG_H = CELL_H - CAPTION_H

BG = (32, 24, 18)
PAPER = (235, 215, 176)
PAPER_2 = (222, 194, 143)
GOLD = (199, 147, 61)
INK = (46, 33, 25)
MUTED = (117, 82, 49)
WHITE = (252, 244, 224)


def font(size: int, bold: bool = False):
    candidates = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    ]
    for c in candidates:
        try:
            return ImageFont.truetype(c, size)
        except OSError:
            pass
    return ImageFont.load_default()

FONT_TITLE = font(46, True)
FONT_SUB = font(23)
FONT_CAP = font(25, True)
FONT_NOTE = font(17)
FONT_SMALL = font(15)


def fit_cover(img: Image.Image, box_w: int, box_h: int) -> Image.Image:
    iw, ih = img.size
    scale = max(box_w / iw, box_h / ih)
    nw, nh = round(iw * scale), round(ih * scale)
    resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - box_w) // 2
    top = (nh - box_h) // 2
    return resized.crop((left, top, left + box_w, top + box_h))


def draw_wrapped(draw: ImageDraw.ImageDraw, text: str, xy: tuple[int, int], max_w: int, fnt, fill):
    words = text.split()
    lines = []
    line = ''
    for word in words:
        trial = (line + ' ' + word).strip()
        if draw.textbbox((0, 0), trial, font=fnt)[2] <= max_w or not line:
            line = trial
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    x, y = xy
    line_h = draw.textbbox((0, 0), 'Ag', font=fnt)[3] + 5
    for ln in lines[:2]:
        draw.text((x, y), ln, font=fnt, fill=fill)
        y += line_h


canvas = Image.new('RGB', (W, H), BG)
d = ImageDraw.Draw(canvas)

# layered parchment background
for i in range(18):
    inset = i * 2
    col = (42 + i, 31 + i // 2, 22)
    d.rounded_rectangle((inset, inset, W - inset - 1, H - inset - 1), radius=24, outline=col, width=2)

d.rounded_rectangle((28, 26, W - 28, H - 26), radius=26, fill=(57, 39, 25), outline=GOLD, width=3)
d.rounded_rectangle((38, 36, W - 38, H - 36), radius=20, outline=(121, 84, 41), width=2)

# header
d.text((MARGIN, 42), 'Terra Chronicle — Review Package Contact Sheet', font=FONT_TITLE, fill=WHITE)
d.text((MARGIN, 96), 'Current public screenshots selected to show alchemy, dungeon, farm/spirit loop, and card reveal progress.', font=FONT_SUB, fill=(224, 197, 150))
d.line((MARGIN, HEADER_H - 10, W - MARGIN, HEADER_H - 10), fill=GOLD, width=2)

manifest_items = []
for idx, item in enumerate(ITEMS):
    if not item['path'].exists():
        raise FileNotFoundError(item['path'])
    row, col = divmod(idx, 2)
    x = MARGIN + col * (CELL_W + GAP)
    y = HEADER_H + row * (CELL_H + GAP)

    d.rounded_rectangle((x, y, x + CELL_W, y + CELL_H), radius=18, fill=PAPER, outline=GOLD, width=3)
    d.rounded_rectangle((x + 10, y + 10, x + CELL_W - 10, y + CELL_H - 10), radius=12, outline=PAPER_2, width=2)

    img = Image.open(item['path']).convert('RGB')
    source_size = img.size
    fitted = fit_cover(img, CELL_W - 28, IMG_H - 20)
    img_x, img_y = x + 14, y + 14
    canvas.paste(fitted, (img_x, img_y))
    d.rectangle((img_x, img_y, img_x + fitted.width - 1, img_y + fitted.height - 1), outline=(69, 43, 25), width=2)

    cap_y = y + IMG_H + 4
    d.rectangle((x + 14, cap_y, x + CELL_W - 14, y + CELL_H - 14), fill=(242, 224, 184))
    d.text((x + 26, cap_y + 12), f'{idx + 1}. {item["title"]}', font=FONT_CAP, fill=INK)
    draw_wrapped(d, item['note'], (x + 26, cap_y + 46), CELL_W - 60, FONT_NOTE, MUTED)
    d.text((x + CELL_W - 250, y + CELL_H - 36), f'{source_size[0]}×{source_size[1]}', font=FONT_SMALL, fill=MUTED)

    manifest_items.append({
        'key': item['key'],
        'title': item['title'],
        'source': str(item['path'].relative_to(REPO)),
        'source_dimensions': {'width': source_size[0], 'height': source_size[1]},
        'panel': {'x': x, 'y': y, 'width': CELL_W, 'height': CELL_H},
        'caption': item['note'],
    })

footer = 'Generated from existing dogfood-output screenshots; no Telegram delivery requested.'
d.text((MARGIN, H - FOOTER_H + 10), footer, font=FONT_SMALL, fill=(214, 181, 125))
d.text((W - MARGIN - 210, H - FOOTER_H + 10), f'Canvas: {W}×{H}', font=FONT_SMALL, fill=(214, 181, 125))

contact_path = OUT_DIR / 'contact_sheet.png'
canvas.save(contact_path, 'PNG', optimize=True)

manifest = {
    'package': 'terra-review-package-20260616',
    'created_at_utc': datetime.now(timezone.utc).isoformat(),
    'generator': 'tools/create_review_contact_sheet.py',
    'contact_sheet': {
        'path': str(contact_path.relative_to(REPO)),
        'dimensions': {'width': W, 'height': H},
        'layout': {'columns': 2, 'rows': 2},
    },
    'items': manifest_items,
}
manifest_path = OUT_DIR / 'manifest.json'
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(contact_path)
print(manifest_path)
print(f'{W}x{H}')
