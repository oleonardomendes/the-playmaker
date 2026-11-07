"use client";

import { useMemo } from "react";
import { useWorld } from "@/components/game/GameProvider";
import { useNavigation, type TournamentTab } from "@/components/game/navigation";
import { Crest } from "@/components/ui/Crest";
import { EmptyState, Segmented } from "@/components/ui/bits";
import { formatShortDate } from "@/engine/calendar/date";
import { tieAggregate } from "@/engine/competitions/fixtures";
import { groupStandings, stageFixtures } from "@/engine/competitions/standings";
import type { Competition, Fixture, Stage, World, ZoneKind } from "@/engine/types";

const ZONE_COLOR: Record<ZoneKind, string> = {
  titulo: "#f5c542",
  continental: "#5b8fd6",
  sul: "#8fc1e8",
  acesso: "#3fa35b",
  classifica: "#3fa35b",
  rebaixa: "#e5484d",
};
const ZONE_LABEL: Record<ZoneKind, string> = {
  titulo: "Campeão",
  continental: "Copa Continental",
  sul: "Copa Sul-Continental",
  acesso: "Acesso",
  classifica: "Classificação",
  rebaixa: "Rebaixamento",
};

function zoneAt(stage: Stage, pos: number): ZoneKind | undefined {
  // A zona mais específica (menor faixa) vence: o 1º da Série A é "título", não "continental".
  return [...stage.zones].sort((a, b) => a.to - a.from - (b.to - b.from)).find((z) => pos >= z.from && pos <= z.to)?.kind;
}

