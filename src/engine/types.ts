import type { RngState } from "./rng";

/**
 * Modelo de dados do motor. Fase 0: só o mínimo para validar o pipeline
 * (mundo -> simulação -> save). As fases seguintes expandem cada tipo
 * conforme o documento de design.
 */

export type Position = "GOL" | "ZAG" | "LAT" | "VOL" | "MEI" | "ATA";

export interface Player {
  id: string;
  name: string;
  position: Position;
  age: number;
  /** Força geral 1–100. Na fase 3 vira atributos detalhados de 1 a 20. */
  overall: number;
}

export interface Club {
  id: string;
  name: string;
  shortName: string;
  state: string;
  /** Prestígio histórico 1–100: pesa em torcida, receitas e valor de SAF. */
  prestige: number;
  playerIds: string[];
}

export interface MatchResult {
  homeId: string;
  awayId: string;
  homeGoals: number;
  awayGoals: number;
}

export interface World {
  seed: number;
  season: number;
  clubs: Record<string, Club>;
  players: Record<string, Player>;
  rng: RngState;
}

export interface SaveGame {
  /** Versão do esquema do save; ver src/lib/save/migrations.ts. */
  schemaVersion: number;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  world: World;
}
