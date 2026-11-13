// VFD Clock for OpenDeck (Stream Deck SDK compatible).
// Three key actions: hours, minutes and seconds. Every VFD face is pre-rendered
// by tools/gen_keys.py into imgs/<skin>/; the plugin only picks the right PNG
// and sends it when the shown value or the settings change.
//
// With OpenXLR installed, the keys wear OpenXLR's skin instead of their own:
// a VFD skin picks the VFD faces nearest its lit colour, any other skin draws
// the clock in that skin's colours (render below). skin-palette.mjs and
// skin-palettes.json are copied from the OpenXLR deck plugin.

import process from "node:process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { SkinPalette } from "./skin-palette.mjs";

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
// Lit phosphor of each VFD face set (tools/vfd_palette.py).
const SKIN_LIT = { amber: [255, 150, 52], blue: [63, 230, 255], classic: [74, 222, 128] };
const LEGENDS = { hours: "HRS", minutes: "MIN", seconds: "SEC" };

const host = new WebSocket(`ws://127.0.0.1:${port}`);
const send = (msg) => { if (host.readyState === WebSocket.OPEN) host.send(JSON.stringify(msg)); };

// context -> { kind: "hours" | "minutes" | "seconds", settings, shown }
const contexts = new Map();
const images = new Map(); // face path -> data URI

// OpenXLR's skin, followed live. Without OpenXLR settings or a running
// OpenXLR window (and no OPENXLR_SKIN), each key keeps its own skin.
let skinPalette = null;
try {
  skinPalette = new SkinPalette(() => render(true));
} catch (e) {
  console.error(`[vfdclock] OpenXLR skin unavailable: ${e.message}`);
}
const openXlrPresent = () => !!skinPalette &&
  (skinPalette.override !== undefined || existsSync(skinPalette.preferences) || existsSync(skinPalette.live));

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
// A colour with no alpha draws no unlit cells: such a skin is no display.
const isDisplay = (ghost) => typeof ghost === "string" && !(ghost.length === 9 && ghost.endsWith("00"));
function nearestSkin(lit) {
  const [r, g, b] = rgb(lit);
  let best = "amber", bestDistance = Infinity;
  for (const [name, [sr, sg, sb]] of Object.entries(SKIN_LIT)) {
    const distance = (r - sr) ** 2 + (g - sg) ** 2 + (b - sb) ** 2;
    if (distance < bestDistance) { best = name; bestDistance = distance; }
  }
  return best;
}

// What the keys wear: { skin } for a VFD face set, { colours } for a drawn
// face, or null to keep each key's own skin.
function followed() {
  if (!openXlrPresent()) return null;
  const c = skinPalette.colours;
  return isDisplay(c["Ox.Text.Ghost"]) ? { skin: nearestSkin(c["Ox.Text.Primary"]) } : { colours: c };
}

// The digits and the AM/PM mark a key shows.
function reading(kind, settings, now) {
  if (kind === "seconds") return { digits: String(now.getSeconds()).padStart(2, "0") };
  if (kind === "minutes") return { digits: String(now.getMinutes()).padStart(2, "0") };
  const h = now.getHours();
  if (settings.format === "12") return { digits: String(h % 12 || 12), meridiem: h < 12 ? "am" : "pm" };
  return { digits: String(h).padStart(2, "0") };
}

// A face: `key` identifies it, `uri()` builds the image.
function faceFor(kind, settings, now, follow) {
  const { digits, meridiem } = reading(kind, settings, now);
  const bare = settings.legend === false;
  if (follow?.colours) {
    const c = follow.colours;
    const key = `skin:${skinPalette.id}:${JSON.stringify(c)}:${kind}:${digits}:${meridiem ?? ""}:${bare}`;
    return { key, uri: () => drawnFace(c, { digits: digits.padStart(2, " "), meridiem, legend: bare ? "" : LEGENDS[kind] }) };
  }
  const skin = follow?.skin ?? (SKINS.includes(settings.skin) ? settings.skin : "amber");
  const name = kind === "seconds" ? `s_${digits}`
    : kind === "minutes" ? `m_${digits}`
    : meridiem ? `h12_${digits}_${meridiem}` : `h24_${digits}`;
  const path = `imgs/${skin}/${name}${bare ? "_bare" : ""}.png`;
  return { key: path, uri: () => image(path) };
}

function image(path) {
  let uri = images.get(path);
  if (!uri) {
    uri = "data:image/png;base64," + readFileSync(join(ROOT, path)).toString("base64");
    images.set(path, uri);
  }
  return uri;
}

