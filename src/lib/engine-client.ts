"use client";

import type { EngineReply, EngineRequest, EngineResponseMap } from "@/engine/protocol";

/**
 * Cliente do motor: cria o Web Worker uma única vez e expõe chamadas
 * tipadas que retornam Promises.
 */

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("../engine/engine.worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (event: MessageEvent<EngineReply>) => {
    const reply = event.data;
    const entry = pending.get(reply.id);
    if (!entry) return;
    pending.delete(reply.id);
    if (reply.ok) entry.resolve(reply.data);
    else entry.reject(new Error(reply.error));
  };
  worker.onerror = (event) => {
    const error = new Error(event.message || "Falha no motor do jogo");
    for (const entry of pending.values()) entry.reject(error);
    pending.clear();
  };
  return worker;
}

export function callEngine<R extends EngineRequest>(
  request: R,
): Promise<EngineResponseMap[R["type"]]> {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
    getWorker().postMessage({ ...request, id });
  });
}
