#!/bin/sh
# Copies the plugin into OpenDeck's plugin folder (native or Flatpak) and
# restarts OpenDeck if it runs as a systemd user unit.
set -eu
here=$(cd "$(dirname "$0")" && pwd)
name=com.emaspa.vfdclock.sdPlugin

if [ -d "$HOME/.var/app/me.amankhanna.opendeck/config/opendeck" ] && [ ! -d "$HOME/.config/opendeck" ]; then
  dest="$HOME/.var/app/me.amankhanna.opendeck/config/opendeck/plugins"
else
  dest="${XDG_CONFIG_HOME:-$HOME/.config}/opendeck/plugins"
fi
mkdir -p "$dest"
rm -rf "${dest:?}/$name"
cp -r "$here/$name" "$dest/$name"
echo "installed to $dest/$name"

unit=$(systemctl --user list-units --plain --no-legend 'app-opendeck*' 2>/dev/null | awk 'NR==1{print $1}')
if [ -n "$unit" ]; then
  systemctl --user restart "$unit" && echo "restarted $unit"
else
  echo "restart OpenDeck to load the plugin"
fi
