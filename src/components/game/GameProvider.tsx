"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { MatchOutcome } from "@/engine/match/engine";
import type { PackReport } from "@/engine/pack";
import { exportPack } from "@/engine/pack";
import type { AdvanceStop, DayReport } from "@/engine/season/season";
import { teamStrength } from "@/engine/sim/quickMatch";
import type { SaveGame, SeasonRecord, Tactic, World } from "@/engine/types";
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
  /** Último dia de jogos simulado ao avançar (para resumos). */
  lastDays: DayReport[];
  lastRecord: SeasonRecord | null;
  createWorld: () => Promise<void>;
  chooseClub: (clubId: string) => Promise<void>;
  updateTactic: (patch: Partial<Tactic>) => Promise<void>;
  /** Avança até o próximo jogo do seu clube. */
  advance: () => Promise<AdvanceStop | null>;
  /** Joga o dia de hoje; a sua partida pode vir pronta (jogada ao vivo). */
  playDay: (userOutcome?: MatchOutcome) => Promise<boolean>;
  newSeason: () => Promise<void>;
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
  const [lastDays, setLastDays] = useState<DayReport[]>([]);
  const [lastRecord, setLastRecord] = useState<SeasonRecord | null>(null);
  // Referência sempre atual ao save, para ações encadeadas não usarem estado velho.
  const saveRef = useRef<SaveGame | null>(null);
  const busyRef = useRef(false);

  const commit = useCallback(async (current: SaveGame, world: World) => {
    const updated = await updateSave(current, world);
    saveRef.current = updated;
    setSave(updated);
    return updated;
  }, []);

  useEffect(() => {
    latestSave()
      .then((found) => {
        saveRef.current = found ?? null;
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
    if (busyRef.current) return null;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      return await action();
    } catch (err) {
      setError(errorMessage(err));
      return null;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, []);

  const createWorld = useCallback(async () => {
    await run(async () => {
      const seed = Math.floor(Math.random() * 2 ** 31);
      const newWorld = await callEngine({ type: "newWorld", seed });
      const created = await createSave("Carreira 1", newWorld);
      saveRef.current = created;
      setSave(created);
      setLastDays([]);
      setLastRecord(null);
      setStatus("ready");
    });
  }, [run]);

  const chooseClub = useCallback(
    async (clubId: string) => {
      await run(async () => {
        const current = saveRef.current;
        if (!current) return;
        await commit(current, { ...current.world, user: { clubId } });
      });
    },
    [run, commit],
  );

  const updateTactic = useCallback(
    async (patch: Partial<Tactic>) => {
      const current = saveRef.current;
      const clubId = current?.world.user?.clubId;
      if (!current || !clubId) return;
      const club = current.world.clubs[clubId];
      const next: World = {
        ...current.world,
        clubs: { ...current.world.clubs, [clubId]: { ...club, tactic: { ...club.tactic, ...patch } } },
      };
      // Atualiza a tela na hora; grava em seguida.
      const optimistic = { ...current, world: next };
      saveRef.current = optimistic;
      setSave(optimistic);
      try {
        await commit(optimistic, next);
      } catch (err) {
        setError(errorMessage(err));
      }
    },
    [commit],
  );

  const advance = useCallback(async () => {
    return run(async () => {
      const current = saveRef.current;
      if (!current) return null;
      const { world: next, stop } = await callEngine({ type: "advance", world: current.world });
      setLastDays(stop.days);
      await commit(current, next);
      return stop;
    });
  }, [run, commit]);

  const playDay = useCallback(
    async (userOutcome?: MatchOutcome) => {
      const done = await run(async () => {
        const current = saveRef.current;
        if (!current) return false;
        const { world: next, report } = await callEngine({ type: "playDay", world: current.world, userOutcome });
        setLastDays([report]);
        await commit(current, next);
        return true;
      });
      return Boolean(done);
    },
    [run, commit],
  );

  const newSeason = useCallback(async () => {
    await run(async () => {
      const current = saveRef.current;
      if (!current) return;
      const { world: next, record } = await callEngine({ type: "newSeason", world: current.world });
      setLastRecord(record);
      setLastDays([]);
      await commit(current, next);
    });
  }, [run, commit]);

  const restoreWorld = useCallback(async () => {
    await run(async () => {
      const current = saveRef.current;
      if (!current) return;
      const original = await callEngine({ type: "newWorld", seed: current.world.seed });
      await commit(current, { ...original, user: current.world.user });
    });
  }, [run, commit]);

  const importPack = useCallback(
    async (file: File) => {
      return run(async () => {
        const current = saveRef.current;
        if (!current) return null;
        let raw: unknown;
        try {
          raw = JSON.parse(await file.text());
        } catch {
          throw new Error("O arquivo não é um JSON válido.");
        }
        const { world: patched, report } = await callEngine({ type: "applyPack", world: current.world, pack: raw });
        await commit(current, patched);
        return report;
      });
    },
    [run, commit],
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
      lastDays,
      lastRecord,
      createWorld,
      chooseClub,
      updateTactic,
      advance,
      playDay,
      newSeason,
      restoreWorld,
      importPack,
      downloadDatabase,
      clearError: () => setError(null),
    }),
    [status, busy, error, save, world, strength, lastDays, lastRecord, createWorld, chooseClub, updateTactic, advance, playDay, newSeason, restoreWorld, importPack, downloadDatabase],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
