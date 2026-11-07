import type { SaveGame } from "@/engine/types";

/**
 * Versão atual do esquema do save. Sempre que o formato do mundo mudar de um
 * jeito incompatível, aumente este número e adicione a migração
 * correspondente abaixo — assim carreiras em andamento sobrevivem às
 * atualizações do jogo.
 */
export const SCHEMA_VERSION = 1;

type Migration = (save: Record<string, unknown>) => Record<string, unknown>;

/** migrations[n] converte um save da versão n para a versão n + 1. */
const migrations: Record<number, Migration> = {
  // Exemplo para o futuro:
  // 1: (save) => ({ ...save, schemaVersion: 2, world: { ...addNewField(save.world) } }),
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
