"use strict";
let ws = null, piUuid = null, settings = {};

function connectElgatoStreamDeckSocket(inPort, inUUID, inRegisterEvent, inInfo, inActionInfo) {
  piUuid = inUUID;
  const info = JSON.parse(inActionInfo);
  settings = info.payload?.settings ?? {};
  document.getElementById("formatRow").hidden = !String(info.action).endsWith(".hours");

  for (const input of document.querySelectorAll("[data-setting]")) {
    const key = input.dataset.setting;
    if (input.type === "checkbox") input.checked = settings[key] !== false;
    else if (settings[key] !== undefined) input.value = settings[key];
    input.addEventListener("change", () => {
      settings[key] = input.type === "checkbox" ? input.checked : input.value;
      if (ws?.readyState === 1) ws.send(JSON.stringify({ event: "setSettings", context: piUuid, payload: settings }));
    });
  }

  ws = new WebSocket("ws://127.0.0.1:" + inPort);
  ws.onopen = () => ws.send(JSON.stringify({ event: inRegisterEvent, uuid: piUuid }));
}
