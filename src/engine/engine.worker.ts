/// <reference lib="webworker" />
import type { EngineMessage, EngineReply } from "./protocol";
import { generateWorld } from "./world/generate";
import { simulateTestRound } from "./sim/quickMatch";

/**
 * Web Worker do motor: toda simulação pesada roda aqui, fora da thread da
 * interface, para o celular não travar ao avançar rodadas.
 */

function handle(msg: EngineMessage): unknown {
  switch (msg.type) {
    case "newWorld":
      return generateWorld(msg.seed);
    case "simulateTestRound":
      return simulateTestRound(msg.world);
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
