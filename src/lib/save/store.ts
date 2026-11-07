"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { SaveGame, World } from "@/engine/types";
import { migrateSave, SCHEMA_VERSION } from "./migrations";

/**
 * Saves locais no aparelho (IndexedDB). A cópia na nuvem (Supabase) entra
 * como backup na sequência; o aparelho continua sendo a fonte principal
 * para o jogo funcionar mesmo com internet ruim.
 */

interface PlaymakerDB extends DBSchema {
  saves: {
    key: string;
    value: SaveGame;
    indexes: { updatedAt: string };
  };
}

let dbPromise: Promise<IDBPDatabase<PlaymakerDB>> | null = null;

function db() {
  dbPromise ??= openDB<PlaymakerDB>("the-playmaker", 1, {
    upgrade(database) {
      const store = database.createObjectStore("saves", { keyPath: "id" });
      store.createIndex("updatedAt", "updatedAt");
    },
  });
  return dbPromise;
}

export async function createSave(name: string, world: World): Promise<SaveGame> {
  const now = new Date().toISOString();
  const save: SaveGame = {
    schemaVersion: SCHEMA_VERSION,
    id: crypto.randomUUID(),
    name,
    createdAt: now,
    updatedAt: now,
    world,
  };
  await (await db()).put("saves", save);
  return save;
}

export async function updateSave(save: SaveGame, world: World): Promise<SaveGame> {
  const updated: SaveGame = { ...save, world, updatedAt: new Date().toISOString() };
  await (await db()).put("saves", updated);
  return updated;
}

export async function loadSave(id: string): Promise<SaveGame | undefined> {
  const raw = await (await db()).get("saves", id);
  return raw ? migrateSave(raw as unknown as Record<string, unknown>) : undefined;
}

export async function latestSave(): Promise<SaveGame | undefined> {
  const all = await (await db()).getAllFromIndex("saves", "updatedAt");
  const raw = all.at(-1);
  return raw ? migrateSave(raw as unknown as Record<string, unknown>) : undefined;
}

export async function deleteSave(id: string): Promise<void> {
  await (await db()).delete("saves", id);
}
