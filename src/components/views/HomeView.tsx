"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useGame, useWorld } from "@/components/game/GameProvider";
import { useNavigation } from "@/components/game/navigation";
import { Crest } from "@/components/ui/Crest";
import { Face, PosTag, Ring } from "@/components/ui/player";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { daysBetween, formatDate, formatShortDate } from "@/engine/calendar/date";
import { leagueTable } from "@/engine/competitions/standings";
import { isAvailable } from "@/engine/match/tactics";
import { seasonOver, upcomingUserFixtures, userFixtureOn, userSummary } from "@/engine/season/season";
import type { Competition, Fixture, Player, World } from "@/engine/types";
import { fixtureLabel, outcomeFor, ownScore, plural, RESULT_STYLE } from "@/lib/fixtures";
import { ChooseClubView } from "./ChooseClubView";

function ErrorBanner() {
  const { error, clearError } = useGame();
  if (!error) return null;
  return (
    <div role="alert" className="flex items-start justify-between gap-3 rounded-lg border border-red/40 bg-red/10 px-3 py-2 text-sm">
      <span>{error}</span>
      <button onClick={clearError} className="text-chalk-dim hover:text-chalk">
        Fechar
      </button>
    </div>
  );
}

function EmptyHome() {
  const { createWorld, busy, status } = useGame();
  return (
    <div className="scroll-pane flex h-full items-center gap-10 px-8 py-5">
      <div className="flex w-[280px] shrink-0 flex-col gap-4">
        <h1 className="font-display text-[44px] font-bold leading-[0.88] tracking-tight">
          The
          <br />
          Playmaker
        </h1>
        <p className="text-chalk-dim">Manager de futebol brasileiro</p>
        <ErrorBanner />
      </div>
      <div className="max-w-md">
        <p className="font-display text-2xl font-bold">Comece criando o seu mundo do futebol</p>
        <p className="mt-2 text-chalk-dim">
          302 clubes brasileiros em 27 estados, das Séries A a D até quem só joga o estadual, mais 60 clubes da América do Sul e
          cerca de 9 mil jogadores. A temporada tem estaduais, Brasileirão, Copa Nacional e copas continentais.
        </p>
        <button
          onClick={createWorld}
          disabled={busy || status === "loading"}
          className="btn-primary mt-5 px-6 py-3 text-xl"
        >
          {busy ? "Criando o mundo…" : status === "loading" ? "Carregando…" : "Criar mundo"}
        </button>
      </div>
    </div>
  );
}

function FixtureRow({ world, fixture, clubId }: { world: World; fixture: Fixture; clubId: string }) {
  const { navigate } = useNavigation();
  const home = fixture.home === clubId;
  const opp = world.clubs[home ? fixture.away : fixture.home];
  const outcome = outcomeFor(fixture, clubId);
  const comp = world.competitions[fixture.comp];
  return (
    <li>
      <button
        onClick={() => fixture.result && navigate({ view: "partida", fixtureId: fixture.id, mode: "sumula" })}
        disabled={!fixture.result}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-[5px] text-left enabled:hover:bg-white/5"
      >
        <span className="w-10 shrink-0 text-[11px] tabular-nums text-chalk-faint">
          {fixture.date.slice(8, 10)}/{fixture.date.slice(5, 7)}
        </span>
        <Crest club={opp} size={18} />
        <span className="min-w-0 flex-1 truncate text-[13px]">
          {opp.shortName}
          <span className="ml-1.5 text-[11px] text-chalk-faint">{home ? "casa" : "fora"}</span>
        </span>
        {outcome ? (
          <span className={`w-12 shrink-0 rounded-md text-center font-display text-[15px] font-bold tabular-nums ${RESULT_STYLE[outcome]}`}>
            {ownScore(fixture, clubId)}
          </span>
        ) : (
          <span className="w-16 shrink-0 truncate text-right text-[11px] text-chalk-faint">{comp?.short}</span>
        )}
      </button>
    </li>
  );
}

