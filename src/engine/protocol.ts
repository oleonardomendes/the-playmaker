import type { MatchOutcome } from "./match/engine";
import type { PackReport } from "./pack";
import type { AdvanceStop, DayReport } from "./season/season";
import type { SeasonRecord, World } from "./types";

/**
 * Contrato de mensagens entre a interface e o motor (que roda num Web Worker).
 * Cada pedido carrega um id; a resposta volta com o mesmo id.
 */

export type EngineRequest =
  | { type: "newWorld"; seed: number }
  | { type: "applyPack"; world: World; pack: unknown }
  | { type: "advance"; world: World }
  | { type: "playDay"; world: World; userOutcome?: MatchOutcome }
  | { type: "newSeason"; world: World };

export type EngineResponseMap = {
  newWorld: World;
  applyPack: { world: World; report: PackReport };
  advance: { world: World; stop: AdvanceStop };
  playDay: { world: World; report: DayReport };
  newSeason: { world: World; record: SeasonRecord };
};

export type EngineMessage = EngineRequest & { id: number };

export type EngineReply =
  | { id: number; ok: true; data: unknown }
  | { id: number; ok: false; error: string };
