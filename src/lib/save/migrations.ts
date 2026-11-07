import { buildSeason } from "@/engine/competitions/build";
import { defaultTactic } from "@/engine/match/tactics";
import type { Club, Player, SaveGame, World } from "@/engine/types";
import { emptySeason, generateWorld } from "@/engine/world/generate";

/**
 * Versão atual do esquema do save. Sempre que o formato do mundo mudar de um
 * jeito incompatível, aumente este número e adicione a migração
 * correspondente abaixo — assim carreiras em andamento sobrevivem às
 * atualizações do jogo.
 */
export const SCHEMA_VERSION = 3;

type Migration = (save: Record<string, unknown>) => Record<string, unknown>;

/** migrations[n] converte um save da versão n para a versão n + 1. */
const migrations: Record<number, Migration> = {
  // v1 (fase 0) tinha um mundo de teste com 20 clubes e nenhuma carreira.
  // Na v2 o mundo passa a ser completo: regeramos a partir da mesma semente.
  1: (save) => {
    const oldWorld = save.world as { seed?: unknown } | undefined;
    const seed = typeof oldWorld?.seed === "number" ? oldWorld.seed : 1;
    return { ...save, schemaVersion: 2, world: generateWorld(seed) };
  },
  // v3 (fase 2): partidas, táticas e calendário. Mantém clubes e jogadores
  // (inclusive edições de pack) e monta a temporada.
  2: (save) => {
    const world = save.world as World;
    for (const p of Object.values(world.players) as Partial<Player>[]) {
      p.condition ??= 100;
      p.season ??= emptySeason();
    }
    for (const c of Object.values(world.clubs) as Club[]) {
      c.tactic ??= defaultTactic(c.id);
    }
    world.date ??= `${world.season}-01-10`;
    world.history ??= [];
    buildSeason(world);
    return { ...save, schemaVersion: 3, world };
  },
};

export class SaveTooNewError extends Error {
  constructor(version: number) {
    super(`Save criado por uma versão mais nova do jogo (esquema ${version}).`);
  }
}

export function migrateSave(raw: Record<string, unknown>): SaveGame {
  let save = raw;
  let version = typeof save.schemaVersion === "number" ? save.schemaVersion : 1;
  if (version > SCHEMA_VERSION) throw new SaveTooNewError(version);
  while (version < SCHEMA_VERSION) {
    const migrate = migrations[version];
    if (!migrate) throw new Error(`Falta a migração do esquema ${version} para ${version + 1}.`);
    save = migrate(save);
    version += 1;
  }
  return { ...save, schemaVersion: SCHEMA_VERSION } as unknown as SaveGame;
}
