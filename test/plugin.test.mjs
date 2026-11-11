import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const dir = new URL("../com.emaspa.vfdclock.sdPlugin/", import.meta.url);
const run = (time, keys) => JSON.parse(execFileSync(process.execPath,
  ["--import", new URL("fake-host.mjs", import.meta.url).pathname, new URL("bin/plugin.mjs", dir).pathname,
   "-port", "1", "-pluginUUID", "x", "-registerEvent", "registerPlugin"],
  { env: { ...process.env, FAKE_TIME: time, KEYS: JSON.stringify(keys) } }).toString());
const sha = (b) => createHash("sha1").update(b).digest("hex");
const face = (p) => sha(readFileSync(new URL(p, dir)));
const shown = (msgs, ctx) => {
  const m = msgs.filter((x) => x.event === "setImage" && x.context === ctx).at(-1);
  return sha(Buffer.from(m.payload.image.split(",")[1], "base64"));
};

test("each key shows the face for the current time and settings", () => {
  const msgs = run("2026-11-11T21:07:00", [
    ["hours", {}], ["minutes", {}], ["hours", { format: "12", skin: "blue" }],
    ["minutes", { skin: "classic", legend: false }], ["hours", { skin: "bogus" }],
  ]);
  assert.equal(msgs[0].event, "registerPlugin");
  assert.equal(shown(msgs, "k0"), face("imgs/amber/h24_21.png"));
  assert.equal(shown(msgs, "k1"), face("imgs/amber/m_07.png"));
  assert.equal(shown(msgs, "k2"), face("imgs/blue/h12_9_pm.png"));
  assert.equal(shown(msgs, "k3"), face("imgs/classic/m_07_bare.png"));
  assert.equal(shown(msgs, "k4"), face("imgs/amber/h24_21.png"));
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
