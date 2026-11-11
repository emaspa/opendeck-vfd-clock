# VFD Clock for OpenDeck

Two Stream Deck keys, one for the hour and one for the minute, drawn like the InfoPanel VFD profiles: DSEG7 digits over unlit ghost segments, a phosphor halo, a silk legend chip, the rounded frame and the glass mesh.

## Actions

The plugin has two actions, Hours and Minutes. Put them side by side to read the time across the two keys. Hours shows 24-hour time by default, or 12-hour time with an AM/PM indicator.

Each key picks its own skin. Orange VFD, Blue VFD and Classic VFD use the same palettes as the InfoPanel profiles. Each key can also hide its HRS or MIN legend chip, which makes the digits bigger.

## Install

```sh
./install.sh
```

This copies the plugin into OpenDeck's plugin folder and restarts OpenDeck if it runs as a systemd user unit. Then drag **Hours** and **Minutes** from the VFD Clock category onto keys.

## Build

The key faces are 648 pre-rendered PNGs in `com.emaspa.vfdclock.sdPlugin/imgs/<skin>/`, about 9 MB. The plugin is a small Node script that picks a face and sends it when the time or a setting changes.

To render them again:

```sh
./build.sh
```

It needs python3 with Pillow and numpy, ImageMagick, and three fonts in `~/.local/share/fonts`: DSEG7 Classic Italic, DSEG14 Classic Italic, and Bahnschrift at `windows/bahnschrift.ttf` for the legend chips. Colours come from `tools/vfd_palette.py`, a copy of the InfoPanel VFD generator's palette.

## Test

```sh
npm test
```