/** Competição que mais importa agora para a mini tabela: a do próximo jogo, se for de grupos. */
function focusCompetition(world: World, next: Fixture | undefined, clubId: string): Competition | undefined {
  if (next) {
    const comp = world.competitions[next.comp];
    if (comp && comp.stages[next.stage].type === "grupos" && comp.stages[next.stage].groups.length === 1) return comp;
  }
  return Object.values(world.competitions).find((c) => c.kind === "liga" && c.clubIds.includes(clubId));
}

function CardTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2 px-3 pt-2.5 pb-1">
      <h2 className="font-display text-[15px] font-bold tracking-wide text-chalk-dim">{children}</h2>
      {action}
    </div>
  );
}

function MiniTable({ world, comp, clubId }: { world: World; comp: Competition; clubId: string }) {
  const { navigate } = useNavigation();
  const { strength } = useGame();
  const stageIndex = comp.stages[comp.current]?.type === "grupos" && comp.stages[comp.current].groups.length === 1 ? comp.current : 0;
  const rows = leagueTable(world, comp, stageIndex);
  const pos = rows.findIndex((r) => r.clubId === clubId);
  const start = Math.max(0, Math.min(rows.length - 7, pos - 3));
  const slice = rows.slice(start, start + 7);
  const anyPlayed = rows.some((r) => r.played > 0);
  return (
    <button onClick={() => navigate({ view: "torneios", compId: comp.id })} className="panel panel-hover flex h-full w-full flex-col text-left">
      <CardTitle action={<span className="text-[11px] text-chalk-faint">{anyPlayed ? "J · Pts" : "força"}</span>}>{comp.name}</CardTitle>
      <table className="w-full text-[13px]">
        <tbody>
          {slice.map((r) => {
            const i = rows.indexOf(r);
            const mine = r.clubId === clubId;
            const club = world.clubs[r.clubId];
            return (
              <tr key={r.clubId} className={mine ? "bg-gold/10 text-gold" : ""}>
                <td className="w-7 py-[3px] pl-3 tabular-nums text-chalk-faint">{i + 1}</td>
                <td className="max-w-0 truncate pr-2">
                  <span className="flex items-center gap-1.5">
                    <Crest club={club} size={15} />
                    <span className={`truncate ${mine ? "font-semibold" : ""}`}>{club.shortName}</span>
                  </span>
                </td>
                <td className="w-6 text-right tabular-nums text-chalk-faint">{anyPlayed ? r.played : ""}</td>
                <td className="w-9 pr-3 text-right font-display text-[15px] font-bold tabular-nums">{anyPlayed ? r.points : Math.round(strength[r.clubId])}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!anyPlayed && <span className="mt-auto px-3 pb-2 text-[11px] text-chalk-faint">Antes da estreia: ordenado pela força do elenco.</span>}
    </button>
  );
}

function SeasonEnd() {
  const world = useWorld();
  const { newSeason, busy } = useGame();
  const clubId = world.user!.clubId;
  const main = ["a", "b", "copa", "lib", "sul"].map((id) => world.competitions[id]).filter(Boolean);
  return (
    <div className="scroll-pane flex h-full gap-8 px-8 py-6">
      <div className="flex w-[300px] shrink-0 flex-col gap-3">
        <p className="text-sm text-chalk-dim">Temporada {world.season} encerrada</p>
        <h1 className="font-display text-3xl font-bold leading-tight">{userSummary(world, clubId)}</h1>
        <p className="text-sm text-chalk-dim">Na virada, os clubes sobem e descem de divisão e os classificados às copas continentais são definidos.</p>
        <button onClick={newSeason} disabled={busy} className="btn-primary mt-2 px-5 py-3 text-xl">
          {busy ? "Preparando…" : `Começar a temporada ${world.season + 1}`}
        </button>
        <ErrorBanner />
      </div>
      <ul className="flex min-w-0 flex-1 flex-col gap-2">
        {main.map((c) => {
          const champ = c.championId ? world.clubs[c.championId] : null;
          return (
            <li key={c.id} className="panel flex items-center gap-3 px-4 py-2.5">
              <span className="w-40 shrink-0 text-sm text-chalk-dim">{c.name}</span>
              {champ && <Crest club={champ} size={22} />}
              <span className={`min-w-0 flex-1 truncate font-medium ${champ?.id === clubId ? "text-gold" : ""}`}>{champ?.name ?? "—"}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function NextMatchCard({ world, next, clubId, today }: { world: World; next: Fixture; clubId: string; today: boolean }) {
  const { strength } = useGame();
  const { navigate, openPlayer } = useNavigation();
  const home = world.clubs[next.home];
  const away = world.clubs[next.away];
  const days = daysBetween(world.date, next.date);
  return (
    <div className="panel relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* luz de estádio com as cores dos dois clubes */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background: `radial-gradient(60% 90% at 0% 40%, color-mix(in srgb, ${home.colors[0]} 38%, transparent), transparent 70%), radial-gradient(60% 90% at 100% 40%, color-mix(in srgb, ${away.colors[0]} 38%, transparent), transparent 70%)`,
        }}
      />
      <div className="relative flex items-center justify-between gap-2 px-3 pt-2.5">
        <p className="min-w-0 truncate text-[11px] font-medium text-chalk-dim">{fixtureLabel(world, next)}</p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${today ? "bg-gold text-pitch" : "bg-white/8 text-chalk-dim"}`}>
          {today ? "Hoje" : days === 1 ? "Amanhã" : `Em ${days} dias`}
        </span>
      </div>
      <div className="relative flex items-center justify-center gap-3 px-3 py-2">
        {[home, away].map((c, i) => (
          <div key={c.id} className={`flex min-w-0 flex-1 flex-col items-center gap-1.5 ${i === 1 ? "order-3" : ""}`}>
            <span className="drop-shadow-[0_6px_14px_rgba(0,0,0,0.6)]">
              <Crest club={c} size={58} />
            </span>
            <span className={`max-w-full truncate font-display text-[17px] font-bold leading-none tracking-wide ${c.id === clubId ? "text-gold" : ""}`}>
              {c.shortName.toUpperCase()}
            </span>
          </div>
        ))}
        <div className="order-2 flex flex-col items-center gap-1">
          <div className="flex items-center gap-1.5">
            <Ring value={strength[home.id]} size={32} label={`Força de ${home.name}`} />
            <span className="font-display text-sm text-chalk-faint">×</span>
            <Ring value={strength[away.id]} size={32} label={`Força de ${away.name}`} />
          </div>
          <span className="text-[10px] text-chalk-faint">força</span>
        </div>
      </div>
      <p className="relative px-3 text-center text-[11px] text-chalk-dim">
        {formatDate(next.date)} · {next.neutral ? "Campo neutro" : home.stadium.name}
      </p>
      <div className="relative mt-auto grid grid-cols-2 gap-2 px-2.5 pt-2">
        {[home, away].map((c) => {
          const star = c.playerIds.map((id) => world.players[id]).sort((a, b) => b.overall - a.overall)[0];
          if (!star) return <span key={c.id} />;
          return (
            <button key={c.id} onClick={() => openPlayer(star.id)} className="flex min-w-0 items-center gap-2 rounded-xl border border-line bg-pitch/50 px-2 py-1.5 text-left hover:border-line-strong">
              <Face player={star} size={30} shirt={c.colors[0]} season={world.season} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-semibold leading-tight">{star.knownAs}</span>
                <span className="block text-[10px] text-chalk-faint">destaque {c.shortName}</span>
              </span>
              <Ring value={star.overall} size={24} />
            </button>
          );
        })}
      </div>
      <div className="relative flex gap-2 p-2.5">
        <button onClick={() => navigate({ view: "time" })} className="btn-ghost flex-1 py-1.5 font-display text-[15px] font-semibold">
          Escalação
        </button>
        <button onClick={() => navigate({ view: "agenda" })} className="btn-ghost flex-1 py-1.5 font-display text-[15px] font-semibold">
          Agenda
        </button>
      </div>
    </div>
  );
}

function SquadCard({ world, clubId }: { world: World; clubId: string }) {
  const { navigate, openPlayer } = useNavigation();
  const club = world.clubs[clubId];
  const squad = club.playerIds.map((id) => world.players[id]);
  const out = squad.filter((p) => !isAvailable(world, p));
  const scorer = [...squad].sort((a, b) => b.season.goals - a.season.goals || b.overall - a.overall)[0];
  const best = [...squad].sort((a, b) => b.overall - a.overall)[0];
  const tired = squad.filter((p) => p.condition < 75 && !p.injury).length;
  const picks: Array<{ p: Player; note: string }> = [
    { p: best, note: "Craque do elenco" },
    ...(scorer && scorer.season.goals > 0 && scorer.id !== best.id ? [{ p: scorer, note: `${plural(scorer.season.goals, "gol", "gols")} na temporada` }] : []),
    ...out.slice(0, 2).map((p) => ({ p, note: p.injury ? `Lesionado até ${formatShortDate(p.injury.until)}` : "Suspenso" })),
  ].slice(0, 3);
  return (
    <div className="panel flex flex-col">
      <CardTitle
        action={
          <button onClick={() => navigate({ view: "time" })} className="text-[11px] text-chalk-faint hover:text-chalk">
            Ver elenco
          </button>
        }
      >
        Elenco
      </CardTitle>
      <ul className="flex flex-col gap-0.5 px-1.5 pb-1.5">
        {picks.map(({ p, note }) => (
          <li key={p.id}>
            <button onClick={() => openPlayer(p.id)} className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left hover:bg-white/5">
              <Face player={p} size={30} shirt={club.colors[0]} season={world.season} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold">{p.knownAs}</span>
                <span className={`block truncate text-[11px] ${p.injury ? "text-red" : "text-chalk-faint"}`}>{note}</span>
              </span>
              <PosTag pos={p.position} />
              <Ring value={p.overall} size={26} />
            </button>
          </li>
        ))}
      </ul>
      {tired > 0 && <p className="mt-auto px-3 pb-2 text-[11px] text-warn">{plural(tired, "jogador cansado", "jogadores cansados")} (condição abaixo de 75%).</p>}
    </div>
  );
}

function FormStrip({ world, recent, clubId }: { world: World; recent: Fixture[]; clubId: string }) {
  if (!recent.length) return null;
  return (
    <div className="flex items-center gap-1" aria-label="Últimos resultados">
      {[...recent].reverse().map((f) => {
        const o = outcomeFor(f, clubId)!;
        return (
          <span key={f.id} title={`${world.clubs[f.home].shortName} ${f.result?.hg}–${f.result?.ag} ${world.clubs[f.away].shortName}`} className={`flex h-5 w-5 items-center justify-center rounded-md font-display text-[12px] font-bold ${RESULT_STYLE[o]}`}>
            {o}
          </span>
        );
      })}
    </div>
  );
}

function Dashboard() {
  const world = useWorld();
  const { busy, lastDays, lastRecord } = useGame();
  const { navigate } = useNavigation();
  const [confirmNew, setConfirmNew] = useState(false);
  const clubId = world.user!.clubId;

  const today = userFixtureOn(world, world.date);
  const matchToday = today && !today.result ? today : undefined;
  const upcoming = useMemo(() => upcomingUserFixtures(world, 6), [world]);
  const next = matchToday ?? upcoming[0];
  const recent = useMemo(
    () =>
      Object.values(world.fixtures)
        .filter((f) => f.result && (f.home === clubId || f.away === clubId))
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5),
    [world, clubId],
  );
  const focus = focusCompetition(world, next, clubId);
  const gamesPlayed = lastDays.filter((d) => d.played > 0).reduce((s, d) => s + d.played, 0);

  return (
    <div className="scroll-pane grid h-full min-h-0 grid-cols-[minmax(250px,1.15fr)_minmax(200px,1fr)] gap-2.5 p-2.5 lg:grid-cols-[minmax(280px,1.2fr)_minmax(220px,1fr)_minmax(220px,0.95fr)]">
      <div className="flex min-h-0 flex-col gap-2.5">
        {next ? (
          <NextMatchCard world={world} next={next} clubId={clubId} today={Boolean(matchToday)} />
        ) : (
          <div className="panel p-3 text-sm text-chalk-dim">Nenhum jogo marcado. Continue para seguir o calendário.</div>
        )}
        {lastRecord && lastRecord.season === world.season - 1 && (
          <div className="panel border-gold/40 px-3 py-2 text-[13px]">
            Temporada {lastRecord.season}: {lastRecord.user?.summary}. Bem-vindo a {world.season}.
          </div>
        )}
        <ErrorBanner />
        <div className="flex items-center justify-between gap-2 px-1 text-[11px] text-chalk-faint">
          <span>{gamesPlayed > 0 && !busy ? `${plural(gamesPlayed, "partida simulada", "partidas simuladas")} pelo Brasil e pelo continente.` : ""}</span>
          <span className="flex shrink-0 gap-3">
            <button onClick={() => navigate({ view: "banco" })} className="hover:text-chalk">
              Banco de dados
            </button>
            <button onClick={() => setConfirmNew(true)} className="hover:text-chalk">
              Novo jogo
            </button>
          </span>
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-2.5">
        <div className="panel flex flex-col">
          <CardTitle action={<FormStrip world={world} recent={recent} clubId={clubId} />}>Jogos</CardTitle>
          <ul className="px-1 pb-1.5">
            {upcoming
              .filter((f) => f.id !== next?.id)
              .slice(0, 3)
              .map((f) => (
                <FixtureRow key={f.id} world={world} fixture={f} clubId={clubId} />
              ))}
            {recent.length > 0 && <li aria-hidden className="mx-2 my-1 border-t border-line" />}
            {recent.slice(0, 3).map((f) => (
              <FixtureRow key={f.id} world={world} fixture={f} clubId={clubId} />
            ))}
            {recent.length === 0 && upcoming.length <= 1 && <li className="px-2 py-1 text-[13px] text-chalk-dim">A estreia é no estadual, em janeiro.</li>}
          </ul>
        </div>
        <SquadCard world={world} clubId={clubId} />
        {focus && (
          <div className="lg:hidden">
            <MiniTable world={world} comp={focus} clubId={clubId} />
          </div>
        )}
      </div>

      {focus && (
        <div className="hidden min-h-0 lg:block">
          <MiniTable world={world} comp={focus} clubId={clubId} />
        </div>
      )}

      <NewGameDialog open={confirmNew} onClose={() => setConfirmNew(false)} />
    </div>
  );
}

function NewGameDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { createWorld } = useGame();
  return (
    <ConfirmDialog
      open={open}
      title="Começar um jogo novo?"
      message="O mundo atual, com seu clube e a temporada em andamento, será substituído por um mundo novo. Isso não pode ser desfeito."
      confirmLabel="Começar jogo novo"
      onCancel={onClose}
      onConfirm={() => {
        onClose();
        void createWorld();
      }}
    />
  );
}

export function HomeView() {
  const { status, world } = useGame();
  if (status !== "ready" || !world) return <EmptyHome />;
  if (!world.user) return <ChooseClubView />;
  if (seasonOver(world)) return <SeasonEnd />;
  return <Dashboard />;
}
