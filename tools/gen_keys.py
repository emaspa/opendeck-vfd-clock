#!/usr/bin/env python3
"""Render the VFD clock key faces.

usage: gen_keys.py <plugin-dir>
Writes <plugin-dir>/imgs/<skin>/<face>.png for every skin in vfd_palette.PALETTES:
  h24_HH.png            hours, 24-hour
  h12_H_am|pm.png       hours, 12-hour with an AM/PM indicator
  m_MM.png              minutes
  s_SS.png              seconds
and the same with a "_bare" suffix (no legend chip, bigger digits).

The look follows the InfoPanel VFD profiles (InfoPanel/tools/orange-vfd/gen_vfd.py):
DSEG7 Classic Italic digits over ghost 8s, a GLOW halo blurred by 7 px and added
with the Plus blend (SkiaGraphics.DrawString), silk legend chips, a rounded frame,
light spill and the glass mesh.
"""
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vfd_palette import PALETTES, silk_font

S = 144
FONTS = os.path.expanduser('~/.local/share/fonts')
SEG7 = os.path.join(FONTS, 'DSEG7Classic-Italic.ttf')
SEG14 = os.path.join(FONTS, 'DSEG14Classic-Italic.ttf')
GLOW_RADIUS = 7
GLOW_ALPHA = 0xCC


def background(p):
    im = Image.new('RGBA', (S, S), p['BG'] + (255,))
    spill = Image.new('L', (S, S), 0)
    ImageDraw.Draw(spill).ellipse((-10, 24, S + 10, S - 8), fill=26)
    spill = spill.filter(ImageFilter.GaussianBlur(22))
    tint = Image.new('RGBA', (S, S), p['SPILL'] + (255,))
    tint.putalpha(spill)
    im.alpha_composite(tint)
    ImageDraw.Draw(im).rounded_rectangle((5, 5, S - 6, S - 6), radius=16, outline=p['FRAME'], width=2)
    return im


def mesh(p):
    m = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(m)
    for v in range(0, S, 3):
        d.line((0, v, S, v), fill=(0, 0, 0, 70))
        d.line((v, 0, v, S), fill=(0, 0, 0, 45))
    sheen = Image.new('L', (S, S), 0)
    ImageDraw.Draw(sheen).polygon([(0, 0), (S, 0), (S, S * 0.22), (0, S * 0.5)], fill=14)
    sheen = sheen.filter(ImageFilter.GaussianBlur(12))
    white = Image.new('RGBA', (S, S), p['SHEEN'] + (255,))
    white.putalpha(sheen)
    m.alpha_composite(white)
    return m


def ghost(im, xy, text, font, color):
    ImageDraw.Draw(im).text(xy, text, font=font, fill=color + (255,), anchor='rs')


def lit(im, xy, text, font, p):
    """InfoPanel's glowing text: blurred GLOW plus sharp LIT, added onto the background."""
    group = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    halo = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(halo).text(xy, text, font=font, fill=p['GLOW'] + (GLOW_ALPHA,), anchor='rs')
    group.alpha_composite(halo.filter(ImageFilter.GaussianBlur(GLOW_RADIUS)))
    ImageDraw.Draw(group).text(xy, text, font=font, fill=p['LIT'] + (255,), anchor='rs')
    g = np.asarray(group, dtype=np.float32) / 255.0
    base = np.asarray(im, dtype=np.float32) / 255.0
    out = base.copy()
    out[..., :3] = np.clip(base[..., :3] + g[..., :3] * g[..., 3:4], 0, 1)   # Plus, premultiplied source
    im.paste(Image.fromarray((out * 255 + 0.5).astype(np.uint8), 'RGBA'))


def chip(im, text, p):
    d = ImageDraw.Draw(im)
    f = silk_font(19, 800)
    tw = d.textlength(text, font=f)
    w = int(tw + 14)
    d.rounded_rectangle((15, 15, 15 + w, 15 + 23), radius=4, fill=p['SILK'])
    d.text((15 + (w - tw) / 2, 15 + 12), text, font=f, fill=p['BG'], anchor='lm')


def face(p, digits, legend, ampm=None):
    """digits: two characters, '!' is a blank DSEG cell (shows only its ghost)."""
    im = background(p)
    size, base = (60, 119) if legend else (68, 107)
    f7 = ImageFont.truetype(SEG7, size)
    width = -f7.getbbox('88', anchor='rs')[0]
    right = (S + width) // 2 + 1
    ghost(im, (right, base), '88', f7, p['GHOST'])
    lit(im, (right, base), digits, f7, p)
    if legend:
        chip(im, legend, p)
    if ampm:
        f14 = ImageFont.truetype(SEG14, 15)
        xy = (S - 16, 38) if legend else (S - 16, 30)
        ghost(im, xy, '~~', f14, p['GHOST14'])
        lit(im, xy, ampm, f14, p)
    im.alpha_composite(mesh(p))
    return im.convert('RGB')


def main():
    out = sys.argv[1]
    for skin, p in PALETTES.items():
        d = os.path.join(out, 'imgs', skin)
        os.makedirs(d, exist_ok=True)
        for bare in (False, True):
            sfx = '_bare' if bare else ''
            for h in range(24):
                face(p, f'{h:02d}', None if bare else 'HRS').save(os.path.join(d, f'h24_{h:02d}{sfx}.png'), optimize=True)
            for h in range(1, 13):
                for ap in ('am', 'pm'):
                    face(p, f'{h:>2}'.replace(' ', '!'), None if bare else 'HRS', ap.upper()).save(
                        os.path.join(d, f'h12_{h}_{ap}{sfx}.png'), optimize=True)
            for m in range(60):
                face(p, f'{m:02d}', None if bare else 'MIN').save(os.path.join(d, f'm_{m:02d}{sfx}.png'), optimize=True)
                face(p, f'{m:02d}', None if bare else 'SEC').save(os.path.join(d, f's_{m:02d}{sfx}.png'), optimize=True)
        print(skin, 'done')


if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == '--preview':
        # quick contact sheet: gen_keys.py --preview out.png
        tiles = []
        for skin, p in PALETTES.items():
            tiles += [face(p, '09', 'HRS'), face(p, '41', 'MIN'), face(p, '!9', 'HRS', 'PM'), face(p, '41', None)]
        sheet = Image.new('RGB', (S * 4 + 50, S * 3 + 40), (20, 20, 20))
        for i, t in enumerate(tiles):
            sheet.paste(t, (10 + (i % 4) * (S + 10), 10 + (i // 4) * (S + 10)))
        sheet.save(sys.argv[2])
    else:
        main()
