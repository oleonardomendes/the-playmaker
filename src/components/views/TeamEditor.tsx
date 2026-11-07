"use client";

import { useMemo, useState } from "react";
import { useGame, useWorld } from "@/components/game/GameProvider";
import { useNavigation } from "@/components/game/navigation";
import { Strength } from "@/components/ui/bits";
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

function conditionTone(c: number) {
  return c >= 90 ? "bg-[#3fa35b]" : c >= 75 ? "bg-gold" : "bg-red";
}

function shortName(name: string) {
  return name.length > 11 ? name.split(" ")[0] : name;
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
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line px-3 py-2">
        <Select label="Formação" value={tactic.formation} options={FORMATION_LIST.map((f) => [f, f])} onChange={(v) => setFormation(v as Formation)} />
        <Select label="Postura" value={tactic.mentality} options={MENTALITIES.map((m) => [m, MENTALITY_NAMES[m]])} onChange={(v) => updateTactic({ mentality: v as Mentality })} />
        <Select label="Estilo" value={tactic.style} options={STYLES.map((s) => [s, STYLE_NAMES[s]])} onChange={(v) => updateTactic({ style: v as Style })} />
        <Select label="Marcação" value={tactic.pressing} options={PRESSINGS.map((p) => [p, `Pressão ${PRESSING_NAMES[p].toLowerCase()}`])} onChange={(v) => updateTactic({ pressing: v as Pressing })} />
        <button
          onClick={() => {
            void updateTactic({ lineup: [], bench: [] });
            setSelected(null);
          }}
          className={`ml-auto rounded-lg px-3 py-1.5 text-sm font-medium ${custom ? "bg-pitch-3 text-chalk hover:bg-pitch-2" : "text-chalk-faint"}`}
          disabled={!custom}
        >
          {custom ? "Voltar ao automático" : "Escalação automática"}
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="relative m-2 aspect-[6/5] h-[calc(100%-1rem)] max-w-[52%] shrink-0 overflow-hidden rounded-xl border border-line bg-[#123726]">
          <PitchLines />
          {slots.map((pos, i) => {
            const id = lineup[i];
            const p = id ? world.players[id] : undefined;
            const [x, y] = PITCH[tactic.formation][i];
            const problem = p ? unavailableReason(world, p, compId) : null;
            const fit = p ? familiarity(p.position, pos) : 1;
            return (
              <button
                key={i}
                onClick={() => onSlot(i)}
                style={{ left: `${x}%`, top: `${y}%` }}
                className={`absolute flex w-[64px] -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-md px-0.5 py-0.5 ${
                  selected === i ? "bg-gold text-pitch" : "bg-pitch/80"
                }`}
                aria-label={`${pos}: ${p?.knownAs ?? "vazio"}`}
              >
                <span className={`font-display text-[12px] font-bold leading-none ${selected === i ? "" : fit < 0.9 ? "text-red" : "text-chalk-dim"}`}>{pos}</span>
                <span className={`max-w-full truncate text-[10.5px] font-medium leading-tight ${problem ? "text-red line-through" : ""}`}>{p ? shortName(p.knownAs) : "—"}</span>
                {p && (
                  <span className="mt-0.5 h-1 w-10 overflow-hidden rounded-full bg-black/40">
                    <span className={`block h-full ${conditionTone(p.condition)}`} style={{ width: `${p.condition}%` }} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <p className="shrink-0 px-2 pt-2 text-xs text-chalk-dim">
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
                <li key={p.id} className="flex items-center gap-1">
                  <button
                    onClick={() => onPlayer(p)}
                    className={`flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-pitch-2 ${inXI ? "bg-pitch-2/60" : ""}`}
                  >
                    <span className="w-8 shrink-0 font-display text-[13px] font-semibold text-chalk-dim">{p.position}</span>
                    <span className={`min-w-0 flex-1 truncate text-sm ${reason ? "text-chalk-faint line-through" : ""}`}>{p.knownAs}</span>
                    <span
                      className={`w-14 shrink-0 text-center text-[11px] ${inXI ? "text-gold" : onBench ? "text-chalk" : "text-chalk-faint"}`}
                      title={reason ?? undefined}
                    >
                      {reason ? (reason.startsWith("Lesionado") ? `até ${formatShortDate(p.injury!.until)}` : "suspenso") : inXI ? "titular" : onBench ? "banco" : ""}
                    </span>
                    <span className="w-9 shrink-0 text-right text-xs tabular-nums text-chalk-dim">{Math.round(p.condition)}%</span>
                    <Strength value={value} className="w-7 shrink-0 text-right text-base" />
                  </button>
                  <button onClick={() => openPlayer(p.id)} aria-label={`Ficha de ${p.knownAs}`} className="shrink-0 rounded px-1.5 py-1 text-xs text-chalk-faint hover:text-chalk">
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
    <label className="flex items-center gap-1.5 text-xs text-chalk-dim">
      <span className="hidden lg:inline">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className="h-8 rounded-lg bg-pitch-2 px-2 text-sm text-chalk">
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

function PitchLines() {
  return (
    <svg viewBox="0 0 120 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
      <g fill="none" stroke="rgba(234,241,230,0.16)" strokeWidth="0.6">
        <rect x="3" y="3" width="114" height="94" />
        <line x1="3" y1="50" x2="117" y2="50" />
        <ellipse cx="60" cy="50" rx="10" ry="8" />
        <rect x="35" y="3" width="50" height="15" />
        <rect x="35" y="82" width="50" height="15" />
      </g>
    </svg>
  );
}
