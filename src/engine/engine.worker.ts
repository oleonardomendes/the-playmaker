/// <reference lib="webworker" />
import { applyPack, parsePack } from "./pack";
import type { EngineMessage, EngineReply } from "./protocol";
import { advance, createWorld, endSeason, playToday, startNextSeason } from "./season/season";

/**
 * Web Worker do motor: toda simulação pesada roda aqui, fora da thread da
 * interface, para o celular não travar. O mundo chega como cópia, é
 * alterado aqui e volta para a interface.
 */

function handle(msg: EngineMessage): unknown {
  switch (msg.type) {
    case "newWorld":
      return createWorld(msg.seed);
    case "applyPack":
      return applyPack(msg.world, parsePack(msg.pack));
    case "advance": {
      const stop = advance(msg.world);
      return { world: msg.world, stop };
    }
    case "playDay": {
      const report = playToday(msg.world, msg.userOutcome);
      return { world: msg.world, report };
    }
    case "newSeason": {
      const record = endSeason(msg.world);
      startNextSeason(msg.world);
      return { world: msg.world, record };
    }
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
