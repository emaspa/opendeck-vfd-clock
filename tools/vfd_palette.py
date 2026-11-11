"""Colours and legend font shared by the VFD profile generators.

Colours follow OpenXLR's Hi-Fi skins (src/OpenXLR.UI/Assets/Skins/hifi, hifi-amber):
one dominant phosphor colour, with #ff3b2f red for the top 30% of every meter
(Ox.Meter.WarningLevel 0.7) and for index marks.
"""
import os
from PIL import ImageFont

PALETTES = {
    'amber': dict(
        BG      = (9, 5, 3),
        LIT     = (255, 150, 52),    # phosphor core
        GLOW    = (255, 84, 0),      # halo
        GHOST   = (40, 19, 8),       # unlit 7-seg segment behind the smoked filter
        GHOST14 = (30, 14, 6),       # unlit 14-seg segment (finer strokes, keep it dimmer)
        SILK    = (168, 86, 34),     # printed legends (non-emissive)
        FRAME   = (74, 38, 16),
        SPILL   = (90, 35, 8),       # warm light bleeding around the panels
        SHEEN   = (255, 220, 190),   # glass reflection tint
    ),
    'blue': dict(                    # Hi-Fi: cyan phosphor (#3fe6ff) with a deep blue halo
        BG      = (3, 8, 11),
        LIT     = (63, 230, 255),
        GLOW    = (0, 120, 255),
        GHOST   = (11, 35, 40),      # Ox.Meter.Track
        GHOST14 = (8, 26, 31),
        SILK    = (50, 148, 166),
        FRAME   = (14, 56, 66),
        SPILL   = (4, 40, 70),
        SHEEN   = (190, 238, 255),
    ),
    'classic': dict(                 # Broadcast skin: green fill, yellow from 70%, red from 90%
        BG      = (3, 9, 5),
        LIT     = (74, 222, 128),    # Ox.Meter.Fill #4ade80
        GLOW    = (0, 200, 60),
        GHOST   = (12, 38, 22),
        GHOST14 = (9, 28, 16),
        SILK    = (60, 160, 96),
        FRAME   = (18, 62, 34),
        SPILL   = (6, 60, 24),
        SHEEN   = (200, 255, 215),
    ),
}

RED       = (255, 59, 47)            # Ox.Meter.Hot / Ox.Led.Alert / fader-cap index
RED_GLOW  = (255, 12, 0)
RED_GHOST = (46, 12, 9)
RED_SILK  = (196, 52, 40)
RED_FROM  = 0.7                      # Ox.Meter.WarningLevel

# Meter zones: colour sets for the segments above a fraction of full scale.
HI_FI_RED = dict(lit=RED, glow=RED_GLOW, ghost=RED_GHOST, silk=RED_SILK)
BROADCAST_YELLOW = dict(lit=(250, 204, 21), glow=(255, 150, 0), ghost=(42, 34, 6), silk=(190, 156, 30))
BROADCAST_RED = dict(lit=(239, 68, 68), glow=(255, 20, 10), ghost=(46, 12, 12), silk=(196, 56, 52))
ZONES = {
    'amber':   dict(warn=None, hot=HI_FI_RED, warn_from=None, hot_from=RED_FROM),
    'blue':    dict(warn=None, hot=HI_FI_RED, warn_from=None, hot_from=RED_FROM),
    'classic': dict(warn=BROADCAST_YELLOW, hot=BROADCAST_RED, warn_from=0.7, hot_from=0.9),
}

def zones(palette, hot_from=None, warn_from=None):
    """[(fraction, colour set)] in ascending order for one meter.

    hot_from / warn_from override the palette's defaults; a palette without a
    warning colour ignores warn_from. hot_from=False gives a meter with no zones.
    """
    z = ZONES[palette]
    if hot_from is False:
        return []
    out = []
    if z['warn']:
        out.append((warn_from if warn_from is not None else z['warn_from'], z['warn']))
    out.append((hot_from if hot_from is not None else z['hot_from'], z['hot']))
    return out

def hot_set(palette):
    return ZONES[palette]['hot']

def hexc(c, a=255):
    return '#%02X%02X%02X%02X' % (a, *c)

BAHN = os.path.expanduser('~/.local/share/fonts/windows/bahnschrift.ttf')

def silk_font(size, weight=700):
    f = ImageFont.truetype(BAHN, size)
    try:
        f.set_variation_by_axes([weight, 75])   # wght, wdth (condensed)
    except Exception:
        pass
    return f
