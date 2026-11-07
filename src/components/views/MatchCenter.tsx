"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useGame, useWorld } from "@/components/game/GameProvider";
import { useNavigation } from "@/components/game/navigation";
import { Crest } from "@/components/ui/Crest";
import { EmptyState } from "@/components/ui/bits";
import { MatchSim } from "@/engine/match/engine";
import { MENTALITIES, MENTALITY_NAMES, MENTALITY_SHORT } from "@/engine/match/tactics";
import { matchSetup } from "@/engine/season/season";
import type { Fixture, MatchEvent, Mentality, World } from "@/engine/types";
import { describeEvent, minuteLabel, type CommentaryLine } from "@/lib/commentary";
import { aggregateNote, fixtureLabel } from "@/lib/fixtures";
import { TeamEditor } from "./TeamEditor";

export function MatchCenter({ fixtureId, mode }: { fixtureId: string; mode: "pre" | "live" | "sumula" }) {
  const world = useWorld();
  const fixture = world.fixtures[fixtureId];
  if (!fixture) return <EmptyState title="Partida não encontrada">Ela pode ser de uma temporada que já acabou.</EmptyState>;
  if (fixture.result || mode === "sumula") return <MatchReport world={world} fixture={fixture} />;
  if (mode === "live") return <LiveMatch world={world} fixture={fixture} />;
  return <PreMatch world={world} fixture={fixture} />;
}

function MatchHeader({ world, fixture, score, center }: { world: World; fixture: Fixture; score?: [number, number]; center?: string }) {
  const home = world.clubs[fixture.home];
  const away = world.clubs[fixture.away];
  const userId = world.user?.clubId;
  const name = (id: string) => (
    <span className={`truncate font-display text-xl font-bold ${id === userId ? "text-gold" : ""}`}>{world.clubs[id].name}</span>
  );
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-2">
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
        {name(home.id)}
        <Crest club={home} size={28} />
      </div>
      <div className="flex w-28 shrink-0 flex-col items-center">
        <span className="font-display text-3xl font-bold leading-none tabular-nums">{score ? `${score[0]} – ${score[1]}` : "×"}</span>
        {center && <span className="mt-0.5 text-xs text-chalk-dim">{center}</span>}
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Crest club={away} size={28} />
        {name(away.id)}
      </div>
    </div>
  );
}

/* ---------- Antes do jogo ---------- */

function PreMatch({ world, fixture }: { world: World; fixture: Fixture }) {
  const { playDay, busy } = useGame();
  const { navigate } = useNavigation();
  const agg = aggregateNote(world, fixture);

  async function simulate() {
    if (await playDay()) navigate({ view: "partida", fixtureId: fixture.id, mode: "sumula" }, { replace: true });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-chalk-dim">{fixtureLabel(world, fixture)}</p>
          <p className="truncate font-display text-lg font-bold leading-tight">
            {world.clubs[fixture.home].shortName} × {world.clubs[fixture.away].shortName}
            <span className="ml-2 text-sm font-normal text-chalk-dim">{agg ?? (fixture.neutral ? "Campo neutro" : world.clubs[fixture.home].stadium.name)}</span>
          </p>
        </div>
        <button onClick={simulate} disabled={busy} className="rounded-lg bg-pitch-3 px-4 py-2 font-display text-lg font-bold hover:bg-pitch-2 disabled:opacity-50">
          {busy ? "Simulando…" : "Simular"}
        </button>
        <button
          onClick={() => navigate({ view: "partida", fixtureId: fixture.id, mode: "live" }, { replace: true })}
          disabled={busy}
          className="rounded-lg bg-gold px-5 py-2 font-display text-lg font-bold text-pitch disabled:opacity-50"
        >
          Jogar ao vivo
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <TeamEditor compId={fixture.comp} />
      </div>
    </div>
  );
}

/* ---------- Ao vivo ---------- */

const SPEEDS = [
  { label: "1×", ms: 450 },
  { label: "3×", ms: 150 },
  { label: "10×", ms: 40 },
] as const;

