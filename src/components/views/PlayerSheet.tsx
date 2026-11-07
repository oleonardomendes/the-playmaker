"use client";

import { useEffect } from "react";
import { useGame } from "@/components/game/GameProvider";
import { useNavigation } from "@/components/game/navigation";
import { Crest } from "@/components/ui/Crest";
import { Strength, TierBadge } from "@/components/ui/bits";
import { IconClose } from "@/components/ui/icons";
import { POSITION_NAMES } from "@/engine/types";
import { countryName, FOOT_LABEL } from "@/lib/format";
import { formatShortDate } from "@/engine/calendar/date";

/** Ficha do jogador, aberta pela lateral por cima de qualquer tela. */
export function PlayerSheet() {
  const { world } = useGame();
  const { playerId, openPlayer, navigate } = useNavigation();
  const player = playerId && world ? world.players[playerId] : undefined;

  useEffect(() => {
    if (!player) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && openPlayer(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [player, openPlayer]);

  if (!player || !world) return null;
  const club = world.clubs[player.clubId];
  const age = world.season - player.birthYear;

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label={`Ficha de ${player.knownAs}`}>
      <button aria-label="Fechar ficha" className="absolute inset-0 bg-black/50" onClick={() => openPlayer(null)} />
      <aside
        className="sheet-in relative flex h-full w-[min(380px,85vw)] flex-col border-l border-line bg-pitch-2"
        style={{ paddingRight: "env(safe-area-inset-right)" }}
      >
        <div className="flex items-start gap-3 p-4">
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-semibold text-chalk-dim">{POSITION_NAMES[player.position]}</p>
            <h2 className="truncate font-display text-3xl font-bold leading-tight">{player.knownAs}</h2>
            <p className="truncate text-sm text-chalk-dim">{player.fullName}</p>
          </div>
          <div className="flex flex-col items-center rounded-lg bg-pitch px-3 py-1.5">
            <Strength value={player.overall} className="text-4xl leading-none" />
            <span className="text-[11px] text-chalk-faint">força</span>
          </div>
          <button onClick={() => openPlayer(null)} aria-label="Fechar" className="-mr-1 -mt-1 rounded-md p-1.5 text-xl text-chalk-dim hover:text-chalk">
            <IconClose />
          </button>
        </div>

        <button
          onClick={() => navigate({ view: "clubes", clubId: club.id })}
          className="mx-4 flex items-center gap-3 rounded-lg bg-pitch px-3 py-2 text-left hover:bg-pitch-3"
        >
          <Crest club={club} size={28} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{club.name}</span>
            <span className="block text-xs text-chalk-dim">Ver clube</span>
          </span>
          <TierBadge tier={club.tier} short />
        </button>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 text-sm">
          <div>
            <dt className="text-chalk-dim">Idade</dt>
            <dd className="font-medium">
              {age} anos <span className="text-chalk-faint">({player.birthYear})</span>
            </dd>
          </div>
          <div>
            <dt className="text-chalk-dim">Nacionalidade</dt>
            <dd className="font-medium">{countryName(player.nationality)}</dd>
          </div>
          <div>
            <dt className="text-chalk-dim">Posição</dt>
            <dd className="font-medium">{POSITION_NAMES[player.position]}</dd>
          </div>
          <div>
            <dt className="text-chalk-dim">Pé preferido</dt>
            <dd className="font-medium">{FOOT_LABEL[player.foot]}</dd>
          </div>
        </dl>
        <div className="mx-4 grid grid-cols-4 gap-1.5 text-center">
          {[
            ["Jogos", player.season.apps],
            ["Gols", player.season.goals],
            ["Assist.", player.season.assists],
            ["Nota", player.season.apps ? (player.season.ratingSum / player.season.apps).toFixed(1) : "–"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-pitch px-1 py-1.5">
              <p className="font-display text-xl font-bold leading-none">{value}</p>
              <p className="mt-0.5 text-[11px] text-chalk-faint">{label}</p>
            </div>
          ))}
        </div>
        <p className="mx-4 mt-3 text-sm text-chalk-dim">
          {player.injury
            ? `Lesionado (${player.injury.name.toLowerCase()}), volta em ${formatShortDate(player.injury.until)}.`
            : `Condição física: ${Math.round(player.condition)}%.`}
          {player.season.yellow + player.season.red > 0 && ` ${player.season.yellow} amarelos e ${player.season.red} vermelhos na temporada.`}
        </p>
      </aside>
    </div>
  );
}
