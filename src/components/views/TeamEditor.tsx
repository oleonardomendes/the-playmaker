"use client";

import { useMemo, useState } from "react";
import { useGame, useWorld } from "@/components/game/GameProvider";
import { useNavigation } from "@/components/game/navigation";
import { Face, PosTag, Ring, conditionColor, pitchName, positionColor } from "@/components/ui/player";
import { formatShortDate } from "@/engine/calendar/date";
import {
  BENCH_SIZE,
  FORMATION_LIST,
  FORMATIONS,
  MENTALITIES,
  MENTALITY_NAMES,
  PITCH,
  PRESSINGS,
  PRESSING_NAMES,
  STYLES,
  STYLE_NAMES,
  effectiveRating,
  familiarity,
  fitToFormation,
  pickLineup,
  unavailableReason,
} from "@/engine/match/tactics";
import { POSITIONS, type Formation, type Mentality, type Player, type Pressing, type Style } from "@/engine/types";

const POSITION_ORDER = Object.fromEntries(POSITIONS.map((p, i) => [p, i])) as Record<string, number>;

/**
 * Campo em perspectiva: o fundo do campo (ataque) fica mais estreito.
 * Converte as coordenadas planas da formação (0–100) para a tela.
 */
function project(x: number, y: number): [number, number] {
  const scale = (0.72 + 0.24 * (y / 100)) * 0.9;
  // O goleiro fica colado à linha de fundo para não cobrir os zagueiros.
  return [50 + (x - 50) * scale, y >= 88 ? 90 : 4 + y * 0.92];
}

/**
 * Escalação e tática do seu clube. Toque num lugar do campo e depois no
 * jogador da lista para colocá-lo ali; toque em dois lugares do campo para
 * trocá-los. Sem mexer, o auxiliar escala o melhor time disponível.
 */
