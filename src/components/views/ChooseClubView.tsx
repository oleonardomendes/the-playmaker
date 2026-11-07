"use client";

import { useMemo, useState } from "react";
import { useGame, useWorld } from "@/components/game/GameProvider";
import { Crest } from "@/components/ui/Crest";
import { Segmented, Strength, TierBadge } from "@/components/ui/bits";
import type { Tier } from "@/engine/types";
import { formatCompact } from "@/lib/format";

/**
 * Escolha do clube. É provisória: a carreira de técnico, com propostas e
 * origem do técnico, chega na fase 6.
 */
export function ChooseClubView() {
  const world = useWorld();
  const { strength, chooseClub, busy } = useGame();
  const [tier, setTier] = useState<Exclude<Tier, "INT">>("A");
  const [selected, setSelected] = useState<string | null>(null);

  const clubs = useMemo(
    () =>
      Object.values(world.clubs)
        .filter((c) => c.country === "BR" && c.tier === tier)
        .sort((a, b) => strength[b.id] - strength[a.id]),
    [world, tier, strength],
  );
  const club = selected ? world.clubs[selected] : null;

  return (
    <div className="flex h-full min-h-0">
      <section className="flex w-[clamp(250px,40vw,360px)] shrink-0 flex-col border-r border-line">
        <div className="border-b border-line p-3">
          <h1 className="font-display text-2xl font-bold leading-none">Escolha seu clube</h1>
          <p className="mt-1 text-sm text-chalk-dim">Por enquanto você assume o clube que quiser. As propostas de emprego chegam com a carreira de técnico.</p>
          <div className="mt-2">
            <Segmented
              label="Divisão"
              value={tier}
              onChange={(t) => {
                setTier(t);
                setSelected(null);
              }}
              options={[
                { value: "A", label: "Série A" },
                { value: "B", label: "B" },
                { value: "C", label: "C" },
                { value: "D", label: "D" },
                { value: "E", label: "Estadual" },
              ]}
            />
          </div>
        </div>
        <ul className="scroll-pane min-h-0 flex-1 p-1.5">
          {clubs.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => setSelected(c.id)}
                aria-current={c.id === selected ? "true" : undefined}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left ${c.id === selected ? "bg-pitch-3" : "hover:bg-pitch-2"}`}
              >
                <Crest club={c} size={24} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium leading-tight">{c.name}</span>
                  <span className="block truncate text-xs text-chalk-dim">
                    {c.city}, {c.state}
                  </span>
                </span>
                <Strength value={strength[c.id]} className="w-7 text-right text-lg" />
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section className="flex min-w-0 flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        {club ? (
          <>
            <Crest club={club} size={72} />
            <div>
              <h2 className="font-display text-3xl font-bold leading-tight">{club.name}</h2>
              <p className="mt-1 flex items-center justify-center gap-2 text-sm text-chalk-dim">
                <TierBadge tier={club.tier} short /> {club.city}, {club.state} · torcida de {formatCompact(club.fans)}
              </p>
            </div>
            <p className="max-w-sm text-sm text-chalk-dim">
              Força do elenco <Strength value={strength[club.id]} />. A temporada começa com o estadual em janeiro.
            </p>
            <button
              onClick={() => chooseClub(club.id)}
              disabled={busy}
              className="rounded-lg bg-gold px-6 py-3 font-display text-xl font-bold text-pitch disabled:opacity-50"
            >
              Comandar o {club.shortName}
            </button>
          </>
        ) : (
          <p className="max-w-xs text-chalk-dim">Escolha um clube na lista para ver os detalhes.</p>
        )}
      </section>
    </div>
  );
}
