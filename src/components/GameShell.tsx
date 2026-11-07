"use client";

import { useEffect, useState } from "react";
import type { MatchResult, SaveGame } from "@/engine/types";
import { callEngine } from "@/lib/engine-client";
import { createSave, latestSave, updateSave } from "@/lib/save/store";

/**
 * Tela provisória da fase 0: valida o caminho completo
 * mundo (Web Worker) -> save (IndexedDB) -> simulação -> save.
 * As telas de verdade chegam a partir da fase 1.
 */

type Status = "loading" | "idle" | "busy";

export function GameShell() {
  const [status, setStatus] = useState<Status>("loading");
  const [save, setSave] = useState<SaveGame | null>(null);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    latestSave()
      .then((found) => setSave(found ?? null))
      .catch((err: unknown) => setError(String(err)))
      .finally(() => setStatus("idle"));
  }, []);

  async function run(action: () => Promise<void>) {
    setStatus("busy");
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setStatus("idle");
    }
  }

  const newGame = () =>
    run(async () => {
      const seed = Math.floor(Math.random() * 2 ** 31);
      const world = await callEngine({ type: "newWorld", seed });
      setSave(await createSave("Carreira 1", world));
      setResults([]);
    });

  const playRound = () =>
    run(async () => {
      if (!save) return;
      const { world, results: round } = await callEngine({ type: "simulateTestRound", world: save.world });
      setSave(await updateSave(save, world));
      setResults(round);
    });

  if (status === "loading") {
    return <p className="text-chalk-dim">Carregando…</p>;
  }

  const clubs = save ? Object.values(save.world.clubs) : [];
  const clubName = (id: string) => save?.world.clubs[id]?.name ?? id;

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-lg border border-line bg-pitch-2 p-4">
        <p className="text-xs uppercase tracking-widest text-gold">Fase 0 · laboratório</p>
        <p className="mt-1 text-sm text-chalk-dim">
          Teste do motor: gera um mundo, salva no aparelho e simula rodadas.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            onClick={newGame}
            disabled={status === "busy"}
            className="flex-1 rounded-md bg-gold px-4 py-3 font-display text-lg font-bold uppercase text-pitch disabled:opacity-50"
          >
            Novo mundo
          </button>
          {save && (
            <button
              onClick={playRound}
              disabled={status === "busy"}
              className="flex-1 rounded-md border border-chalk/40 px-4 py-3 font-display text-lg font-bold uppercase disabled:opacity-50"
            >
              Simular rodada
            </button>
          )}
        </div>
        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
      </div>

      {results.length > 0 && (
        <div className="rounded-lg border border-line p-4">
          <h2 className="font-display text-xl font-bold uppercase">Resultados</h2>
          <ul className="mt-2 divide-y divide-line text-sm">
            {results.map((r) => (
              <li key={`${r.homeId}-${r.awayId}`} className="flex items-center gap-2 py-2">
                <span className="flex-1 truncate text-right">{clubName(r.homeId)}</span>
                <span className="w-14 rounded bg-pitch-2 py-0.5 text-center font-display text-lg font-bold tabular-nums">
                  {r.homeGoals} × {r.awayGoals}
                </span>
                <span className="flex-1 truncate">{clubName(r.awayId)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {save && (
        <div className="rounded-lg border border-line p-4">
          <h2 className="font-display text-xl font-bold uppercase">Clubes · temporada {save.world.season}</h2>
          <ul className="mt-2 divide-y divide-line text-sm">
            {clubs.map((club) => (
              <li key={club.id} className="flex items-center justify-between py-2">
                <span className="truncate">{club.name}</span>
                <span className="text-chalk-dim">
                  {club.state} · prestígio {club.prestige}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
