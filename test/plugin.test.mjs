import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const dir = new URL("../com.emaspa.vfdclock.sdPlugin/", import.meta.url);
// Runs as if OpenXLR were not installed, unless `skin` names the skin it wears.
const noOpenXlr = new URL("no-openxlr/", import.meta.url).pathname;
const run = (time, keys, skin) => {
  const env = { ...process.env, FAKE_TIME: time, KEYS: JSON.stringify(keys),
    XDG_CONFIG_HOME: noOpenXlr + "config", XDG_DATA_HOME: noOpenXlr + "data", XDG_DATA_DIRS: noOpenXlr + "dirs" };
  delete env.OPENXLR_SKIN;
  if (skin) env.OPENXLR_SKIN = skin;
  return JSON.parse(execFileSync(process.execPath,
    ["--import", new URL("fake-host.mjs", import.meta.url).pathname, new URL("bin/plugin.mjs", dir).pathname,
     "-port", "1", "-pluginUUID", "x", "-registerEvent", "registerPlugin"],
    { env }).toString());
};
const image = (msgs, ctx) => msgs.filter((x) => x.event === "setImage" && x.context === ctx).at(-1).payload.image;
const sha = (b) => createHash("sha1").update(b).digest("hex");
const face = (p) => sha(readFileSync(new URL(p, dir)));
const shown = (msgs, ctx) => {
  const m = msgs.filter((x) => x.event === "setImage" && x.context === ctx).at(-1);
  return sha(Buffer.from(m.payload.image.split(",")[1], "base64"));
};

test("each key shows the face for the current time and settings", () => {
  const msgs = run("2026-11-11T21:07:42", [
    ["hours", {}], ["minutes", {}], ["hours", { format: "12", skin: "blue" }],
    ["minutes", { skin: "classic", legend: false }], ["hours", { skin: "bogus" }],
    ["seconds", { skin: "blue" }],
  ]);
  assert.equal(msgs[0].event, "registerPlugin");
  assert.equal(shown(msgs, "k0"), face("imgs/amber/h24_21.png"));
  assert.equal(shown(msgs, "k1"), face("imgs/amber/m_07.png"));
  assert.equal(shown(msgs, "k2"), face("imgs/blue/h12_9_pm.png"));
  assert.equal(shown(msgs, "k3"), face("imgs/classic/m_07_bare.png"));
  assert.equal(shown(msgs, "k4"), face("imgs/amber/h24_21.png"));
  assert.equal(shown(msgs, "k5"), face("imgs/blue/s_42.png"));
});

test("midnight and noon in 12-hour mode", () => {
  const am = run("2026-11-11T00:30:00", [["hours", { format: "12" }]]);
  assert.equal(shown(am, "k0"), face("imgs/amber/h12_12_am.png"));
  const pm = run("2026-11-11T12:30:00", [["hours", { format: "12" }]]);
  assert.equal(shown(pm, "k0"), face("imgs/amber/h12_12_pm.png"));
});

test("an unchanged face is sent once, not every tick", () => {
  const msgs = run("2026-11-11T10:00:00", [["minutes", {}]]);
  assert.equal(msgs.filter((m) => m.event === "setImage").length, 1);
});

test("an OpenXLR VFD skin picks its face set over each key's own", () => {
  const msgs = run("2026-11-11T21:07:42", [["hours", { skin: "amber" }], ["minutes", { skin: "classic", legend: false }]], "vfd-blue");
  assert.equal(shown(msgs, "k0"), face("imgs/blue/h24_21.png"));
  assert.equal(shown(msgs, "k1"), face("imgs/blue/m_07_bare.png"));
});

test("any other OpenXLR skin draws the clock in its colours", () => {
  const msgs = run("2026-11-11T21:07:42", [["hours", { format: "12" }], ["seconds", {}]], "tokyo-night");
  const svg = (ctx) => {
    const uri = image(msgs, ctx);
    assert.match(uri, /^data:image\/svg\+xml;base64,/);
    return Buffer.from(uri.split(",")[1], "base64").toString();
  };
  const hours = svg("k0");
  assert.match(hours, /fill="#1f202d"/); // Tokyo Night card
  assert.match(hours, />HRS</);
  assert.match(hours, />PM</);
  assert.match(svg("k1"), />SEC</);
});
