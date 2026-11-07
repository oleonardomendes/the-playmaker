import type { PackReport } from "./pack";
import type { World } from "./types";

/**
 * Contrato de mensagens entre a interface e o motor (que roda num Web Worker).
 * Cada pedido carrega um id; a resposta volta com o mesmo id.
 */

export type EngineRequest =
  | { type: "newWorld"; seed: number }
  | { type: "applyPack"; world: World; pack: unknown };

export type EngineResponseMap = {
  newWorld: World;
  applyPack: { world: World; report: PackReport };
};

export type EngineMessage = EngineRequest & { id: number };

export type EngineReply =
  | { id: number; ok: true; data: unknown }
  | { id: number; ok: false; error: string };
