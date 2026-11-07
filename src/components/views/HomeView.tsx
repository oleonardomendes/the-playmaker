"use client";

import { useMemo, useState } from "react";
import { useGame, useWorld } from "@/components/game/GameProvider";
import { useNavigation } from "@/components/game/navigation";
import { Crest } from "@/components/ui/Crest";
import { TierBadge } from "@/components/ui/bits";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatDate } from "@/engine/calendar/date";
import { leagueTable } from "@/engine/competitions/standings";
import { isAvailable } from "@/engine/match/tactics";
import { seasonOver, upcomingUserFixtures, userFixtureOn, userSummary } from "@/engine/season/season";
import type { Competition, Fixture, World } from "@/engine/types";
import { fixtureLabel, outcomeFor, ownScore, RESULT_STYLE } from "@/lib/fixtures";
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
          className="mt-5 rounded-lg bg-gold px-6 py-3 font-display text-xl font-bold text-pitch disabled:opacity-50"
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
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left enabled:hover:bg-pitch-2"
      >
        <span className="w-12 shrink-0 text-xs text-chalk-dim">{fixture.date.slice(8, 10)}/{fixture.date.slice(5, 7)}</span>
        <span className="w-5 shrink-0 text-center text-xs text-chalk-faint">{home ? "C" : "F"}</span>
        <Crest club={opp} size={18} />
        <span className="min-w-0 flex-1 truncate">{opp.name}</span>
        {outcome ? (
          <span className={`w-14 shrink-0 rounded px-1 text-center font-display font-bold tabular-nums ${RESULT_STYLE[outcome]}`}>
            {ownScore(fixture, clubId)}
          </span>
        ) : (
          <span className="w-20 shrink-0 truncate text-right text-xs text-chalk-faint">{comp?.short}</span>
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

function MiniTable({ world, comp, clubId }: { world: World; comp: Competition; clubId: string }) {
  const { navigate } = useNavigation();
  const { strength } = useGame();
  const stageIndex = comp.stages[comp.current]?.type === "grupos" && comp.stages[comp.current].groups.length === 1 ? comp.current : 0;
  const rows = leagueTable(world, comp, stageIndex);
  const pos = rows.findIndex((r) => r.clubId === clubId);
  const start = Math.max(0, Math.min(rows.length - 8, pos - 3));
  const slice = rows.slice(start, start + 8);
  const anyPlayed = rows.some((r) => r.played > 0);
  return (
    <button
      onClick={() => navigate({ view: "torneios", compId: comp.id })}
      className="flex w-full flex-col rounded-xl bg-pitch-2 p-3 text-left hover:bg-pitch-3"
    >
      <span className="font-display text-lg font-bold">{comp.name}</span>
      <table className="mt-1 w-full text-sm">
        <tbody>
          {slice.map((r) => {
            const i = rows.indexOf(r);
            const mine = r.clubId === clubId;
            const club = world.clubs[r.clubId];
            return (
              <tr key={r.clubId} className={mine ? "text-gold" : ""}>
                <td className="w-6 py-0.5 tabular-nums text-chalk-faint">{i + 1}</td>
                <td className="max-w-0 truncate pr-2">
                  <span className="flex items-center gap-1.5">
                    <Crest club={club} size={14} />
                    <span className={`truncate ${mine ? "font-semibold" : ""}`}>{club.shortName}</span>
                  </span>
                </td>
                <td className="w-8 text-right tabular-nums text-chalk-dim">{r.played}</td>
                <td className="w-8 text-right font-display font-bold tabular-nums">{anyPlayed ? r.points : Math.round(strength[r.clubId])}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!anyPlayed && <span className="mt-1 text-[11px] text-chalk-faint">Antes da estreia: ordenado pela força do elenco.</span>}
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
        <button onClick={newSeason} disabled={busy} className="mt-2 rounded-lg bg-gold px-5 py-3 font-display text-xl font-bold text-pitch disabled:opacity-50">
          {busy ? "Preparando…" : `Começar a temporada ${world.season + 1}`}
        </button>
        <ErrorBanner />
      </div>
      <ul className="flex min-w-0 flex-1 flex-col gap-2">
        {main.map((c) => {
          const champ = c.championId ? world.clubs[c.championId] : null;
          return (
            <li key={c.id} className="flex items-center gap-3 rounded-xl bg-pitch-2 px-4 py-2.5">
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

function Dashboard() {
  const world = useWorld();
  const { advance, busy, lastDays, lastRecord, strength } = useGame();
  const { navigate } = useNavigation();
  const [confirmNew, setConfirmNew] = useState(false);
  const clubId = world.user!.clubId;
  const club = world.clubs[clubId];

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
  const squad = club.playerIds.map((id) => world.players[id]);
  const out = squad.filter((p) => !isAvailable(world, p)).length;
  const daysPlayed = lastDays.filter((d) => d.played > 0);
  const gamesPlayed = daysPlayed.reduce((s, d) => s + d.played, 0);

  async function onPrimary() {
    if (matchToday) {
      navigate({ view: "partida", fixtureId: matchToday.id, mode: "pre" });
      return;
    }
    const stop = await advance();
    if (stop?.kind === "match") navigate({ view: "partida", fixtureId: stop.fixtureId, mode: "pre" });
  }

  const opponent = next ? world.clubs[next.home === clubId ? next.away : next.home] : null;

  return (
    <div className="flex h-full min-h-0 gap-4 px-4 py-3">
      <section aria-label="Próximo jogo" className="scroll-pane flex w-[clamp(240px,34vw,320px)] shrink-0 flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <Crest club={club} size={34} />
          <div className="min-w-0">
            <p className="truncate font-display text-xl font-bold leading-tight">{club.name}</p>
            <p className="flex items-center gap-1.5 text-xs text-chalk-dim">
              <TierBadge tier={club.tier} short /> {formatDate(world.date)} de {world.season}
            </p>
          </div>
        </div>

        {next && opponent ? (
          <div className="rounded-xl bg-pitch-2 p-3">
            <p className="truncate text-xs text-chalk-dim">{fixtureLabel(world, next)}</p>
            <div className="mt-2 flex items-center justify-between gap-2">
              {[world.clubs[next.home], world.clubs[next.away]].map((c, i) => (
                <div key={c.id} className={`flex min-w-0 flex-1 flex-col items-center gap-1 ${i === 1 ? "order-3" : ""}`}>
                  <Crest club={c} size={40} />
                  <span className={`max-w-full truncate font-display text-[15px] font-bold ${c.id === clubId ? "text-gold" : ""}`}>{c.shortName}</span>
                  <span className="text-[11px] text-chalk-faint">força {Math.round(strength[c.id])}</span>
                </div>
              ))}
              <span className="order-2 font-display text-lg text-chalk-faint">×</span>
            </div>
            <p className="mt-2 text-center text-xs text-chalk-dim">
              {matchToday ? "Hoje" : formatDate(next.date)} · {next.neutral ? "Campo neutro" : world.clubs[next.home].stadium.name}
            </p>
          </div>
        ) : (
          <div className="rounded-xl bg-pitch-2 p-3 text-sm text-chalk-dim">Nenhum jogo marcado. Avance para seguir o calendário.</div>
        )}

        <button onClick={onPrimary} disabled={busy} className="rounded-lg bg-gold px-5 py-3 font-display text-xl font-bold text-pitch disabled:opacity-60">
          {busy ? "Simulando…" : matchToday ? "Ir para o jogo" : "Avançar"}
        </button>
        {gamesPlayed > 0 && !busy && (
          <p className="text-center text-xs text-chalk-faint">
            {gamesPlayed} {gamesPlayed === 1 ? "partida simulada" : "partidas simuladas"} pelo Brasil e pelo continente.
          </p>
        )}
        {out > 0 && (
          <button onClick={() => navigate({ view: "time" })} className="rounded-lg border border-line px-3 py-2 text-left text-sm text-chalk-dim hover:text-chalk">
            {out} {out === 1 ? "jogador fora" : "jogadores fora"} por lesão. Ver elenco.
          </button>
        )}
        <ErrorBanner />
        <div className="mt-auto flex justify-between gap-2 pt-1 text-xs text-chalk-faint">
          <button onClick={() => navigate({ view: "banco" })} className="hover:text-chalk">
            Banco de dados
          </button>
          <button onClick={() => setConfirmNew(true)} className="hover:text-chalk">
            Novo jogo
          </button>
        </div>
      </section>

      <section aria-label="Resultados e próximos jogos" className="scroll-pane flex min-w-0 flex-1 flex-col gap-3">
        {lastRecord && lastRecord.season === world.season - 1 && (
          <div className="rounded-xl border border-gold/40 px-3 py-2 text-sm">
            Temporada {lastRecord.season}: {lastRecord.user?.summary}. Bem-vindo a {world.season}.
          </div>
        )}
        <div>
          <h2 className="px-2 font-display text-lg font-bold">Próximos jogos</h2>
          <ul>
            {upcoming.filter((f) => f.id !== matchToday?.id).slice(0, 4).map((f) => (
              <FixtureRow key={f.id} world={world} fixture={f} clubId={clubId} />
            ))}
            {upcoming.length === 0 && <li className="px-2 text-sm text-chalk-dim">Os próximos confrontos de mata-mata aparecem após o sorteio.</li>}
          </ul>
        </div>
        <div>
          <h2 className="px-2 font-display text-lg font-bold">Últimos resultados</h2>
          <ul>
            {recent.map((f) => (
              <FixtureRow key={f.id} world={world} fixture={f} clubId={clubId} />
            ))}
            {recent.length === 0 && <li className="px-2 text-sm text-chalk-dim">A estreia é no estadual, em janeiro.</li>}
          </ul>
        </div>
        {focus && (
          <div className="lg:hidden">
            <MiniTable world={world} comp={focus} clubId={clubId} />
          </div>
        )}
      </section>

      {focus && (
        <section aria-label="Classificação" className="scroll-pane hidden w-[260px] shrink-0 lg:block">
          <MiniTable world={world} comp={focus} clubId={clubId} />
        </section>
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