// Seven-segment figures drawn as shapes, as on the OpenXLR deck keys. A space
// leaves an unlit cell; `unlit` is the opacity of the cells' dark segments.
const SEGMENTS = {
  "0": "abcdef", "1": "bc", "2": "abged", "3": "abgcd", "4": "fgbc",
  "5": "afgcd", "6": "afgedc", "7": "abc", "8": "abcdefg", "9": "abcfgd",
};
function sevenSeg(text, x, y, h, color, unlit = 0.14) {
  const w = h * 0.58, t = h * 0.2, gap = w * 0.4;
  const seg = {
    a: [t * 0.7, 0, w - 1.4 * t, t], b: [w - t, t * 0.6, t, h / 2 - t],
    c: [w - t, h / 2 + t * 0.4, t, h / 2 - t], d: [t * 0.7, h - t, w - 1.4 * t, t],
    e: [0, h / 2 + t * 0.4, t, h / 2 - t], f: [0, t * 0.6, t, h / 2 - t],
    g: [t * 0.7, (h - t) / 2, w - 1.4 * t, t],
  };
  const draw = (cx, names, opacity) => {
    let out = `<g fill="${color}" opacity="${opacity}">`;
    for (const n of names) {
      const [sx, sy, sw, sh] = seg[n];
      out += `<rect x="${(cx + sx).toFixed(1)}" y="${(y + sy).toFixed(1)}" width="${sw.toFixed(1)}" height="${sh.toFixed(1)}" rx="${(t / 4).toFixed(1)}"/>`;
    }
    return out + "</g>";
  };
  let out = "";
  let cx = x - (text.length * w + (text.length - 1) * gap) / 2;
  for (const ch of text) {
    if (unlit > 0) out += draw(cx, "abcdefg", unlit);
    out += draw(cx, SEGMENTS[ch] ?? "", 1);
    cx += w + gap;
  }
  return out;
}

const FONT = 'font-family="Inter, Noto Sans, DejaVu Sans, sans-serif" font-weight="700"';

// The clock in an OpenXLR skin's colours, on the card the OpenXLR deck keys
// use: legend chip top left, AM/PM top right, digits in a recessed window.
function drawnFace(c, { digits, meridiem, legend }) {
  const lit = c["Ox.Led.On"];
  const topRow = legend || meridiem;
  const [wy, wh] = topRow ? [46, 80] : [18, 108];
  const dh = topRow ? 56 : 78;
  const dy = wy + (wh - dh) / 2;
  const chip = legend
    ? `<rect x="16" y="16" width="44" height="22" rx="5" fill="${c["Ox.Text.Muted"]}"/>` +
      `<text x="38" y="32.5" text-anchor="middle" fill="${c["Ox.Card.Background"]}" ${FONT} font-size="15">${legend}</text>`
    : "";
  const mark = meridiem
    ? `<text x="128" y="33" text-anchor="end" fill="${lit}" ${FONT} font-size="17">${meridiem.toUpperCase()}</text>`
    : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="288" height="288" viewBox="0 0 144 144">
    <defs>
      <linearGradient id="side" x1="138" y1="72" x2="6" y2="72" gradientUnits="userSpaceOnUse">
        <stop stop-opacity="0"/><stop offset="1" stop-opacity="0.2"/>
      </linearGradient>
      <filter id="bloom" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3"/></filter>
    </defs>
    <rect x="6" y="6" width="132" height="132" rx="14" fill="${c["Ox.Card.Background"]}"/>
    <rect x="6" y="6" width="132" height="132" rx="14" fill="url(#side)"/>
    <rect x="9" y="9" width="126" height="126" rx="12" fill="none" stroke="${c["Ox.Text.Muted"]}" stroke-width="4"/>
    ${chip}${mark}
    <rect x="16" y="${wy}" width="112" height="${wh - 8}" rx="8" fill="${c["Ox.Meter.Track"]}" stroke="#000" stroke-opacity="0.5" stroke-width="4"/>
    ${sevenSeg(digits, 72, dy - 4, dh, lit, 0.1)}
    <g filter="url(#bloom)" opacity="0.45">${sevenSeg(digits, 72, dy - 4, dh, lit, 0)}</g>
  </svg>`;
  return "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");
}

function render(force = false) {
  const now = new Date();
  const follow = followed();
  for (const [context, c] of contexts) {
    const face = faceFor(c.kind, c.settings, now, follow);
    if (!force && face.key === c.shown) continue;
    try {
      send({ event: "setImage", context, payload: { image: face.uri(), target: 0 } });
      c.shown = face.key;
    } catch (e) {
      send({ event: "logMessage", payload: { message: `[vfdclock] ${face.key}: ${e.message}` } });
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
host.onclose = () => { skinPalette?.close(); process.exit(0); };
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
