"use client";

import { useGame } from "./GameProvider";
import { useNavigation } from "./navigation";
import { Crest } from "@/components/ui/Crest";
import { formatShortDate } from "@/engine/calendar/date";
import { seasonOver, upcomingUserFixtures, userFixtureOn } from "@/engine/season/season";
import { IconChevronRight } from "@/components/ui/icons";

/**
 * Ação principal do jogo, a mesma em qualquer tela: se tem jogo hoje, vai
 * para o pré-jogo; senão, avança o calendário até o próximo compromisso.
 */
export function useContinue() {
  const { world, advance, busy } = useGame();
  const { navigate } = useNavigation();
  const clubId = world?.user?.clubId;
  if (!world || !clubId) return null;

  const over = seasonOver(world);
  const today = userFixtureOn(world, world.date);
  const matchToday = today && !today.result ? today : undefined;
  const next = matchToday ?? upcomingUserFixtures(world, 1)[0];
  const opp = next ? world.clubs[next.home === clubId ? next.away : next.home] : undefined;

  const label = over ? "Fim de temporada" : matchToday ? "Jogar" : "Continuar";
  const detail = busy ? "Simulando…" : over ? "Ver o balanço" : matchToday ? `Hoje × ${opp?.shortName}` : next ? `${formatShortDate(next.date)} × ${opp?.shortName}` : "Próximo dia";

  async function run() {
    if (over) {
      navigate({ view: "inicio" });
      return;
    }
    if (matchToday) {
      navigate({ view: "partida", fixtureId: matchToday.id, mode: "pre" });
      return;
    }
    const stop = await advance();
    if (stop?.kind === "match") navigate({ view: "partida", fixtureId: stop.fixtureId, mode: "pre" });
  }

  return { label, detail, run, busy, matchToday: Boolean(matchToday) };
}

export function TopBar() {
  const { world } = useGame();
  const { navigate } = useNavigation();
  const cont = useContinue();
  const club = world?.user ? world.clubs[world.user.clubId] : undefined;

  return (
    <header
      className="flex h-12 shrink-0 items-center gap-3 border-b border-line bg-pitch/70 px-3 backdrop-blur"
      style={{ paddingRight: "max(0.75rem, env(safe-area-inset-right))" }}
    >
      {club && world ? (
        <button onClick={() => navigate({ view: "inicio" })} className="flex min-w-0 items-center gap-2 rounded-lg pr-2 hover:bg-white/5">
          <Crest club={club} size={28} />
          <span className="min-w-0 text-left leading-tight">
            <span className="block truncate font-display text-[17px] font-bold tracking-wide">{club.shortName.toUpperCase()}</span>
            <span className="block text-[11px] text-chalk-dim">
              {formatShortDate(world.date)} de {world.season}
            </span>
          </span>
        </button>
      ) : (
        <span className="font-display text-lg font-bold tracking-wide">THE PLAYMAKER</span>
      )}

      <span className="flex-1" />

      {cont && (
        <button
          onClick={() => void cont.run()}
          disabled={cont.busy}
          className="btn-primary flex h-9 items-center gap-2 pl-4 pr-2"
          aria-label={`${cont.label}: ${cont.detail}`}
        >
          <span className="flex flex-col items-start leading-none">
            <span className="text-[17px] uppercase tracking-wide">{cont.label}</span>
            <span className="font-sans text-[10px] font-semibold opacity-75">{cont.detail}</span>
          </span>
          <IconChevronRight className={`text-xl ${cont.busy ? "animate-pulse" : ""}`} />
        </button>
      )}
    </header>
  );
}
