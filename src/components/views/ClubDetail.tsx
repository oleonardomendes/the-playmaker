"use client";

import { useMemo, useState } from "react";
import { useGame, useWorld } from "@/components/game/GameProvider";
import { useNavigation } from "@/components/game/navigation";
import { Crest } from "@/components/ui/Crest";
import { Segmented, Stat, Strength, TierBadge } from "@/components/ui/bits";
import { POSITIONS, type Club, type Position } from "@/engine/types";
import { readableOn } from "@/lib/color";
import { COUNTRY_SHORT, countryName, formatCompact, formatInt, RIVAL_LABEL } from "@/lib/format";

const POSITION_ORDER: Record<Position, number> = Object.fromEntries(POSITIONS.map((p, i) => [p, i])) as Record<Position, number>;

/** Faixa no topo com as cores do clube: é a parte mais "barulhenta" da tela de propósito. */
function ClubBand({ club }: { club: Club }) {
  const world = useWorld();
  const [c0, c1] = club.colors;
  const ink = readableOn(c0);
  const where = club.country === "BR" ? `${club.city}, ${world.states[club.state]?.name ?? club.state}` : `${club.city}, ${countryName(club.country)}`;
  return (
    <header
      className="relative flex shrink-0 items-center gap-4 overflow-hidden px-5 py-3"
      style={{ background: c0, color: ink }}
    >
      <span aria-hidden className="absolute -right-16 top-0 h-full w-32 -skew-x-[24deg]" style={{ background: c1, opacity: 0.9 }} />
      <span aria-hidden className="absolute right-20 top-0 h-full w-4 -skew-x-[24deg]" style={{ background: c1, opacity: 0.5 }} />
      <span className="relative rounded-lg bg-black/15 p-1.5">
        <Crest club={club} size={46} />
      </span>
      <div className="relative min-w-0 pr-16">
        <h2 className="line-clamp-2 font-display text-[26px] font-bold leading-[0.95]">{club.name}</h2>
        <p className="mt-1 flex items-center gap-2 text-[13px] opacity-90">
          <TierBadge tier={club.tier} short />
          <span className="truncate">
            {club.nickname}, desde {club.founded}. {where}
          </span>
        </p>
      </div>
    </header>
  );
}

function Squad({ club }: { club: Club }) {
  const world = useWorld();
  const { openPlayer } = useNavigation();
  const players = useMemo(
    () =>
      club.playerIds
        .map((id) => world.players[id])
        .sort((a, b) => POSITION_ORDER[a.position] - POSITION_ORDER[b.position] || b.overall - a.overall),
    [club, world],
  );
  return (
    <table className="w-full table-fixed text-left">
      <thead className="sticky top-0 z-10 bg-pitch text-xs text-chalk-faint">
        <tr>
          <th className="w-14 py-1.5 pl-5 font-medium">Pos</th>
          <th className="font-medium">Jogador</th>
          <th className="w-12 font-medium">Idade</th>
          <th className="hidden w-11 font-medium @[400px]:table-cell">País</th>
          <th className="hidden w-8 font-medium @[460px]:table-cell">Pé</th>
          <th className="w-16 pr-5 text-right font-medium">Força</th>
        </tr>
      </thead>
      <tbody>
        {players.map((p, i) => {
          const newGroup = i === 0 || players[i - 1].position !== p.position;
          return (
            <tr
              key={p.id}
              onClick={() => openPlayer(p.id)}
              className={`cursor-pointer hover:bg-pitch-2 ${newGroup ? "border-t border-line" : ""}`}
            >
              <td className="py-1.5 pl-5 font-display font-semibold text-chalk-dim">{newGroup ? p.position : ""}</td>
              <td className="truncate pr-2 font-medium">{p.knownAs}</td>
              <td className="tabular-nums text-chalk-dim">{world.season - p.birthYear}</td>
              <td className={`hidden text-xs @[400px]:table-cell ${p.nationality === club.country ? "text-chalk-faint" : "font-semibold text-chalk"}`}>
                {COUNTRY_SHORT[p.nationality]}
              </td>
              <td className="hidden text-chalk-dim @[460px]:table-cell">{p.foot}</td>
              <td className="pr-5 text-right">
                <Strength value={p.overall} className="text-lg" />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function About({ club }: { club: Club }) {
  const world = useWorld();
  const { strength } = useGame();
  const { navigate } = useNavigation();
  const squad = club.playerIds.map((id) => world.players[id]);
  const avgAge = squad.reduce((s, p) => s + (world.season - p.birthYear), 0) / squad.length;
  const foreigners = squad.filter((p) => p.nationality !== club.country).length;

  return (
    <div className="flex flex-col gap-4 px-5 py-4">
      <dl className="grid grid-cols-3 gap-2 lg:grid-cols-6">
        <Stat label="Força do time">
          <Strength value={strength[club.id]} />
        </Stat>
        <Stat label="Prestígio">{club.prestige}</Stat>
        <Stat label="Torcida">{formatCompact(club.fans)}</Stat>
        <Stat label="Capacidade">{formatInt(club.stadium.capacity)}</Stat>
        <Stat label="Idade média">{avgAge.toFixed(1)}</Stat>
        <Stat label="Estrangeiros">{foreigners}</Stat>
      </dl>
      <p className="text-sm text-chalk-dim">
        Manda os jogos no <span className="text-chalk">{club.stadium.name}</span>.
      </p>
      <div>
        <h3 className="mb-2 font-display text-lg font-bold">Rivais</h3>
        <ul className="grid grid-cols-1 gap-1.5 lg:grid-cols-2">
          {club.rivals.map((r) => {
            const rival = world.clubs[r.clubId];
            return (
              <li key={r.clubId}>
                <button
                  onClick={() => navigate({ view: "clubes", clubId: rival.id })}
                  className="flex w-full items-center gap-2.5 rounded-lg bg-pitch-2 px-3 py-2 text-left hover:bg-pitch-3"
                >
                  <Crest club={rival} size={22} />
                  <span className="min-w-0 flex-1 truncate font-medium">{rival.name}</span>
                  <span className={`text-xs ${r.intensity === 3 ? "font-semibold text-gold" : "text-chalk-dim"}`}>
                    {RIVAL_LABEL[r.intensity]}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function ClubDetail({ club }: { club: Club }) {
  const [tab, setTab] = useState<"elenco" | "clube">("elenco");
  return (
    <div className="flex h-full min-h-0 flex-col">
      <ClubBand club={club} />
      <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-2">
        <Segmented
          label="Seções do clube"
          value={tab}
          onChange={setTab}
          options={[
            { value: "elenco", label: `Elenco (${club.playerIds.length})` },
            { value: "clube", label: "Clube e rivais" },
          ]}
        />
      </div>
      <div className="scroll-pane min-h-0 flex-1">{tab === "elenco" ? <Squad club={club} /> : <About club={club} />}</div>
    </div>
  );
}
