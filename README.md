# VFD Clock for OpenDeck

Stream Deck keys for the hour, the minute and the second, drawn like the InfoPanel VFD profiles: DSEG7 digits over unlit ghost segments, a phosphor halo, a silk legend chip, the rounded frame and the glass mesh.

## Actions

The plugin has three actions, Hours, Minutes and Seconds. Put them side by side to read the time across the keys. Hours shows 24-hour time by default, or 12-hour time with an AM/PM indicator.

Each key picks its own skin. Orange VFD, Blue VFD and Classic VFD use the same palettes as the InfoPanel profiles. Each key can also hide its HRS, MIN or SEC legend chip, which makes the digits bigger.

With [OpenXLR](https://github.com/emaspa/openxlr) installed, the keys ignore their own skin and wear OpenXLR's, switching when you change it there. The VFD skins pick the matching face set. Any other skin draws the clock in that skin's colours, on the same card as OpenXLR's own deck keys. `bin/skin-palette.mjs` and `bin/skin-palettes.json` are copies from the OpenXLR deck plugin.

## Install

```sh
./install.sh
```

This copies the plugin into OpenDeck's plugin folder and restarts OpenDeck if it runs as a systemd user unit. Then drag **Hours**, **Minutes** and **Seconds** from the VFD Clock category onto keys.

## Build

The key faces are 1008 pre-rendered PNGs in `com.emaspa.vfdclock.sdPlugin/imgs/<skin>/`, about 14 MB. The plugin is a small Node script that picks a face and sends it when the time or a setting changes.

To render them again:

```sh
./build.sh
```

It needs python3 with Pillow and numpy, ImageMagick, and three fonts in `~/.local/share/fonts`: DSEG7 Classic Italic, DSEG14 Classic Italic, and Bahnschrift at `windows/bahnschrift.ttf` for the legend chips. Colours come from `tools/vfd_palette.py`, a copy of the InfoPanel VFD generator's palette.

## Test

```sh
npm test
```

## License

GPL-3.0-only, see [LICENSE](LICENSE).