export function TournamentsView({ compId, tab = "tabela", stage }: { compId?: string; tab?: TournamentTab; stage?: number }) {
  const world = useWorld();
  const { navigate } = useNavigation();
  const userClub = world.user?.clubId;
  const comps = Object.values(world.competitions);
  const kindOrder = { liga: 0, estadual: 1, copa: 2, continental: 3, "copa-estadual": 4 } as const;
  const mine = comps.filter((c) => userClub && c.clubIds.includes(userClub)).sort((a, b) => kindOrder[a.kind] - kindOrder[b.kind]);
  const defaultComp = mine.find((c) => c.kind === "liga") ?? mine[0] ?? world.competitions.a;
  const comp = (compId && world.competitions[compId]) || defaultComp;
  const stageIndex = stage ?? comp.current;

  const go = (next: { compId?: string; tab?: TournamentTab; stage?: number }) =>
    navigate({ view: "torneios", compId: next.compId ?? comp.id, tab: next.tab ?? tab, stage: next.compId ? undefined : next.stage ?? stage }, { replace: true });

  const national = ["a", "b", "c", "d", "copa", "lib", "sul"].map((id) => world.competitions[id]).filter(Boolean);
  const estaduais = comps.filter((c) => c.kind === "estadual").sort((a, b) => a.name.localeCompare(b.name));
  const copasEstaduais = comps.filter((c) => c.kind === "copa-estadual").sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex h-full min-h-0">
      <nav aria-label="Competições" className="scroll-pane flex w-[clamp(170px,24vw,220px)] shrink-0 flex-col gap-0.5 border-r border-line p-2">
        {mine.length > 0 && <p className="px-2 pb-0.5 pt-1 text-[11px] text-chalk-faint">Seu clube disputa</p>}
        {mine.map((c) => (
          <CompButton key={`m-${c.id}`} comp={c} active={c.id === comp.id} onClick={() => go({ compId: c.id })} />
        ))}
        <p className="px-2 pb-0.5 pt-2 text-[11px] text-chalk-faint">Nacionais e continentais</p>
        {national.map((c) => (
          <CompButton key={c.id} comp={c} active={c.id === comp.id} onClick={() => go({ compId: c.id })} />
        ))}
        <p className="px-2 pb-0.5 pt-2 text-[11px] text-chalk-faint">Estaduais</p>
        <select
          aria-label="Estadual"
          value={comp.kind === "estadual" ? comp.id : ""}
          onChange={(e) => e.target.value && go({ compId: e.target.value })}
          className="mx-1 h-8 rounded-lg bg-pitch-2 px-2 text-sm"
        >
          <option value="">Escolha o estado</option>
          {estaduais.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Copa estadual"
          value={comp.kind === "copa-estadual" ? comp.id : ""}
          onChange={(e) => e.target.value && go({ compId: e.target.value })}
          className="mx-1 mt-1 h-8 rounded-lg bg-pitch-2 px-2 text-sm"
        >
          <option value="">Copas do 2º semestre</option>
          {copasEstaduais.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </nav>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line px-3 py-2">
          <h1 className="mr-auto truncate font-display text-xl font-bold">
            {comp.name}
            {comp.championId && <span className="ml-2 text-sm font-normal text-gold">Campeão: {world.clubs[comp.championId].name}</span>}
          </h1>
          <Segmented
            label="Visão"
            value={tab}
            onChange={(t) => go({ tab: t })}
            options={[
              { value: "tabela", label: "Tabela" },
              { value: "jogos", label: "Jogos" },
              { value: "artilharia", label: "Artilharia" },
            ]}
          />
        </div>
        {comp.stages.length > 1 && tab !== "artilharia" && (
          <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-line px-3 py-1.5" role="tablist" aria-label="Fase">
            {comp.stages.map((s, i) => (
              <button
                key={s.name}
                role="tab"
                aria-selected={i === stageIndex}
                onClick={() => go({ stage: i })}
                disabled={!s.started}
                className={`shrink-0 rounded-md px-2.5 py-1 text-sm font-medium disabled:opacity-35 ${i === stageIndex ? "bg-pitch-3 text-gold" : "text-chalk-dim hover:text-chalk"}`}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
        <div className="scroll-pane min-h-0 flex-1">
          {tab === "artilharia" ? (
            <Scorers world={world} comp={comp} />
          ) : !comp.stages[stageIndex]?.started ? (
            <EmptyState title="Fase ainda não começou">
              Começa em {formatShortDate(comp.stages[stageIndex].dates[0])}. Os confrontos saem quando a fase anterior terminar.
            </EmptyState>
          ) : tab === "jogos" ? (
            <Games world={world} comp={comp} stageIndex={stageIndex} />
          ) : comp.stages[stageIndex].type === "grupos" ? (
            <Groups world={world} comp={comp} stageIndex={stageIndex} />
          ) : (
            <Ties world={world} comp={comp} stageIndex={stageIndex} />
          )}
        </div>
      </section>
    </div>
  );
}

function CompButton({ comp, active, onClick }: { comp: Competition; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-current={active ? "true" : undefined} className={`truncate rounded-md px-2 py-1.5 text-left text-sm ${active ? "bg-pitch-3 font-semibold text-gold" : "text-chalk-dim hover:text-chalk"}`}>
      {comp.name}
    </button>
  );
}

function Groups({ world, comp, stageIndex }: { world: World; comp: Competition; stageIndex: number }) {
  const stage = comp.stages[stageIndex];
  const single = stage.groups.length === 1;
  const usedZones = [...new Set(stage.zones.map((z) => z.kind))];
  return (
    <div className="p-2">
      <div className={single ? "" : "grid gap-3 lg:grid-cols-2"}>
        {stage.groups.map((g) => (
          <GroupTable key={g.name} world={world} comp={comp} stageIndex={stageIndex} group={g.name} compact={!single} title={single ? undefined : `Grupo ${g.name}`} />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-3 px-2 text-[11px] text-chalk-dim">
        {usedZones.map((z) => (
          <li key={z} className="flex items-center gap-1.5">
            <span className="h-2.5 w-1 rounded-full" style={{ background: ZONE_COLOR[z] }} /> {ZONE_LABEL[z]}
          </li>
        ))}
      </ul>
    </div>
  );
}

function GroupTable({ world, comp, stageIndex, group, compact, title }: { world: World; comp: Competition; stageIndex: number; group: string; compact: boolean; title?: string }) {
  const { navigate } = useNavigation();
  const stage = comp.stages[stageIndex];
  const rows = groupStandings(world, comp, stageIndex, group);
  const userClub = world.user?.clubId;
  return (
    <div>
      {title && <p className="px-2 pb-0.5 font-display font-bold">{title}</p>}
      <table className="w-full table-fixed text-sm">
        <thead className="text-[11px] text-chalk-faint">
          <tr>
            <th className="w-10 py-1 text-left font-medium">#</th>
            <th className="text-left font-medium">Clube</th>
            <th className="w-9 text-right font-medium">P</th>
            <th className="w-8 text-right font-medium">J</th>
            {!compact && <th className="w-8 text-right font-medium">V</th>}
            {!compact && <th className="w-8 text-right font-medium">E</th>}
            {!compact && <th className="w-8 text-right font-medium">D</th>}
            <th className="w-10 text-right font-medium">SG</th>
            {!compact && <th className="hidden w-24 pr-2 text-right font-medium xl:table-cell">Últimos</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const club = world.clubs[r.clubId];
            const zone = zoneAt(stage, i + 1);
            const mine = r.clubId === userClub;
            return (
              <tr key={r.clubId} onClick={() => navigate({ view: "clubes", clubId: r.clubId })} className={`cursor-pointer border-t border-line hover:bg-pitch-2 ${mine ? "bg-gold/10" : ""}`}>
                <td className="py-1 pl-1">
                  <span className="flex items-center gap-1.5 tabular-nums text-chalk-dim">
                    <span className="h-4 w-1 rounded-full" style={{ background: zone ? ZONE_COLOR[zone] : "transparent" }} />
                    {i + 1}
                  </span>
                </td>
                <td className="truncate pr-2">
                  <span className="flex items-center gap-1.5">
                    <Crest club={club} size={16} />
                    <span className={`truncate ${mine ? "font-semibold text-gold" : ""}`}>{compact ? club.shortName : club.name}</span>
                  </span>
                </td>
                <td className="text-right font-display font-bold tabular-nums">{r.points}</td>
                <td className="text-right tabular-nums text-chalk-dim">{r.played}</td>
                {!compact && <td className="text-right tabular-nums text-chalk-dim">{r.won}</td>}
                {!compact && <td className="text-right tabular-nums text-chalk-dim">{r.drawn}</td>}
                {!compact && <td className="text-right tabular-nums text-chalk-dim">{r.lost}</td>}
                <td className="text-right tabular-nums text-chalk-dim">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                {!compact && (
                  <td className="hidden pr-2 xl:table-cell">
                    <span className="flex justify-end gap-0.5">
                      {r.form.map((f, k) => (
                        <span key={k} className={`h-2 w-2 rounded-full ${f === "V" ? "bg-[#3fa35b]" : f === "E" ? "bg-chalk-faint" : "bg-red"}`} title={f} />
                      ))}
                    </span>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Ties({ world, comp, stageIndex }: { world: World; comp: Competition; stageIndex: number }) {
  const stage = comp.stages[stageIndex];
  const userClub = world.user?.clubId;
  return (
    <ul className="grid gap-1.5 p-2 lg:grid-cols-2">
      {stage.ties.map((tie) => {
        const agg = tieAggregate(world, tie);
        const fixtures = tie.fixtureIds.map((id) => world.fixtures[id]);
        const pens = fixtures.at(-1)?.result?.pens;
        const lastHome = fixtures.at(-1)?.home;
        return (
          <li key={tie.id} className={`rounded-lg bg-pitch-2 px-3 py-2 ${tie.first === userClub || tie.second === userClub ? "ring-1 ring-gold/60" : ""}`}>
            {[tie.first, tie.second].map((id) => {
              const club = world.clubs[id];
              const won = tie.winnerId === id;
              const pen = pens ? (id === lastHome ? pens[0] : pens[1]) : undefined;
              return (
                <div key={id} className="flex items-center gap-2 py-0.5">
                  <Crest club={club} size={18} />
                  <span className={`min-w-0 flex-1 truncate ${won ? "font-semibold" : tie.winnerId ? "text-chalk-dim" : ""}`}>{club.name}</span>
                  {pen !== undefined && <span className="text-xs text-chalk-faint">({pen})</span>}
                  <span className="w-6 text-right font-display text-lg font-bold tabular-nums">{fixtures.some((f) => f.result) ? agg[id] : ""}</span>
                </div>
              );
            })}
            <p className="mt-0.5 text-[11px] text-chalk-faint">
              {fixtures.map((f) => `${formatShortDate(f.date)}${f.result ? ` ${f.result.hg}–${f.result.ag}` : ""}`).join(" · ")}
              {stage.legs === 2 ? " · ida e volta" : ""}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

function Games({ world, comp, stageIndex }: { world: World; comp: Competition; stageIndex: number }) {
  const { navigate } = useNavigation();
  const userClub = world.user?.clubId;
  const fixtures = stageFixtures(world, comp, stageIndex);
  const byRound = new Map<number, Fixture[]>();
  for (const f of fixtures) byRound.set(f.round, [...(byRound.get(f.round) ?? []), f]);
  const stage = comp.stages[stageIndex];
  const label = (round: number) => (stage.type === "grupos" ? `Rodada ${round + 1}` : stage.legs === 2 ? (round === 0 ? "Ida" : "Volta") : "Jogo único");
  const currentRound = fixtures.find((f) => !f.result)?.round ?? 0;
  const rounds = [...byRound.keys()].sort((a, b) => a - b);
  // Mostra a rodada atual primeiro, depois as demais.
  const ordered = [...rounds.filter((r) => r >= currentRound), ...rounds.filter((r) => r < currentRound).reverse()];
  return (
    <div className="flex flex-col gap-3 p-2">
      {ordered.slice(0, 6).map((round) => (
        <div key={round}>
          <p className="px-2 font-display font-bold">
            {label(round)} <span className="text-sm font-normal text-chalk-dim">{formatShortDate(stage.dates[round])}</span>
          </p>
          <ul className="grid gap-x-4 lg:grid-cols-2">
            {byRound.get(round)!.map((f) => {
              const mine = f.home === userClub || f.away === userClub;
              return (
                <li key={f.id}>
                  <button
                    onClick={() => mine && f.result && navigate({ view: "partida", fixtureId: f.id, mode: "sumula" })}
                    className={`flex w-full items-center gap-2 rounded px-2 py-1 text-sm ${mine ? "bg-gold/10" : ""}`}
                  >
                    <span className="min-w-0 flex-1 truncate text-right">{world.clubs[f.home].shortName}</span>
                    <Crest club={world.clubs[f.home]} size={14} />
                    <span className="w-12 text-center font-display font-bold tabular-nums">{f.result ? `${f.result.hg}–${f.result.ag}` : "×"}</span>
                    <Crest club={world.clubs[f.away]} size={14} />
                    <span className="min-w-0 flex-1 truncate">{world.clubs[f.away].shortName}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Scorers({ world, comp }: { world: World; comp: Competition }) {
  const { openPlayer } = useNavigation();
  const rows = useMemo(() => {
    const goals = new Map<string, number>();
    for (const f of Object.values(world.fixtures)) {
      if (f.comp !== comp.id || !f.result) continue;
      for (const e of f.result.events) if (e[1] === "G") goals.set(e[3], (goals.get(e[3]) ?? 0) + 1);
    }
    return [...goals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
  }, [world, comp.id]);
  if (rows.length === 0) return <EmptyState title="Nenhum gol ainda">A artilharia aparece depois da primeira rodada.</EmptyState>;
  return (
    <table className="w-full table-fixed text-sm">
      <tbody>
        {rows.map(([id, goals], i) => {
          const p = world.players[id];
          const club = world.clubs[p.clubId];
          return (
            <tr key={id} onClick={() => openPlayer(id)} className="cursor-pointer border-t border-line hover:bg-pitch-2">
              <td className="w-10 py-1.5 pl-3 tabular-nums text-chalk-dim">{i + 1}</td>
              <td className="truncate pr-2 font-medium">{p.knownAs}</td>
              <td className="truncate pr-2">
                <span className="flex items-center gap-1.5 text-chalk-dim">
                  <Crest club={club} size={14} />
                  <span className="truncate">{club.name}</span>
                </span>
              </td>
              <td className="w-14 pr-3 text-right font-display text-lg font-bold tabular-nums">{goals}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
