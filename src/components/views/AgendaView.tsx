"use client";

import { useMemo } from "react";
import { useWorld } from "@/components/game/GameProvider";
import { useNavigation } from "@/components/game/navigation";
import { Crest } from "@/components/ui/Crest";
import { formatDate } from "@/engine/calendar/date";
import { fixtureLabel, outcomeFor, ownScore, plural, RESULT_STYLE } from "@/lib/fixtures";

/** Todos os jogos do seu clube na temporada, com resultados e os que faltam. */
export function AgendaView() {
  const world = useWorld();
  const { navigate } = useNavigation();
  const clubId = world.user!.clubId;
  const fixtures = useMemo(
    () => Object.values(world.fixtures).filter((f) => f.home === clubId || f.away === clubId).sort((a, b) => a.date.localeCompare(b.date)),
    [world, clubId],
  );
  const played = fixtures.filter((f) => f.result);
  const record = played.reduce(
    (acc, f) => {
      const o = outcomeFor(f, clubId)!;
      acc[o] += 1;
      return acc;
    },
    { V: 0, E: 0, D: 0 },
  );
  const nextIndex = fixtures.findIndex((f) => !f.result);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-baseline gap-4 border-b border-line px-4 py-2">
        <h1 className="font-display text-2xl font-bold">Agenda {world.season}</h1>
        <p className="text-sm text-chalk-dim">
          {plural(played.length, "jogo", "jogos")}: {plural(record.V, "vitória", "vitórias")}, {plural(record.E, "empate", "empates")}, {plural(record.D, "derrota", "derrotas")}. Placar com os gols do seu time primeiro.
        </p>
      </div>
      <ul className="scroll-pane min-h-0 flex-1 px-2 py-1">
        {fixtures.map((f, i) => {
          const home = f.home === clubId;
          const opp = world.clubs[home ? f.away : f.home];
          const o = outcomeFor(f, clubId);
          const isNext = i === nextIndex;
          return (
            <li key={f.id}>
              <button
                onClick={() => navigate({ view: "partida", fixtureId: f.id, mode: f.result ? "sumula" : "pre" })}
                disabled={!f.result && !(isNext && f.date === world.date)}
                className={`flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left enabled:hover:bg-pitch-2 ${isNext ? "bg-pitch-2" : ""}`}
              >
                <span className="w-24 shrink-0 text-xs text-chalk-dim">{formatDate(f.date)}</span>
                <span className="w-6 shrink-0 text-center text-xs text-chalk-faint" title={home ? "Em casa" : "Fora"}>
                  {home ? "C" : "F"}
                </span>
                <Crest club={opp} size={20} />
                <span className="min-w-0 flex-1 truncate font-medium">{opp.name}</span>
                <span className="hidden min-w-0 max-w-[40%] truncate text-xs text-chalk-faint md:block">{fixtureLabel(world, f)}</span>
                {o ? (
                  <span className={`w-16 shrink-0 rounded px-1 text-center font-display font-bold tabular-nums ${RESULT_STYLE[o]}`}>
                    {ownScore(f, clubId)}
                  </span>
                ) : (
                  <span className="w-16 shrink-0 text-center text-xs text-chalk-faint">{isNext ? "próximo" : ""}</span>
                )}
              </button>
            </li>
          );
        })}
        {fixtures.length === 0 && <li className="p-4 text-chalk-dim">Nenhum jogo marcado.</li>}
      </ul>
      <p className="shrink-0 px-4 pb-1 text-[11px] text-chalk-faint">Jogos de mata-mata entram na agenda depois do sorteio de cada fase. * decidido nos pênaltis.</p>
    </div>
  );
}