function LiveMatch({ world, fixture }: { world: World; fixture: Fixture }) {
  const { playDay, busy } = useGame();
  const { navigate } = useNavigation();
  const userSide: 0 | 1 = fixture.home === world.user?.clubId ? 0 : 1;
  // A partida vive só nesta tela: é criada uma vez e só vai para o save no fim.
  const [sim] = useState(() => new MatchSim(world.players, matchSetup(world, fixture, { live: true }), world.season));
  const [lines, setLines] = useState<CommentaryLine[]>([{ minute: "0'", text: "Rola a bola!", kind: "info" }]);
  const [snap, setSnap] = useState(() => sim.snapshot());
  const [speed, setSpeed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [halfTime, setHalfTime] = useState(false);
  const [subOut, setSubOut] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const clubs: [string, string] = [fixture.home, fixture.away];

  const push = useCallback(
    (events: MatchEvent[], extra?: CommentaryLine) => {
      const added = events.map((e) => describeEvent(world, e, clubs));
      if (extra) added.push(extra);
      if (added.length) setLines((prev) => [...added.reverse(), ...prev]);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [world, fixture.id],
  );

  const tick = useCallback(() => {
    if (sim.done) return;
    const events = sim.step();
    let extra: CommentaryLine | undefined;
    if (sim.minute === 45) {
      extra = { minute: "45'", text: "Fim do primeiro tempo.", kind: "info" };
      setHalfTime(true);
    }
    if (sim.done) {
      const s = sim.snapshot();
      extra = { minute: minuteLabel(sim.minute), text: s.pens ? `Fim de jogo! Decisão nos pênaltis: ${s.pens[0]} a ${s.pens[1]}.` : "Fim de jogo!", kind: "info" };
    }
    push(events, extra);
    setSnap(sim.snapshot());
  }, [sim, push]);

  useEffect(() => {
    if (paused || halfTime || snap.done) return;
    const t = setInterval(tick, SPEEDS[speed].ms);
    return () => clearInterval(t);
  }, [paused, halfTime, snap.done, speed, tick]);

  function skip() {
    while (!sim.done) {
      const events = sim.step();
      push(events);
    }
    const s = sim.snapshot();
    push([], { minute: minuteLabel(sim.minute), text: s.pens ? `Fim de jogo! Pênaltis: ${s.pens[0]} a ${s.pens[1]}.` : "Fim de jogo!", kind: "info" });
    setHalfTime(false);
    setSnap(s);
  }

  async function finish() {
    if (await playDay(sim.outcome())) navigate({ view: "partida", fixtureId: fixture.id, mode: "sumula" }, { replace: true });
  }

  function setMentality(m: Mentality) {
    sim.setMentality(userSide, m);
    setSnap(sim.snapshot());
  }

  function substitute(inId: string) {
    if (!subOut) return;
    const error = sim.substitute(userSide, subOut, inId);
    setMessage(error);
    if (!error) {
      push([], {
        minute: minuteLabel(sim.minute),
        text: `Substituição no ${world.clubs[clubs[userSide]].name}: sai ${world.players[subOut].knownAs}, entra ${world.players[inId].knownAs}.`,
        kind: "troca",
        side: userSide,
      });
    }
    setSubOut(null);
    setSnap(sim.snapshot());
  }

  const mine = snap.sides[userSide];
  const minute = snap.done ? "Fim" : halfTime ? "Intervalo" : minuteLabel(snap.minute);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <MatchHeader world={world} fixture={fixture} score={snap.score} center={snap.pens ? `${minute} · pên. ${snap.pens[0]}–${snap.pens[1]}` : minute} />
      <div className="flex min-h-0 flex-1">
        <section aria-label="Narração" aria-live="polite" className="scroll-pane min-w-0 flex-1 px-4 py-2">
          <ul className="flex flex-col gap-1">
            {lines.map((l, i) => (
              <li key={lines.length - i} className={`flex gap-3 rounded-md px-2 py-1 text-sm ${l.kind === "gol" ? "bg-gold/15 font-semibold text-gold" : l.kind === "vermelho" ? "bg-red/15" : ""}`}>
                <span className="w-10 shrink-0 text-right font-display font-semibold tabular-nums text-chalk-dim">{l.minute}</span>
                <span className={l.kind === "chance" || l.kind === "info" ? "text-chalk-dim" : ""}>
                  {l.kind === "cartao" && <span aria-hidden className="mr-1.5 inline-block h-3 w-2 rounded-[2px] bg-gold align-[-1px]" />}
                  {l.kind === "vermelho" && <span aria-hidden className="mr-1.5 inline-block h-3 w-2 rounded-[2px] bg-red align-[-1px]" />}
                  {l.text}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <aside aria-label="Seu time" className="flex w-[clamp(230px,34vw,300px)] shrink-0 flex-col border-l border-line">
          <div className="border-b border-line p-2">
            <p className="mb-1 text-xs text-chalk-dim">Postura</p>
            <div className="grid grid-cols-5 gap-1">
              {MENTALITIES.map((m) => (
                <button
                  key={m}
                  onClick={() => setMentality(m)}
                  disabled={snap.done}
                  title={MENTALITY_NAMES[m]}
                  className={`rounded-md py-1 text-[11px] font-semibold ${mine.mentality === m ? "bg-chalk text-pitch" : "bg-pitch-2 text-chalk-dim"}`}
                >
                  {MENTALITY_SHORT[m]}
                </button>
              ))}
            </div>
          </div>
          <p className="px-2 pt-1.5 text-xs text-chalk-dim">
            {subOut ? "Quem entra?" : snap.done ? "Partida encerrada." : `Toque num jogador para substituir · ${mine.subsLeft} trocas`}
          </p>
          {message && <p className="px-2 text-xs text-red">{message}</p>}
          <ul className="scroll-pane min-h-0 flex-1 px-1 pb-1">
            {(subOut ? mine.bench : mine.onPitch.map((p) => p.id)).map((id) => {
              const p = world.players[id];
              const live = mine.onPitch.find((x) => x.id === id);
              const cond = live?.cond ?? p.condition;
              return (
                <li key={id}>
                  <button
                    onClick={() => (subOut ? substitute(id) : !snap.done && mine.subsLeft > 0 && setSubOut(id))}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-pitch-2"
                  >
                    <span className="w-8 shrink-0 font-display text-[13px] font-semibold text-chalk-dim">{live?.slot ?? p.position}</span>
                    <span className="min-w-0 flex-1 truncate">
                      {p.knownAs}
                      {live?.yellow ? <span aria-label="amarelo" className="ml-1 inline-block h-2.5 w-1.5 rounded-[1px] bg-gold" /> : null}
                    </span>
                    <span className={`w-9 text-right text-xs tabular-nums ${cond < 70 ? "text-red" : "text-chalk-dim"}`}>{Math.round(cond)}%</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {subOut && (
            <button onClick={() => setSubOut(null)} className="mx-2 mb-1 rounded-md py-1 text-sm text-chalk-dim hover:text-chalk">
              Cancelar troca
            </button>
          )}
        </aside>
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t border-line px-3 py-2">
        {snap.done ? (
          <button onClick={finish} disabled={busy} className="ml-auto rounded-lg bg-gold px-5 py-2 font-display text-lg font-bold text-pitch disabled:opacity-50">
            {busy ? "Salvando…" : "Ver súmula"}
          </button>
        ) : (
          <>
            {halfTime ? (
              <button onClick={() => setHalfTime(false)} className="rounded-lg bg-gold px-4 py-1.5 font-display text-lg font-bold text-pitch">
                Começar o 2º tempo
              </button>
            ) : (
              <button onClick={() => setPaused((p) => !p)} className="rounded-lg bg-pitch-3 px-4 py-1.5 font-display text-lg font-bold">
                {paused ? "Continuar" : "Pausar"}
              </button>
            )}
            <div className="flex gap-1" role="group" aria-label="Velocidade">
              {SPEEDS.map((s, i) => (
                <button key={s.label} onClick={() => setSpeed(i)} className={`rounded-md px-2.5 py-1.5 text-sm font-semibold ${speed === i ? "bg-chalk text-pitch" : "bg-pitch-2 text-chalk-dim"}`}>
                  {s.label}
                </button>
              ))}
            </div>
            <span className="ml-2 hidden text-xs text-chalk-faint sm:inline">
              Chutes {snap.sides[0].shots}–{snap.sides[1].shots}
            </span>
            <button onClick={skip} className="ml-auto rounded-lg px-3 py-1.5 text-sm text-chalk-dim hover:text-chalk">
              Ir para o fim
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- Súmula ---------- */

function MatchReport({ world, fixture }: { world: World; fixture: Fixture }) {
  const { navigate, openPlayer } = useNavigation();
  const r = fixture.result;
  const lines = useMemo(() => {
    if (!r) return [];
    return r.events.filter((e) => e[1] !== "C").map((e) => describeEvent(world, e, [fixture.home, fixture.away]));
  }, [r, world, fixture]);
  if (!r) return <EmptyState title="Partida ainda não jogada" />;

  const goals = (side: 0 | 1) => r.events.filter((e) => e[1] === "G" && e[2] === side);
  const agg = aggregateNote(world, fixture);
  const center = r.pens ? `pên. ${r.pens[0]}–${r.pens[1]}` : agg ?? "Fim de jogo";

  const statRows: Array<[string, number, number, boolean?]> = [
    ["Posse de bola", r.stats.possession, 100 - r.stats.possession, true],
    ["Finalizações", r.stats.shots[0], r.stats.shots[1]],
    ["No gol", r.stats.onTarget[0], r.stats.onTarget[1]],
    ["Amarelos", r.events.filter((e) => e[1] === "Y" && e[2] === 0).length, r.events.filter((e) => e[1] === "Y" && e[2] === 1).length],
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <MatchHeader world={world} fixture={fixture} score={[r.hg, r.ag]} center={center} />
      <div className="flex min-h-0 flex-1">
        <section className="scroll-pane min-w-0 flex-1 px-4 py-3">
          <p className="text-xs text-chalk-dim">{fixtureLabel(world, fixture)}</p>
          <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
            {([0, 1] as const).map((side) => (
              <ul key={side} className={side === 0 ? "text-right" : ""}>
                {goals(side).map((g) => (
                  <li key={`${g[0]}${g[3]}`}>
                    {world.players[g[3]]?.knownAs} <span className="text-chalk-dim">{minuteLabel(g[0])}</span>
                  </li>
                ))}
              </ul>
            ))}
          </div>
          <dl className="mt-4 flex flex-col gap-2">
            {statRows.map(([label, a, b, pct]) => (
              <div key={label}>
                <dt className="flex justify-between text-xs text-chalk-dim">
                  <span className="font-semibold text-chalk tabular-nums">{pct ? `${a}%` : a}</span>
                  {label}
                  <span className="font-semibold text-chalk tabular-nums">{pct ? `${b}%` : b}</span>
                </dt>
                <dd className="mt-0.5 flex h-1.5 gap-0.5 overflow-hidden rounded-full">
                  <span className="bg-chalk" style={{ flex: Math.max(a, 0.01) }} />
                  <span className="bg-chalk-faint" style={{ flex: Math.max(b, 0.01) }} />
                </dd>
              </div>
            ))}
          </dl>
          <h3 className="mt-4 font-display text-lg font-bold">Lances</h3>
          <ul className="mt-1 flex flex-col gap-0.5 text-sm">
            {lines.map((l, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-10 shrink-0 text-right font-display font-semibold tabular-nums text-chalk-dim">{l.minute}</span>
                <span className={l.kind === "gol" ? "font-semibold text-gold" : ""}>{l.text}</span>
              </li>
            ))}
          </ul>
        </section>
        {r.ratings && r.lineups && (
          <aside aria-label="Notas" className="scroll-pane hidden w-[clamp(220px,32vw,300px)] shrink-0 border-l border-line px-2 py-2 sm:block">
            {(fixture.away === world.user?.clubId ? ([1, 0] as const) : ([0, 1] as const)).map((side) => {
              const clubId = side === 0 ? fixture.home : fixture.away;
              const played = Object.keys(r.ratings!).filter((id) => world.players[id]?.clubId === clubId);
              const starters = new Set(r.lineups![side]);
              played.sort((a, b) => Number(starters.has(b)) - Number(starters.has(a)) || r.ratings![b] - r.ratings![a]);
              return (
                <div key={side} className="mb-3">
                  <p className="px-1 font-display text-base font-bold">{world.clubs[clubId].shortName}</p>
                  <ul>
                    {played.map((id) => (
                      <li key={id}>
                        <button onClick={() => openPlayer(id)} className="flex w-full items-center gap-2 rounded px-1 py-0.5 text-left text-sm hover:bg-pitch-2">
                          <span className={`min-w-0 flex-1 truncate ${starters.has(id) ? "" : "text-chalk-dim"}`}>{world.players[id].knownAs}</span>
                          <span className={`font-display font-bold tabular-nums ${r.ratings![id] >= 7.5 ? "text-gold" : r.ratings![id] < 6 ? "text-red" : ""}`}>
                            {r.ratings![id].toFixed(1)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </aside>
        )}
      </div>
      <div className="flex shrink-0 justify-end border-t border-line px-3 py-2">
        <button onClick={() => navigate({ view: "inicio" })} className="rounded-lg bg-gold px-5 py-2 font-display text-lg font-bold text-pitch">
          Continuar
        </button>
      </div>
    </div>
  );
}