export function TeamEditor({ compId }: { compId?: string }) {
  const world = useWorld();
  const { updateTactic } = useGame();
  const { openPlayer } = useNavigation();
  const clubId = world.user!.clubId;
  const club = world.clubs[clubId];
  const tactic = club.tactic;
  const slots = FORMATIONS[tactic.formation];
  const [selected, setSelected] = useState<number | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const custom = tactic.lineup.length === 11;
  const auto = useMemo(() => pickLineup(world, clubId, tactic.formation, compId), [world, clubId, tactic.formation, compId]);
  const lineup: (string | null)[] = custom ? tactic.lineup : auto.starters;
  const bench: string[] = useMemo(() => {
    if (!custom) return auto.bench;
    if (tactic.bench.length) return tactic.bench.filter((id) => !tactic.lineup.includes(id));
    return pickLineup(world, clubId, tactic.formation, compId, { lineup: tactic.lineup, bench: [] }).bench.filter((id) => !tactic.lineup.includes(id));
  }, [custom, auto.bench, tactic, world, clubId, compId]);

  const squad = useMemo(
    () => club.playerIds.map((id) => world.players[id]).sort((a, b) => POSITION_ORDER[a.position] - POSITION_ORDER[b.position] || b.overall - a.overall),
    [club, world],
  );

  const save = (nextLineup: (string | null)[], nextBench: string[]) => {
    void updateTactic({ lineup: nextLineup, bench: nextBench.slice(0, BENCH_SIZE) });
  };

  function onSlot(index: number) {
    setHint(null);
    if (selected === null) {
      setSelected(index);
      return;
    }
    if (selected === index) {
      setSelected(null);
      return;
    }
    const next = [...lineup];
    [next[selected], next[index]] = [next[index], next[selected]];
    save(next, bench);
    setSelected(null);
  }

  function onPlayer(player: Player) {
    setHint(null);
    const inXI = lineup.indexOf(player.id);
    if (selected !== null) {
      const next = [...lineup];
      let nextBench = bench.filter((id) => id !== player.id);
      const previous = next[selected];
      if (inXI >= 0) {
        next[inXI] = previous;
      } else if (previous) {
        nextBench = [previous, ...nextBench];
      }
      next[selected] = player.id;
      save(next, nextBench);
      setSelected(null);
      return;
    }
    if (inXI >= 0) {
      setHint("Toque num lugar do campo para trocar este titular.");
      return;
    }
    // Sem lugar selecionado: põe ou tira do banco.
    if (bench.includes(player.id)) save(lineup, bench.filter((id) => id !== player.id));
    else if (bench.length >= BENCH_SIZE) setHint(`O banco já tem ${BENCH_SIZE} jogadores. Tire alguém antes.`);
    else save(lineup, [...bench, player.id]);
  }

  function setFormation(formation: Formation) {
    const starters = lineup.filter((id): id is string => Boolean(id));
    void updateTactic({ formation, lineup: custom ? fitToFormation(world, starters, formation) : [], bench: custom ? bench : [] });
    setSelected(null);
  }

  const problems = lineup.filter((id) => id && unavailableReason(world, world.players[id], compId)).length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1">
        <div className="relative m-1.5 mr-0 aspect-[11/10] h-[calc(100%-0.75rem)] max-w-[56%] shrink-0">
          <PitchLines />
          {slots.map((pos, i) => {
            const id = lineup[i];
            const p = id ? world.players[id] : undefined;
            const [x, y] = project(...PITCH[tactic.formation][i]);
            const problem = p ? unavailableReason(world, p, compId) : null;
            const fit = p ? familiarity(p.position, pos) : 1;
            const active = selected === i;
            return (
              <button
                key={i}
                onClick={() => onSlot(i)}
                style={{ left: `${x}%`, top: `${y}%`, zIndex: Math.round(y) }}
                className="group absolute flex w-[58px] -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                aria-label={`${pos}: ${p?.knownAs ?? "vazio"}`}
              >
                <span className={`relative rounded-full p-[2px] transition-shadow ${active ? "bg-gold shadow-[0_0_14px_var(--gold)]" : "bg-black/35"}`}>
                  {p ? (
                    <Face player={p} size={27} shirt={club.colors[0]} season={world.season} />
                  ) : (
                    <span className="block h-[27px] w-[27px] rounded-full border border-dashed border-white/40" />
                  )}
                  {p && (
                    <span className="absolute -right-3 -top-1">
                      <Ring value={effectiveRating(p, pos)} size={20} stroke={2} />
                    </span>
                  )}
                </span>
                <span
                  className={`mt-[-3px] flex w-full flex-col items-center overflow-hidden rounded-md border text-center shadow-[0_4px_10px_rgba(0,0,0,0.45)] ${
                    active ? "border-gold bg-[#2a2210]" : "border-white/10 bg-[rgba(9,14,26,0.86)]"
                  }`}
                >
                  <span className={`block w-full truncate px-0.5 pt-[2px] font-display text-[11px] font-bold leading-[12px] tracking-wide ${problem ? "text-red line-through" : ""}`}>
                    {p ? pitchName(p.knownAs, 9) : "—"}
                  </span>
                  <span className="flex w-full items-center justify-center gap-1 pb-[2px]">
                    <span className="font-display text-[10px] font-bold leading-[11px]" style={{ color: fit < 0.9 ? "var(--red)" : positionColor(pos) }}>
                      {pos}
                    </span>
                    {p && (
                      <span className="h-[3px] w-5 overflow-hidden rounded-full bg-white/15">
                        <span className="block h-full" style={{ width: `${p.condition}%`, background: conditionColor(p.condition) }} />
                      </span>
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
      <div className="grid shrink-0 grid-cols-2 gap-1.5 px-2 pt-2 lg:grid-cols-4">
            <Select label="Formação" value={tactic.formation} options={FORMATION_LIST.map((f) => [f, f])} onChange={(v) => setFormation(v as Formation)} />
            <Select label="Postura" value={tactic.mentality} options={MENTALITIES.map((m) => [m, MENTALITY_NAMES[m]])} onChange={(v) => updateTactic({ mentality: v as Mentality })} />
            <Select label="Estilo" value={tactic.style} options={STYLES.map((s) => [s, STYLE_NAMES[s]])} onChange={(v) => updateTactic({ style: v as Style })} />
            <Select label="Marcação" value={tactic.pressing} options={PRESSINGS.map((p) => [p, `Pressão ${PRESSING_NAMES[p].toLowerCase()}`])} onChange={(v) => updateTactic({ pressing: v as Pressing })} />
            <button
              onClick={() => {
                void updateTactic({ lineup: [], bench: [] });
                setSelected(null);
              }}
              className={`col-span-2 px-3 lg:col-span-4 py-1 text-[13px] font-medium ${custom ? "btn-ghost text-chalk" : "text-chalk-faint"}`}
              disabled={!custom}
            >
              {custom ? "Voltar ao automático" : "Escalação automática"}
            </button>
          </div>
          <p className="shrink-0 px-2 pt-1.5 text-[11px] leading-snug text-chalk-faint">
            {hint ??
              (selected !== null
                ? `Escolha quem joga de ${slots[selected]}, ou toque em outro lugar do campo para trocar.`
                : problems > 0
                  ? `${problems} titular(es) indisponível(is): o auxiliar troca na hora do jogo.`
                  : custom
                    ? "Escalação sua. Toque num lugar do campo para mudar."
                    : "O auxiliar escalou o melhor time disponível. Toque num lugar do campo para mudar.")}
          </p>
          <ul className="scroll-pane min-h-0 flex-1 px-1 pb-2">
            {squad.map((p) => {
              const inXI = lineup.includes(p.id);
              const onBench = bench.includes(p.id);
              const reason = unavailableReason(world, p, compId);
              const slotPos = selected !== null ? slots[selected] : null;
              const value = slotPos ? effectiveRating(p, slotPos) : p.overall;
              return (
                <li key={p.id} className="flex items-center">
                  <button
                    onClick={() => onPlayer(p)}
                    className={`relative flex min-w-0 flex-1 items-center gap-2 rounded-lg py-[3px] pl-2.5 pr-1.5 text-left hover:bg-white/5 ${inXI ? "bg-white/[0.04]" : ""}`}
                  >
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full" style={{ background: positionColor(p.position), opacity: inXI ? 1 : 0.35 }} />
                    <Face player={p} size={26} shirt={club.colors[0]} season={world.season} />
                    <PosTag pos={p.position} />
                    <span className={`min-w-0 flex-1 truncate text-[13px] ${inXI ? "font-semibold" : ""} ${reason ? "text-chalk-faint line-through" : ""}`}>{p.knownAs}</span>
                    <span
                      className={`w-12 shrink-0 text-center text-[11px] ${reason ? "text-red" : inXI ? "text-gold" : onBench ? "text-chalk" : "text-chalk-faint"}`}
                      title={reason ?? undefined}
                    >
                      {reason ? (reason.startsWith("Lesionado") ? `até ${formatShortDate(p.injury!.until)}` : "suspenso") : inXI ? "titular" : onBench ? "banco" : ""}
                    </span>
                    <span className="w-8 shrink-0 text-right text-[11px] font-semibold tabular-nums" style={{ color: conditionColor(p.condition) }}>
                      {Math.round(p.condition)}%
                    </span>
                    <Ring value={value} size={26} />
                  </button>
                  <button onClick={() => openPlayer(p.id)} aria-label={`Ficha de ${p.knownAs}`} className="shrink-0 rounded px-1.5 py-1 text-[11px] text-chalk-faint hover:text-chalk">
                    ficha
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string]>; onChange: (v: string) => void }) {
  return (
    <label className="flex min-w-0 items-center gap-1.5 text-xs text-chalk-dim">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className="h-8 w-full min-w-0 rounded-lg border border-line bg-pitch-2 px-2 text-[13px] font-medium text-chalk">
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Gramado em perspectiva com as linhas do campo projetadas. */
function PitchLines() {
  const pt = (x: number, y: number) => project(x, y).join(",");
  const poly = (pts: Array<[number, number]>) => pts.map(([x, y]) => pt(x, y)).join(" ");
  const box = (x0: number, y0: number, x1: number, y1: number) => poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
  const circle = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2;
    return [50 + Math.cos(a) * 11, 50 + Math.sin(a) * 9] as [number, number];
  });
  const stripes = Array.from({ length: 10 }, (_, i) => i);
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full drop-shadow-[0_14px_22px_rgba(0,0,0,0.55)]" aria-hidden>
      <defs>
        <linearGradient id="grass-light" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.14" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      {/* borda do campo, um pouco maior que as linhas */}
      <polygon points={poly([[-6, -7], [106, -7], [106, 104], [-6, 104]])} fill="#165c2c" />
      {stripes.map((i) => (
        <polygon key={i} points={box(-6, -7 + i * 11.1, 106, -7 + (i + 1) * 11.1)} fill={i % 2 ? "var(--grass-a)" : "var(--grass-b)"} />
      ))}
      <polygon points={poly([[-6, -7], [106, -7], [106, 104], [-6, 104]])} fill="url(#grass-light)" />
      <g fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.45" vectorEffect="non-scaling-stroke">
        <polygon points={box(0, 0, 100, 100)} />
        <polyline points={poly([[0, 50], [100, 50]])} />
        <polygon points={poly(circle)} />
        <polygon points={box(27, 0, 73, 15)} />
        <polygon points={box(40, 0, 60, 5.5)} />
        <polygon points={box(27, 85, 73, 100)} />
        <polygon points={box(40, 94.5, 60, 100)} />
      </g>
    </svg>
  );
}
