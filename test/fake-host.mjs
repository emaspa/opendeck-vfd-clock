// Loaded with --import before bin/plugin.mjs: a fake OpenDeck host socket and a
// frozen clock (FAKE_TIME), so the plugin's setImage output can be checked.
const sent = [];
const RealDate = Date;
const fixed = new RealDate(process.env.FAKE_TIME).getTime();
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [fixed])); } };
globalThis.WebSocket = class {
  static OPEN = 1;
  constructor() {
    this.readyState = 1;
    setTimeout(() => {
      this.onopen?.();
      const appear = (context, action, settings) => this.onmessage({ data: JSON.stringify({ event: "willAppear", context, action: "com.emaspa.vfdclock." + action, payload: { settings } }) });
      for (const [i, [a, s]] of JSON.parse(process.env.KEYS).entries()) appear("k" + i, a, s);
      setTimeout(() => { process.stdout.write(JSON.stringify(sent)); process.exit(0); }, 700);
    }, 10);
  }
  send(m) { sent.push(JSON.parse(m)); }
};
