// VFD Clock for OpenDeck (Stream Deck SDK compatible).
// Three key actions: hours, minutes and seconds. Every face is pre-rendered by
// tools/gen_keys.py into imgs/<skin>/; the plugin only picks the right PNG
// and sends it when the shown value or the settings change.

import process from "node:process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const port = arg("-port");
const pluginUUID = arg("-pluginUUID");
const registerEvent = arg("-registerEvent");

const PREFIX = "com.emaspa.vfdclock.";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKINS = ["amber", "blue", "classic"];

const host = new WebSocket(`ws://127.0.0.1:${port}`);
const send = (msg) => { if (host.readyState === WebSocket.OPEN) host.send(JSON.stringify(msg)); };

// context -> { kind: "hours" | "minutes" | "seconds", settings, shown }
const contexts = new Map();
const images = new Map(); // face path -> data URI

function faceFor(kind, settings, now) {
  const skin = SKINS.includes(settings.skin) ? settings.skin : "amber";
  const bare = settings.legend === false ? "_bare" : "";
  let name;
  if (kind === "seconds") {
    name = `s_${String(now.getSeconds()).padStart(2, "0")}`;
  } else if (kind === "minutes") {
    name = `m_${String(now.getMinutes()).padStart(2, "0")}`;
  } else if (settings.format === "12") {
    const h = now.getHours();
    name = `h12_${h % 12 || 12}_${h < 12 ? "am" : "pm"}`;
  } else {
    name = `h24_${String(now.getHours()).padStart(2, "0")}`;
  }
  return `imgs/${skin}/${name}${bare}.png`;
}

function image(path) {
  let uri = images.get(path);
  if (!uri) {
    uri = "data:image/png;base64," + readFileSync(join(ROOT, path)).toString("base64");
    images.set(path, uri);
  }
  return uri;
}

function render(force = false) {
  const now = new Date();
  for (const [context, c] of contexts) {
    const face = faceFor(c.kind, c.settings, now);
    if (!force && face === c.shown) continue;
    try {
      send({ event: "setImage", context, payload: { image: image(face), target: 0 } });
      c.shown = face;
    } catch (e) {
      send({ event: "logMessage", payload: { message: `[vfdclock] ${face}: ${e.message}` } });
    }
  }
}

// Wake just after each second boundary so the seconds key flips on time.
// Recomputing the delay every tick follows suspend/resume and clock changes.
function tick() {
  render();
  setTimeout(tick, 1005 - (Date.now() % 1000));
}
tick();

host.onopen = () => send({ event: registerEvent, uuid: pluginUUID });
host.onclose = () => process.exit(0);
host.onmessage = (e) => {
  let m;
  try { m = JSON.parse(e.data); } catch { return; }
  const { event, context, action, payload } = m;
  switch (event) {
    case "willAppear":
      contexts.set(context, { kind: action.slice(PREFIX.length), settings: payload?.settings ?? {}, shown: null });
      render();
      break;
    case "willDisappear":
      contexts.delete(context);
      break;
    case "didReceiveSettings": {
      const c = contexts.get(context);
      if (c) { c.settings = payload?.settings ?? {}; c.shown = null; render(); }
      break;
    }
  }
};
