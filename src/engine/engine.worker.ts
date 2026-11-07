/// <reference lib="webworker" />
import { applyPack, parsePack } from "./pack";
import type { EngineMessage, EngineReply } from "./protocol";
import { generateWorld } from "./world/generate";

/**
 * Web Worker do motor: toda simulação pesada roda aqui, fora da thread da
 * interface, para o celular não travar.
 */

function handle(msg: EngineMessage): unknown {
  switch (msg.type) {
    case "newWorld":
      return generateWorld(msg.seed);
    case "applyPack":
      return applyPack(msg.world, parsePack(msg.pack));
  }
}

self.onmessage = (event: MessageEvent<EngineMessage>) => {
  const msg = event.data;
  let reply: EngineReply;
  try {
    reply = { id: msg.id, ok: true, data: handle(msg) };
  } catch (err) {
    reply = { id: msg.id, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  self.postMessage(reply);
};
