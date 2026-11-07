"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { PackReport } from "@/engine/pack";
import { exportPack } from "@/engine/pack";
import { teamStrength } from "@/engine/sim/quickMatch";
import type { SaveGame, World } from "@/engine/types";
import { callEngine } from "@/lib/engine-client";
import { createSave, latestSave, updateSave } from "@/lib/save/store";

/**
 * Estado global do jogo: o save carregado, as ações sobre ele e dados
 * derivados que várias telas usam (como a força de cada elenco).
 */

type Status = "loading" | "empty" | "ready";

interface GameContextValue {
  status: Status;
  busy: boolean;
  error: string | null;
  save: SaveGame | null;
  world: World | null;
  /** Força dos 11 melhores de cada clube, calculada uma vez por mundo. */
  strength: Record<string, number>;
  createWorld: () => Promise<void>;
  restoreWorld: () => Promise<void>;
  importPack: (file: File) => Promise<PackReport | null>;
  downloadDatabase: () => void;
  clearError: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame precisa estar dentro de GameProvider");
  return ctx;
}

/** Atalho para telas que só aparecem com um mundo carregado. */
export function useWorld(): World {
  const { world } = useGame();
  if (!world) throw new Error("Nenhum mundo carregado");
  return world;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [save, setSave] = useState<SaveGame | null>(null);

  useEffect(() => {
    latestSave()
      .then((found) => {
        setSave(found ?? null);
        setStatus(found ? "ready" : "empty");
      })
      .catch((err: unknown) => {
        setError(`Não foi possível abrir o save: ${errorMessage(err)}`);
        setStatus("empty");
      });
  }, []);

  const world = save?.world ?? null;

  const strength = useMemo(() => {
    const map: Record<string, number> = {};
    if (!world) return map;
    for (const club of Object.values(world.clubs)) map[club.id] = teamStrength(world, club);
    return map;
  }, [world]);

  const run = useCallback(async <T,>(action: () => Promise<T>): Promise<T | null> => {
    setBusy(true);
    setError(null);
    try {
      return await action();
    } catch (err) {
      setError(errorMessage(err));
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const createWorld = useCallback(async () => {
    await run(async () => {
      const seed = Math.floor(Math.random() * 2 ** 31);
      const newWorld = await callEngine({ type: "newWorld", seed });
      setSave(await createSave("Carreira 1", newWorld));
      setStatus("ready");
    });
  }, [run]);

  const restoreWorld = useCallback(async () => {
    if (!save) return;
    await run(async () => {
      const original = await callEngine({ type: "newWorld", seed: save.world.seed });
      setSave(await updateSave(save, original));
    });
  }, [run, save]);

  const importPack = useCallback(
    async (file: File) => {
      if (!save) return null;
      return run(async () => {
        let raw: unknown;
        try {
          raw = JSON.parse(await file.text());
        } catch {
          throw new Error("O arquivo não é um JSON válido.");
        }
        const { world: patched, report } = await callEngine({ type: "applyPack", world: save.world, pack: raw });
        setSave(await updateSave(save, patched));
        return report;
      });
    },
    [run, save],
  );

  const downloadDatabase = useCallback(() => {
    if (!world) return;
    const blob = new Blob([JSON.stringify(exportPack(world), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `the-playmaker-banco-${world.season}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [world]);

  const value = useMemo<GameContextValue>(
    () => ({
      status,
      busy,
      error,
      save,
      world,
      strength,
      createWorld,
      restoreWorld,
      importPack,
      downloadDatabase,
      clearError: () => setError(null),
    }),
    [status, busy, error, save, world, strength, createWorld, restoreWorld, importPack, downloadDatabase],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
