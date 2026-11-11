#!/bin/sh
# Renders every key face and the manifest icons. Needs python3 with Pillow and
# numpy, ImageMagick, and the DSEG7/DSEG14 Classic fonts plus Bahnschrift
# (legend chips) in ~/.local/share/fonts.
set -eu
here=$(cd "$(dirname "$0")" && pwd)
plugin="$here/com.emaspa.vfdclock.sdPlugin"
rm -rf "$plugin/imgs"
python3 "$here/tools/gen_keys.py" "$plugin"
icons="$plugin/icons"
mkdir -p "$icons"
for pair in hours:h24_12 minutes:m_34 seconds:s_56; do
  name=${pair%%:*}; face=${pair#*:}
  magick "$plugin/imgs/amber/$face.png" -resize 72x72 "$icons/$name.png"
  cp "$plugin/imgs/amber/$face.png" "$icons/$name@2x.png"
done
magick "$plugin/imgs/amber/h24_12_bare.png" -resize 72x72 "$icons/plugin.png"
cp "$plugin/imgs/amber/h24_12_bare.png" "$icons/plugin@2x.png"
magick "$plugin/imgs/amber/h24_12_bare.png" -resize 28x28 "$icons/category.png"
magick "$plugin/imgs/amber/h24_12_bare.png" -resize 56x56 "$icons/category@2x.png"
echo "built $(find "$plugin/imgs" -name '*.png' | wc -l) faces, $(du -sh "$plugin/imgs" | cut -f1)"
