"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useWorld } from "@/components/game/GameProvider";
import { useNavigation } from "@/components/game/navigation";
import { Crest } from "@/components/ui/Crest";
import { Strength } from "@/components/ui/bits";
import { IconSearch } from "@/components/ui/icons";
import { POSITIONS, POSITION_NAMES, type Position } from "@/engine/types";
import { COUNTRY_SHORT } from "@/lib/format";

const LIMIT = 150;

type Origin = "todos" | "br" | "estrangeiros";
type AgeBand = "todas" | "sub20" | "sub23" | "23a29" | "30mais";

const AGE_BANDS: Record<AgeBand, [number, number]> = {
  todas: [0, 99],
  sub20: [0, 20],
  sub23: [0, 23],
  "23a29": [23, 29],
  "30mais": [30, 99],
};

function normalize(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function PlayersView() {
  const world = useWorld();
  const { openPlayer } = useNavigation();
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<"todas" | Position>("todas");
  const [age, setAge] = useState<AgeBand>("todas");
  const [origin, setOrigin] = useState<Origin>("todos");
  const deferredQuery = useDeferredValue(query);

  const { rows, total } = useMemo(() => {
    const q = normalize(deferredQuery.trim());
    const [minAge, maxAge] = AGE_BANDS[age];
    const filtered = Object.values(world.players).filter((p) => {
      const playerAge = world.season - p.birthYear;
      if (position !== "todas" && p.position !== position) return false;
      if (playerAge < minAge || playerAge > maxAge) return false;
      if (origin === "br" && p.nationality !== "BR") return false;
      if (origin === "estrangeiros" && p.nationality === "BR") return false;
      if (q && !normalize(`${p.knownAs} ${p.fullName}`).includes(q)) return false;
      return true;
    });
    filtered.sort((a, b) => b.overall - a.overall);
    return { rows: filtered.slice(0, LIMIT), total: filtered.length };
  }, [world, deferredQuery, position, age, origin]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
        <label className="flex min-w-[150px] flex-1 items-center gap-2 rounded-lg bg-pitch-2 px-2.5">
          <IconSearch className="text-chalk-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar jogador"
            className="h-9 min-w-0 flex-1 bg-transparent outline-none placeholder:text-chalk-faint"
          />
        </label>
        <select value={position} onChange={(e) => setPosition(e.target.value as typeof position)} aria-label="Posição" className="h-9 rounded-lg bg-pitch-2 px-2 text-sm">
          <option value="todas">Todas as posições</option>
          {POSITIONS.map((p) => (
            <option key={p} value={p}>
              {POSITION_NAMES[p]}
            </option>
          ))}
        </select>
        <select value={age} onChange={(e) => setAge(e.target.value as AgeBand)} aria-label="Idade" className="h-9 rounded-lg bg-pitch-2 px-2 text-sm">
          <option value="todas">Qualquer idade</option>
          <option value="sub20">Até 20 anos</option>
          <option value="sub23">Até 23 anos</option>
          <option value="23a29">23 a 29 anos</option>
          <option value="30mais">30 anos ou mais</option>
        </select>
        <select value={origin} onChange={(e) => setOrigin(e.target.value as Origin)} aria-label="Nacionalidade" className="h-9 rounded-lg bg-pitch-2 px-2 text-sm">
          <option value="todos">Todos os países</option>
          <option value="br">Brasileiros</option>
          <option value="estrangeiros">Estrangeiros</option>
        </select>
      </div>

      <div className="scroll-pane min-h-0 flex-1">
        <p className="px-4 pt-2 text-xs text-chalk-faint">
          {total > LIMIT ? `Os ${LIMIT} mais fortes de ${total.toLocaleString("pt-BR")} jogadores` : `${total} jogadores`}
        </p>
        <table className="w-full table-fixed text-left">
          <thead className="sticky top-0 bg-pitch text-xs text-chalk-faint">
            <tr>
              <th className="w-[34%] py-1.5 pl-4 font-medium">Jogador</th>
              <th className="w-12 font-medium">Pos</th>
              <th className="w-12 font-medium">Idade</th>
              <th className="w-12 font-medium">País</th>
              <th className="font-medium">Clube</th>
              <th className="w-16 pr-4 text-right font-medium">Força</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const club = world.clubs[p.clubId];
              return (
                <tr key={p.id} onClick={() => openPlayer(p.id)} className="cursor-pointer border-t border-line hover:bg-pitch-2">
                  <td className="truncate py-1.5 pl-4 pr-2 font-medium">{p.knownAs}</td>
                  <td className="font-display font-semibold text-chalk-dim">{p.position}</td>
                  <td className="tabular-nums text-chalk-dim">{world.season - p.birthYear}</td>
                  <td className="text-xs text-chalk-dim">{COUNTRY_SHORT[p.nationality]}</td>
                  <td className="pr-2">
                    <span className="flex items-center gap-1.5">
                      <Crest club={club} size={16} />
                      <span className="truncate text-chalk-dim">{club.name}</span>
                    </span>
                  </td>
                  <td className="pr-4 text-right">
                    <Strength value={p.overall} className="text-lg" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {total === 0 && <p className="p-6 text-center text-chalk-dim">Nenhum jogador com esses filtros.</p>}
      </div>
    </div>
  );
}
